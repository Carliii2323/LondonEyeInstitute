package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"sge-london-eye/internal/dto"

	"github.com/gin-gonic/gin"
)

/*
RateLimit — limita los pedidos por IP en una ventana de tiempo.

Pensado para los endpoints PÚBLICOS de auth: sin esto el login queda abierto a
fuerza bruta y el reenvío de verificación a bombardeo de mails, ambos gratis
para el atacante (hallazgo M1-03).

Decisiones:

  - Ventana fija, no deslizante. Es más simple y alcanza: en el peor caso
    (pedidos justo en el borde) deja pasar hasta 2x el límite, que para frenar
    fuerza bruta es irrelevante.

  - El contador vive EN MEMORIA del proceso. Con una sola instancia de la API
    alcanza, que es como está desplegado hoy. Si algún día se corre más de una
    réplica, cada una tendría su propia cuenta y habría que mover esto a
    Postgres o Redis.

  - Cada llamada a RateLimit() crea su propia cubeta, así que los límites de
    login, registro y reenvío son independientes entre sí.

Depende de que gin resuelva bien ClientIP(): ver SetTrustedProxies en server.go.
Sin eso, detrás de Caddy todas las IPs se verían iguales y el límite sería
global en vez de por cliente.
*/

type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string]*rateWindow
	limit  int
	window time.Duration
}

type rateWindow struct {
	count int
	reset time.Time
}

// RateLimit devuelve un middleware que permite `limit` pedidos por `per` y por IP.
func RateLimit(limit int, per time.Duration) gin.HandlerFunc {
	rl := &rateLimiter{
		hits:   make(map[string]*rateWindow),
		limit:  limit,
		window: per,
	}
	go rl.janitor()

	return func(c *gin.Context) {
		allowed, retryIn := rl.allow(c.ClientIP())
		if !allowed {
			// Retry-After en segundos: le dice al cliente cuándo reintentar.
			c.Header("Retry-After", strconv.Itoa(int(retryIn.Seconds())+1))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, dto.ApiError{
				Error: "demasiados intentos, esperá un momento y probá de nuevo",
				Code:  "RATE_LIMITED",
			})
			return
		}
		c.Next()
	}
}

func (r *rateLimiter) allow(key string) (bool, time.Duration) {
	now := time.Now()

	r.mu.Lock()
	defer r.mu.Unlock()

	w, seen := r.hits[key]
	if !seen || now.After(w.reset) {
		r.hits[key] = &rateWindow{count: 1, reset: now.Add(r.window)}
		return true, 0
	}
	if w.count >= r.limit {
		return false, time.Until(w.reset)
	}
	w.count++
	return true, 0
}

// janitor borra las ventanas vencidas. Sin esto el mapa crece sin techo: a un
// atacante que rota IPs le alcanzaría con pedir para hacer crecer la memoria.
func (r *rateLimiter) janitor() {
	ticker := time.NewTicker(r.window)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		r.mu.Lock()
		for key, w := range r.hits {
			if now.After(w.reset) {
				delete(r.hits, key)
			}
		}
		r.mu.Unlock()
	}
}
