-- ============================================================
-- Snap & Print Studio — Services Seed
-- Run this ONCE in Supabase SQL Editor to load all packages.
-- ============================================================

-- Step 1: Add category column (safe to run even if it already exists)
ALTER TABLE services ADD COLUMN IF NOT EXISTS category text DEFAULT 'self-shoot';

-- Step 2: Insert all packages
INSERT INTO services (name, category, description, price, duration_minutes, inclusions, is_active) VALUES

-- Self-Shoot Packages
('Solo Muna Package', 'self-shoot', 'Perfect for solo portraits and individual shots.', 199, 10,
  ARRAY['1 Pax', '10 Mins Photoshoot', '10 Mins Photo Selection', '10 Pcs Soft Copies (Enhanced)', '1 Pc 4R Hard Copy', '1 Background'],
  true),

('Pakners Package', 'self-shoot', 'Great for couples or best friends.', 299, 13,
  ARRAY['1-2 Pax', '13 Mins Photoshoot', '15 Mins Photo Selection', '15 Pcs Soft Copies (Enhanced)', '1 Pc 4R Hard Copy', '2 Pcs Instax Style (4x3)', '1 Background'],
  true),

('Trio Package', 'self-shoot', 'Fun group package for up to 3 people.', 399, 20,
  ARRAY['1-3 Pax', '20 Mins Photoshoot', '15 Mins Photo Selection', '20 Pcs Soft Copies (Enhanced)', '2 Pcs 4R Hard Copy', '2 Pcs Instax Style (4x3)', '1 Background'],
  true),

('Tropa Time Package', 'self-shoot', 'Squad package for up to 4 friends.', 499, 25,
  ARRAY['Up to 4 Pax', '25 Mins Photoshoot', '20 Mins Photo Selection', '2 Pcs 4R Hard Copy', '4 Pcs Instax Style (4x3)', '2 Backgrounds'],
  true),

('Family Package', 'self-shoot', 'Family memories for up to 6 members.', 599, 30,
  ARRAY['Up to 6 Pax', '30 Mins Photoshoot', '20 Mins Photo Selection', '4 Pcs 4R Hard Copy', '4 Pcs Instax Style (4x3)', '2 Backgrounds'],
  true),

-- Milestone Packages
('Milestone Basic', 'milestone', 'Staff-assisted package for monthly and milestone shoots.', 1299, 25,
  ARRAY['25 Mins Photoshoot', 'Staff-Assisted', '25 Pcs Soft Copies', '2 Pcs 4R Printed Copies', 'A4 Basic Picture Frame', '1 Themed Background', 'Themed Props'],
  true),

('Milestone Premium', 'milestone', 'Full milestone session for bigger, more detailed shoots.', 1999, 60,
  ARRAY['1 Hour Photoshoot', 'Staff-Assisted', 'All Soft Copies', '5R Premium Picture Frame', '4 Pcs 4R Printed Copies', '1 Themed Background', '1 Plain Color Background', 'Themed Props', 'Family Picture (5 Shots)', 'Costume (Varies by Theme)'],
  true),

-- Photo Coverage Packages
('Basic Photo Coverage', 'coverage', 'For Kiddie Party, Christening, 1st Birthday, Civil Wedding, Bridal Showers, Debuts, and Reunions.', 1999, 120,
  ARRAY['2 Hours Unlimited Shots', 'All Soft Copies Enhanced', '3-4 Days Editing Process', 'Highlights Photo Sent Same Day'],
  true),

('Upgraded Photo Coverage', 'coverage', 'For Kiddie Party, Christening, 1st Birthday, Civil Wedding, Bridal Showers, Debuts, and Reunions.', 2999, 210,
  ARRAY['3-4 Hours Unlimited Shots', 'Free A4 Printed Hard Copy', 'All Soft Copies Enhanced', '3-4 Days Editing Process', 'Highlights Photo Sent Same Day'],
  true),

('Premium Photo Coverage', 'coverage', 'For Kiddie Party, Christening, 1st Birthday, Civil Wedding, Bridal Showers, Debuts, and Reunions.', 3999, 300,
  ARRAY['4-6 Hours Unlimited Shots', '2 Pcs A4 Printed Copies', '5 Pcs 4R Printed Copies', '3-5 Days Editing Process', 'All Soft Copies Enhanced', 'Highlights Photo Sent Same Day'],
  true);
