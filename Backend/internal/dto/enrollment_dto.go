package dto

type EnrollRequest struct {
	StudentID string `json:"student_id" binding:"required"`
	CourseID  string `json:"course_id"  binding:"required"`
}

type EnrollmentResponse struct {
	ID               string `json:"id"`
	StudentID        string `json:"student_id"`
	CourseID         string `json:"course_id"`
	EnrolledAt       string `json:"enrolled_at"`
	Status           string `json:"status"`
	PaymentGenerated bool   `json:"payment_generated"`
}

type EnrollmentListItem struct {
	ID           string `json:"id"`
	EnrolledAt   string `json:"enrolled_at"`
	Status       string `json:"status"`
	StudentID    string `json:"student_id"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Email        string `json:"email"`
	DNI          string `json:"dni"`
	CourseID     string `json:"course_id"`
	CourseName   string `json:"course_name"`
	CourseLevel  string `json:"course_level"`
}
