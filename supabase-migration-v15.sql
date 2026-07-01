-- ============================================================
-- Snap & Print Studio - Migration v15
-- Add wedding-specific photo coverage services.
-- Run in Supabase SQL Editor after v14 when ready.
-- ============================================================

ALTER TABLE services ADD COLUMN IF NOT EXISTS category text DEFAULT 'self-shoot';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM services WHERE name = 'Wedding Photo Coverage - 2 Hours') THEN
    UPDATE services
    SET
      category = 'coverage',
      description = 'Wedding-focused photo coverage with all soft copies included.',
      price = 3999,
      duration_minutes = 120,
      inclusions = ARRAY['2 Hours Photo Coverage', 'All Soft Copies', 'Wedding Event Coverage'],
      is_active = true
    WHERE name = 'Wedding Photo Coverage - 2 Hours';
  ELSE
    INSERT INTO services (name, category, description, price, duration_minutes, inclusions, is_active)
    VALUES (
      'Wedding Photo Coverage - 2 Hours',
      'coverage',
      'Wedding-focused photo coverage with all soft copies included.',
      3999,
      120,
      ARRAY['2 Hours Photo Coverage', 'All Soft Copies', 'Wedding Event Coverage'],
      true
    );
  END IF;

  IF EXISTS (SELECT 1 FROM services WHERE name = 'Wedding Photo Coverage - 4 Hours') THEN
    UPDATE services
    SET
      category = 'coverage',
      description = 'Extended wedding photo coverage with all soft copies included.',
      price = 4999,
      duration_minutes = 240,
      inclusions = ARRAY['4 Hours Photo Coverage', 'All Soft Copies', 'Wedding Event Coverage'],
      is_active = true
    WHERE name = 'Wedding Photo Coverage - 4 Hours';
  ELSE
    INSERT INTO services (name, category, description, price, duration_minutes, inclusions, is_active)
    VALUES (
      'Wedding Photo Coverage - 4 Hours',
      'coverage',
      'Extended wedding photo coverage with all soft copies included.',
      4999,
      240,
      ARRAY['4 Hours Photo Coverage', 'All Soft Copies', 'Wedding Event Coverage'],
      true
    );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
