-- ============================================================
-- Snap & Print Studio — Database Migration
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- -------------------------
-- PROFILES
-- -------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name   text NOT NULL,
  role        text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -------------------------
-- SERVICES
-- -------------------------
CREATE TABLE IF NOT EXISTS services (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  description       text,
  price             numeric(10,2) NOT NULL,
  duration_minutes  int NOT NULL DEFAULT 60,
  inclusions        text[] DEFAULT '{}',
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

-- -------------------------
-- BOOKINGS
-- -------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name         text NOT NULL,
  client_phone        text NOT NULL,
  client_email        text,
  booking_date        date NOT NULL,
  booking_time        time NOT NULL,
  package_id          uuid REFERENCES services(id) ON DELETE SET NULL,
  total_amount        numeric(10,2) NOT NULL DEFAULT 0,
  downpayment_amount  numeric(10,2) NOT NULL DEFAULT 0,
  downpayment_paid    boolean NOT NULL DEFAULT false,
  balance             numeric(10,2) GENERATED ALWAYS AS (total_amount - downpayment_amount) STORED,
  payment_status      text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  notes               text,
  session_folder      text,
  reminder_sent       boolean NOT NULL DEFAULT false,
  created_by          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now()
);

-- -------------------------
-- PAYMENT HISTORY
-- -------------------------
CREATE TABLE IF NOT EXISTS payment_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount          numeric(10,2) NOT NULL,
  payment_method  text NOT NULL CHECK (payment_method IN ('cash', 'gcash', 'bank')),
  payment_date    date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- -------------------------
-- INVENTORY
-- -------------------------
CREATE TABLE IF NOT EXISTS inventory (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name             text NOT NULL,
  quantity              numeric(10,2) NOT NULL DEFAULT 0,
  unit                  text NOT NULL DEFAULT 'pcs',
  unit_cost             numeric(10,2) NOT NULL DEFAULT 0,
  selling_price         numeric(10,2) NOT NULL DEFAULT 0,
  low_stock_threshold   numeric(10,2) NOT NULL DEFAULT 10,
  supplier              text,
  last_restocked        date,
  created_at            timestamptz DEFAULT now()
);

-- -------------------------
-- EXPENSES
-- -------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL CHECK (category IN ('supplies', 'utilities', 'equipment', 'other')),
  description   text NOT NULL,
  amount        numeric(10,2) NOT NULL,
  expense_date  date NOT NULL DEFAULT CURRENT_DATE,
  receipt_url   text,
  recorded_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses        ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: users can only see their own profile; owners can see all
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR get_my_role() = 'owner');

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- SERVICES: all authenticated users can read; only owners can write
CREATE POLICY "services_select" ON services FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "services_write_owner" ON services FOR ALL
  USING (get_my_role() = 'owner');

-- BOOKINGS: all authenticated users can read/write
CREATE POLICY "bookings_all" ON bookings FOR ALL
  USING (auth.uid() IS NOT NULL);

-- PAYMENT HISTORY: all authenticated users can read/write
CREATE POLICY "payment_history_all" ON payment_history FOR ALL
  USING (auth.uid() IS NOT NULL);

-- INVENTORY: all authenticated users can read/write
CREATE POLICY "inventory_all" ON inventory FOR ALL
  USING (auth.uid() IS NOT NULL);

-- EXPENSES: only owners can read/write
CREATE POLICY "expenses_owner_only" ON expenses FOR ALL
  USING (get_my_role() = 'owner');

-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
