package services

import (
	"context"
	"errors"
	"testing"
	"time"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"
	"sge-london-eye/internal/storage"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// 1. Lock-order / cupo de inscripciones: el FOR UPDATE garantiza que un curso
//    con capacity=1 no admita un segundo alumno.
func TestEnrollment_CupoLleno(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	svc := NewEnrollmentService(pool)
	courseID := seedCourse(t, pool, "Curso cupo 1", 1, "8000.00")
	s1 := seedStudent(t, pool, "a@test.com", "111")
	s2 := seedStudent(t, pool, "b@test.com", "222")

	// Primer alumno entra
	if _, err := svc.Enroll(ctx, dto.EnrollRequest{StudentID: s1, CourseID: courseID}); err != nil {
		t.Fatalf("primera inscripción debería pasar: %v", err)
	}

	// Segundo alumno: curso lleno
	_, err := svc.Enroll(ctx, dto.EnrollRequest{StudentID: s2, CourseID: courseID})
	if err == nil {
		t.Fatal("la segunda inscripción debería fallar por cupo")
	}
	var appErr *apperror.AppError
	if !errors.As(err, &appErr) || appErr.Code != "COURSE_FULL" {
		t.Fatalf("se esperaba COURSE_FULL, se obtuvo: %v", err)
	}

	// El curso debe haber quedado en cupo_completo
	q := dbsqlc.New(pool)
	course, _ := q.GetCourseByID(ctx, mustUUID(t, courseID))
	if string(course.Status) != "cupo_completo" {
		t.Errorf("status del curso = %q; want cupo_completo", course.Status)
	}
}

// 2a. Idempotencia: GenerateMonthlyInvoices no duplica cuotas del mes.
func TestCron_GenerateMonthlyInvoices_Idempotente(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	// Asegurar que el mes actual NO esté en no_payment_months (ponemos solo un mes lejano)
	otherMonth := int32((int(time.Now().Month()) % 12) + 1)
	if _, err := pool.Exec(ctx, "UPDATE institute_settings SET no_payment_months = $1 WHERE id = 1", []int32{otherMonth}); err != nil {
		t.Fatalf("ajustar settings: %v", err)
	}

	courseID := seedCourse(t, pool, "Curso", 30, "5000.00")
	studentID := seedStudent(t, pool, "s@test.com", "999")
	NewEnrollmentService(pool).Enroll(ctx, dto.EnrollRequest{StudentID: studentID, CourseID: courseID})

	pay := NewPaymentService(pool, nil)

	// Primera corrida: el Enroll ya generó la cuota del mes, así que esta corrida
	// no debería crear otra (idempotencia con ON CONFLICT DO NOTHING).
	r1, err := pay.GenerateMonthlyInvoices(ctx)
	if err != nil {
		t.Fatalf("primera corrida: %v", err)
	}
	r2, err := pay.GenerateMonthlyInvoices(ctx)
	if err != nil {
		t.Fatalf("segunda corrida: %v", err)
	}
	if r2["invoices_created"].(int64) != 0 {
		t.Errorf("segunda corrida creó %v cuotas; want 0 (idempotente)", r2["invoices_created"])
	}
	_ = r1

	// Debe existir exactamente 1 cuota del mes para ese alumno/curso
	var count int
	now := time.Now()
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM payments WHERE student_id=$1 AND course_id=$2 AND type='cuota_mensual' AND month=$3 AND year=$4`,
		mustUUID(t, studentID), mustUUID(t, courseID), int32(now.Month()), int32(now.Year())).Scan(&count)
	if count != 1 {
		t.Errorf("cuotas del mes = %d; want 1", count)
	}
}

// 2b. Idempotencia: MarkOverduePayments no duplica el recargo.
func TestCron_MarkOverdue_Idempotente(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	courseID := seedCourse(t, pool, "Curso", 30, "10000.00")
	studentID := seedStudent(t, pool, "s@test.com", "999")

	// Cuota pending vencida (due_date viejo). late_fee 10% → 1000.00
	_, err := pool.Exec(ctx, `
		INSERT INTO payments (student_id, course_id, type, month, year, amount, due_date, status)
		VALUES ($1, $2, 'cuota_mensual', 1, 2026, 10000.00, '2026-01-01', 'pending')`,
		mustUUID(t, studentID), mustUUID(t, courseID))
	if err != nil {
		t.Fatalf("seed payment: %v", err)
	}

	pay := NewPaymentService(pool, nil)

	if _, err := pay.MarkOverduePayments(ctx); err != nil {
		t.Fatalf("primera corrida: %v", err)
	}
	r2, _ := pay.MarkOverduePayments(ctx)
	if r2["marked_overdue"].(int64) != 0 {
		t.Errorf("segunda corrida marcó %v; want 0 (ya overdue)", r2["marked_overdue"])
	}

	// El recargo debe ser 1000.00, no 2000.00
	var lateFee pgtype.Numeric
	pool.QueryRow(ctx, `SELECT late_fee_applied FROM payments WHERE student_id=$1`, mustUUID(t, studentID)).Scan(&lateFee)
	if got := numericToString(lateFee); got != "1000.00" {
		t.Errorf("late_fee_applied = %q; want 1000.00 (no duplicado)", got)
	}
}

// 3. Elegibilidad de certificados: cuotas impagas bloquean; todas approved habilita.
func TestCertificate_Elegibilidad(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	courseID := seedCourse(t, pool, "Curso", 30, "5000.00")
	studentID := seedStudent(t, pool, "s@test.com", "999")
	sid, cid := mustUUID(t, studentID), mustUUID(t, courseID)

	// Inscripción directa (sin pasar por Enroll, que generaría la cuota del mes
	// actual y metería ruido en este test de elegibilidad). Issue solo requiere
	// que exista inscripción.
	if _, err := pool.Exec(ctx, `INSERT INTO enrollments (student_id, course_id, status) VALUES ($1,$2,'active')`, sid, cid); err != nil {
		t.Fatalf("seed enrollment: %v", err)
	}

	// Sembrar exactamente 2 cuotas del año: una approved, una pending
	pool.Exec(ctx, `INSERT INTO payments (student_id,course_id,type,month,year,amount,due_date,status)
		VALUES ($1,$2,'cuota_mensual',3,2026,5000,'2026-03-10','approved')`, sid, cid)
	pool.Exec(ctx, `INSERT INTO payments (student_id,course_id,type,month,year,amount,due_date,status)
		VALUES ($1,$2,'cuota_mensual',4,2026,5000,'2026-04-10','pending')`, sid, cid)

	cert := NewCertificateService(pool)

	// Con una cuota pending → no elegible, con breakdown
	_, err := cert.Issue(ctx, dto.IssueCertificateRequest{StudentID: studentID, CourseID: courseID, Year: 2026}, "")
	var neErr *NotEligibleError
	if !errors.As(err, &neErr) {
		t.Fatalf("se esperaba NotEligibleError, se obtuvo: %v", err)
	}
	if neErr.UnpaidCount != 1 || neErr.ByStatus["pending"] != 1 {
		t.Errorf("breakdown = %+v; want unpaid_count=1, pending=1", neErr)
	}

	// Aprobar la pendiente → ahora elegible
	pool.Exec(ctx, `UPDATE payments SET status='approved' WHERE student_id=$1 AND month=4`, sid)
	detail, err := cert.Issue(ctx, dto.IssueCertificateRequest{StudentID: studentID, CourseID: courseID, Year: 2026}, "")
	if err != nil {
		t.Fatalf("debería emitir tras aprobar todas: %v", err)
	}
	if detail.Status != "issued" {
		t.Errorf("status del certificado = %q; want issued", detail.Status)
	}
}

// 4. Pago end-to-end: subir comprobante (submitted) → aprobar (approved).
func TestPayment_SubmitApprove(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	courseID := seedCourse(t, pool, "Curso", 30, "5000.00")
	studentID := seedStudent(t, pool, "s@test.com", "999")
	NewEnrollmentService(pool).Enroll(ctx, dto.EnrollRequest{StudentID: studentID, CourseID: courseID})

	// Cargo pending para subir comprobante
	var payID pgtype.UUID
	pool.QueryRow(ctx, `INSERT INTO payments (student_id,course_id,type,year,amount,due_date,status,observation)
		VALUES ($1,$2,'cargo_adicional',2026,3000,'2026-06-10','pending','material') RETURNING id`,
		mustUUID(t, studentID), mustUUID(t, courseID)).Scan(&payID)
	payIDStr := uuidToString(payID)

	store := storage.NewLocalStorage(t.TempDir(), "/uploads")
	pay := NewPaymentService(pool, store)

	// El alumno sube comprobante
	if err := pay.SubmitReceipt(ctx, payIDStr, studentID, []byte("contenido-pdf"), "comprobante.pdf"); err != nil {
		t.Fatalf("submit receipt: %v", err)
	}
	assertStatus(t, pool, payID, "submitted")

	// Ownership: otro alumno no puede subir comprobante a este pago
	other := seedStudent(t, pool, "otro@test.com", "888")
	err := pay.SubmitReceipt(ctx, payIDStr, other, []byte("x"), "x.pdf")
	var appErr *apperror.AppError
	if !errors.As(err, &appErr) || appErr.Code != "NOT_YOURS" {
		t.Fatalf("se esperaba NOT_YOURS por ownership, se obtuvo: %v", err)
	}

	// El admin aprueba
	if err := pay.Approve(ctx, payIDStr, studentID, ""); err != nil { // reviewerID cualquiera válido
		t.Fatalf("approve: %v", err)
	}
	assertStatus(t, pool, payID, "approved")

	// Re-aprobar (ya approved) → estado inválido
	err = pay.Approve(ctx, payIDStr, studentID, "")
	if !errors.As(err, &appErr) || appErr.Code != "PAYMENT_INVALID_STATE" {
		t.Fatalf("se esperaba PAYMENT_INVALID_STATE al re-aprobar, se obtuvo: %v", err)
	}
}

func assertStatus(t *testing.T, pool *pgxpool.Pool, id pgtype.UUID, want string) {
	t.Helper()
	var status string
	if err := pool.QueryRow(context.Background(),
		`SELECT status FROM payments WHERE id=$1`, id).Scan(&status); err != nil {
		t.Fatalf("leer status: %v", err)
	}
	if status != want {
		t.Errorf("status = %q; want %q", status, want)
	}
}

// 5. Notas end-to-end (B33): guardar (admin) → leer como admin y como alumno →
//    upsert idempotente → validaciones (nota fuera de rango, alumno no inscripto).
func TestGrades_SaveAndRead(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	courseID := seedCourse(t, pool, "Curso Notas", 30, "5000.00")
	studentID := seedStudent(t, pool, "g@test.com", "700")
	if _, err := pool.Exec(ctx, `INSERT INTO enrollments (student_id, course_id, status) VALUES ($1,$2,'active')`,
		mustUUID(t, studentID), mustUUID(t, courseID)); err != nil {
		t.Fatalf("seed enrollment: %v", err)
	}

	grades := NewGradeService(pool)
	year := 2026
	f := func(v float64) *float64 { return &v }

	// Guardar: term1 R/L/S/W = 8 y term2 = 6, + recuperatorio del term2.
	req := dto.SaveGradesRequest{
		CourseID: courseID,
		Year:     year,
		Grades: []dto.UpsertGradeItem{
			{StudentID: studentID, Term: 1, Reading: f(8), Listening: f(8), Speaking: f(8), Writing: f(8)},
			{StudentID: studentID, Term: 2, Reading: f(6), Listening: f(6), Speaking: f(6), Writing: f(6)},
		},
		Makeups: []dto.UpsertMakeupItem{
			{StudentID: studentID, Term: 2, Score: 9, TakenAt: "2026-12-15"},
		},
	}
	if err := grades.Save(ctx, req, "", "admin"); err != nil {
		t.Fatalf("save grades: %v", err)
	}

	// Leer como admin
	adminResp, err := grades.GetByCourseAndYear(ctx, courseID, year, "", "admin")
	if err != nil {
		t.Fatalf("get by course: %v", err)
	}
	if len(adminResp.Grades) != 2 {
		t.Fatalf("grades (admin) = %d; want 2", len(adminResp.Grades))
	}
	if len(adminResp.Makeups) != 1 {
		t.Fatalf("makeups (admin) = %d; want 1", len(adminResp.Makeups))
	}
	var term1 *dto.GradeRowDTO
	for i := range adminResp.Grades {
		if adminResp.Grades[i].Term == 1 {
			term1 = &adminResp.Grades[i]
		}
	}
	if term1 == nil || term1.Reading == nil || *term1.Reading != 8 {
		t.Errorf("term1 reading = %v; want 8", term1)
	}

	// Leer como alumno (incluye course_name)
	myResp, err := grades.GetMyGrades(ctx, studentID)
	if err != nil {
		t.Fatalf("get my grades: %v", err)
	}
	if len(myResp.Grades) != 2 {
		t.Errorf("grades (alumno) = %d; want 2", len(myResp.Grades))
	}
	if len(myResp.Makeups) != 1 {
		t.Errorf("makeups (alumno) = %d; want 1", len(myResp.Makeups))
	}
	if len(myResp.Grades) > 0 && myResp.Grades[0].CourseName != "Curso Notas" {
		t.Errorf("course_name (alumno) = %q; want Curso Notas", myResp.Grades[0].CourseName)
	}

	// Upsert idempotente: re-guardar term1 → sigue habiendo 2 filas de nota
	req2 := dto.SaveGradesRequest{
		CourseID: courseID, Year: year,
		Grades: []dto.UpsertGradeItem{
			{StudentID: studentID, Term: 1, Reading: f(10), Listening: f(10), Speaking: f(10), Writing: f(10)},
		},
	}
	if err := grades.Save(ctx, req2, "", "admin"); err != nil {
		t.Fatalf("save grades (upsert): %v", err)
	}
	adminResp2, _ := grades.GetByCourseAndYear(ctx, courseID, year, "", "admin")
	if len(adminResp2.Grades) != 2 {
		t.Errorf("tras upsert grades = %d; want 2 (no duplica)", len(adminResp2.Grades))
	}

	var appErr *apperror.AppError

	// Nota fuera de rango (> 10) → INVALID_SCORE
	reqBad := dto.SaveGradesRequest{
		CourseID: courseID, Year: year,
		Grades: []dto.UpsertGradeItem{{StudentID: studentID, Term: 1, Reading: f(11)}},
	}
	if err := grades.Save(ctx, reqBad, "", "admin"); !errors.As(err, &appErr) || appErr.Code != "INVALID_SCORE" {
		t.Errorf("se esperaba INVALID_SCORE, se obtuvo: %v", err)
	}

	// Alumno no inscripto → NOT_ENROLLED
	otherStudent := seedStudent(t, pool, "h@test.com", "701")
	reqNotEnrolled := dto.SaveGradesRequest{
		CourseID: courseID, Year: year,
		Grades: []dto.UpsertGradeItem{{StudentID: otherStudent, Term: 1, Reading: f(7)}},
	}
	if err := grades.Save(ctx, reqNotEnrolled, "", "admin"); !errors.As(err, &appErr) || appErr.Code != "NOT_ENROLLED" {
		t.Errorf("se esperaba NOT_ENROLLED, se obtuvo: %v", err)
	}
}
