-- ============================================================
-- Snap & Print Studio - Migration v16
-- Rename wedding coverage services for simple church weddings.
-- Run in Supabase SQL Editor after v15 when ready.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM services WHERE name = 'Simple Church Wedding Coverage - 2 Hours') THEN
    UPDATE services
    SET
      category = 'coverage',
      description = 'Simple church wedding photo coverage with all soft copies included.',
      price = 3999,
      duration_minutes = 120,
      inclusions = ARRAY['2 Hours Simple Church Wedding Coverage', 'All Soft Copies', 'Ceremony and Key Family Photos'],
      is_active = true
    WHERE name = 'Simple Church Wedding Coverage - 2 Hours';

    UPDATE services
    SET is_active = false
    WHERE name = 'Wedding Photo Coverage - 2 Hours';
  ELSIF EXISTS (SELECT 1 FROM services WHERE name = 'Wedding Photo Coverage - 2 Hours') THEN
    UPDATE services
    SET
      name = 'Simple Church Wedding Coverage - 2 Hours',
      category = 'coverage',
      description = 'Simple church wedding photo coverage with all soft copies included.',
      price = 3999,
      duration_minutes = 120,
      inclusions = ARRAY['2 Hours Simple Church Wedding Coverage', 'All Soft Copies', 'Ceremony and Key Family Photos'],
      is_active = true
    WHERE name = 'Wedding Photo Coverage - 2 Hours';
  ELSE
    INSERT INTO services (name, category, description, price, duration_minutes, inclusions, is_active)
    VALUES (
      'Simple Church Wedding Coverage - 2 Hours',
      'coverage',
      'Simple church wedding photo coverage with all soft copies included.',
      3999,
      120,
      ARRAY['2 Hours Simple Church Wedding Coverage', 'All Soft Copies', 'Ceremony and Key Family Photos'],
      true
    );
  END IF;

  IF EXISTS (SELECT 1 FROM services WHERE name = 'Simple Church Wedding Coverage - 4 Hours') THEN
    UPDATE services
    SET
      category = 'coverage',
      description = 'Extended simple church wedding photo coverage with all soft copies included.',
      price = 4999,
      duration_minutes = 240,
      inclusions = ARRAY['4 Hours Simple Church Wedding Coverage', 'All Soft Copies', 'Ceremony, Family Photos, and Reception Moments'],
      is_active = true
    WHERE name = 'Simple Church Wedding Coverage - 4 Hours';

    UPDATE services
    SET is_active = false
    WHERE name = 'Wedding Photo Coverage - 4 Hours';
  ELSIF EXISTS (SELECT 1 FROM services WHERE name = 'Wedding Photo Coverage - 4 Hours') THEN
    UPDATE services
    SET
      name = 'Simple Church Wedding Coverage - 4 Hours',
      category = 'coverage',
      description = 'Extended simple church wedding photo coverage with all soft copies included.',
      price = 4999,
      duration_minutes = 240,
      inclusions = ARRAY['4 Hours Simple Church Wedding Coverage', 'All Soft Copies', 'Ceremony, Family Photos, and Reception Moments'],
      is_active = true
    WHERE name = 'Wedding Photo Coverage - 4 Hours';
  ELSE
    INSERT INTO services (name, category, description, price, duration_minutes, inclusions, is_active)
    VALUES (
      'Simple Church Wedding Coverage - 4 Hours',
      'coverage',
      'Extended simple church wedding photo coverage with all soft copies included.',
      4999,
      240,
      ARRAY['4 Hours Simple Church Wedding Coverage', 'All Soft Copies', 'Ceremony, Family Photos, and Reception Moments'],
      true
    );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
