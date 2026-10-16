-- The GPS submission pipeline could be used to send spam and to flood the review
-- queue by anyone holding the PUBLIC publishable key (it ships in the bundle, and
-- the Edge Functions gateway accepts it as a bearer token).
--
--   1. notify-gps-climber emailed whatever address the caller passed, with a body
--      built from caller-supplied text. The moment RESEND_API_KEY is set, that is an
--      open mail relay sending from our verified domain.
--   2. Every limit was keyed on the OPTIONAL, caller-chosen email, so omitting it
--      bypassed them; there was no per-IP limit and no cap on mail sent.
--   3. The anon INSERT policy on gps_submissions let a client skip validate-gps
--      entirely -- its rate limits and its quality score -- and write rows straight
--      into the admin review queue.
--
-- The functions are rewritten alongside this (supabase/functions/_shared/ratelimit.ts);
-- this migration supplies the storage they need and closes the direct-insert path.

-- 1. Rate-limit ledger. Written and read ONLY by Edge Functions through the service
--    role. Keys are SHA-256 hashes (an IP address or recipient is never stored raw).
create table if not exists public.edge_rate_events (
  id bigserial primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists edge_rate_events_lookup
  on public.edge_rate_events (bucket, key, created_at desc);
alter table public.edge_rate_events enable row level security;
-- No policies: RLS with none denies anon and authenticated outright. Revoke as well,
-- so the table is not even visible through PostgREST.
revoke all on public.edge_rate_events from anon, authenticated;
revoke all on sequence public.edge_rate_events_id_seq from anon, authenticated;

-- 2. At most ONE notification of each type per submission. The notify functions
--    insert the row before sending, so a replayed call hits this and sends nothing.
--    (gps_notifications held 0 rows when this was written, so it cannot fail.)
create unique index if not exists gps_notifications_one_per_type
  on public.gps_notifications (submission_id, type);

-- 3. Submissions go through validate-gps only. It inserts with the service role,
--    which bypasses RLS, so removing the anon insert policy changes nothing for the
--    real path and closes the side door. Nothing in the app inserts directly.
drop policy if exists "anyone_can_submit_gps_pending" on public.gps_submissions;
drop policy if exists "anyone_can_submit_gps" on public.gps_submissions;

-- 4. trust_scores_view is SECURITY DEFINER, so it returned every profile's name and
--    trust score to anon while skipping 0095's block rule on profiles. Nothing in the
--    app reads it (only a service-key one-off does), so close it to public roles.
revoke select on public.trust_scores_view from anon, authenticated;
