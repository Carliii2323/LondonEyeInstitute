package dto

type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// RegisterRequest — auto-registro del alumno. Llega como multipart/form-data
// (trae el frente del DNI como archivo aparte, ver handler). Usa tags `binding`
// (gin las evalúa; las `validate` no corrían — hallazgo M1-01) y `form` para el
// bind del multipart.
type RegisterRequest struct {
	Email      string `json:"email"       form:"email"       binding:"required,email"`
	Password   string `json:"password"    form:"password"    binding:"required,min=8"`
	FirstName  string `json:"first_name"  form:"first_name"  binding:"required,min=2,max=60"`
	LastName   string `json:"last_name"   form:"last_name"   binding:"required,min=2,max=60"`
	DNI        string `json:"dni"         form:"dni"         binding:"required,numeric,min=7,max=8"`
	Phone      string `json:"phone"       form:"phone"       binding:"required,max=30"`
	BirthDate  string `json:"birth_date"  form:"birth_date"  binding:"required"` // YYYY-MM-DD
	Address    string `json:"address"     form:"address"     binding:"required,max=255"`
	TutorName  string `json:"tutor_name"  form:"tutor_name"  binding:"omitempty,max=120"`
	TutorPhone string `json:"tutor_phone" form:"tutor_phone" binding:"omitempty,max=30"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// VerifyEmailRequest — el alumno confirma su email con el token del link (F1).
type VerifyEmailRequest struct {
	Token string `json:"token" validate:"required"`
}

// ResendVerificationRequest — reenviar el mail de verificación.
type ResendVerificationRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type UserInfo struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	AvatarURL string `json:"avatar_url"`
	Status    string `json:"status"`
}

type AuthResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	User         UserInfo `json:"user"`
}
