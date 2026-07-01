package apperror

import "errors"

type AppError struct {
	Err     error
	Message string
	Code    string
}

func (e *AppError) Error() string { return e.Err.Error() }

func New(err error, message, code string) *AppError {
	return &AppError{Err: err, Message: message, Code: code}
}

var (
	ErrNotFound           = errors.New("not_found")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden")
	ErrConflict           = errors.New("conflict")
	ErrBadRequest         = errors.New("bad_request")
	ErrInternal           = errors.New("internal")
	ErrInvalidCredentials = errors.New("invalid_credentials")
	ErrCourseFull         = errors.New("course_full")
	ErrPaymentNotPending  = errors.New("payment_not_pending")
)
