/*
# Add address_id to deliveries

## Overview
Adds an `address_id` foreign key column to the `deliveries` table so each
delivery can be linked to a row in the `addresses` address book.

## Modified Tables
- `deliveries` — added `address_id` (uuid, nullable, references addresses
  ON DELETE SET NULL).

## Notes
- Nullable because existing deliveries won't have an address_id, and some
  orders may be created without an address book entry.
*/

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS address_id uuid REFERENCES addresses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_address_id ON deliveries(address_id);
