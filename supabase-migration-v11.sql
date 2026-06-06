-- ============================================================
-- Snap & Print Studio - Migration v11
-- Add internal booking production lifecycle.
-- Run in Supabase SQL Editor before using the dashboard lifecycle buttons.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS production_status text NOT NULL DEFAULT 'not_started';

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_production_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_production_status_check
  CHECK (production_status IN ('not_started', 'shoot_done', 'editing', 'ready', 'delivered'));

UPDATE bookings
SET production_status = 'not_started'
WHERE production_status IS NULL;

DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (
    created_by IS NULL
    AND booking_status = 'pending'
    AND production_status = 'not_started'
    AND downpayment_paid = false
    AND payment_status IN ('unpaid', 'partial', 'paid')
  );

-- Refresh Supabase/PostgREST schema cache so the API sees the new column.
NOTIFY pgrst, 'reload schema';
