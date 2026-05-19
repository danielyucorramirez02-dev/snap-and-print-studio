-- ============================================================
-- Snap & Print Studio - Migration v9
-- Multiple partial-day blocked time ranges per date
-- Run in Supabase SQL Editor before using multiple time blocks.
-- ============================================================

CREATE TABLE IF NOT EXISTS blocked_time_slots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id),
  CONSTRAINT blocked_time_slots_time_range_check CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_blocked_time_slots_date_time
  ON blocked_time_slots (date, start_time, end_time);

ALTER TABLE blocked_time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read blocked_time_slots" ON blocked_time_slots;
CREATE POLICY "Public can read blocked_time_slots"
  ON blocked_time_slots FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can write blocked_time_slots" ON blocked_time_slots;
CREATE POLICY "Authenticated can write blocked_time_slots"
  ON blocked_time_slots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Move any v8 timed block stored on blocked_dates into blocked_time_slots.
INSERT INTO blocked_time_slots (date, start_time, end_time, reason, created_at, created_by)
SELECT date, start_time, end_time, reason, created_at, created_by
FROM blocked_dates
WHERE start_time IS NOT NULL
  AND end_time IS NOT NULL
ON CONFLICT DO NOTHING;

-- Keep blocked_dates as the whole-day blocking table going forward.
UPDATE blocked_dates
SET start_time = NULL,
    end_time = NULL
WHERE start_time IS NOT NULL
   OR end_time IS NOT NULL;
