-- ============================================================
-- Snap & Print Studio - Migration v6
-- Privacy hardening for public booking reads + AIOS schedule RPC
-- Run in Supabase SQL Editor after deploying code that uses these RPCs.
-- ============================================================

CREATE OR REPLACE FUNCTION public_get_booking_by_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  client_name text,
  client_phone text,
  client_email text,
  booking_date date,
  booking_time time,
  package_id uuid,
  total_amount numeric,
  downpayment_amount numeric,
  downpayment_paid boolean,
  balance numeric,
  payment_status text,
  booking_status text,
  booking_token uuid,
  notes text,
  receipt_url text,
  session_folder text,
  reminder_sent boolean,
  created_by uuid,
  created_at timestamptz,
  service jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.client_name,
    b.client_phone,
    b.client_email,
    b.booking_date,
    b.booking_time,
    b.package_id,
    b.total_amount,
    b.downpayment_amount,
    b.downpayment_paid,
    b.balance,
    b.payment_status,
    b.booking_status,
    b.booking_token,
    b.notes,
    b.receipt_url,
    b.session_folder,
    b.reminder_sent,
    b.created_by,
    b.created_at,
    CASE
      WHEN s.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'price', s.price,
        'inclusions', s.inclusions,
        'duration_minutes', s.duration_minutes
      )
    END AS service
  FROM bookings b
  LEFT JOIN services s ON s.id = b.package_id
  WHERE b.booking_token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public_get_bookings_for_date(p_date date)
RETURNS TABLE (
  id uuid,
  booking_time time,
  booking_status text,
  service jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.booking_time,
    b.booking_status,
    CASE
      WHEN s.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'name', s.name,
        'category', s.category,
        'duration_minutes', s.duration_minutes
      )
    END AS service
  FROM bookings b
  LEFT JOIN services s ON s.id = b.package_id
  WHERE b.booking_date = p_date
    AND b.booking_status <> 'cancelled'
  ORDER BY b.booking_time ASC;
$$;

CREATE OR REPLACE FUNCTION aios_get_booking_schedule(p_start date, p_end date)
RETURNS TABLE (
  booking_date date,
  booking_time time,
  booking_status text,
  service_name text,
  service_category text,
  service_duration_minutes int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.booking_date,
    b.booking_time,
    b.booking_status,
    s.name AS service_name,
    s.category AS service_category,
    s.duration_minutes AS service_duration_minutes
  FROM bookings b
  LEFT JOIN services s ON s.id = b.package_id
  WHERE b.booking_date >= p_start
    AND b.booking_date <= p_end
    AND b.booking_status <> 'cancelled'
  ORDER BY b.booking_date ASC, b.booking_time ASC;
$$;

GRANT EXECUTE ON FUNCTION public_get_booking_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_get_bookings_for_date(date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION aios_get_booking_schedule(date, date) TO anon, authenticated;

-- Authenticated dashboard reads still use the existing "bookings_all" policy.
DROP POLICY IF EXISTS "Client can view own booking by token" ON bookings;
