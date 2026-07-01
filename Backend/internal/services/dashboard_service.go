package services

import (
	"context"
	"fmt"
	"sort"
	"time"

	dbsqlc "sge-london-eye/internal/db/sqlc"
	"sge-london-eye/internal/dto"
	apperror "sge-london-eye/internal/errors"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardService struct {
	pool *pgxpool.Pool
}

func NewDashboardService(pool *pgxpool.Pool) *DashboardService {
	return &DashboardService{pool: pool}
}

func (s *DashboardService) Stats(ctx context.Context, month, year int) (*dto.DashboardStats, error) {
	q := dbsqlc.New(s.pool)

	r, err := q.GetDashboardStats(ctx, dbsqlc.GetDashboardStatsParams{
		Column1: int32(month),
		Column2: int32(year),
	})
	if err != nil {
		return nil, apperror.ErrInternal
	}

	return &dto.DashboardStats{
		Month:          month,
		Year:           year,
		ActiveStudents: r.ActiveStudents,
		ActiveCourses:  r.ActiveCourses,
		ActiveTeachers: r.ActiveTeachers,
		Collected:      numericToString(r.Collected),
		PendingAmount:  numericToString(r.PendingAmount),
		OtherCollected: numericToString(r.OtherCollected),
	}, nil
}

func (s *DashboardService) Activity(ctx context.Context, limit int) ([]dto.ActivityItem, error) {
	q := dbsqlc.New(s.pool)
	n := int32(limit)

	type timed struct {
		item dto.ActivityItem
		at   time.Time
	}
	var all []timed

	enrolls, err := q.ListRecentEnrollments(ctx, n)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	for _, e := range enrolls {
		all = append(all, timed{
			at: e.EnrolledAt.Time,
			item: dto.ActivityItem{
				Type:        "enrollment",
				At:          e.EnrolledAt.Time.Format("2006-01-02T15:04:05Z"),
				Description: fmt.Sprintf("%s %s se inscribió en %s", e.FirstName, e.LastName, e.CourseName),
			},
		})
	}

	submitted, err := q.ListRecentSubmittedReceipts(ctx, n)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	for _, p := range submitted {
		all = append(all, timed{
			at: p.ReceiptUploadedAt.Time,
			item: dto.ActivityItem{
				Type:        "payment_submitted",
				At:          p.ReceiptUploadedAt.Time.Format("2006-01-02T15:04:05Z"),
				Description: fmt.Sprintf("%s %s subió comprobante de %s", p.FirstName, p.LastName, periodLabel(p.Month, p.Year, p.CourseName)),
			},
		})
	}

	approved, err := q.ListRecentApprovedPayments(ctx, n)
	if err != nil {
		return nil, apperror.ErrInternal
	}
	for _, p := range approved {
		all = append(all, timed{
			at: p.ReviewedAt.Time,
			item: dto.ActivityItem{
				Type:        "payment_approved",
				At:          p.ReviewedAt.Time.Format("2006-01-02T15:04:05Z"),
				Description: fmt.Sprintf("Pago de %s %s aprobado (%s)", p.FirstName, p.LastName, periodLabel(p.Month, p.Year, p.CourseName)),
			},
		})
	}

	// Merge ordenado por fecha desc, top N
	sort.Slice(all, func(i, j int) bool { return all[i].at.After(all[j].at) })
	if len(all) > limit {
		all = all[:limit]
	}

	items := make([]dto.ActivityItem, len(all))
	for i, t := range all {
		items[i] = t.item
	}
	return items, nil
}

func (s *DashboardService) UpcomingEvents(ctx context.Context, limit int) ([]dto.UpcomingEventItem, error) {
	q := dbsqlc.New(s.pool)

	rows, err := q.ListUpcomingEvents(ctx, int32(limit))
	if err != nil {
		return nil, apperror.ErrInternal
	}

	items := make([]dto.UpcomingEventItem, len(rows))
	for i, e := range rows {
		item := dto.UpcomingEventItem{
			ID:        uuidToString(e.ID),
			Title:     e.Title,
			Type:      string(e.Type),
			Date:      e.Date.Time.Format("2006-01-02"),
			StartTime: timeToString(e.StartTime),
		}
		if e.CourseName.Valid {
			item.CourseName = e.CourseName.String
		}
		items[i] = item
	}
	return items, nil
}

// ── helpers privados ──────────────────────────────────────────────

// periodLabel describe a qué corresponde un pago: cuota de un mes o cargo adicional.
func periodLabel(month pgtype.Int4, year int32, courseName string) string {
	if month.Valid {
		return fmt.Sprintf("cuota %02d/%d de %s", month.Int32, year, courseName)
	}
	return fmt.Sprintf("un cargo de %s", courseName)
}
