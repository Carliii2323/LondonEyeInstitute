package services

import (
	"context"
	"errors"
	"log"
	"path/filepath"

	"sge-london-eye/internal/auth"
	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"
	"sge-london-eye/internal/storage"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProfileService struct {
	pool    *pgxpool.Pool
	storage storage.Storage
}

func NewProfileService(pool *pgxpool.Pool, s storage.Storage) *ProfileService {
	return &ProfileService{pool: pool, storage: s}
}

func (s *ProfileService) GetProfile(ctx context.Context, userID string) (*dto.UserInfo, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	user, err := q.GetUserByID(ctx, uid)
	if err != nil {
		return nil, apperror.ErrNotFound
	}

	info := userToDTO(user)
	return &info, nil
}

func (s *ProfileService) UpdateProfile(ctx context.Context, userID string, req dto.UpdateProfileRequest) (*dto.UserInfo, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	phone := pgtype.Text{}
	if req.Phone != "" {
		phone = pgtype.Text{String: req.Phone, Valid: true}
	}

	user, err := q.UpdateUserProfile(ctx, dbsqlc.UpdateUserProfileParams{
		ID:        uid,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     phone,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrNotFound
		}
		return nil, apperror.ErrInternal
	}

	info := userToDTO(user)
	return &info, nil
}

func (s *ProfileService) ChangePassword(ctx context.Context, userID string, req dto.ChangePasswordRequest) error {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		return apperror.ErrBadRequest
	}

	user, err := q.GetUserByID(ctx, uid)
	if err != nil {
		return apperror.ErrNotFound
	}

	if !auth.CheckPassword(req.CurrentPassword, user.PasswordHash) {
		return apperror.ErrInvalidCredentials
	}

	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		return apperror.ErrInternal
	}

	if err := q.UpdateUserPassword(ctx, dbsqlc.UpdateUserPasswordParams{
		ID:           uid,
		PasswordHash: newHash,
	}); err != nil {
		return apperror.ErrInternal
	}

	if err := q.RevokeAllUserTokens(ctx, uid); err != nil {
		log.Printf("warning: no se pudieron revocar tokens tras cambio de contraseña (user %s): %v", userID, err)
	}
	return nil
}

func (s *ProfileService) UpdateAvatar(ctx context.Context, userID string, fileData []byte, filename string) (*dto.UserInfo, error) {
	q := dbsqlc.New(s.pool)

	var uid pgtype.UUID
	if err := uid.Scan(userID); err != nil {
		return nil, apperror.ErrBadRequest
	}

	current, err := q.GetUserByID(ctx, uid)
	if err != nil {
		return nil, apperror.ErrNotFound
	}

	if current.AvatarUrl.Valid && current.AvatarUrl.String != "" {
		_ = s.storage.Delete(ctx, current.AvatarUrl.String)
	}

	ext := filepath.Ext(filename)
	destName := userID + ext

	avatarURL, err := s.storage.Save(ctx, "avatars", destName, fileData)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	user, err := q.UpdateUserAvatar(ctx, dbsqlc.UpdateUserAvatarParams{
		ID:        uid,
		AvatarUrl: pgtype.Text{String: avatarURL, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrNotFound
		}
		return nil, apperror.ErrInternal
	}

	info := userToDTO(user)
	return &info, nil
}
