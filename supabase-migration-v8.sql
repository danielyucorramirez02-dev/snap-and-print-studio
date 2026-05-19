-- ============================================================
-- Snap & Print Studio - Migration v8
-- Partial-day blocking for blocked_dates
-- Run in Supabase SQL Editor before using timed blocks in Settings.
-- ============================================================

ALTER TABLE blocked_dates
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time;

ALTER TABLE blocked_dates
  DROP CONSTRAINT IF EXISTS blocked_dates_time_range_check;

ALTER TABLE blocked_dates
  ADD CONSTRAINT blocked_dates_time_range_check
  CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  );

CREATE INDEX IF NOT EXISTS idx_blocked_dates_date_time
  ON blocked_dates (date, start_time, end_time);
