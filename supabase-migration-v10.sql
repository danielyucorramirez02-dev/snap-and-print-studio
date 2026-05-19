-- ============================================================
-- Snap & Print Studio - Migration v10
-- Restore safe public booking creation after RLS hardening.
-- Run in Supabase SQL Editor if customers see:
-- "new row violates row-level security policy for table bookings"
-- ============================================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (
    created_by IS NULL
    AND booking_status = 'pending'
    AND downpayment_paid = false
    AND payment_status IN ('unpaid', 'partial', 'paid')
  );

DROP POLICY IF EXISTS "Authenticated can create bookings" ON bookings;
CREATE POLICY "Authenticated can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

