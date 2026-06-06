-- ============================================================
-- Snap & Print Studio - Migration v13
-- Expose public-safe production status on booking token pages.
-- Run in Supabase SQL Editor after v12 when ready.
-- ============================================================

DROP FUNCTION IF EXISTS public_get_booking_by_token(uuid);

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
  production_status text,
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
    b.production_status,
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

GRANT EXECUTE ON FUNCTION public_get_booking_by_token(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
