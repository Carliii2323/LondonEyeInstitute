.PHONY: run build migrate-up migrate-down sqlc-gen seed lint test deps

run:
	go run ./cmd/api/main.go

build:
	go build -o sge-london-eye ./cmd/api/main.go

# migrate-up asume una base de datos limpia y aplica las migraciones en orden.
migrate-up:
	psql "$(DATABASE_URL)" -f migrations/001_init_schema.up.sql
	psql "$(DATABASE_URL)" -f migrations/002_add_grade_grace_days.up.sql
	psql "$(DATABASE_URL)" -f migrations/003_late_fee_percentage_check.up.sql
	psql "$(DATABASE_URL)" -f migrations/004_simplify_grades.up.sql
	psql "$(DATABASE_URL)" -f migrations/005_certificate_hours.up.sql
	psql "$(DATABASE_URL)" -f migrations/006_libreta_requests.up.sql
	psql "$(DATABASE_URL)" -f migrations/007_payment_anulado.up.sql
	psql "$(DATABASE_URL)" -f migrations/008_payment_derechos.up.sql
	psql "$(DATABASE_URL)" -f migrations/009_payment_method.up.sql
	psql "$(DATABASE_URL)" -f migrations/010_course_derechos.up.sql
	psql "$(DATABASE_URL)" -f migrations/011_course_classroom.up.sql

# migrate-down revierte en orden inverso.
migrate-down:
	psql "$(DATABASE_URL)" -f migrations/011_course_classroom.down.sql
	psql "$(DATABASE_URL)" -f migrations/010_course_derechos.down.sql
	psql "$(DATABASE_URL)" -f migrations/009_payment_method.down.sql
	psql "$(DATABASE_URL)" -f migrations/008_payment_derechos.down.sql
	psql "$(DATABASE_URL)" -f migrations/007_payment_anulado.down.sql
	psql "$(DATABASE_URL)" -f migrations/006_libreta_requests.down.sql
	psql "$(DATABASE_URL)" -f migrations/005_certificate_hours.down.sql
	psql "$(DATABASE_URL)" -f migrations/004_simplify_grades.down.sql
	psql "$(DATABASE_URL)" -f migrations/003_late_fee_percentage_check.down.sql
	psql "$(DATABASE_URL)" -f migrations/002_add_grade_grace_days.down.sql
	psql "$(DATABASE_URL)" -f migrations/001_init_schema.down.sql

sqlc-gen:
	sqlc generate

lint:
	golangci-lint run ./...

test:
	go test ./... -v

deps:
	go mod tidy
	go mod download
