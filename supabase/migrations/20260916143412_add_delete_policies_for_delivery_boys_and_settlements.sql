CREATE POLICY "anon_delete_delivery_boys"
  ON delivery_boys FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon_delete_settlements"
  ON settlements FOR DELETE
  TO anon, authenticated
  USING (true);
