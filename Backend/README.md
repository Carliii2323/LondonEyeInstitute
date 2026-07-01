# SGE London Eye — Backend

Sistema de Gestión Educativa para **London Eye English Institute**. API REST que gestiona estudiantes, docentes, cursos, inscripciones, asistencia, calificaciones, pagos (con cuotas automáticas y recargos), calendario, notificaciones, certificados, dashboard y configuración del instituto.

---

## Stack

| Componente | Tecnología |
|---|---|
| Lenguaje | Go 1.25 |
| Framework HTTP | Gin |
| Base de datos | PostgreSQL |
| Acceso a datos | sqlc (código type-safe generado desde SQL) + pgx/v5 |
| Autenticación | JWT (HMAC-SHA256) + refresh tokens rotativos |
| Hashing | bcrypt (cost 12) |
| Jobs programados | robfig/cron/v3 |

Arquitectura en capas estricta: **SQL → sqlc → DTO → Service → Handler → Routes**. Ningún handler tiene lógica de negocio; ningún service escribe JSON.

---

## Requisitos

- **Go 1.25+**
- **PostgreSQL 14+** (usa `gen_random_uuid()`, arrays, `EXTRACT`)
- **sqlc** — `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`
- **psql** en el PATH (para aplicar migraciones)
- `make` (opcional, los comandos se pueden correr a mano)

---

## Setup paso a paso

```bash
# 1. Variables de entorno
cp .env.example .env
#    Editá .env: DATABASE_URL real y un JWT_SECRET seguro

# 2. Crear la base de datos (si no existe)
createdb londoneye        # o: psql -c "CREATE DATABASE londoneye;"

# 3. Aplicar las migraciones (asume BD limpia)
make migrate-up           # aplica 001, 002 y 003 en orden

# 4. Dependencias
make deps                 # go mod tidy + download

# 5. Generar el código de sqlc (si modificaste queries)
make sqlc-gen

# 6. Correr el servidor
make run                  # → "servidor corriendo en :8080"
```

Verificá: `GET http://localhost:8080/api/v1/health` → `{"status":"ok"}`.

### Crear el primer admin

No hay endpoint público para crear admins (el auto-registro crea solo estudiantes). El primer admin se inserta directo en la BD con una contraseña hasheada con bcrypt:

```sql
INSERT INTO users (email, password_hash, role, first_name, last_name, status)
VALUES ('admin@londoneye.com', '<hash-bcrypt>', 'admin', 'Admin', 'Sistema', 'active');
```

Para generar el `<hash-bcrypt>`, un mini programa Go:

```go
package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	h, _ := bcrypt.GenerateFromPassword([]byte("TuPasswordSeguro"), 12)
	fmt.Println(string(h))
}
```

Después, `POST /api/v1/auth/login` con esas credenciales devuelve el `access_token`.

---

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `8080` | Puerto HTTP |
| `ENV` | `development` | `production` activa el modo release de Gin |
| `DATABASE_URL` | — (**obligatoria**) | DSN de PostgreSQL (`postgres://user:pass@host:5432/db`) |
| `JWT_SECRET` | — (**obligatoria**) | Secreto para firmar los JWT. El server no arranca si está vacío |
| `JWT_EXPIRY_MINUTES` | `15` | Vida del access token |
| `REFRESH_TOKEN_EXPIRY_DAYS` | `7` | Vida del refresh token |
| `STORAGE_DRIVER` | `local` | Driver de archivos (hoy solo `local`) |
| `STORAGE_PATH` | `./uploads` | Carpeta de avatares y comprobantes |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Orígenes CORS permitidos (separados por coma) |

---

## Comandos (Makefile)

| Comando | Qué hace |
|---|---|
| `make run` | Corre el servidor |
| `make build` | Compila el binario `sge-london-eye` |
| `make migrate-up` | Aplica las migraciones en orden (BD limpia) |
| `make migrate-down` | Revierte las migraciones en orden inverso |
| `make sqlc-gen` | Regenera el código Go desde las queries SQL |
| `make lint` | `golangci-lint run ./...` |
| `make test` | `go test ./... -v` |
| `make deps` | `go mod tidy` + `go mod download` |

> **Migraciones:** se aplican con `psql` directo, sin herramienta de tracking. `migrate-up` asume una BD limpia. Si tu BD ya tiene parte aplicada, corré manualmente solo la migración que falte (`psql "$DATABASE_URL" -f migrations/00X_*.up.sql`).

---

## Estructura del proyecto

```
Backend/
├── cmd/api/main.go              # punto de entrada (composition root)
├── migrations/                  # 001 schema · 002 grade grace · 003 late fee check
├── sqlc.yaml                    # config de generación (lista las 3 migraciones como schema)
└── internal/
    ├── config/                  # carga de variables de entorno
    ├── auth/                    # JWT + bcrypt
    ├── db/
    │   ├── connection.go        # pool pgx
    │   ├── queries/             # *.sql — fuente de verdad de las queries
    │   └── sqlc/                # generado por sqlc (NO editar a mano)
    ├── dto/                     # contratos de request/response (sin lógica)
    ├── services/                # lógica de negocio + helpers compartidos
    ├── handlers/                # capa HTTP (bind → service → JSON)
    ├── middleware/              # Auth, RBAC, CORS, Logger, Recovery
    ├── storage/                 # interfaz Storage + LocalStorage
    ├── cron/                    # scheduler de jobs (cuotas, vencidas, limpieza)
    └── server/                  # motor Gin + registro de rutas
```

---

## API — resumen

Prefijo: `/api/v1`. Salvo `health`, `register`, `login` y `refresh`, todo requiere `Authorization: Bearer <access_token>`.

### Autenticación (`/auth`)
`POST /register` (alumno, queda `pending`) · `POST /login` · `POST /refresh` · `POST /logout` · `GET /me`

El flujo: `login` devuelve `access_token` (15 min) + `refresh_token` (7 días). Cuando el access expira, `POST /refresh` con el refresh token devuelve un par nuevo (rotación: el viejo se revoca). El alumno auto-registrado queda `pending` hasta que un admin lo apruebe.

### Perfil (`/profile`)
`GET` · `PUT` (datos) · `PUT /password` · `PUT /avatar` (multipart)

### Admin (`/admin/*` — rol `admin`)
- **Estudiantes:** CRUD + `:id/status`, `:id/approve`, `:id/grades`, `:id/attendance`, `:id/payments`
- **Docentes:** CRUD + `:id/status`
- **Cursos:** CRUD + `:id/status`, `:id/students`
- **Inscripciones:** listar, inscribir (genera cuota del mes), dar de baja
- **Pagos:** listar (filtros), pendientes, detalle, cargo adicional, aprobar/rechazar
- **Asistencia:** sesión por curso+fecha, guardar masivo, anual, historial
- **Calificaciones:** ver/guardar por curso+año (notas + recuperatorios)
- **Calendario / Notificaciones:** CRUD de eventos y notificaciones
- **Certificados:** emitir (verifica cuotas pagas), listar
- **Dashboard:** `stats`, `activity`, `events`
- **Configuración:** `GET`/`PUT settings`
- **Cron:** `POST /cron/run/:job` (trigger manual)

### Docente (`/teacher/*` — rol `teacher`)
`courses` · `grades` (sus cursos, año en curso) · `attendance` (sus cursos, ventana 2 meses)

### Estudiante (`/student/*` — rol `student`)
`grades` · `attendance` · `payments` + `payments/:id/receipt` (subir comprobante) · `certificates`

### Lectura compartida (cualquier rol autenticado, filtrada por rol)
`GET /calendar/events` · `GET /notifications`

---

## Jobs de cron

Registrados en `main.go`, corren en background y se pueden disparar a mano vía `POST /admin/cron/run/:job`:

| Job | Schedule | Qué hace |
|---|---|---|
| `monthly-invoices` | 1° de mes 02:00 | Genera la cuota del mes para cada inscripción activa (respeta `no_payment_months`) |
| `overdue-payments` | diario 03:00 | Marca vencidas las cuotas `pending` + aplica recargo |
| `cleanup-tokens` | diario 04:00 | Borra refresh tokens expirados/revocados |

Todos idempotentes: re-ejecutarlos no duplica efectos.

---

## Convenciones y documentación

- **`Documentos/SGE-London-Eye-Backend-Convenciones.md`** — decisiones transversales (representación de decimales, ownership, ventanas editables, alcance de datos, migraciones).
- **`Documentos/sprints/sprint-0.md` … `sprint-6.md`** — bitácora de cada sprint: qué se construyó, decisiones, código clave, correcciones de code review y verificación.

---

## Pendiente

- Tests automatizados (services con lógica crítica: elegibilidad de certificados, late fee, idempotencia de crons, transacción de inscripción).
- Observabilidad: logging estructurado + request IDs.
- Rate limiting en `/auth/*`.
