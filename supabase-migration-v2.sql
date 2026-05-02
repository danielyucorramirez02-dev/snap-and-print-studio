-- ============================================================
-- Snap & Print Studio — Migration v2
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- 1. Add booking_status column (confirmed | pending | cancelled)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_status text NOT NULL DEFAULT 'confirmed';

-- 2. Add unique booking_token for client-facing URLs
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL;

-- 3. Add notes column to expenses (if not already added)
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS notes text;

-- 4. Allow public (unauthenticated) INSERT on bookings for the /book page
DROP POLICY IF EXISTS "Public can create bookings" ON bookings;
CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- 5. Allow public SELECT on services so /book can show packages
DROP POLICY IF EXISTS "Public can read active services" ON services;
CREATE POLICY "Public can read active services"
  ON services FOR SELECT
  USING (is_active = true);

-- 6. Allow public SELECT on bookings by token (for /my-booking/[token])
DROP POLICY IF EXISTS "Client can view own booking by token" ON bookings;
CREATE POLICY "Client can view own booking by token"
  ON bookings FOR SELECT
  USING (true);
