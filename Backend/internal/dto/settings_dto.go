package dto

type SettingsResponse struct {
	Name                  string `json:"name"`
	LegalName             string `json:"legal_name"`
	Cuit                  string `json:"cuit"`
	Phone                 string `json:"phone"`
	Address               string `json:"address"`
	Email                 string `json:"email"`
	MonthlyDueDay         int32  `json:"monthly_due_day"`
	GraceDays             int32  `json:"grace_days"`
	LateFeeKind           string `json:"late_fee_kind"`
	LateFeeValue          string `json:"late_fee_value"`
	NoPaymentMonths       []int  `json:"no_payment_months"`
	GradeGraceDaysJanuary int32  `json:"grade_grace_days_january"`
	Cbu                   string `json:"cbu"`
	Alias                 string `json:"alias"`
	AccountHolder         string `json:"account_holder"`
	UpdatedAt             string `json:"updated_at"`
}

// PublicSettings — datos del instituto visibles para cualquier usuario
// autenticado (ej. el alumno necesita los datos bancarios para transferir).
type PublicSettings struct {
	Name          string `json:"name"`
	Cbu           string `json:"cbu"`
	Alias         string `json:"alias"`
	AccountHolder string `json:"account_holder"`
}

type UpdateSettingsRequest struct {
	Name                  string `json:"name"                     binding:"required,min=2"`
	LegalName             string `json:"legal_name"               binding:"omitempty"`
	Cuit                  string `json:"cuit"                     binding:"omitempty"`
	Phone                 string `json:"phone"                    binding:"omitempty"`
	Address               string `json:"address"                  binding:"omitempty"`
	Email                 string `json:"email"                    binding:"omitempty,email"`
	MonthlyDueDay         int    `json:"monthly_due_day"          binding:"required,min=1,max=31"`
	GraceDays             int    `json:"grace_days"               binding:"gte=0"`
	LateFeeKind           string `json:"late_fee_kind"            binding:"required,oneof=porcentaje fijo"`
	LateFeeValue          string `json:"late_fee_value"           binding:"required"`
	NoPaymentMonths       []int  `json:"no_payment_months"`
	GradeGraceDaysJanuary int    `json:"grade_grace_days_january" binding:"gte=0,lte=31"`
	Cbu                   string `json:"cbu"                      binding:"omitempty"`
	Alias                 string `json:"alias"                    binding:"omitempty"`
	AccountHolder         string `json:"account_holder"           binding:"omitempty"`
}
