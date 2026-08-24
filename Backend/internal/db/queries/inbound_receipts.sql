-- name: CreateInboundReceipt :execrows
-- Idempotente por message_uid (el poller puede reprocesar sin duplicar).
INSERT INTO inbound_receipts (
    from_email, student_id, subject, body_excerpt,
    attachment_url, attachment_filename, message_uid, status, received_at,
    detected_dni, detected_amount
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (message_uid) DO NOTHING;

-- name: ListInboundReceipts :many
SELECT
    r.id, r.from_email, r.subject, r.body_excerpt, r.attachment_filename,
    r.status, r.received_at, r.student_id, r.linked_payment_id,
    r.detected_dni, r.detected_amount,
    COALESCE(u.first_name, '') AS first_name,
    COALESCE(u.last_name, '')  AS last_name,
    COALESCE(u.email, '')      AS student_email
FROM inbound_receipts r
LEFT JOIN users u ON u.id = r.student_id
WHERE ($1::text = '' OR r.status = $1::text)
ORDER BY r.received_at DESC
LIMIT 500;

-- name: GetInboundReceiptByID :one
SELECT id, from_email, student_id, subject, body_excerpt, attachment_url,
       attachment_filename, message_uid, status, linked_payment_id, received_at, created_at,
       detected_dni, detected_amount
FROM inbound_receipts
WHERE id = $1 LIMIT 1;

-- name: SetInboundReceiptLinked :exec
UPDATE inbound_receipts
SET status = 'vinculado', linked_payment_id = $2, student_id = COALESCE(student_id, $3)
WHERE id = $1;

-- name: SetInboundReceiptDiscarded :exec
UPDATE inbound_receipts
SET status = 'descartado'
WHERE id = $1;
