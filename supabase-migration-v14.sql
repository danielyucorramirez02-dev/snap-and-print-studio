-- ============================================================
-- Snap & Print Studio - Migration v14
-- Add owner-managed navigation destinations to bookings.
-- Run in Supabase SQL Editor after v13.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS navigation_label text,
  ADD COLUMN IF NOT EXISTS navigation_latitude double precision,
  ADD COLUMN IF NOT EXISTS navigation_longitude double precision;

NOTIFY pgrst, 'reload schema';
