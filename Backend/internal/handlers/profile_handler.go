package handlers

import (
	"io"
	"net/http"

	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/services"
	"sge-london-eye/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProfileHandler struct {
	svc *services.ProfileService
}

func NewProfileHandler(pool *pgxpool.Pool, s storage.Storage) *ProfileHandler {
	return &ProfileHandler{
		svc: services.NewProfileService(pool, s),
	}
}

func (h *ProfileHandler) GetProfile(c *gin.Context) {
	userID := c.GetString("userID")

	profile, err := h.svc.GetProfile(c.Request.Context(), userID)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("userID")

	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	profile, err := h.svc.UpdateProfile(c.Request.Context(), userID, req)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *ProfileHandler) ChangePassword(c *gin.Context) {
	userID := c.GetString("userID")

	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	if err := h.svc.ChangePassword(c.Request.Context(), userID, req); err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.StatusResponse{Message: "contraseña actualizada"})
}

func (h *ProfileHandler) UpdateAvatar(c *gin.Context) {
	userID := c.GetString("userID")

	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "campo 'avatar' requerido"})
		return
	}
	defer file.Close()

	const maxSize = 2 << 20 // 2 MB
	if header.Size > maxSize {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "el archivo supera el límite de 2 MB"})
		return
	}

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiError{Error: "error al leer el archivo"})
		return
	}

	allowed := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
	}
	if !allowed[http.DetectContentType(data)] {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "solo se permiten imágenes JPG, PNG o WebP"})
		return
	}

	profile, err := h.svc.UpdateAvatar(c.Request.Context(), userID, data, header.Filename)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, profile)
}
