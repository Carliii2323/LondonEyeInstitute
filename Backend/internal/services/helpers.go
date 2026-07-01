package services

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"time"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

// editableWindowMonths — ventana en meses que un docente puede editar asistencia
// (mes actual + el anterior). Las notas usan su propia regla (año + gracia de enero).
const editableWindowMonths = 2

// ── conversión de tipos pgtype ────────────────────────────────────

func uuidToString(id pgtype.UUID) string {
	b := id.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func parseDate(s string) pgtype.Date {
	if s == "" {
		return pgtype.Date{}
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return pgtype.Date{}
	}
	return pgtype.Date{Time: t, Valid: true}
}

func parseNumeric(s string) (pgtype.Numeric, error) {
	var n pgtype.Numeric
	if err := n.Scan(s); err != nil {
		return pgtype.Numeric{}, err
	}
	return n, nil
}

// parseOptionalNumeric — para montos opcionales (nil o "" → NULL).
func parseOptionalNumeric(s *string) (pgtype.Numeric, error) {
	if s == nil || *s == "" {
		return pgtype.Numeric{}, nil
	}
	return parseNumeric(*s)
}

// numericToStringPtr — monto opcional: string exacto de la BD o nil si es NULL.
func numericToStringPtr(n pgtype.Numeric) *string {
	if !n.Valid {
		return nil
	}
	v, err := n.Value()
	if err != nil || v == nil {
		return nil
	}
	s := v.(string)
	return &s
}

func parseOptionalUUID(s string) (pgtype.UUID, error) {
	if s == "" {
		return pgtype.UUID{}, nil
	}
	var uid pgtype.UUID
	if err := uid.Scan(s); err != nil {
		return pgtype.UUID{}, err
	}
	return uid, nil
}

// numericToString — para valores monetarios. Devuelve el string exacto de la BD
// sin pasar por float64 (preserva precisión). Política: precios → string.
func numericToString(n pgtype.Numeric) string {
	if !n.Valid {
		return "0.00"
	}
	v, err := n.Value()
	if err != nil || v == nil {
		return "0.00"
	}
	return v.(string)
}

// numericToFloat64Ptr — para notas (NUMERIC(4,2), rango 0-10). float64 representa
// exacto en ese rango. Política: notas → number. NULL queda como nil (no 0).
func numericToFloat64Ptr(n pgtype.Numeric) *float64 {
	if !n.Valid {
		return nil
	}
	v, err := n.Value()
	if err != nil || v == nil {
		return nil
	}
	var f float64
	fmt.Sscanf(v.(string), "%f", &f)
	return &f
}

func numericToFloat64(n pgtype.Numeric) float64 {
	p := numericToFloat64Ptr(n)
	if p == nil {
		return 0
	}
	return *p
}

func float64PtrToNumeric(f *float64) pgtype.Numeric {
	if f == nil {
		return pgtype.Numeric{}
	}
	var n pgtype.Numeric
	n.Scan(fmt.Sprintf("%.2f", *f))
	return n
}

func int4ToIntPtr(n pgtype.Int4) *int {
	if !n.Valid {
		return nil
	}
	v := int(n.Int32)
	return &v
}

func intPtrToInt4(n *int) pgtype.Int4 {
	if n == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*n), Valid: true}
}

// timeToString convierte un pgtype.Time (microsegundos desde medianoche) a "HH:MM".
func timeToString(t pgtype.Time) string {
	if !t.Valid {
		return ""
	}
	totalSec := t.Microseconds / 1_000_000
	return fmt.Sprintf("%02d:%02d", totalSec/3600, (totalSec%3600)/60)
}

// parseTimeOfDay convierte "HH:MM" a pgtype.Time. String vacío o inválido → NULL.
func parseTimeOfDay(s string) pgtype.Time {
	if s == "" {
		return pgtype.Time{}
	}
	var h, m int
	if _, err := fmt.Sscanf(s, "%d:%d", &h, &m); err != nil {
		return pgtype.Time{}
	}
	if h < 0 || h > 23 || m < 0 || m > 59 {
		return pgtype.Time{}
	}
	return pgtype.Time{Microseconds: int64(h*3600+m*60) * 1_000_000, Valid: true}
}

// addMoney suma dos montos monetarios (strings de NUMERIC) con precisión exacta
// usando big.Rat — sin pasar por float64. Devuelve 2 decimales.
func addMoney(a, b string) string {
	ra, okA := new(big.Rat).SetString(a)
	rb, okB := new(big.Rat).SetString(b)
	if !okA || !okB {
		return "0.00"
	}
	return new(big.Rat).Add(ra, rb).FloatString(2)
}

// isPositiveMoney valida que un string represente un monto > 0.
func isPositiveMoney(s string) bool {
	r, ok := new(big.Rat).SetString(s)
	return ok && r.Sign() > 0
}

// validateLateFeeValue valida el recargo: >= 0 siempre, y <= 100 si es porcentaje
// (un recargo porcentual > 100% no tiene sentido económico y previene tipeos).
func validateLateFeeValue(value, kind string) error {
	r, ok := new(big.Rat).SetString(value)
	if !ok || r.Sign() < 0 {
		return apperror.New(apperror.ErrBadRequest, "late_fee_value debe ser un número >= 0", "INVALID_LATE_FEE")
	}
	if kind == "porcentaje" && r.Cmp(big.NewRat(100, 1)) > 0 {
		return apperror.New(apperror.ErrBadRequest, "late_fee_value como porcentaje no puede superar 100", "INVALID_LATE_FEE")
	}
	return nil
}

// dedupeMonths valida que cada mes esté en 1-12 y que no haya duplicados.
func dedupeMonths(months []int) ([]int32, error) {
	seen := make(map[int]struct{}, len(months))
	out := make([]int32, 0, len(months))
	for _, m := range months {
		if m < 1 || m > 12 {
			return nil, apperror.New(apperror.ErrBadRequest, "no_payment_months debe contener meses entre 1 y 12", "INVALID_MONTHS")
		}
		if _, dup := seen[m]; dup {
			return nil, apperror.New(apperror.ErrBadRequest, "no_payment_months no puede tener meses duplicados", "INVALID_MONTHS")
		}
		seen[m] = struct{}{}
		out = append(out, int32(m))
	}
	return out, nil
}

// ── errores de PostgreSQL ─────────────────────────────────────────

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// ── autorización transversal ──────────────────────────────────────

// verifyCourseOwnership valida que el curso pertenezca al docente.
// Devuelve 403 tanto si el curso no existe como si no le pertenece
// (no se revela al cliente si el curso existe).
func verifyCourseOwnership(ctx context.Context, q *dbsqlc.Queries, courseID pgtype.UUID, teacherID string) error {
	var tid pgtype.UUID
	if err := tid.Scan(teacherID); err != nil {
		return apperror.ErrForbidden
	}
	ownerID, err := q.GetCourseTeacherID(ctx, courseID)
	if err != nil || ownerID != tid {
		return apperror.New(apperror.ErrForbidden, "no tenés acceso a este curso", "COURSE_NOT_YOURS")
	}
	return nil
}

// ensureOwnership valida que un recurso (cuyo dueño ya fue cargado) pertenezca
// al solicitante. Genérico: recibe el ownerID ya obtenido, no re-consulta la BD.
func ensureOwnership(ownerID pgtype.UUID, requesterID string) error {
	var rid pgtype.UUID
	if err := rid.Scan(requesterID); err != nil {
		return apperror.ErrForbidden
	}
	if ownerID != rid {
		return apperror.New(apperror.ErrForbidden, "no tenés acceso a este recurso", "NOT_YOURS")
	}
	return nil
}

// userCourseIDs devuelve los course_id que "toca" un usuario según su rol:
// alumno → inscripciones activas; docente → cursos asignados; admin → nil
// (el caller interpreta nil como "sin filtro / todos"). Compartido por el
// calendario y las notificaciones para filtrar por audiencia de curso.
func userCourseIDs(ctx context.Context, q *dbsqlc.Queries, userID, role string) ([]pgtype.UUID, error) {
	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		return nil, apperror.ErrBadRequest
	}
	switch role {
	case "student":
		return q.GetActiveCourseIDsForStudent(ctx, uid)
	case "teacher":
		return q.GetCourseIDsForTeacher(ctx, uid)
	default:
		return nil, nil
	}
}
