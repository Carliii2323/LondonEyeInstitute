package handlers

import (
	"io"
	"net/http"

	"sge-london-eye/internal/config"
	"sge-london-eye/internal/dto"
	"sge-london-eye/internal/mailer"
	"sge-london-eye/internal/services"
	"sge-london-eye/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthHandler struct {
	svc *services.AuthService
}

func NewAuthHandler(pool *pgxpool.Pool, cfg *config.Config, m mailer.Sender, st storage.Storage) *AuthHandler {
	return &AuthHandler{svc: services.NewAuthService(pool, cfg, m, st)}
}

// dniFrontMaxBytes — límite del frente del DNI en el registro (imagen o PDF).
const dniFrontMaxBytes = 5 << 20 // 5 MB

// dniFrontTypes — tipos permitidos para el frente del DNI y su extensión canónica.
// El ext se deriva del tipo DETECTADO (no del nombre del archivo, que se puede falsear).
var dniFrontTypes = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/webp":      ".webp",
	"application/pdf": ".pdf",
}

// Register — auto-registro del alumno. Llega como multipart/form-data: los datos
// del alumno (campos `form`) + el frente del DNI como archivo `dni_front`.
func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBind(&req); err != nil { // multipart: lee tags `form` + valida `binding`
		respondValidationError(c, err)
		return
	}

	file, header, err := c.Request.FormFile("dni_front")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "el frente del DNI es obligatorio (campo 'dni_front')"})
		return
	}
	defer file.Close()

	if header.Size > dniFrontMaxBytes {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "el frente del DNI supera el límite de 5 MB"})
		return
	}
	data, err := io.ReadAll(io.LimitReader(file, dniFrontMaxBytes+1))
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiError{Error: "error al leer el archivo"})
		return
	}
	if len(data) > dniFrontMaxBytes {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "el frente del DNI supera el límite de 5 MB"})
		return
	}
	ext, ok := dniFrontTypes[http.DetectContentType(data)]
	if !ok {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "el frente del DNI debe ser JPG, PNG, WebP o PDF"})
		return
	}

	if err := h.svc.Register(c.Request.Context(), req, data, ext); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, dto.StatusResponse{Message: "Te enviamos un email para verificar tu cuenta. Un administrador debe aprobarla antes de que puedas ingresar."})
}

func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req dto.VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.VerifyEmail(c.Request.Context(), req.Token); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "Tu email fue verificado. Cuando un administrador apruebe tu cuenta vas a poder ingresar."})
}

func (h *AuthHandler) ResendVerification(c *gin.Context) {
	var req dto.ResendVerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.ResendVerification(c.Request.Context(), req.Email); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "Si el email está registrado y sin verificar, te reenviamos el link."})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	resp, err := h.svc.Login(c.Request.Context(), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req dto.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	resp, err := h.svc.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req dto.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.Logout(c.Request.Context(), req.RefreshToken); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "sesión cerrada"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetString("userID")
	user, err := h.svc.Me(c.Request.Context(), userID)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, user)
}
