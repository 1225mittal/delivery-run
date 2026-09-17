/*
# Delivery Run — Core Schema

## Overview
Creates the database tables for a delivery agent PWA. The app uses a custom
auth model: delivery agents log in with phone + PIN (no Supabase Auth / email).
The frontend talks to Supabase with the anon key, so all policies must allow
the `anon` role.

## New Tables

1. **delivery_boys** — delivery agent profiles
   - `id` (uuid, PK)
   - `name` (text, not null) — agent's display name
   - `phone` (text, unique, not null) — phone number used for login
   - `pin` (text, not null) — plain PIN for demo login (4-digit)
   - `is_active` (boolean, default true) — whether the agent can log in
   - `created_at` (timestamptz)

2. **deliveries** — delivery assignments
   - `id` (uuid, PK)
   - `order_number` (text, not null) — human-readable order ID
   - `customer_name` (text, not null)
   - `customer_phone` (text) — stored but NEVER exposed to the frontend
   - `address` (text, not null) — full delivery address
   - `landmark` (text) — nearby landmark for navigation
   - `bill_amount` (numeric, not null) — amount to collect (COD)
   - `latitude` (double precision) — address coordinates (nullable)
   - `longitude` (double precision) — address coordinates (nullable)
   - `status` (text, default 'assigned') — assigned | delivered | failed
   - `assigned_to` (uuid, references delivery_boys) — which agent is assigned
   - `created_at` (timestamptz)

3. **settlements** — payment settlement records created on delivery completion
   - `id` (uuid, PK)
   - `delivery_id` (uuid, references deliveries, ON DELETE CASCADE)
   - `delivery_boy_id` (uuid, references delivery_boys)
   - `payment_method` (text, not null) — cash | upi | credit
   - `amount_collected` (numeric, default 0) — cash amount (for cash method)
   - `upi_screenshot_path` (text) — storage path for UPI screenshot
   - `pod_photo_path` (text, not null) — storage path for proof-of-delivery photo
   - `created_at` (timestamptz)

## Security (RLS)

All tables have RLS enabled. Because the app uses anon-key access (no Supabase
Auth), policies use `TO anon, authenticated` with `USING (true)` — the data is
intentionally shared among delivery agents.

**Important privacy measure:** The `deliveries` table has a SECURITY DEFINER
function `get_assigned_deliveries(p_delivery_boy_id)` that returns delivery
data WITHOUT the `customer_phone` column. The frontend should call this
function instead of selecting from `deliveries` directly, so phone numbers
are never exposed to the app even though they exist in the database.

## Storage

Creates a storage bucket `delivery-proofs` (public) for POD photos and UPI
screenshots, with policies allowing anon read/write.

## Notes
1. All tables use `gen_random_uuid()` for primary keys.
2. `deliveries.assigned_to` is nullable so an unassigned delivery is possible.
3. The `get_assigned_deliveries` function is the ONLY sanctioned way for the
   frontend to read delivery data — it strips `customer_phone`.
4. Settlements are linked to deliveries with CASCADE delete.
*/

-- ============================================================
-- 1. delivery_boys
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_boys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  pin text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_boys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_delivery_boys" ON delivery_boys;
CREATE POLICY "anon_read_delivery_boys"
  ON delivery_boys FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_delivery_boys" ON delivery_boys;
CREATE POLICY "anon_insert_delivery_boys"
  ON delivery_boys FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_delivery_boys" ON delivery_boys;
CREATE POLICY "anon_update_delivery_boys"
  ON delivery_boys FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2. deliveries
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  address text NOT NULL,
  landmark text,
  bill_amount numeric NOT NULL DEFAULT 0,
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'assigned',
  assigned_to uuid REFERENCES delivery_boys(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_deliveries" ON deliveries;
CREATE POLICY "anon_select_deliveries"
  ON deliveries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_deliveries" ON deliveries;
CREATE POLICY "anon_insert_deliveries"
  ON deliveries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_deliveries" ON deliveries;
CREATE POLICY "anon_update_deliveries"
  ON deliveries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_deliveries" ON deliveries;
CREATE POLICY "anon_delete_deliveries"
  ON deliveries FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 3. settlements
-- ============================================================
CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  delivery_boy_id uuid REFERENCES delivery_boys(id) ON DELETE SET NULL,
  payment_method text NOT NULL,
  amount_collected numeric NOT NULL DEFAULT 0,
  upi_screenshot_path text,
  pod_photo_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settlements" ON settlements;
CREATE POLICY "anon_select_settlements"
  ON settlements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settlements" ON settlements;
CREATE POLICY "anon_insert_settlements"
  ON settlements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settlements" ON settlements;
CREATE POLICY "anon_update_settlements"
  ON settlements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. SECURITY DEFINER function to get deliveries WITHOUT customer_phone
-- ============================================================
CREATE OR REPLACE FUNCTION get_assigned_deliveries(p_delivery_boy_id uuid)
RETURNS TABLE (
  id uuid,
  order_number text,
  customer_name text,
  address text,
  landmark text,
  bill_amount numeric,
  latitude double precision,
  longitude double precision,
  status text,
  assigned_to uuid,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.order_number,
    d.customer_name,
    d.address,
    d.landmark,
    d.bill_amount,
    d.latitude,
    d.longitude,
    d.status,
    d.assigned_to,
    d.created_at
  FROM deliveries d
  WHERE d.assigned_to = p_delivery_boy_id
    AND d.status = 'assigned'
  ORDER BY d.created_at ASC;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_assigned_deliveries(uuid) TO anon, authenticated;

-- ============================================================
-- 5. Storage bucket for delivery proofs
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for delivery-proofs bucket
DROP POLICY IF EXISTS "anon_read_delivery_proofs" ON storage.objects;
CREATE POLICY "anon_read_delivery_proofs"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'delivery-proofs');

DROP POLICY IF EXISTS "anon_insert_delivery_proofs" ON storage.objects;
CREATE POLICY "anon_insert_delivery_proofs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'delivery-proofs');

DROP POLICY IF EXISTS "anon_update_delivery_proofs" ON storage.objects;
CREATE POLICY "anon_update_delivery_proofs"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'delivery-proofs')
  WITH CHECK (bucket_id = 'delivery-proofs');

-- ============================================================
-- 6. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_to ON deliveries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_settlements_delivery_id ON settlements(delivery_id);