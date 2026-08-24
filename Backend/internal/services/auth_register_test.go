package services

import (
	"context"
	"errors"
	"testing"
	"time"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"
	"sge-london-eye/internal/mailer"
	"sge-london-eye/internal/storage"
)

// newAuthSvcForTest arma un AuthService con storage aislado en un tempdir del
// test (STORAGE_PATH separado, nunca el de dev) y el LogSender (no envía mails).
func newAuthSvcForTest(t *testing.T) (*AuthService, storage.Storage) {
	t.Helper()
	pool := requireDB(t)
	st := storage.NewLocalStorage(t.TempDir(), "/uploads")
	return NewAuthService(pool, testConfig(), mailer.New(testConfig()), st), st
}

func yearsAgoISO(years int) string {
	return time.Now().AddDate(-years, 0, 0).Format("2006-01-02")
}

// Registro completo de un adulto: crea el usuario (pending), el estudiante con
// todos los datos y guarda el frente del DNI en storage + la url en la fila.
func TestRegister_AdultoCompleto(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	svc, st := newAuthSvcForTest(t)
	ctx := context.Background()

	req := dto.RegisterRequest{
		Email:     "adulto@test.com",
		Password:  "clave1234",
		FirstName: "Ana",
		LastName:  "Gomez",
		DNI:       "30111222",
		Phone:     "+54 9 261 555 0001",
		BirthDate: yearsAgoISO(25),
		Address:   "Av. San Martin 100, Mendoza",
	}
	dniFront := []byte("bytes-simulados-del-frente-del-dni")

	if err := svc.Register(ctx, req, dniFront, ".jpg"); err != nil {
		t.Fatalf("registro de adulto debería pasar: %v", err)
	}

	q := dbsqlc.New(pool)
	user, err := q.GetUserByEmail(ctx, req.Email)
	if err != nil {
		t.Fatalf("el usuario no se creó: %v", err)
	}
	if user.Status != dbsqlc.UserStatusPending {
		t.Fatalf("el usuario debería quedar pending, quedó %q", user.Status)
	}

	stu, err := q.GetStudentByID(ctx, user.ID)
	if err != nil {
		t.Fatalf("el estudiante no se creó: %v", err)
	}
	if stu.Address.String != req.Address {
		t.Fatalf("address = %q, se esperaba %q", stu.Address.String, req.Address)
	}
	if !stu.BirthDate.Valid {
		t.Fatal("birth_date debería estar seteada")
	}
	if !stu.DniFrontUrl.Valid || stu.DniFrontUrl.String == "" {
		t.Fatal("dni_front_url debería estar seteada")
	}

	// El archivo del DNI debe existir en storage con esos bytes.
	data, err := st.Read(ctx, stu.DniFrontUrl.String)
	if err != nil {
		t.Fatalf("el archivo del DNI no se guardó: %v", err)
	}
	if string(data) != string(dniFront) {
		t.Fatal("el contenido del DNI guardado no coincide")
	}
}

// Un menor sin datos del tutor debe ser rechazado (TUTOR_REQUIRED) y no dejar
// ni usuario ni archivo huérfano.
func TestRegister_MenorSinTutor(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	svc, _ := newAuthSvcForTest(t)
	ctx := context.Background()

	req := dto.RegisterRequest{
		Email:     "menor@test.com",
		Password:  "clave1234",
		FirstName: "Tomas",
		LastName:  "Ruiz",
		DNI:       "50111222",
		Phone:     "+54 9 261 555 0002",
		BirthDate: yearsAgoISO(15),
		Address:   "Calle Falsa 123",
	}

	err := svc.Register(ctx, req, []byte("dni"), ".jpg")
	var appErr *apperror.AppError
	if !errors.As(err, &appErr) || appErr.Code != "TUTOR_REQUIRED" {
		t.Fatalf("se esperaba TUTOR_REQUIRED, se obtuvo %v", err)
	}

	q := dbsqlc.New(pool)
	if _, err := q.GetUserByEmail(ctx, req.Email); err == nil {
		t.Fatal("no debería haberse creado el usuario del menor sin tutor")
	}
}

// Un menor CON datos del tutor sí se registra.
func TestRegister_MenorConTutor(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	svc, _ := newAuthSvcForTest(t)
	ctx := context.Background()

	req := dto.RegisterRequest{
		Email:      "menortutor@test.com",
		Password:   "clave1234",
		FirstName:  "Lucia",
		LastName:   "Diaz",
		DNI:        "50333444",
		Phone:      "+54 9 261 555 0003",
		BirthDate:  yearsAgoISO(16),
		Address:    "Calle Real 456",
		TutorName:  "Marta Diaz",
		TutorPhone: "+54 9 261 555 9999",
	}

	if err := svc.Register(ctx, req, []byte("dni"), ".png"); err != nil {
		t.Fatalf("un menor con tutor debería registrarse: %v", err)
	}

	q := dbsqlc.New(pool)
	user, err := q.GetUserByEmail(ctx, req.Email)
	if err != nil {
		t.Fatalf("el usuario no se creó: %v", err)
	}
	stu, err := q.GetStudentByID(ctx, user.ID)
	if err != nil {
		t.Fatalf("el estudiante no se creó: %v", err)
	}
	if stu.TutorName.String != req.TutorName {
		t.Fatalf("tutor_name = %q, se esperaba %q", stu.TutorName.String, req.TutorName)
	}
}

// Fecha de nacimiento futura → INVALID_BIRTHDATE.
func TestRegister_FechaFutura(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	svc, _ := newAuthSvcForTest(t)
	ctx := context.Background()

	req := dto.RegisterRequest{
		Email:     "futuro@test.com",
		Password:  "clave1234",
		FirstName: "Nico",
		LastName:  "Sosa",
		DNI:       "40555666",
		Phone:     "+54 9 261 555 0004",
		BirthDate: time.Now().AddDate(1, 0, 0).Format("2006-01-02"),
		Address:   "Calle 1",
	}

	err := svc.Register(ctx, req, []byte("dni"), ".jpg")
	var appErr *apperror.AppError
	if !errors.As(err, &appErr) || appErr.Code != "INVALID_BIRTHDATE" {
		t.Fatalf("se esperaba INVALID_BIRTHDATE, se obtuvo %v", err)
	}
}

// Email duplicado → EMAIL_TAKEN.
func TestRegister_EmailDuplicado(t *testing.T) {
	pool := requireDB(t)
	cleanTables(t, pool)
	svc, _ := newAuthSvcForTest(t)
	ctx := context.Background()

	req := dto.RegisterRequest{
		Email:     "dup@test.com",
		Password:  "clave1234",
		FirstName: "Ivan",
		LastName:  "Paz",
		DNI:       "40777888",
		Phone:     "+54 9 261 555 0005",
		BirthDate: yearsAgoISO(30),
		Address:   "Calle 2",
	}
	if err := svc.Register(ctx, req, []byte("dni"), ".jpg"); err != nil {
		t.Fatalf("primer registro debería pasar: %v", err)
	}

	req.DNI = "40777889" // otro DNI, mismo email
	err := svc.Register(ctx, req, []byte("dni"), ".jpg")
	var appErr *apperror.AppError
	if !errors.As(err, &appErr) || appErr.Code != "EMAIL_TAKEN" {
		t.Fatalf("se esperaba EMAIL_TAKEN, se obtuvo %v", err)
	}
}
