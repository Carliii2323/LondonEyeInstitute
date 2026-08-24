package dto

// InboundReceiptItem — fila de la bandeja de comprobantes recibidos por mail.
type InboundReceiptItem struct {
	ID                 string `json:"id"`
	FromEmail          string `json:"from_email"`
	Subject            string `json:"subject"`
	BodyExcerpt        string `json:"body_excerpt"`
	AttachmentFilename string `json:"attachment_filename"`
	Status             string `json:"status"` // sin_identificar | identificado | vinculado | descartado
	ReceivedAt         string `json:"received_at"`
	StudentID          string `json:"student_id"`   // "" si no matcheó ningún alumno
	StudentName        string `json:"student_name"` // "" si no identificado
	StudentEmail       string `json:"student_email"`
	LinkedPaymentID    string `json:"linked_payment_id"` // "" si no vinculado
	DetectedDNI        string `json:"detected_dni"`      // DNI hallado en el cuerpo ("" si no)
	DetectedAmount     string `json:"detected_amount"`   // monto hallado ("" si no)
}

// LinkInboundReceiptRequest — el admin vincula un comprobante entrante a un pago.
// Si approve=true, además aprueba el pago (atajo "vincular y aprobar").
type LinkInboundReceiptRequest struct {
	PaymentID string `json:"payment_id" binding:"required"`
	Approve   bool   `json:"approve"`
	Method    string `json:"method"` // medio de pago opcional (solo aplica si approve)
}

// InboundSuggestion — sugerencia para resolver un comprobante entrante.
type InboundSuggestion struct {
	ReceiptID            string                    `json:"receipt_id"`
	SuggestedStudentID   string                    `json:"suggested_student_id"` // "" si no hay
	SuggestedStudentName string                    `json:"suggested_student_name"`
	MatchSource          string                    `json:"match_source"` // email | dni | ""
	DetectedDNI          string                    `json:"detected_dni"`
	DetectedAmount       string                    `json:"detected_amount"`
	Payments             []InboundCandidatePayment `json:"payments"`
}

// InboundCandidatePayment — cuota abierta candidata para vincular.
type InboundCandidatePayment struct {
	ID            string `json:"id"`
	Label         string `json:"label"`
	Total         string `json:"total"`
	Status        string `json:"status"`
	MatchesAmount bool   `json:"matches_amount"`
}
