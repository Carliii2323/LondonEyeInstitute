package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"time"

	"sge-london-eye/internal/auth"
	"sge-london-eye/internal/config"
	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthService struct {
	pool *pgxpool.Pool
	cfg  *config.Config
}

func NewAuthService(pool *pgxpool.Pool, cfg *config.Config) *AuthService {
	return &AuthService{pool: pool, cfg: cfg}
}

func (s *AuthService) Register(ctx context.Context, req dto.RegisterRequest) error {
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
		Address:    pgtype.Text{},
		TutorName:  pgtype.Text{},
		TutorPhone: pgtype.Text{},
	}); err != nil {
		if isUniqueViolation(err) {
			return apperror.New(apperror.ErrConflict, "el DNI ya está registrado", "DNI_TAKEN")
		}
		return apperror.New(apperror.ErrInternal, "error al crear el estudiante", "CREATE_STUDENT_ERROR")
	}

	return tx.Commit(ctx)
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
