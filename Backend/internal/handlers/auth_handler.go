package handlers

import (
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

// Register — auto-registro del alumno. Llega como multipart/form-data: los datos
// del alumno (campos `form`) + el frente del DNI como archivo `dni_front`.
func (h *AuthHandler) Register(c *gin.Context) {
	// El limite va ANTES del bind: ShouldBind parsea el multipart (o sea, lee el
	// cuerpo entero), asi que ponerlo despues no protegeria nada.
	limitRequestBody(c, maxDocUploadBytes)

	var req dto.RegisterRequest
	if err := c.ShouldBind(&req); err != nil { // multipart: lee tags `form` + valida `binding`
		// Si el cuerpo supero el tope, el MaxBytesReader corta ACA, durante el
		// parseo del multipart. Sin este caso aparte el alumno recibiria un
		// "formato de datos invalido" generico por mandar una foto pesada.
		if isTooLarge(err) {
			badUpload(c, "el frente del DNI supera el limite de "+humanMB(maxDocUploadBytes))
			return
		}
		respondValidationError(c, err)
		return
	}

	data, ext, ok := readValidatedUpload(c, "dni_front", "el frente del DNI", maxDocUploadBytes, docUploadTypes)
	if !ok {
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
