package services

import (
	"context"
	"errors"
	"testing"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

/*
M5-03 — la baja logica de un curso no se deshace sola.

El enum tiene tres estados pero el recalculo contemplaba solo dos, asi que un
curso dado de baja volvia a 'activo' apenas alguien se inscribia o se daba de
baja. La regla vive ahora en nextCourseStatus(), y estos tests cubren los TRES
caminos que la usan, porque arreglar uno solo dejaba el bug vivo por los otros.
*/

func setCourseStatus(t *testing.T, pool *pgxpool.Pool, courseID string, status dbsqlc.CourseStatus) {
	t.Helper()
	err := dbsqlc.New(pool).UpdateCourseStatus(context.Background(), dbsqlc.UpdateCourseStatusParams{
		ID:     mustUUID(t, courseID),
		Status: status,
	})
	if err != nil {
		t.Fatalf("set status %s: %v", status, err)
	}
}

func courseStatus(t *testing.T, pool *pgxpool.Pool, courseID string) dbsqlc.CourseStatus {
	t.Helper()
	st, err := dbsqlc.New(pool).GetCourseStatus(context.Background(), mustUUID(t, courseID))
	if err != nil {
		t.Fatalf("leer status: %v", err)
	}
	return st
}

// Camino 1: un curso dado de baja no acepta inscripciones nuevas.
func TestCourseInactivo_RechazaInscripcion(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	courseID := seedCourse(t, pool, "Curso de baja", 10, "8000.00")
	studentID := seedStudent(t, pool, "inact1@test.com", "90000001")
	setCourseStatus(t, pool, courseID, dbsqlc.CourseStatusInactivo)

	_, err := NewEnrollmentService(pool).Enroll(ctx, dto.EnrollRequest{
		StudentID: studentID, CourseID: courseID,
	})

	var appErr *apperror.AppError
	if !errors.As(err, &appErr) || appErr.Code != "COURSE_INACTIVE" {
		t.Fatalf("se esperaba COURSE_INACTIVE, se obtuvo %v", err)
	}
	if got := courseStatus(t, pool, courseID); got != dbsqlc.CourseStatusInactivo {
		t.Fatalf("el curso quedó en %q, debía seguir inactivo", got)
	}
}

// Camino 2: dar de baja a un alumno no revive el curso.
func TestCourseInactivo_DropNoLoReactiva(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	svc := NewEnrollmentService(pool)
	courseID := seedCourse(t, pool, "Curso con alumnos", 10, "8000.00")
	studentID := seedStudent(t, pool, "inact2@test.com", "90000002")

	// Se inscribe mientras el curso esta activo (el caso real: el curso tenia
	// alumnos y despues se dio de baja).
	enr, err := svc.Enroll(ctx, dto.EnrollRequest{StudentID: studentID, CourseID: courseID})
	if err != nil {
		t.Fatalf("la inscripción inicial debía pasar: %v", err)
	}
	setCourseStatus(t, pool, courseID, dbsqlc.CourseStatusInactivo)

	if err := svc.Drop(ctx, enr.ID); err != nil {
		t.Fatalf("drop: %v", err)
	}

	if got := courseStatus(t, pool, courseID); got != dbsqlc.CourseStatusInactivo {
		t.Fatalf("el curso volvió a %q: la baja se deshizo sola (M5-03)", got)
	}
}

// Camino 3: cambiar la capacidad (recalcStatus) tampoco lo revive.
func TestCourseInactivo_RecalcNoLoReactiva(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	courseID := seedCourse(t, pool, "Curso de baja", 5, "8000.00")
	setCourseStatus(t, pool, courseID, dbsqlc.CourseStatusInactivo)

	if err := NewCourseService(pool).RecalcStatus(ctx, mustUUID(t, courseID), 20); err != nil {
		t.Fatalf("recalc: %v", err)
	}

	if got := courseStatus(t, pool, courseID); got != dbsqlc.CourseStatusInactivo {
		t.Fatalf("el curso volvió a %q al recalcular (M5-03)", got)
	}
}

// Regresion: en un curso ACTIVO el recalculo sigue funcionando como antes.
func TestCourseActivo_SigueMarcandoCupoCompleto(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	ctx := context.Background()

	svc := NewEnrollmentService(pool)
	courseID := seedCourse(t, pool, "Curso cupo 1", 1, "8000.00")
	studentID := seedStudent(t, pool, "act1@test.com", "90000003")

	if _, err := svc.Enroll(ctx, dto.EnrollRequest{StudentID: studentID, CourseID: courseID}); err != nil {
		t.Fatalf("inscripción: %v", err)
	}
	if got := courseStatus(t, pool, courseID); got != dbsqlc.CourseStatusCupoCompleto {
		t.Fatalf("status = %q, se esperaba cupo_completo", got)
	}
}
