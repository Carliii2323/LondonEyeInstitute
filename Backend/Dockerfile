# syntax=docker/dockerfile:1
# ============================================================
# Backend Go — imagen de produccion.
#
# Se arma en dos etapas: una que compila (pesada, con todo el
# toolchain de Go) y otra que solo lleva el binario ya hecho.
# La imagen final termina pesando ~30 MB en vez de ~900 MB.
# ============================================================

# ---------- Etapa 1: compilar ----------
FROM golang:1.26-alpine AS builder

# git lo necesita "go install" para bajar sqlc.
RUN apk add --no-cache git

# sqlc genera el codigo de acceso a la BD. Como internal/db/sqlc/ esta
# en .gitignore, al clonar el repo ese codigo NO existe: hay que
# regenerarlo aca adentro o el build falla. Version fijada para que
# genere exactamente lo mismo que en tu maquina.
#
# Nota: la imagen base es golang 1.26 (no 1.25 como pide go.mod) porque
# sqlc 1.31 necesita 1.26 para compilarse. Go es compatible hacia atras:
# el binario de la app se compila igual contra go.mod 1.25.5.
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1

WORKDIR /src

# Las dependencias se copian primero y solas: mientras go.mod y go.sum
# no cambien, Docker reutiliza esta capa y no vuelve a bajar nada.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN sqlc generate

# CGO_ENABLED=0 -> binario estatico, sin dependencias del sistema.
# -ldflags "-s -w" -> saca simbolos de debug, achica el binario.
ENV CGO_ENABLED=0 GOOS=linux
RUN go build -ldflags="-s -w" -o /out/sge-london-eye ./cmd/api

# ---------- Etapa 2: imagen final ----------
FROM alpine:3.20

# ca-certificates: sin esto no puede hablar TLS con Gmail (SMTP/IMAP).
# wget: lo usa el healthcheck de mas abajo.
RUN apk add --no-cache ca-certificates wget \
 && adduser -D -u 1000 app

WORKDIR /app
COPY --from=builder /out/sge-london-eye /app/sge-london-eye

# La carpeta de uploads se monta como volumen desde afuera; se crea
# aca para fijar el dueño y que el usuario "app" pueda escribir.
RUN mkdir -p /app/uploads && chown -R app:app /app

# No corre como root: si algun dia alguien escapa del proceso, cae
# como usuario sin privilegios.
USER app

EXPOSE 8080

# Docker consulta /health cada 30s. Si deja de responder, el
# contenedor se marca "unhealthy" y lo ves en "docker compose ps".
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/v1/health || exit 1

CMD ["/app/sge-london-eye"]
