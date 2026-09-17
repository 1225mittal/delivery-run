/*
# Update get_assigned_deliveries RPC to return address_id

## Overview
The rider dashboard needs `address_id` so that when a delivery boy pins
their GPS location, the coordinates can be saved back to the `addresses`
table (not just the individual delivery). This makes the location
reusable for all future orders to the same address.

## Changes
- Adds `address_id uuid` to the RETURN TABLE column list of
  `get_assigned_deliveries`.
- Adds `d.address_id` to the SELECT query.

## Notes
1. The `deliveries.address_id` column already exists (added in a prior
   migration). Only the RPC return signature was missing it.
2. Re-uses DROP + CREATE to make the migration idempotent.
*/

DROP FUNCTION IF EXISTS get_assigned_deliveries(uuid);

CREATE OR REPLACE FUNCTION get_assigned_deliveries(p_delivery_boy_id uuid)
RETURNS TABLE (
  id uuid,
  order_number text,
  bill_no text,
  customer_name text,
  address text,
  landmark text,
  bill_amount numeric,
  latitude double precision,
  longitude double precision,
  status text,
  assigned_to uuid,
  created_at timestamptz,
  flat_house_no text,
  packets_count integer,
  address_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.order_number,
    d.bill_no,
    d.customer_name,
    d.address,
    d.landmark,
    d.bill_amount,
    d.latitude,
    d.longitude,
    d.status,
    d.assigned_to,
    d.created_at,
    d.flat_house_no,
    d.packets_count,
    d.address_id
  FROM deliveries d
  WHERE d.assigned_to = p_delivery_boy_id
    AND d.status = 'assigned'
  ORDER BY d.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_assigned_deliveries(uuid) TO anon, authenticated;
