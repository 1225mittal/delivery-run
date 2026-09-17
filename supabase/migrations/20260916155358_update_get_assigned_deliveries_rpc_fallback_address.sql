/*
# Update get_assigned_deliveries RPC to fall back to address book

## Overview
When a delivery's own `address` field is empty (which happens when
orders are created via the Counter Order tab with only a flat number),
the rider sees a blank address on their dashboard. This update makes
the RPC fall back to the linked `addresses.full_address` when the
delivery's address is empty, and also returns the address book's
landmark as a fallback.

## Changes
1. Replaces `get_assigned_deliveries` to LEFT JOIN the `addresses`
   table and use COALESCE to fall back to `addresses.full_address`
   when `d.address` is empty.
2. Same fallback for `landmark`.
3. Returns `address_id` (already added in prior migration).

## Notes
1. Uses DROP + CREATE for idempotency.
2. SECURITY DEFINER with explicit search_path = public.
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
    COALESCE(NULLIF(d.address, ''), a.full_address, '') AS address,
    COALESCE(d.landmark, a.landmark) AS landmark,
    d.bill_amount,
    COALESCE(d.latitude, a.latitude) AS latitude,
    COALESCE(d.longitude, a.longitude) AS longitude,
    d.status,
    d.assigned_to,
    d.created_at,
    d.flat_house_no,
    d.packets_count,
    d.address_id
  FROM deliveries d
  LEFT JOIN addresses a ON a.id = d.address_id
  WHERE d.assigned_to = p_delivery_boy_id
    AND d.status = 'assigned'
  ORDER BY d.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_assigned_deliveries(uuid) TO anon, authenticated;
