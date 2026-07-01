package dto

type TeacherListItem struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	DNI       string `json:"dni"`
	Phone     string `json:"phone"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type TeacherDetail struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	DNI       string `json:"dni"`
	Phone     string `json:"phone"`
	AvatarURL string `json:"avatar_url"`
	Status    string `json:"status"`
	JoinDate  string `json:"join_date"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type CreateTeacherRequest struct {
	Email     string `json:"email"      binding:"required,email"`
	Password  string `json:"password"   binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required,min=2"`
	LastName  string `json:"last_name"  binding:"required,min=2"`
	DNI       string `json:"dni"        binding:"required"`
	Phone     string `json:"phone"      binding:"omitempty"`
	JoinDate  string `json:"join_date"  binding:"omitempty"`
	Notes     string `json:"notes"      binding:"omitempty"`
}

type UpdateTeacherRequest struct {
	FirstName string `json:"first_name" binding:"required,min=2"`
	LastName  string `json:"last_name"  binding:"required,min=2"`
	DNI       string `json:"dni"        binding:"required"`
	Phone     string `json:"phone"      binding:"omitempty"`
	JoinDate  string `json:"join_date"  binding:"omitempty"`
	Notes     string `json:"notes"      binding:"omitempty"`
}
