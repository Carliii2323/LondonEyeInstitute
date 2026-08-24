package server

import (
	"context"
	"net/http"
	"reflect"
	"strings"

	"sge-london-eye/internal/config"
	"sge-london-eye/internal/cron"
	"sge-london-eye/internal/mailer"
	"sge-london-eye/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgxpool"
)

// useJSONFieldNames hace que los errores de validación reporten el nombre
// `json` del campo (snake_case) en vez del nombre del struct en Go.
func useJSONFieldNames() {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		v.RegisterTagNameFunc(func(fld reflect.StructField) string {
			name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
			if name == "-" {
				return ""
			}
			return name
		})
	}
}

type Server struct {
	engine *gin.Engine
	http   *http.Server
}

func New(cfg *config.Config, pool *pgxpool.Pool, runner *cron.Runner, mail mailer.Sender) *Server {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	useJSONFieldNames()

	engine := gin.New()
	engine.Use(
		middleware.RequestID(),
		middleware.Logger(),
		middleware.Recovery(),
		middleware.CORS(cfg.AllowedOrigins),
	)

	s := &Server{engine: engine}
	s.registerRoutes(cfg, pool, runner, mail)

	s.http = &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: engine,
	}

	return s
}

func (s *Server) Run() error {
	return s.http.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}
