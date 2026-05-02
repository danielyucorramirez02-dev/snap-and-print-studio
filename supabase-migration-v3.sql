-- ============================================================
-- Snap & Print Studio — Migration v3
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- 1. Add receipt_url column to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS receipt_url text;

-- 2. Create the receipts storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Allow anonymous clients to upload receipts
DROP POLICY IF EXISTS "Public can upload receipts" ON storage.objects;
CREATE POLICY "Public can upload receipts"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'receipts');

-- 4. Allow public read of receipt images
DROP POLICY IF EXISTS "Public can read receipts" ON storage.objects;
CREATE POLICY "Public can read receipts"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'receipts');
