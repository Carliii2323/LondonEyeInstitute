package dto

type AttendanceRecord struct {
	StudentID   string `json:"student_id"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DNI         string `json:"dni"`
	Status      string `json:"status"`
	Observation string `json:"observation"`
}

type AttendanceSessionResponse struct {
	SessionID string             `json:"session_id"`
	CourseID  string             `json:"course_id"`
	Date      string             `json:"date"`
	Records   []AttendanceRecord `json:"records"`
}

type SaveAttendanceRecord struct {
	StudentID   string `json:"student_id"   binding:"required"`
	Status      string `json:"status"       binding:"required,oneof=presente ausente justificado"`
	Observation string `json:"observation"`
}

type SaveAttendanceRequest struct {
	CourseID string                 `json:"course_id" binding:"required"`
	Date     string                 `json:"date"      binding:"required"`
	Records  []SaveAttendanceRecord `json:"records"   binding:"required,min=1"`
}

type AttendanceHistoryItem struct {
	Date        string `json:"date"`
	CourseID    string `json:"course_id"`
	CourseName  string `json:"course_name"`
	Status      string `json:"status"`
	Observation string `json:"observation"`
}

type AnnualAttendanceRow struct {
	StudentID string `json:"student_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	DNI       string `json:"dni"`
	Date      string `json:"date"`
	Status    string `json:"status"`
}
