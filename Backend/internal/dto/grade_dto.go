package dto

// Una nota por skill por término (R/L/S/W). term 1 = Julio, term 2 = Diciembre.
type GradeRowDTO struct {
	StudentID string   `json:"student_id"`
	FirstName string   `json:"first_name"`
	LastName  string   `json:"last_name"`
	DNI       string   `json:"dni"`
	Year      int32    `json:"year"`
	Term      int32    `json:"term"`
	Reading   *float64 `json:"reading"`
	Listening *float64 `json:"listening"`
	Speaking  *float64 `json:"speaking"`
	Writing   *float64 `json:"writing"`
}

// MakeupRowDTO — recuperatorio por término.
type MakeupRowDTO struct {
	StudentID  string  `json:"student_id"`
	FirstName  string  `json:"first_name"`
	LastName   string  `json:"last_name"`
	DNI        string  `json:"dni"`
	CourseName string  `json:"course_name,omitempty"`
	Year       int32   `json:"year"`
	Term       int32   `json:"term"`
	Score      float64 `json:"score"`
	TakenAt    string  `json:"taken_at"`
}

type GradesResponse struct {
	Grades  []GradeRowDTO  `json:"grades"`
	Makeups []MakeupRowDTO `json:"makeups"`
}

type UpsertGradeItem struct {
	StudentID string   `json:"student_id" binding:"required"`
	Term      int      `json:"term"       binding:"required,oneof=1 2"`
	Reading   *float64 `json:"reading"`
	Listening *float64 `json:"listening"`
	Speaking  *float64 `json:"speaking"`
	Writing   *float64 `json:"writing"`
}

type UpsertMakeupItem struct {
	StudentID string  `json:"student_id" binding:"required"`
	Term      int     `json:"term"       binding:"required,oneof=1 2"`
	Score     float64 `json:"score"      binding:"min=0,max=10"`
	TakenAt   string  `json:"taken_at"`
}

type SaveGradesRequest struct {
	CourseID string             `json:"course_id" binding:"required"`
	Year     int                `json:"year"      binding:"required,min=2000"`
	Grades   []UpsertGradeItem  `json:"grades"    binding:"required"`
	Makeups  []UpsertMakeupItem `json:"makeups"`
}

// StudentGradeRowDTO — para GET /student/grades (sin datos de otros alumnos)
type StudentGradeRowDTO struct {
	CourseID   string   `json:"course_id"`
	CourseName string   `json:"course_name"`
	Year       int32    `json:"year"`
	Term       int32    `json:"term"`
	Reading    *float64 `json:"reading"`
	Listening  *float64 `json:"listening"`
	Speaking   *float64 `json:"speaking"`
	Writing    *float64 `json:"writing"`
}

type StudentGradesResponse struct {
	Grades  []StudentGradeRowDTO `json:"grades"`
	Makeups []MakeupRowDTO       `json:"makeups"`
}
