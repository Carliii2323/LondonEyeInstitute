package services

import (
	"context"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsService struct {
	pool *pgxpool.Pool
}

func NewSettingsService(pool *pgxpool.Pool) *SettingsService {
	return &SettingsService{pool: pool}
}

func (s *SettingsService) Get(ctx context.Context) (*dto.SettingsResponse, error) {
	q := dbsqlc.New(s.pool)

	r, err := q.GetInstituteSettings(ctx)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	months := make([]int, len(r.NoPaymentMonths))
	for i, m := range r.NoPaymentMonths {
		months[i] = int(m)
	}

	return &dto.SettingsResponse{
		Name:                  r.Name,
		LegalName:             r.LegalName.String,
		Cuit:                  r.Cuit.String,
		Phone:                 r.Phone.String,
		Address:               r.Address.String,
		Email:                 r.Email.String,
		MonthlyDueDay:         r.MonthlyDueDay,
		GraceDays:             r.GraceDays,
		LateFeeKind:           string(r.LateFeeKind),
		LateFeeValue:          numericToString(r.LateFeeValue),
		NoPaymentMonths:       months,
		GradeGraceDaysJanuary: r.GradeGraceDaysJanuary,
		Cbu:                   r.Cbu.String,
		Alias:                 r.Alias.String,
		AccountHolder:         r.AccountHolder.String,
		UpdatedAt:             r.UpdatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}, nil
}

// GetPublic devuelve solo los datos que cualquier usuario autenticado puede ver
// (nombre del instituto + datos bancarios para transferencias).
func (s *SettingsService) GetPublic(ctx context.Context) (*dto.PublicSettings, error) {
	q := dbsqlc.New(s.pool)

	r, err := q.GetInstituteSettings(ctx)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	return &dto.PublicSettings{
		Name:          r.Name,
		Cbu:           r.Cbu.String,
		Alias:         r.Alias.String,
		AccountHolder: r.AccountHolder.String,
	}, nil
}

func (s *SettingsService) Update(ctx context.Context, req dto.UpdateSettingsRequest) error {
	q := dbsqlc.New(s.pool)

	// Validación de negocio (el CHECK de la BD es el último candado)
	if err := validateLateFeeValue(req.LateFeeValue, req.LateFeeKind); err != nil {
		return err
	}
	lateFee, err := parseNumeric(req.LateFeeValue)
	if err != nil {
		return apperror.New(apperror.ErrBadRequest, "late_fee_value inválido", "INVALID_LATE_FEE")
	}

	months, err := dedupeMonths(req.NoPaymentMonths)
	if err != nil {
		return err
	}

	return q.UpdateSettings(ctx, dbsqlc.UpdateSettingsParams{
		Name:                  req.Name,
		LegalName:             pgtype.Text{String: req.LegalName, Valid: req.LegalName != ""},
		Cuit:                  pgtype.Text{String: req.Cuit, Valid: req.Cuit != ""},
		Phone:                 pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
		Address:               pgtype.Text{String: req.Address, Valid: req.Address != ""},
		Email:                 pgtype.Text{String: req.Email, Valid: req.Email != ""},
		MonthlyDueDay:         int32(req.MonthlyDueDay),
		GraceDays:             int32(req.GraceDays),
		LateFeeKind:           dbsqlc.LateFeeKind(req.LateFeeKind),
		LateFeeValue:          lateFee,
		NoPaymentMonths:       months,
		GradeGraceDaysJanuary: int32(req.GradeGraceDaysJanuary),
		Cbu:                   pgtype.Text{String: req.Cbu, Valid: req.Cbu != ""},
		Alias:                 pgtype.Text{String: req.Alias, Valid: req.Alias != ""},
		AccountHolder:         pgtype.Text{String: req.AccountHolder, Valid: req.AccountHolder != ""},
	})
}
