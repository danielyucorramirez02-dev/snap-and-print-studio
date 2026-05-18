# Booking App - Codex Guide

This is the Snap & Print Studio booking and operations app.

## Stack

- Next.js App Router
- React 18
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui-style components in `components/ui`
- Supabase for Postgres, Auth, RLS, and Storage
- Vercel deployment
- Resend for email reminders
- Semaphore PH planned for SMS

## Commands

Run from `booking-app/`:

```powershell
npm run dev
npm run build
npm run lint
```

Use `npm run build` as the main verification command when behavior or types change. Use `npm run lint` if the local Next.js lint command still works for the installed Next version.

## Git, Vercel, And Deployment Continuity

- Local path: `C:\dev\studio-os\booking-app`.
- Current primary branch: `main`.
- GitHub remote: `https://github.com/danielyucorramirez02-dev/snap-and-print-studio.git`.
- Vercel deploys from GitHub. Pushing/merging to `main` is the production deployment path.
- `vercel.json` defines the reminder cron at `/api/cron/send-reminders` with schedule `0 1 * * *` (9am Manila).
- `.vercel/` is intentionally ignored and may not exist locally. Do not treat that as broken deployment by itself.
- Before a production push, run `npm run build` when feasible and summarize any warnings or failures.
- Do not remove `vercel.json`, cron routes, `proxy.ts`, or environment-variable usage unless replacing them with a verified equivalent.

## Product Context

The app manages Snap & Print Studio operations:

- Public booking flow
- Owner and staff dashboard
- Calendar
- Payments
- Services and packages
- Inventory
- Reports
- Client gallery
- Expenses
- Settings
- Daily posting support

Roles:

- Owner: full access, including reports, expenses, settings, and financial views.
- Staff: bookings and inventory access; no financial reports or settings.

## Code Rules

- No `any` types unless there is no reasonable alternative and the reason is documented.
- Keep components modular and close to the existing folder pattern.
- Use server actions for Supabase mutations unless an API route is clearly more appropriate.
- Use `zod` for validation and `react-hook-form` for complex forms.
- Prefer existing helpers in `lib/` before adding new utilities.
- Keep UI copy clear for a non-technical studio operator.
- Format money as Philippine pesos.
- Format dates for the local business context.

## Design Rules

- Keep the UI clean, practical, and operator-focused.
- Dashboard screens should be dense enough for repeated use, not marketing pages.
- Use `lucide-react` icons for icon buttons and navigation where appropriate.
- Avoid nested cards and decorative clutter.
- Make mobile views usable for quick studio checks.
- Tagalog labels are okay when Daniel requests them.

## Assets

- Logo and brand assets live in `assets/` and `public/`.
- Price list seed data is represented in SQL seed/migration files. If Daniel provides a new price list image, inspect it and update the seed/services flow deliberately.

## Database

Migration files live in the repo root:

- `supabase-migration.sql`
- `supabase-migration-v2.sql`
- `supabase-migration-v3.sql`
- `supabase-migration-v4.sql`
- `supabase-migration-v5.sql`
- `supabase-migration-v6.sql`
- `supabase-fix-trigger.sql`
- `supabase-services-seed.sql`

Do not assume production has a migration applied. If a feature depends on schema changes, say which SQL file Daniel needs to run in Supabase.

Known migration state from the Claude-era decision log:

- V2 production app shipped on 2026-05-16.
- `supabase-migration-v5.sql` was run by Daniel on 2026-05-18 for the `studio_posts` table and RLS.
- `supabase-migration-v6.sql` was run by Daniel on 2026-05-18. It hardens public booking reads with token/schedule RPCs.
- The booking app Supabase DB is the source of truth for bookings and revenue.
- GCash remains manually verified; there is no personal GCash API integration.
- Google Sheets sync exists in the app flow; Google Drive folder-per-booking is deferred.

## Environment

Local secrets belong in `.env.local`, which is ignored by git. Do not print secrets in final answers.

Expected local/Vercel environment variable names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `GOOGLE_SHEET_ID`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`

## Migrated Claude Notes

The old `claude.md` file is retained as historical source material. Prefer this `AGENTS.md` for Codex behavior. If the two conflict, follow `AGENTS.md`.
