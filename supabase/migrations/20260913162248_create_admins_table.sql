/*
# Admin Portal — Admins Table

## Overview
Creates an `admins` table for admin/manager authentication on the /admin route.
The admin portal is separate from the driver app and has its own login.

## New Table
1. **admins** — admin/manager accounts
   - `id` (uuid, PK)
   - `username` (text, unique, not null) — login username
   - `password` (text, not null) — plain password for demo (not production-grade)
   - `display_name` (text, not null) — shown in the admin UI
   - `created_at` (timestamptz)

## Security
RLS enabled with anon+authenticated CRUD (same pattern as other tables —
the app uses anon-key access with no Supabase Auth).

## Seed Data
Inserts a default admin: username `admin`, password `admin123`.

## Notes
1. Passwords are stored in plain text for this demo app. In production, these
   should be hashed server-side.
2. The admin can change their password via the admin panel (updates the row).
*/

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_admins" ON admins;
CREATE POLICY "anon_read_admins"
  ON admins FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_admins" ON admins;
CREATE POLICY "anon_insert_admins"
  ON admins FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_admins" ON admins;
CREATE POLICY "anon_update_admins"
  ON admins FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed default admin
INSERT INTO admins (username, password, display_name)
VALUES ('admin', 'admin123', 'Administrator')
ON CONFLICT (username) DO NOTHING;
