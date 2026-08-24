ALTER TABLE inbound_receipts
  DROP COLUMN IF EXISTS detected_dni,
  DROP COLUMN IF EXISTS detected_amount;
