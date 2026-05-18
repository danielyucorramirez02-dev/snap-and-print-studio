-- ============================================================
-- Snap & Print Studio - Content Bank Starter Seed
-- Optional: run after supabase-migration-v7.sql to preload ideas.
-- Safe to rerun: existing titles will not be duplicated.
-- ============================================================

WITH starter_items(title, post_type, status, target_date, asset_note, caption_draft) AS (
  VALUES
    (
      'This week open slots',
      'open-slots',
      'captioned',
      current_date,
      'Use a clean studio photo or a recent self-shoot sample. Update exact available dates before posting.',
      'Open slots this week at Snap & Print Studio. Message us to reserve your self-shoot, milestone, or coverage schedule.'
    ),
    (
      'May 24 coverage prep',
      'behind-the-scenes',
      'needs-shoot',
      DATE '2026-05-24',
      'Take behind-the-scenes clips/photos while preparing gear, batteries, memory cards, and shot list.',
      'Coverage day prep. Getting everything ready so the important moments are captured cleanly.'
    ),
    (
      'Debut package highlight',
      'package-highlight',
      'needs-shoot',
      current_date + INTERVAL '1 day',
      'Need an elegant sample image: gown/detail shot, portrait, or event highlight. Avoid posting client faces without permission.',
      'Planning a debut? We can cover the details, portraits, and highlights so you can enjoy the celebration.'
    ),
    (
      'Client photo sample needed',
      'fresh-shoot',
      'needs-shoot',
      current_date + INTERVAL '2 days',
      'Ask one happy client/model for permission to post 2-3 best images.',
      'Fresh shoot sample from Snap & Print Studio. Simple, clean, and ready for memories worth keeping.'
    ),
    (
      'Studio setup equipment shot',
      'behind-the-scenes',
      'needs-shoot',
      current_date + INTERVAL '3 days',
      'Shoot the camera, lights, backdrop, props, printer, or editing desk. No client needed.',
      'A little behind the scenes from the studio. Every setup is prepared so your photos look clean and memorable.'
    ),
    (
      'Before and after edit sample',
      'behind-the-scenes',
      'needs-shoot',
      current_date + INTERVAL '4 days',
      'Use a consented image only. Show crop/color/enhancement before and after.',
      'Small edits can make a big difference. Here is a quick before and after from the studio workflow.'
    ),
    (
      'Family package highlight',
      'package-highlight',
      'needs-shoot',
      current_date + INTERVAL '5 days',
      'Need family/self-shoot sample. Could use props, printed output, or setup photo if no model yet.',
      'Family photos do not need to be complicated. Book a quick studio session and keep the memory printed and saved.'
    ),
    (
      'Book early reminder',
      'promo',
      'captioned',
      current_date + INTERVAL '6 days',
      'Use any strong studio image. Keep caption simple and direct.',
      'Planning a shoot or event? Book early so your preferred date and time stay reserved.'
    ),
    (
      'Throwback favorite shoot',
      'throwback',
      'needs-shoot',
      current_date + INTERVAL '7 days',
      'Pick an older client-approved image or a setup/result photo that still represents the studio well.',
      'Throwback to one of our favorite studio moments. More memories like this soon.'
    ),
    (
      'Client love screenshot',
      'client-love',
      'needs-shoot',
      current_date + INTERVAL '8 days',
      'Use a Messenger review/comment screenshot. Blur private info before posting.',
      'Messages like this keep us going. Thank you for trusting Snap & Print Studio.'
    )
)
INSERT INTO content_bank (title, post_type, status, target_date, asset_note, caption_draft)
SELECT
  title,
  post_type,
  status,
  target_date::date,
  asset_note,
  caption_draft
FROM starter_items s
WHERE NOT EXISTS (
  SELECT 1
  FROM content_bank c
  WHERE c.title = s.title
);
