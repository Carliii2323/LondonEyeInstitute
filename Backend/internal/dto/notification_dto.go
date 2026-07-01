package dto

type NotificationItem struct {
	ID               string `json:"id"`
	Title            string `json:"title"`
	Message          string `json:"message"`
	Type             string `json:"type"`
	AudienceType     string `json:"audience_type"`
	AudienceCourseID string `json:"audience_course_id,omitempty"`
	CourseName       string `json:"course_name,omitempty"`
	AudienceUserID   string `json:"audience_user_id,omitempty"`
	CreatedAt        string `json:"created_at"`
}

type CreateNotificationRequest struct {
	Title            string `json:"title"              binding:"required,min=2"`
	Message          string `json:"message"            binding:"required,min=2"`
	Type             string `json:"type"               binding:"required,oneof=urgente informativo evento archivado"`
	AudienceType     string `json:"audience_type"      binding:"required,oneof=todos docentes estudiantes curso estudiante_especifico docente_especifico"`
	AudienceCourseID string `json:"audience_course_id" binding:"omitempty"`
	AudienceUserID   string `json:"audience_user_id"   binding:"omitempty"`
}

type UpdateNotificationRequest struct {
	Title            string `json:"title"              binding:"required,min=2"`
	Message          string `json:"message"            binding:"required,min=2"`
	Type             string `json:"type"               binding:"required,oneof=urgente informativo evento archivado"`
	AudienceType     string `json:"audience_type"      binding:"required,oneof=todos docentes estudiantes curso estudiante_especifico docente_especifico"`
	AudienceCourseID string `json:"audience_course_id" binding:"omitempty"`
	AudienceUserID   string `json:"audience_user_id"   binding:"omitempty"`
}
