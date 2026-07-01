package dto

type PaymentListItem struct {
	ID                string `json:"id"`
	StudentID         string `json:"student_id"`
	FirstName         string `json:"first_name"`
	LastName          string `json:"last_name"`
	DNI               string `json:"dni"`
	CourseID          string `json:"course_id"`
	CourseName        string `json:"course_name"`
	Type              string `json:"type"`
	Month             *int   `json:"month"`
	Year              int32  `json:"year"`
	Amount            string `json:"amount"`
	LateFeeApplied    string `json:"late_fee_applied"`
	Total             string `json:"total"`
	DueDate           string `json:"due_date"`
	Status            string `json:"status"`
	PaymentMethod     string `json:"payment_method,omitempty"`
	ReceiptURL        string `json:"receipt_url,omitempty"`
	ReceiptUploadedAt string `json:"receipt_uploaded_at,omitempty"`
	CreatedAt         string `json:"created_at"`
}

type PaymentDetail struct {
	ID                string `json:"id"`
	StudentID         string `json:"student_id"`
	FirstName         string `json:"first_name"`
	LastName          string `json:"last_name"`
	DNI               string `json:"dni"`
	CourseID          string `json:"course_id"`
	CourseName        string `json:"course_name"`
	Type              string `json:"type"`
	Month             *int   `json:"month"`
	Year              int32  `json:"year"`
	Amount            string `json:"amount"`
	LateFeeApplied    string `json:"late_fee_applied"`
	Total             string `json:"total"`
	DueDate           string `json:"due_date"`
	Status            string `json:"status"`
	PaymentMethod     string `json:"payment_method,omitempty"`
	Observation       string `json:"observation,omitempty"`
	ReceiptURL        string `json:"receipt_url,omitempty"`
	ReceiptUploadedAt string `json:"receipt_uploaded_at,omitempty"`
	ReviewedAt        string `json:"reviewed_at,omitempty"`
	RejectionReason   string `json:"rejection_reason,omitempty"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
}

// StudentPaymentItem — para GET /student/payments (sin datos de otros alumnos)
type StudentPaymentItem struct {
	ID              string `json:"id"`
	CourseID        string `json:"course_id"`
	CourseName      string `json:"course_name"`
	Type            string `json:"type"`
	Month           *int   `json:"month"`
	Year            int32  `json:"year"`
	Amount          string `json:"amount"`
	LateFeeApplied  string `json:"late_fee_applied"`
	Total           string `json:"total"`
	DueDate         string `json:"due_date"`
	Status          string `json:"status"`
	ReceiptURL      string `json:"receipt_url,omitempty"`
	RejectionReason string `json:"rejection_reason,omitempty"`
	CreatedAt       string `json:"created_at"`
}

// ReviewedPaymentItem — fila del historial de revisiones (admin).
type ReviewedPaymentItem struct {
	ID              string `json:"id"`
	StudentID       string `json:"student_id"`
	StudentName     string `json:"student_name"`
	DNI             string `json:"dni"`
	CourseName      string `json:"course_name"`
	Type            string `json:"type"`
	Month           *int   `json:"month"`
	Year            int32  `json:"year"`
	Amount          string `json:"amount"`
	LateFeeApplied  string `json:"late_fee_applied"`
	Total           string `json:"total"`
	Status          string `json:"status"`
	PaymentMethod   string `json:"payment_method,omitempty"`
	ReviewedAt      string `json:"reviewed_at"`
	RejectionReason string `json:"rejection_reason,omitempty"`
}

type CreateAdditionalChargeRequest struct {
	StudentID   string `json:"student_id"  binding:"required"`
	CourseID    string `json:"course_id"   binding:"required"`
	Amount      string `json:"amount"      binding:"required"`
	DueDate     string `json:"due_date"    binding:"required"`
	Observation string `json:"observation" binding:"required"`
	// Paid=true → el cobro se crea ya aprobado (pagado en el momento).
	Paid bool `json:"paid"`
	// PaymentMethod opcional (transferencia/efectivo), solo si Paid=true.
	PaymentMethod string `json:"payment_method"`
}

// ApprovePaymentRequest — body opcional al aprobar (medio de pago).
type ApprovePaymentRequest struct {
	PaymentMethod string `json:"payment_method"`
}

// CreateAdvancePaymentRequest — pago adelantado: N cuotas mensuales desde
// start_month/start_year, ya marcadas como pagadas.
type CreateAdvancePaymentRequest struct {
	StudentID     string `json:"student_id"  binding:"required"`
	CourseID      string `json:"course_id"   binding:"required"`
	StartMonth    int    `json:"start_month" binding:"required,min=1,max=12"`
	StartYear     int    `json:"start_year"  binding:"required,min=2000"`
	Months        int    `json:"months"      binding:"required,min=1,max=12"`
	PaymentMethod string `json:"payment_method"`
}

// CreateCourseChargeRequest — derecho (inscripción/examen) para TODO el curso.
type CreateCourseChargeRequest struct {
	CourseID    string `json:"course_id"   binding:"required"`
	Type        string `json:"type"        binding:"required,oneof=derecho_inscripcion derecho_examen"`
	Amount      string `json:"amount"      binding:"required"`
	DueDate     string `json:"due_date"    binding:"required"`
	Observation string `json:"observation"`
}

type RejectPaymentRequest struct {
	Reason string `json:"reason" binding:"required,min=3"`
}

// CronRunResult — telemetría que devuelve POST /admin/cron/run/:job
type CronRunResult struct {
	Job        string         `json:"job"`
	ExecutedAt string         `json:"executed_at"`
	DurationMs int64          `json:"duration_ms"`
	Result     map[string]any `json:"result"`
}
