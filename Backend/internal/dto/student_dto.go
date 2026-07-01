package dto

type StudentListItem struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	DNI       string `json:"dni"`
	Phone     string `json:"phone"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type StudentDetail struct {
	ID         string `json:"id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email"`
	DNI        string `json:"dni"`
	Phone      string `json:"phone"`
	AvatarURL  string `json:"avatar_url"`
	Status     string `json:"status"`
	Address    string `json:"address"`
	TutorName  string `json:"tutor_name"`
	TutorPhone string `json:"tutor_phone"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

type CreateStudentRequest struct {
	Email      string `json:"email"       binding:"required,email"`
	Password   string `json:"password"    binding:"required,min=8"`
	FirstName  string `json:"first_name"  binding:"required,min=2"`
	LastName   string `json:"last_name"   binding:"required,min=2"`
	DNI        string `json:"dni"         binding:"required"`
	Phone      string `json:"phone"       binding:"omitempty"`
	Address    string `json:"address"     binding:"omitempty"`
	TutorName  string `json:"tutor_name"  binding:"omitempty"`
	TutorPhone string `json:"tutor_phone" binding:"omitempty"`
}

type UpdateStudentRequest struct {
	FirstName  string `json:"first_name"  binding:"required,min=2"`
	LastName   string `json:"last_name"   binding:"required,min=2"`
	DNI        string `json:"dni"         binding:"required"`
	Phone      string `json:"phone"       binding:"omitempty"`
	Address    string `json:"address"     binding:"omitempty"`
	TutorName  string `json:"tutor_name"  binding:"omitempty"`
	TutorPhone string `json:"tutor_phone" binding:"omitempty"`
}

type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=active inactive"`
}
