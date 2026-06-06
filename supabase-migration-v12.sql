-- ============================================================
-- Snap & Print Studio - Migration v12
-- Add internal staff notes, attendance/no-show, and cancel reason.
-- Run in Supabase SQL Editor after v11 when ready to enable these features.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS attendance_status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_by uuid REFERENCES profiles(id);

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_attendance_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_attendance_status_check
  CHECK (attendance_status IN ('scheduled', 'arrived', 'no_show'));

UPDATE bookings
SET attendance_status = 'scheduled'
WHERE attendance_status IS NULL;

DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (
    created_by IS NULL
    AND booking_status = 'pending'
    AND production_status = 'not_started'
    AND attendance_status = 'scheduled'
    AND internal_notes IS NULL
    AND cancel_reason IS NULL
    AND cancelled_at IS NULL
    AND cancelled_by IS NULL
    AND no_show_at IS NULL
    AND no_show_by IS NULL
    AND downpayment_paid = false
    AND payment_status IN ('unpaid', 'partial', 'paid')
  );

-- Refresh Supabase/PostgREST schema cache so the API sees the new columns.
NOTIFY pgrst, 'reload schema';
