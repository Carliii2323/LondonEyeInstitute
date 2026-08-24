package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"strings"
	"time"

	"sge-london-eye/internal/auth"
	"sge-london-eye/internal/config"
	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"
	"sge-london-eye/internal/mailer"
	"sge-london-eye/internal/storage"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// emailVerificationExpiry — vida útil del link de verificación de cuenta.
const emailVerificationExpiry = 48 * time.Hour

type AuthService struct {
	pool    *pgxpool.Pool
	cfg     *config.Config
	mailer  mailer.Sender
	storage storage.Storage
}

func NewAuthService(pool *pgxpool.Pool, cfg *config.Config, m mailer.Sender, st storage.Storage) *AuthService {
	return &AuthService{pool: pool, cfg: cfg, mailer: m, storage: st}
}

// Register — auto-registro del alumno con datos completos y el frente del DNI.
// dniFront/dniExt vienen validados por el handler (tipo/tamaño); dniExt es la
// extensión canónica derivada del tipo detectado (ej. ".jpg").
func (s *AuthService) Register(ctx context.Context, req dto.RegisterRequest, dniFront []byte, dniExt string) error {
	// Fecha de nacimiento: válida, no futura, no absurda (M5-12).
	bd, err := time.Parse("2006-01-02", req.BirthDate)
	if err != nil || bd.After(time.Now()) || bd.Year() < 1900 {
		return apperror.New(apperror.ErrBadRequest, "fecha de nacimiento inválida", "INVALID_BIRTHDATE")
	}
	// Menor de edad → tutor (nombre y teléfono) obligatorio.
	if isMinor(bd) && (strings.TrimSpace(req.TutorName) == "" || strings.TrimSpace(req.TutorPhone) == "") {
		return apperror.New(apperror.ErrBadRequest, "para un alumno menor de edad, el nombre y teléfono del tutor son obligatorios", "TUTOR_REQUIRED")
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error al procesar la contraseña", "HASH_ERROR")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error interno", "TX_ERROR")
	}
	defer tx.Rollback(ctx)

	q := dbsqlc.New(tx)

	user, err := q.CreateUser(ctx, dbsqlc.CreateUserParams{
		Email:        req.Email,
		PasswordHash: hash,
		Role:         dbsqlc.UserRoleStudent,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Phone:        pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
		Status:       dbsqlc.UserStatusPending,
	})
	if err != nil {
		if isUniqueViolation(err) {
			return apperror.New(apperror.ErrConflict, "el email ya está registrado", "EMAIL_TAKEN")
		}
		return apperror.New(apperror.ErrInternal, "error al crear el usuario", "CREATE_USER_ERROR")
	}

	if err := q.CreateStudent(ctx, dbsqlc.CreateStudentParams{
		ID:         user.ID,
		Dni:        req.DNI,
		Address:    pgtype.Text{String: req.Address, Valid: req.Address != ""},
		TutorName:  pgtype.Text{String: req.TutorName, Valid: req.TutorName != ""},
		TutorPhone: pgtype.Text{String: req.TutorPhone, Valid: req.TutorPhone != ""},
		BirthDate:  parseDate(req.BirthDate),
	}); err != nil {
		if isUniqueViolation(err) {
			return apperror.New(apperror.ErrConflict, "el DNI ya está registrado", "DNI_TAKEN")
		}
		return apperror.New(apperror.ErrInternal, "error al crear el estudiante", "CREATE_STUDENT_ERROR")
	}

	// Frente del DNI: guardar el archivo y setear la url (dentro de la tx).
	savedDniURL := ""
	if len(dniFront) > 0 {
		url, serr := s.storage.Save(ctx, "dni", uuidToString(user.ID)+"-front"+dniExt, dniFront)
		if serr != nil {
			return apperror.New(apperror.ErrInternal, "error al guardar el DNI", "STORAGE_ERROR")
		}
		savedDniURL = url
		if err := q.SetStudentDniFront(ctx, dbsqlc.SetStudentDniFrontParams{
			ID:          user.ID,
			DniFrontUrl: pgtype.Text{String: url, Valid: true},
		}); err != nil {
			_ = s.storage.Delete(ctx, url)
			return apperror.ErrInternal
		}
	}

	if err := tx.Commit(ctx); err != nil {
		if savedDniURL != "" {
			_ = s.storage.Delete(ctx, savedDniURL) // no dejar el archivo huérfano si no se confirmó
		}
		return apperror.New(apperror.ErrInternal, "error interno", "COMMIT_ERROR")
	}

	// Verificación de email (best-effort: no bloquea el registro si el mail falla).
	s.sendVerificationEmail(ctx, user.ID, req.Email, req.FirstName)
	return nil
}

// isMinor — true si la persona es menor de 18 años a la fecha de hoy.
func isMinor(birth time.Time) bool {
	now := time.Now()
	age := now.Year() - birth.Year()
	if now.Month() < birth.Month() || (now.Month() == birth.Month() && now.Day() < birth.Day()) {
		age--
	}
	return age < 18
}

// VerifyEmail valida el token del link y marca users.email_verified = true.
// No activa la cuenta: el admin sigue aprobando (email_verified es control aparte).
func (s *AuthService) VerifyEmail(ctx context.Context, rawToken string) error {
	if strings.TrimSpace(rawToken) == "" {
		return apperror.New(apperror.ErrBadRequest, "falta el token", "TOKEN_MISSING")
	}
	q := dbsqlc.New(s.pool)

	tok, err := q.GetEmailVerificationToken(ctx, hashToken(rawToken))
	if err != nil {
		return apperror.New(apperror.ErrBadRequest, "el link de verificación no es válido", "VERIFICATION_INVALID")
	}
	if tok.UsedAt.Valid {
		return apperror.New(apperror.ErrBadRequest, "este link ya fue usado", "VERIFICATION_USED")
	}
	if time.Now().After(tok.ExpiresAt.Time) {
		return apperror.New(apperror.ErrBadRequest, "el link de verificación expiró", "VERIFICATION_EXPIRED")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperror.ErrInternal
	}
	defer tx.Rollback(ctx)
	qtx := dbsqlc.New(tx)

	n, err := qtx.MarkEmailVerificationUsed(ctx, hashToken(rawToken))
	if err != nil {
		return apperror.ErrInternal
	}
	if n == 0 {
		// carrera: el token se usó entre el GET y el UPDATE
		return apperror.New(apperror.ErrBadRequest, "este link ya fue usado", "VERIFICATION_USED")
	}
	if err := qtx.SetUserEmailVerified(ctx, tok.UserID); err != nil {
		return apperror.ErrInternal
	}
	return tx.Commit(ctx)
}

// ResendVerification reenvía el mail de verificación. No revela si el email
// existe (responde OK igual) para no filtrar cuentas registradas.
func (s *AuthService) ResendVerification(ctx context.Context, email string) error {
	q := dbsqlc.New(s.pool)
	u, err := q.GetUserVerificationByEmail(ctx, email)
	if err != nil {
		return nil // email inexistente: no revelar
	}
	if u.EmailVerified {
		return nil // ya verificado: nada que reenviar
	}
	_ = q.DeleteUnusedEmailVerificationTokens(ctx, u.ID) // invalida links previos
	s.sendVerificationEmail(ctx, u.ID, email, u.FirstName)
	return nil
}

// sendVerificationEmail genera un token, lo persiste y manda el mail con el link.
// Best-effort: loguea y sigue si algo falla (el alumno puede pedir reenvío).
func (s *AuthService) sendVerificationEmail(ctx context.Context, userID pgtype.UUID, email, firstName string) {
	q := dbsqlc.New(s.pool)
	raw, hash := generateRefreshToken() // token opaco aleatorio (mismo esquema que el refresh)

	if err := q.CreateEmailVerificationToken(ctx, dbsqlc.CreateEmailVerificationTokenParams{
		UserID:    userID,
		TokenHash: hash,
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(emailVerificationExpiry), Valid: true},
	}); err != nil {
		log.Printf("[auth] no se pudo crear token de verificación (user %v): %v", userID, err)
		return
	}

	link := strings.TrimRight(s.cfg.AppURL, "/") + "/verificar-email?token=" + raw
	if err := s.mailer.Send(ctx, email, "Verifica tu cuenta - London Eye", verificationEmailHTML(firstName, link)); err != nil {
		log.Printf("[auth] no se pudo enviar email de verificación a %s: %v", email, err)
	}
}

func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest) (*dto.AuthResponse, error) {
	q := dbsqlc.New(s.pool)

	user, err := q.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, apperror.New(apperror.ErrInvalidCredentials, "credenciales inválidas", "INVALID_CREDENTIALS")
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		return nil, apperror.New(apperror.ErrInvalidCredentials, "credenciales inválidas", "INVALID_CREDENTIALS")
	}

	if user.Status != dbsqlc.UserStatusActive {
		return nil, apperror.New(apperror.ErrForbidden, "cuenta pendiente de aprobación", "ACCOUNT_NOT_ACTIVE")
	}

	userID := uuidToString(user.ID)

	accessToken, err := auth.GenerateJWT(userID, string(user.Role), s.cfg.JWTSecret, s.cfg.JWTExpiryMinutes)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al generar el token", "TOKEN_ERROR")
	}

	rawToken, tokenHash := generateRefreshToken()
	expiresAt := time.Now().Add(time.Duration(s.cfg.RefreshTokenExpiryDays) * 24 * time.Hour)

	if err := q.CreateRefreshToken(ctx, dbsqlc.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	}); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al guardar el token", "TOKEN_SAVE_ERROR")
	}

	const maxActiveSessions = 5
	_ = q.RevokeExcessUserTokens(ctx, dbsqlc.RevokeExcessUserTokensParams{
		UserID: user.ID,
		Limit:  maxActiveSessions,
	})

	return buildAuthResponse(accessToken, rawToken, user), nil
}

func (s *AuthService) Refresh(ctx context.Context, rawToken string) (*dto.AuthResponse, error) {
	q := dbsqlc.New(s.pool)
	tokenHash := hashToken(rawToken)

	stored, err := q.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		log.Printf("[auth] refresh token no encontrado: %v", err)
		return nil, apperror.New(apperror.ErrUnauthorized, "token inválido o expirado", "INVALID_TOKEN")
	}
	if stored.RevokedAt.Valid {
		log.Printf("[auth] intento de uso de refresh token revocado (user_id: %v)", stored.UserID)
		return nil, apperror.New(apperror.ErrUnauthorized, "token inválido o expirado", "INVALID_TOKEN")
	}
	if time.Now().After(stored.ExpiresAt.Time) {
		log.Printf("[auth] refresh token expirado (user_id: %v)", stored.UserID)
		return nil, apperror.New(apperror.ErrUnauthorized, "token inválido o expirado", "INVALID_TOKEN")
	}

	if n, err := q.RevokeRefreshToken(ctx, tokenHash); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error interno", "REVOKE_ERROR")
	} else if n == 0 {
		return nil, apperror.New(apperror.ErrUnauthorized, "token inválido", "INVALID_TOKEN")
	}

	user, err := q.GetUserByID(ctx, stored.UserID)
	if err != nil {
		return nil, apperror.New(apperror.ErrUnauthorized, "usuario no encontrado", "USER_NOT_FOUND")
	}

	if user.Status != dbsqlc.UserStatusActive {
		return nil, apperror.New(apperror.ErrForbidden, "cuenta inactiva", "ACCOUNT_NOT_ACTIVE")
	}

	userID := uuidToString(user.ID)
	accessToken, err := auth.GenerateJWT(userID, string(user.Role), s.cfg.JWTSecret, s.cfg.JWTExpiryMinutes)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al generar el token", "TOKEN_ERROR")
	}

	newRaw, newHash := generateRefreshToken()
	expiresAt := time.Now().Add(time.Duration(s.cfg.RefreshTokenExpiryDays) * 24 * time.Hour)

	if err := q.CreateRefreshToken(ctx, dbsqlc.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: newHash,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	}); err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al guardar el token", "TOKEN_SAVE_ERROR")
	}

	return buildAuthResponse(accessToken, newRaw, user), nil
}

func (s *AuthService) Logout(ctx context.Context, rawToken string) error {
	q := dbsqlc.New(s.pool)
	n, err := q.RevokeRefreshToken(ctx, hashToken(rawToken))
	if err != nil {
		return apperror.New(apperror.ErrInternal, "error interno", "REVOKE_ERROR")
	}
	if n == 0 {
		return apperror.New(apperror.ErrUnauthorized, "token inválido", "INVALID_TOKEN")
	}
	return nil
}

// CleanupExpiredTokens borra refresh tokens expirados o revocados (job de cron).
func (s *AuthService) CleanupExpiredTokens(ctx context.Context) (map[string]any, error) {
	q := dbsqlc.New(s.pool)
	n, err := q.DeleteExpiredTokens(ctx)
	if err != nil {
		return nil, apperror.New(apperror.ErrInternal, "error al limpiar tokens", "CLEANUP_ERROR")
	}
	return map[string]any{"tokens_deleted": n}, nil
}

func (s *AuthService) Me(ctx context.Context, userID string) (*dto.UserInfo, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		return nil, apperror.New(apperror.ErrBadRequest, "ID inválido", "INVALID_ID")
	}

	user, err := q.GetUserByID(ctx, uid)
	if err != nil {
		return nil, apperror.New(apperror.ErrNotFound, "usuario no encontrado", "USER_NOT_FOUND")
	}

	info := userToDTO(user)
	return &info, nil
}

// ── helpers privados ──────────────────────────────────────────────

func generateRefreshToken() (raw, hash string) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic("no hay entropía del sistema: " + err.Error())
	}
	raw = hex.EncodeToString(b)
	hash = hashToken(raw)
	return
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// verificationEmailHTML arma el cuerpo HTML del mail de verificación de cuenta.
func verificationEmailHTML(firstName, link string) string {
	name := strings.TrimSpace(firstName)
	if name == "" {
		name = "Hola"
	} else {
		name = "Hola " + name
	}
	return fmt.Sprintf(`<!doctype html>
<html lang="es">
<body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2733;">
  <div style="max-width:480px;margin:24px auto;background:#ffffff;border-radius:12px;padding:32px;">
    <h1 style="font-size:20px;margin:0 0 16px;color:#1e3a8a;">London Eye</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">%s,</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
      Recibimos tu solicitud de registro. Para confirmar que este correo es tuyo,
      hac&eacute; clic en el bot&oacute;n. Luego un administrador aprobar&aacute; tu cuenta.
    </p>
    <p style="text-align:center;margin:0 0 24px;">
      <a href="%s" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:bold;">Verificar mi cuenta</a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#64748b;margin:0 0 8px;">
      Si el bot&oacute;n no funciona, copi&aacute; y peg&aacute; este enlace en tu navegador:
    </p>
    <p style="font-size:13px;word-break:break-all;color:#1e40af;margin:0 0 24px;">%s</p>
    <p style="font-size:12px;color:#94a3b8;margin:0;">El enlace vence en 48 horas. Si no te registraste, ignor&aacute; este correo.</p>
  </div>
</body>
</html>`, name, link, link)
}

func userToDTO(u dbsqlc.User) dto.UserInfo {
	return dto.UserInfo{
		ID:        uuidToString(u.ID),
		Email:     u.Email,
		Role:      string(u.Role),
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Phone:     u.Phone.String,
		AvatarURL: u.AvatarUrl.String,
		Status:    string(u.Status),
	}
}

func buildAuthResponse(accessToken, refreshToken string, u dbsqlc.User) *dto.AuthResponse {
	info := userToDTO(u)
	return &dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         info,
	}
}
