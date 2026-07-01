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

type PaymentHandler struct {
	svc *services.PaymentService
}

func NewPaymentHandler(pool *pgxpool.Pool, s storage.Storage) *PaymentHandler {
	return &PaymentHandler{svc: services.NewPaymentService(pool, s)}
}

func (h *PaymentHandler) List(c *gin.Context) {
	result, err := h.svc.List(
		c.Request.Context(),
		c.DefaultQuery("student_id", ""),
		c.DefaultQuery("course_id", ""),
		c.DefaultQuery("status", ""),
		c.DefaultQuery("type", ""),
		c.DefaultQuery("search", ""),
		queryInt(c, "month", 0),
		queryInt(c, "year", 0),
		queryInt(c, "page", 1),
		queryInt(c, "page_size", 20),
	)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *PaymentHandler) ListPending(c *gin.Context) {
	items, err := h.svc.ListPending(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

// ListReviewed — GET /admin/payments/reviews?year&month (historial de revisiones)
func (h *PaymentHandler) ListReviewed(c *gin.Context) {
	items, err := h.svc.ListReviewed(c.Request.Context(), queryInt(c, "year", 0), queryInt(c, "month", 0))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *PaymentHandler) GetByID(c *gin.Context) {
	detail, err := h.svc.GetByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, detail)
}

// ListMine — GET /student/payments (alumno autenticado)
func (h *PaymentHandler) ListMine(c *gin.Context) {
	items, err := h.svc.GetByStudent(c.Request.Context(), c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

// ListByStudentParam — GET /admin/students/:id/payments (admin consulta a un alumno)
func (h *PaymentHandler) ListByStudentParam(c *gin.Context) {
	items, err := h.svc.GetByStudent(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}

// GetReceipt — GET /admin/payments/:id/receipt
// Devuelve el archivo del comprobante inline (para abrir en el navegador).
func (h *PaymentHandler) GetReceipt(c *gin.Context) {
	h.streamReceipt(c, c.Param("id"), "")
}

// GetMyReceipt — GET /student/payments/:id/receipt (solo el dueño del pago)
func (h *PaymentHandler) GetMyReceipt(c *gin.Context) {
	h.streamReceipt(c, c.Param("id"), c.GetString("userID"))
}

func (h *PaymentHandler) streamReceipt(c *gin.Context, id, requireOwnerID string) {
	data, filename, err := h.svc.GetReceipt(c.Request.Context(), id, requireOwnerID)
	if err != nil {
		respondError(c, err)
		return
	}
	contentType := http.DetectContentType(data)
	c.Header("Content-Disposition", `inline; filename="`+filename+`"`)
	c.Data(http.StatusOK, contentType, data)
}

func (h *PaymentHandler) CreateAdditionalCharge(c *gin.Context) {
	var req dto.CreateAdditionalChargeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	id, err := h.svc.CreateAdditionalCharge(c.Request.Context(), req, c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *PaymentHandler) CreateAdvance(c *gin.Context) {
	var req dto.CreateAdvancePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	n, err := h.svc.CreateAdvancePayments(c.Request.Context(), req, c.GetString("userID"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"created": n})
}

func (h *PaymentHandler) CreateCourseCharge(c *gin.Context) {
	var req dto.CreateCourseChargeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	n, err := h.svc.CreateCourseCharge(c.Request.Context(), req)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"created": n})
}

func (h *PaymentHandler) Approve(c *gin.Context) {
	var req dto.ApprovePaymentRequest
	_ = c.ShouldBindJSON(&req) // body opcional (medio de pago)
	if err := h.svc.Approve(c.Request.Context(), c.Param("id"), c.GetString("userID"), req.PaymentMethod); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "pago aprobado"})
}

func (h *PaymentHandler) Reject(c *gin.Context) {
	var req dto.RejectPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}
	if err := h.svc.Reject(c.Request.Context(), c.Param("id"), c.GetString("userID"), req.Reason); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "pago rechazado"})
}

func (h *PaymentHandler) Annul(c *gin.Context) {
	if err := h.svc.Annul(c.Request.Context(), c.Param("id")); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "pago anulado"})
}

func (h *PaymentHandler) SubmitReceipt(c *gin.Context) {
	paymentID := c.Param("id")
	studentID := c.GetString("userID")

	file, header, err := c.Request.FormFile("receipt")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "campo 'receipt' requerido"})
		return
	}
	defer file.Close()

	const maxSize = 5 << 20 // 5 MB (los PDF pueden pesar más que una imagen)
	if header.Size > maxSize {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "el archivo supera el límite de 5 MB"})
		return
	}

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ApiError{Error: "error al leer el archivo"})
		return
	}

	allowed := map[string]bool{
		"image/jpeg":      true,
		"image/png":       true,
		"image/webp":      true,
		"application/pdf": true,
	}
	if !allowed[http.DetectContentType(data)] {
		c.JSON(http.StatusBadRequest, dto.ApiError{Error: "solo se permiten JPG, PNG, WebP o PDF"})
		return
	}

	if err := h.svc.SubmitReceipt(c.Request.Context(), paymentID, studentID, data, header.Filename); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.StatusResponse{Message: "comprobante enviado"})
}
