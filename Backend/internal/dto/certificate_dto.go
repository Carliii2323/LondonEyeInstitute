package dto

type CertificateItem struct {
	ID              string   `json:"id"`
	StudentID       string   `json:"student_id"`
	FirstName       string   `json:"first_name"`
	LastName        string   `json:"last_name"`
	DNI             string   `json:"dni"`
	CourseID        string   `json:"course_id"`
	CourseName      string   `json:"course_name"`
	Year            int32    `json:"year"`
	IssuedAt        string   `json:"issued_at"`
	AvgGrade        *float64 `json:"avg_grade"`
	AttendancePct   *float64 `json:"attendance_pct"`
	PresentialHours *int     `json:"presential_hours"`
	Status          string   `json:"status"`
}

type CertificateDetail struct {
	ID              string   `json:"id"`
	StudentID       string   `json:"student_id"`
	FirstName       string   `json:"first_name"`
	LastName        string   `json:"last_name"`
	DNI             string   `json:"dni"`
	CourseID        string   `json:"course_id"`
	CourseName      string   `json:"course_name"`
	CourseLevel     string   `json:"course_level"`
	Year            int32    `json:"year"`
	IssuedAt        string   `json:"issued_at"`
	AvgGrade        *float64 `json:"avg_grade"`
	AttendancePct   *float64 `json:"attendance_pct"`
	PresentialHours *int     `json:"presential_hours"`
	Status          string   `json:"status"`
}

// StudentCertificateItem — GET /student/certificates (sin datos de otros)
type StudentCertificateItem struct {
	ID              string   `json:"id"`
	CourseID        string   `json:"course_id"`
	CourseName      string   `json:"course_name"`
	Year            int32    `json:"year"`
	IssuedAt        string   `json:"issued_at"`
	AvgGrade        *float64 `json:"avg_grade"`
	AttendancePct   *float64 `json:"attendance_pct"`
	PresentialHours *int     `json:"presential_hours"`
	Status          string   `json:"status"`
}

type IssueCertificateRequest struct {
	StudentID       string   `json:"student_id"       binding:"required"`
	CourseID        string   `json:"course_id"        binding:"required"`
	Year            int      `json:"year"             binding:"required,min=2000"`
	AvgGrade        *float64 `json:"avg_grade"        binding:"omitempty,min=0,max=100"`
	AttendancePct   *float64 `json:"attendance_pct"   binding:"omitempty,min=0,max=100"`
	PresentialHours *int     `json:"presential_hours" binding:"omitempty,min=0"`
}
