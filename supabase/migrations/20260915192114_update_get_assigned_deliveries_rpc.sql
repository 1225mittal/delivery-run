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
  packets_count integer
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
    d.packets_count
  FROM deliveries d
  WHERE d.assigned_to = p_delivery_boy_id
    AND d.status = 'assigned'
  ORDER BY d.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_assigned_deliveries(uuid) TO anon, authenticated;
