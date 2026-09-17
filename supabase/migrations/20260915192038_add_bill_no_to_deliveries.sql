ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS bill_no text;

CREATE INDEX IF NOT EXISTS idx_deliveries_bill_no ON deliveries(bill_no);

-- Backfill bill_no for existing rows from order_number
UPDATE deliveries SET bill_no = order_number WHERE bill_no IS NULL;
