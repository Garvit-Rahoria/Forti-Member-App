-- Migration v25: Add credited_inr_amount and exchange_rate to portal_payments

ALTER TABLE portal_payments
  ADD COLUMN IF NOT EXISTS credited_inr_amount DECIMAL(12,2) DEFAULT NULL COMMENT 'INR equivalent credited by admin for forex payments' AFTER currency,
  ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT NULL COMMENT 'Exchange rate used for INR conversion' AFTER credited_inr_amount;
