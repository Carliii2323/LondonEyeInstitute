-- name: GetSettings :one
-- Versión reducida para los servicios/crons que solo necesitan estos campos.
SELECT monthly_due_day, no_payment_months, grade_grace_days_january
FROM institute_settings WHERE id = 1;

-- name: GetInstituteSettings :one
-- Versión completa para el endpoint GET /admin/settings.
SELECT name, legal_name, cuit, phone, address, email,
    monthly_due_day, grace_days, late_fee_kind, late_fee_value,
    no_payment_months, grade_grace_days_january, cbu, alias, account_holder, updated_at
FROM institute_settings WHERE id = 1;

-- name: UpdateSettings :exec
UPDATE institute_settings
SET name = $1, legal_name = $2, cuit = $3, phone = $4, address = $5, email = $6,
    monthly_due_day = $7, grace_days = $8, late_fee_kind = $9, late_fee_value = $10,
    no_payment_months = $11, grade_grace_days_january = $12,
    cbu = $13, alias = $14, account_holder = $15, updated_at = NOW()
WHERE id = 1;
