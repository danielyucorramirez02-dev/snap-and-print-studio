-- ============================================================
-- Snap & Print Studio - Migration v7
-- content_bank: lightweight post idea / asset tracker
-- Run in Supabase SQL Editor before using /content.
-- ============================================================

CREATE TABLE IF NOT EXISTS content_bank (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  post_type      text NOT NULL CHECK (post_type IN (
    'fresh-shoot',
    'open-slots',
    'package-highlight',
    'behind-the-scenes',
    'client-love',
    'throwback',
    'promo'
  )),
  status         text NOT NULL DEFAULT 'idea' CHECK (status IN (
    'idea',
    'needs-shoot',
    'shot',
    'edited',
    'captioned',
    'posted'
  )),
  target_date    date,
  asset_note     text,
  photo_url      text,
  caption_draft  text,
  posted_on      date,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_bank_status_target
  ON content_bank (status, target_date);

CREATE INDEX IF NOT EXISTS idx_content_bank_created_at
  ON content_bank (created_at DESC);

ALTER TABLE content_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read content_bank" ON content_bank;
CREATE POLICY "Authenticated can read content_bank"
  ON content_bank FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert content_bank" ON content_bank;
CREATE POLICY "Authenticated can insert content_bank"
  ON content_bank FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update content_bank" ON content_bank;
CREATE POLICY "Authenticated can update content_bank"
  ON content_bank FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete content_bank" ON content_bank;
CREATE POLICY "Authenticated can delete content_bank"
  ON content_bank FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION set_content_bank_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_bank_updated_at ON content_bank;
CREATE TRIGGER content_bank_updated_at
  BEFORE UPDATE ON content_bank
  FOR EACH ROW
  EXECUTE FUNCTION set_content_bank_updated_at();
