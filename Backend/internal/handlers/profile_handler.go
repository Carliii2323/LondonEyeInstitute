package handlers

import (
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

	data, ext, ok := readValidatedUpload(c, "avatar", "la imagen de perfil", maxAvatarBytes, imageUploadTypes)
	if !ok {
		return
	}

	profile, err := h.svc.UpdateAvatar(c.Request.Context(), userID, data, ext)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, profile)
}
