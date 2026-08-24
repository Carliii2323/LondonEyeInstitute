package dto

type CalendarEventItem struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Type       string `json:"type"`
	Date       string `json:"date"`
	StartTime  string `json:"start_time,omitempty"`
	EndTime    string `json:"end_time,omitempty"`
	Message    string `json:"message,omitempty"`
	CourseID   string `json:"course_id,omitempty"`
	CourseName string `json:"course_name,omitempty"`
	CreatedBy  string `json:"created_by"`
	CreatedAt  string `json:"created_at"`
}

type CreateEventRequest struct {
	Title     string `json:"title"      binding:"required,min=2"`
	Type      string `json:"type"       binding:"required,oneof=vencimiento evento feriado otro"`
	Date      string `json:"date"       binding:"required"`
	StartTime string `json:"start_time" binding:"omitempty"`
	EndTime   string `json:"end_time"   binding:"omitempty"`
	Message   string `json:"message"    binding:"omitempty"`
	CourseID  string `json:"course_id"  binding:"omitempty"`
}

type UpdateEventRequest struct {
	Title     string `json:"title"      binding:"required,min=2"`
	Type      string `json:"type"       binding:"required,oneof=vencimiento evento feriado otro"`
	Date      string `json:"date"       binding:"required"`
	StartTime string `json:"start_time" binding:"omitempty"`
	EndTime   string `json:"end_time"   binding:"omitempty"`
	Message   string `json:"message"    binding:"omitempty"`
	CourseID  string `json:"course_id"  binding:"omitempty"`
}
