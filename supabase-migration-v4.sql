-- ============================================================
-- Snap & Print Studio — Migration v4
-- Capacity blocking: blocked dates + daily self-shoot cap
-- Run in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- 1. blocked_dates table — owner marks specific dates as unavailable
CREATE TABLE IF NOT EXISTS blocked_dates (
  date         date PRIMARY KEY,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id)
);

-- 2. studio_settings — single-row config table
CREATE TABLE IF NOT EXISTS studio_settings (
  id                          int PRIMARY KEY DEFAULT 1,
  max_self_shoots_per_day     int,
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO studio_settings (id, max_self_shoots_per_day)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS — blocked_dates
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read blocked_dates" ON blocked_dates;
CREATE POLICY "Public can read blocked_dates"
  ON blocked_dates FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can write blocked_dates" ON blocked_dates;
CREATE POLICY "Authenticated can write blocked_dates"
  ON blocked_dates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. RLS — studio_settings
ALTER TABLE studio_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read studio_settings" ON studio_settings;
CREATE POLICY "Public can read studio_settings"
  ON studio_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can write studio_settings" ON studio_settings;
CREATE POLICY "Authenticated can write studio_settings"
  ON studio_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
