package server

import (
	"context"
	"log"
	"net/http"
	"reflect"
	"strings"
	"time"

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

	// La API no se publica al host (compose usa `expose`, no `ports`): el unico
	// que puede alcanzarla es Caddy, por la red interna de Docker. Por eso
	// confiamos en los rangos privados para leer X-Forwarded-For y quedarnos con
	// la IP REAL del cliente. Sin esto, ClientIP() devuelve siempre la de Caddy y
	// el rate limiting se vuelve una sola cubeta para todo internet.
	if err := engine.SetTrustedProxies([]string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"}); err != nil {
		log.Printf("[server] no se pudieron fijar los proxies de confianza: %v", err)
	}

	s := &Server{engine: engine}
	s.registerRoutes(cfg, pool, runner, mail)

	// Timeouts explicitos (M1-02). Sin ellos, una conexion que abre y no termina
	// de mandar la peticion se queda tomada para siempre: con unos cientos de
	// esas (slowloris) el proceso deja de atender a cualquier otro.
	//
	// ReadHeaderTimeout es el que corta slowloris. Los demas estan holgados a
	// proposito porque por aca pasan archivos de hasta 5 MB (DNIs y
	// comprobantes) y una subida desde un celular lento tarda.
	s.http = &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           engine,
		ReadHeaderTimeout: 10 * time.Second,  // cabeceras: nadie legitimo tarda mas
		ReadTimeout:       60 * time.Second,  // peticion completa, incluida la subida
		WriteTimeout:      120 * time.Second, // respuesta, incluida la descarga
		IdleTimeout:       120 * time.Second, // keep-alive ocioso
	}

	return s
}

func (s *Server) Run() error {
	return s.http.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}
