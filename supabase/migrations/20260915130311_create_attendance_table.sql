/*
# Attendance Punch-In / Punch-Out Table

## Overview
Creates an `attendance` table to track delivery boy punch-in and punch-out
events with GPS coordinates. The app uses anon-key access (no Supabase Auth),
so policies use `TO anon, authenticated` with `USING (true)` — consistent
with the rest of the schema.

## New Tables

1. **attendance** — punch in/out records
   - `id` (uuid, PK)
   - `delivery_boy_id` (uuid, references delivery_boys, ON DELETE CASCADE)
   - `punch_type` (text, not null) — 'punch_in' | 'punch_out'
   - `latitude` (double precision, not null) — GPS latitude at punch time
   - `longitude` (double precision, not null) — GPS longitude at punch time
   - `recorded_at` (timestamptz, not null) — when the punch occurred

## Security (RLS)
RLS enabled. Anon + authenticated roles have full CRUD access, consistent
with the existing delivery_boys / deliveries / settlements tables.

## Indexes
- `idx_attendance_delivery_boy_id` — filter by delivery boy
- `idx_attendance_recorded_at` — filter by date / sort chronologically
*/

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_boy_id uuid NOT NULL REFERENCES delivery_boys(id) ON DELETE CASCADE,
  punch_type text NOT NULL CHECK (punch_type IN ('punch_in', 'punch_out')),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_attendance" ON attendance;
CREATE POLICY "anon_select_attendance"
  ON attendance FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_attendance" ON attendance;
CREATE POLICY "anon_insert_attendance"
  ON attendance FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_attendance" ON attendance;
CREATE POLICY "anon_update_attendance"
  ON attendance FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_attendance" ON attendance;
CREATE POLICY "anon_delete_attendance"
  ON attendance FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_attendance_delivery_boy_id ON attendance(delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_at ON attendance(recorded_at);
