/*
# Address Book + Delivery Enhancements + Closed Status

## Overview
1. Creates a new `addresses` table for a customer address book.
2. Adds `flat_house_no` and `packets_count` columns to `deliveries`.
3. Drops and recreates the `get_assigned_deliveries` RPC to include
   `packets_count` and to return deliveries with status IN
   ('assigned', 'delivered') so the driver sees delivered orders
   until admin closes them.

## New Tables
- `addresses` — customer address book with flat/house no, name, phone,
  full address, landmark, and optional lat/lng.

## Modified Tables
- `deliveries` — added `flat_house_no` (text) and `packets_count`
  (integer, default 1).

## Security
- RLS enabled on `addresses` with anon+authenticated full CRUD.

## Notes
1. The `get_assigned_deliveries` function is dropped and recreated to
   also return `packets_count` and include status 'delivered' alongside
   'assigned'. Orders with status 'closed' are excluded.
*/

-- ============================================================
-- 1. addresses table
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_house_no text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  full_address text NOT NULL,
  landmark text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_addresses" ON addresses;
CREATE POLICY "anon_select_addresses"
  ON addresses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_addresses" ON addresses;
CREATE POLICY "anon_insert_addresses"
  ON addresses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_addresses" ON addresses;
CREATE POLICY "anon_update_addresses"
  ON addresses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_addresses" ON addresses;
CREATE POLICY "anon_delete_addresses"
  ON addresses FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_addresses_flat_house_no ON addresses(flat_house_no);

-- ============================================================
-- 2. Add columns to deliveries
-- ============================================================
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS flat_house_no text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS packets_count integer NOT NULL DEFAULT 1;

-- ============================================================
-- 3. Replace get_assigned_deliveries to include packets_count
--    and return both 'assigned' and 'delivered' statuses
-- ============================================================
DROP FUNCTION IF EXISTS get_assigned_deliveries(uuid);

CREATE FUNCTION get_assigned_deliveries(p_delivery_boy_id uuid)
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
  created_at timestamptz,
  packets_count integer
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
    d.created_at,
    d.packets_count
  FROM deliveries d
  WHERE d.assigned_to = p_delivery_boy_id
    AND d.status IN ('assigned', 'delivered')
  ORDER BY
    CASE WHEN d.status = 'assigned' THEN 0 ELSE 1 END,
    d.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_assigned_deliveries(uuid) TO anon, authenticated;
