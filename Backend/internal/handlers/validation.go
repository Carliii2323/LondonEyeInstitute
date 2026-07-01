package handlers

import (
	"errors"
	"net/http"
	"reflect"

	"sge-london-eye/internal/dto"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// respondValidationError convierte un error de binding/validación en una
// respuesta clara en español (code VALIDATION_ERROR). Si es un error del
// validador, agrega el detalle por campo (clave = nombre json del campo).
func respondValidationError(c *gin.Context, err error) {
	var ve validator.ValidationErrors
	if errors.As(err, &ve) {
		details := make(map[string]string, len(ve))
		for _, fe := range ve {
			details[fe.Field()] = validationMessage(fe)
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Revisá los datos del formulario.",
			"code":    "VALIDATION_ERROR",
			"details": details,
		})
		return
	}
	// JSON malformado o tipo incorrecto (no llega a validarse)
	c.JSON(http.StatusBadRequest, dto.ApiError{
		Error: "El formato de los datos enviados no es válido.",
		Code:  "VALIDATION_ERROR",
	})
}

// validationMessage traduce un FieldError a un motivo legible en español.
func validationMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "Es un campo obligatorio."
	case "email":
		return "No es un email válido."
	case "min":
		if fe.Kind() == reflect.String {
			return "Debe tener al menos " + fe.Param() + " caracteres."
		}
		return "Debe ser al menos " + fe.Param() + "."
	case "max":
		if fe.Kind() == reflect.String {
			return "No puede superar los " + fe.Param() + " caracteres."
		}
		return "No puede ser mayor a " + fe.Param() + "."
	case "gte":
		return "Debe ser mayor o igual a " + fe.Param() + "."
	case "lte":
		return "Debe ser menor o igual a " + fe.Param() + "."
	case "oneof":
		return "Tiene un valor no permitido."
	default:
		return "Valor inválido."
	}
}
