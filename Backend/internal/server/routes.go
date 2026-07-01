package server

import (
	"net/http"
	"path/filepath"

	"sge-london-eye/internal/config"
	"sge-london-eye/internal/cron"
	"sge-london-eye/internal/handlers"
	"sge-london-eye/internal/middleware"
	"sge-london-eye/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Server) registerRoutes(cfg *config.Config, pool *pgxpool.Pool, runner *cron.Runner) {
	api := s.engine.Group("/api/v1")

	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Avatares: únicos archivos de /uploads servidos de forma pública (los
	// comprobantes de pago siguen sirviéndose solo por endpoints autenticados).
	s.engine.Static("/uploads/avatars", filepath.Join(cfg.StoragePath, "avatars"))

	// Auth — rutas públicas
	auth := api.Group("/auth")
	{
		h := handlers.NewAuthHandler(pool, cfg)
		auth.POST("/register", h.Register)
		auth.POST("/login", h.Login)
		auth.POST("/refresh", h.Refresh)
		auth.POST("/logout", middleware.Auth(cfg), h.Logout)
		auth.GET("/me", middleware.Auth(cfg), h.Me)
	}

	// Admin — estudiantes
	admin := api.Group("/admin", middleware.Auth(cfg), middleware.RequireRole("admin"))
	{
		sh := handlers.NewStudentHandler(pool)
		students := admin.Group("/students")
		students.GET("", sh.List)
		students.GET("/:id", sh.GetByID)
		students.POST("", sh.Create)
		students.PUT("/:id", sh.Update)
		students.PATCH("/:id/status", sh.UpdateStatus)
		students.PATCH("/:id/approve", sh.Approve)
		students.GET("/:id/grades", sh.GetGrades)
		students.GET("/:id/attendance", sh.GetAttendance)

		th := handlers.NewTeacherHandler(pool)
		teachers := admin.Group("/teachers")
		teachers.GET("", th.List)
		teachers.GET("/:id", th.GetByID)
		teachers.POST("", th.Create)
		teachers.PUT("/:id", th.Update)
		teachers.PATCH("/:id/status", th.UpdateStatus)

		ch := handlers.NewCourseHandler(pool)
		courses := admin.Group("/courses")
		courses.GET("", ch.List)
		courses.GET("/:id", ch.GetByID)
		courses.POST("", ch.Create)
		courses.PUT("/:id", ch.Update)
		courses.PATCH("/:id/status", ch.UpdateStatus)
		courses.GET("/:id/students", ch.ListStudents)

		eh := handlers.NewEnrollmentHandler(pool)
		enrollments := admin.Group("/enrollments")
		enrollments.GET("", eh.List)
		enrollments.POST("", eh.Enroll)
		enrollments.DELETE("/:id", eh.Drop)

		store := storage.NewLocalStorage(cfg.StoragePath, "/uploads")
		ph := handlers.NewPaymentHandler(pool, store)
		payments := admin.Group("/payments")
		payments.GET("", ph.List)
		payments.GET("/pending", ph.ListPending)
		payments.GET("/reviews", ph.ListReviewed)
		payments.GET("/:id", ph.GetByID)
		payments.GET("/:id/receipt", ph.GetReceipt)
		payments.POST("", ph.CreateAdditionalCharge)
		payments.POST("/course-charge", ph.CreateCourseCharge)
		payments.POST("/advance", ph.CreateAdvance)
		payments.PATCH("/:id/approve", ph.Approve)
		payments.PATCH("/:id/reject", ph.Reject)
		payments.PATCH("/:id/annul", ph.Annul)

		// Sub-recurso: pagos de un alumno (pendiente de Sprint 2)
		admin.GET("/students/:id/payments", ph.ListByStudentParam)

		// Trigger manual de jobs de cron (operación / testing)
		cronh := handlers.NewCronHandler(runner)
		admin.POST("/cron/run/:job", cronh.Run)

		// Calendario — CRUD solo admin
		calh := handlers.NewCalendarHandler(pool)
		adminCal := admin.Group("/calendar/events")
		adminCal.POST("", calh.Create)
		adminCal.PUT("/:id", calh.Update)
		adminCal.DELETE("/:id", calh.Delete)

		// Notificaciones — CRUD solo admin
		noth := handlers.NewNotificationHandler(pool)
		adminNot := admin.Group("/notifications")
		adminNot.POST("", noth.Create)
		adminNot.PUT("/:id", noth.Update)
		adminNot.DELETE("/:id", noth.Delete)

		// Certificados — emisión y listado (admin)
		certh := handlers.NewCertificateHandler(pool)
		adminCert := admin.Group("/certificates")
		adminCert.POST("", certh.Issue)
		adminCert.GET("", certh.List)

		// Libreta — solicitudes de descarga (admin: revisar/aprobar)
		libh := handlers.NewLibretaHandler(pool)
		adminLib := admin.Group("/libreta/requests")
		adminLib.GET("", libh.ListPending)
		adminLib.POST("/:id/approve", libh.Approve)
		adminLib.POST("/:id/reject", libh.Reject)

		// Dashboard (admin)
		dashh := handlers.NewDashboardHandler(pool)
		dashboard := admin.Group("/dashboard")
		dashboard.GET("/stats", dashh.Stats)
		dashboard.GET("/activity", dashh.Activity)
		dashboard.GET("/events", dashh.Events)

		// Configuración del instituto (admin)
		seth := handlers.NewSettingsHandler(pool)
		settings := admin.Group("/settings")
		settings.GET("", seth.Get)
		settings.PUT("", seth.Update)
	}

	// Calendario — lectura para cualquier usuario autenticado (filtrado por rol)
	calendar := api.Group("/calendar", middleware.Auth(cfg))
	{
		calh := handlers.NewCalendarHandler(pool)
		calendar.GET("/events", calh.List)
	}

	// Notificaciones — lectura para cualquier usuario autenticado (filtrado por audiencia)
	notifications := api.Group("/notifications", middleware.Auth(cfg))
	{
		noth := handlers.NewNotificationHandler(pool)
		notifications.GET("", noth.List)
	}

	// Settings — datos públicos del instituto (ej. datos bancarios para el alumno)
	settingsPublic := api.Group("/settings", middleware.Auth(cfg))
	{
		seth := handlers.NewSettingsHandler(pool)
		settingsPublic.GET("/public", seth.GetPublic)
	}

	// Teacher — rutas propias del docente
	teacher := api.Group("/teacher", middleware.Auth(cfg), middleware.RequireRole("teacher"))
	{
		ch := handlers.NewCourseHandler(pool)
		teacher.GET("/courses", ch.ListByTeacher)
		teacher.GET("/courses/:id/students", ch.ListMyCourseStudents)

		gh := handlers.NewGradeHandler(pool)
		teacher.GET("/grades", gh.Get)
		teacher.PUT("/grades", gh.Save)

		ah := handlers.NewAttendanceHandler(pool)
		teacher.GET("/attendance", ah.GetSession)
		teacher.POST("/attendance", ah.SaveAttendance)
		teacher.GET("/attendance/:studentId/history", ah.GetHistory)
	}

	// Student — rutas propias del estudiante
	student := api.Group("/student", middleware.Auth(cfg), middleware.RequireRole("student"))
	{
		ch := handlers.NewCourseHandler(pool)
		student.GET("/courses", ch.ListMyCourses)

		gh := handlers.NewGradeHandler(pool)
		student.GET("/grades", gh.GetMyGrades)

		ah := handlers.NewAttendanceHandler(pool)
		student.GET("/attendance", ah.GetMyAttendance)

		store := storage.NewLocalStorage(cfg.StoragePath, "/uploads")
		ph := handlers.NewPaymentHandler(pool, store)
		student.GET("/payments", ph.ListMine)
		student.GET("/payments/:id/receipt", ph.GetMyReceipt)
		student.POST("/payments/:id/receipt", ph.SubmitReceipt)

		certh := handlers.NewCertificateHandler(pool)
		student.GET("/certificates", certh.ListMine)
		student.GET("/certificates/:id", certh.GetByID)

		libh := handlers.NewLibretaHandler(pool)
		student.GET("/libreta/requests", libh.ListMine)
		student.POST("/libreta/download", libh.Download)
		student.POST("/libreta/request", libh.Request)
	}

	// Admin — grades y attendance
	{
		gh := handlers.NewGradeHandler(pool)
		adminGrades := admin.Group("/grades")
		adminGrades.GET("", gh.Get)
		adminGrades.PUT("", gh.Save)

		ah := handlers.NewAttendanceHandler(pool)
		adminAttendance := admin.Group("/attendance")
		adminAttendance.GET("", ah.GetSession)
		adminAttendance.POST("", ah.SaveAttendance)
		adminAttendance.GET("/annual", ah.GetAnnual)
		adminAttendance.GET("/:studentId/history", ah.GetHistory)
	}

	// Profile — requiere autenticación
	profile := api.Group("/profile", middleware.Auth(cfg))
	{
		store := storage.NewLocalStorage(cfg.StoragePath, "/uploads")
		h := handlers.NewProfileHandler(pool, store)
		profile.GET("", h.GetProfile)
		profile.PUT("", h.UpdateProfile)
		profile.PUT("/password", h.ChangePassword)
		profile.PUT("/avatar", h.UpdateAvatar)
	}
}
