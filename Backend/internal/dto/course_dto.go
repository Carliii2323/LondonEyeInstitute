package dto

type CourseListItem struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Level            string  `json:"level"`
	Schedule         string  `json:"schedule"`
	PriceMonthly     string  `json:"price_monthly"`
	InscripcionPrice *string `json:"inscripcion_price"`
	ExamenPrice      *string `json:"examen_price"`
	ClassroomCode    string  `json:"classroom_code"`
	Capacity         int32   `json:"capacity"`
	EnrolledCount    int64   `json:"enrolled_count"`
	Status           string  `json:"status"`
	TeacherID        string  `json:"teacher_id"`
	TeacherFirstName string  `json:"teacher_first_name"`
	TeacherLastName  string  `json:"teacher_last_name"`
	CreatedAt        string  `json:"created_at"`
}

// CourseStats — GET /admin/courses/stats (stat cards).
type CourseStats struct {
	Active   int64 `json:"active"`
	Full     int64 `json:"full"`
	Inactive int64 `json:"inactive"`
	Enrolled int64 `json:"enrolled"`
}

// StudentCourse — GET /student/courses ("Mis Cursos" del alumno).
type StudentCourse struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Level         string `json:"level"`
	Schedule      string `json:"schedule"`
	ClassroomCode string `json:"classroom_code"`
	TeacherName   string `json:"teacher_name"`
}

type CourseDetail struct {
	CourseListItem
	UpdatedAt string `json:"updated_at"`
}

type CourseStudent struct {
	ID         string `json:"id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email"`
	DNI        string `json:"dni"`
	Phone      string `json:"phone"`
	Status     string `json:"status"`
	EnrolledAt string `json:"enrolled_at"`
	// PaymentStatus — estado de la cuota mensual del mes en curso ("" = sin cuota).
	PaymentStatus string `json:"payment_status"`
}

type CreateCourseRequest struct {
	Name             string  `json:"name"              binding:"required,min=2"`
	Level            string  `json:"level"             binding:"required"`
	Schedule         string  `json:"schedule"          binding:"required"`
	PriceMonthly     string  `json:"price_monthly"     binding:"required"`
	InscripcionPrice *string `json:"inscripcion_price" binding:"omitempty"`
	ExamenPrice      *string `json:"examen_price"      binding:"omitempty"`
	ClassroomCode    string  `json:"classroom_code"    binding:"omitempty"`
	Capacity         int32   `json:"capacity"          binding:"required,min=1"`
	TeacherID        string  `json:"teacher_id"        binding:"omitempty"`
}

type UpdateCourseRequest struct {
	Name             string  `json:"name"              binding:"required,min=2"`
	Level            string  `json:"level"             binding:"required"`
	Schedule         string  `json:"schedule"          binding:"required"`
	PriceMonthly     string  `json:"price_monthly"     binding:"required"`
	InscripcionPrice *string `json:"inscripcion_price" binding:"omitempty"`
	ExamenPrice      *string `json:"examen_price"      binding:"omitempty"`
	ClassroomCode    string  `json:"classroom_code"    binding:"omitempty"`
	Capacity         int32   `json:"capacity"          binding:"required,min=1"`
	TeacherID        string  `json:"teacher_id"        binding:"omitempty"`
}

type UpdateCourseStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=activo cupo_completo inactivo"`
}
