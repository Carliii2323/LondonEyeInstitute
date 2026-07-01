package dto

type UpdateProfileRequest struct {
	FirstName string `json:"first_name" binding:"required,min=2,max=100"`
	LastName  string `json:"last_name"  binding:"required,min=2,max=100"`
	Phone     string `json:"phone"      binding:"omitempty,max=20"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password"     binding:"required,min=8"`
}
