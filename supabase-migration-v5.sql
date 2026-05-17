-- ============================================================
-- Snap & Print Studio — Migration v5
-- studio_posts: tracks Facebook page posts for the daily-post streak
-- Run in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- 1. studio_posts table — one row per post published to the FB page
CREATE TABLE IF NOT EXISTS studio_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_on    date NOT NULL DEFAULT current_date,
  post_type    text,            -- 'fresh-shoot' | 'fill-in' | null
  caption      text,            -- optional: the caption that went out
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_studio_posts_posted_on
  ON studio_posts (posted_on DESC);

-- 2. RLS — internal owner/staff data, no public access
ALTER TABLE studio_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read studio_posts" ON studio_posts;
CREATE POLICY "Authenticated can read studio_posts"
  ON studio_posts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can write studio_posts" ON studio_posts;
CREATE POLICY "Authenticated can write studio_posts"
  ON studio_posts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
