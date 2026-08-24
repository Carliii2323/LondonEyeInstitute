package services

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"

	"sge-london-eye/internal/config"
	dbsqlc "sge-london-eye/internal/db/sqlc"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// testPool es el pool contra la BD de test. nil si TEST_DATABASE_URL no está
// seteada → los tests de integración hacen Skip (los unit tests puros corren igual).
var testPool *pgxpool.Pool

func TestMain(m *testing.M) {
	dsn := os.Getenv("TEST_DATABASE_URL")

	// Salvaguarda: nunca correr contra una BD que no sea claramente de test.
	if dsn != "" && strings.Contains(strings.ToLower(dsn), "test") {
		// El schema (incluidos los ENUMs) se crea UNA vez con una conexión
		// dedicada, ANTES de abrir el pool. Así el pool cachea los OIDs de los
		// tipos ya estables y se evita "cache lookup failed for type" que ocurre
		// si se dropea/recrea el schema con conexiones del pool ya abiertas.
		if err := setupSchema(dsn); err != nil {
			fmt.Fprintf(os.Stderr, "setup schema de test: %v\n", err)
			os.Exit(1)
		}
		pool, err := pgxpool.New(context.Background(), dsn)
		if err == nil {
			testPool = pool
			defer pool.Close()
		}
	}

	os.Exit(m.Run())
}

func setupSchema(dsn string) error {
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return err
	}
	defer conn.Close(ctx)

	if _, err := conn.Exec(ctx, "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"); err != nil {
		return err
	}
	for _, f := range []string{
		"../../migrations/001_init_schema.up.sql",
		"../../migrations/002_add_grade_grace_days.up.sql",
		"../../migrations/003_late_fee_percentage_check.up.sql",
		"../../migrations/004_simplify_grades.up.sql",
		"../../migrations/005_certificate_hours.up.sql",
		"../../migrations/006_libreta_requests.up.sql",
		"../../migrations/007_payment_anulado.up.sql",
		"../../migrations/008_payment_derechos.up.sql",
		"../../migrations/009_payment_method.up.sql",
		"../../migrations/010_course_derechos.up.sql",
		"../../migrations/011_course_classroom.up.sql",
		"../../migrations/012_student_birthdate.up.sql",
		"../../migrations/013_email_verification.up.sql",
		"../../migrations/014_inbound_receipts.up.sql",
		"../../migrations/015_inbound_detected_fields.up.sql",
		"../../migrations/016_student_dni_files.up.sql",
	} {
		sql, err := os.ReadFile(f)
		if err != nil {
			return err
		}
		if _, err := conn.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("%s: %w", f, err)
		}
	}
	return nil
}

// requireDB salta el test si no hay BD de test configurada.
func requireDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	if testPool == nil {
		t.Skip("TEST_DATABASE_URL no seteada (o no contiene 'test'); se omiten los tests de integración")
	}
	return testPool
}

// cleanTables deja las tablas de datos vacías sin tocar los ENUMs/tablas
// (OIDs estables → sin cache miss). Restaura la fila única de institute_settings
// con sus valores por defecto. Se llama al inicio de cada test de integración.
func cleanTables(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		TRUNCATE users, students, teachers, courses, enrollments,
			attendance_sessions, attendance_records, grades, grade_makeups,
			payments, calendar_events, notifications, certificates,
			refresh_tokens, institute_settings RESTART IDENTITY CASCADE;
		INSERT INTO institute_settings (id) VALUES (1);`)
	if err != nil {
		t.Fatalf("clean tables: %v", err)
	}
}

// testConfig — config mínima para construir services en los tests.
func testConfig() *config.Config {
	return &config.Config{
		JWTSecret:              "test-secret",
		JWTExpiryMinutes:       15,
		RefreshTokenExpiryDays: 7,
	}
}

// ── helpers de seeding ────────────────────────────────────────────

func seedStudent(t *testing.T, pool *pgxpool.Pool, email, dni string) string {
	t.Helper()
	ctx := context.Background()
	q := dbsqlc.New(pool)

	user, err := q.CreateUser(ctx, dbsqlc.CreateUserParams{
		Email:        email,
		PasswordHash: "seed-hash",
		Role:         dbsqlc.UserRoleStudent,
		FirstName:    "Test",
		LastName:     "Student",
		Status:       dbsqlc.UserStatusActive,
	})
	if err != nil {
		t.Fatalf("seed user (student): %v", err)
	}
	if err := q.CreateStudent(ctx, dbsqlc.CreateStudentParams{ID: user.ID, Dni: dni}); err != nil {
		t.Fatalf("seed student: %v", err)
	}
	return uuidToString(user.ID)
}

func seedCourse(t *testing.T, pool *pgxpool.Pool, name string, capacity int32, price string) string {
	t.Helper()
	ctx := context.Background()
	q := dbsqlc.New(pool)

	p, err := parseNumeric(price)
	if err != nil {
		t.Fatalf("seed course price: %v", err)
	}
	course, err := q.CreateCourse(ctx, dbsqlc.CreateCourseParams{
		Name:         name,
		Level:        dbsqlc.CourseLevelINTERMEDIO,
		Schedule:     "Lun-Mie 18:00",
		PriceMonthly: p,
		Capacity:     capacity,
		Status:       dbsqlc.CourseStatusActivo,
	})
	if err != nil {
		t.Fatalf("seed course: %v", err)
	}
	return uuidToString(course.ID)
}

// mustUUID parsea un UUID o falla el test.
func mustUUID(t *testing.T, s string) pgtype.UUID {
	t.Helper()
	var u pgtype.UUID
	if err := u.Scan(s); err != nil {
		t.Fatalf("uuid inválido %q: %v", s, err)
	}
	return u
}
