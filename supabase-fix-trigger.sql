-- ============================================================
-- Fix: Recreate the handle_new_user trigger properly
-- Run this in Supabase SQL Editor if user creation fails
-- ============================================================

-- Step 1: Allow full_name to be empty (safer for all auth methods)
ALTER TABLE profiles ALTER COLUMN full_name SET DEFAULT '';

-- Step 2: Recreate the function with SET search_path (required by Supabase)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Step 3: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
