package dto

// LibretaRequestItem — fila cruda de las solicitudes del alumno
// (GET /student/libreta/requests). El front computa el estado por libreta.
type LibretaRequestItem struct {
	ID        string `json:"id"`
	CourseID  string `json:"course_id"`
	Year      int32  `json:"year"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

// LibretaActionRequest — body de download/request (identifica la libreta).
type LibretaActionRequest struct {
	CourseID string `json:"course_id" binding:"required"`
	Year     int    `json:"year"      binding:"required,min=2000"`
}

// AdminLibretaRequestItem — solicitud pendiente vista por el admin.
type AdminLibretaRequestItem struct {
	ID          string `json:"id"`
	StudentID   string `json:"student_id"`
	StudentName string `json:"student_name"`
	CourseID    string `json:"course_id"`
	CourseName  string `json:"course_name"`
	Year        int32  `json:"year"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
}
