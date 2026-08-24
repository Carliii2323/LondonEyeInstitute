package dto

type ApiError struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

type StatusResponse struct {
	Message string `json:"message"`
}

type PaginatedResponse[T any] struct {
	Data     []T `json:"data"`
	Total    int `json:"total"`
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}
