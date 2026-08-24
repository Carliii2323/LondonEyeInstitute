package dto

type DashboardStats struct {
	Month          int    `json:"month"`
	Year           int    `json:"year"`
	ActiveStudents int64  `json:"active_students"`
	ActiveCourses  int64  `json:"active_courses"`
	ActiveTeachers int64  `json:"active_teachers"`
	Collected      string `json:"collected"`       // cuotas mensuales approved del mes
	PendingAmount  string `json:"pending_amount"`  // cuotas 'pending' del mes, aún por vencer (con recargo)
	OverdueAmount  string `json:"overdue_amount"`  // cuotas 'overdue' del mes, en mora (con recargo)
	OtherCollected string `json:"other_collected"` // cargos adicionales approved del mes
}

// ActivityItem — shape uniforme para los 3 tipos de actividad.
type ActivityItem struct {
	Type        string `json:"type"` // enrollment | payment_submitted | payment_approved
	At          string `json:"at"`
	Description string `json:"description"`
}

// EnrollmentPoint — punto de la serie mensual de inscripciones (B19).
type EnrollmentPoint struct {
	Month string `json:"month"` // "YYYY-MM"
	Count int64  `json:"count"`
}

type UpcomingEventItem struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Type       string `json:"type"`
	Date       string `json:"date"`
	StartTime  string `json:"start_time,omitempty"`
	CourseName string `json:"course_name,omitempty"`
}
