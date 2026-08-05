-- User safety reports.
--
-- Until now the report modal collected a reason and free-text detail for things like
-- "Harassment or abuse" and "Someone is in danger", discarded both, and told the
-- reporter "our team will review it". Nothing was stored anywhere. This table is
-- where a report actually lands.
--
-- Apply in the Supabase SQL Editor. APPLIED 2026-08-05 and verified live.
--
-- Numbering: this was written as 0075, which was free at the time, but #546 landed
-- 0075_crew_locked_day.sql while it was in review. Renumbered to 0077 rather than
-- add a third collision to a folder whose README exists because the first two cost
-- an afternoon. The number is a label -- the objects below already exist in the DB
-- under the old filename, and renaming the file changes nothing about that.

create table user_reports (
  id              uuid primary key default gen_random_uuid(),
  reporter        uuid references auth.users(id) on delete set null,
  reporter_label  text,                     -- who filed it when there is no session yet
  reported_id     text not null,            -- climber id as the app knows it (seed int or auth uuid)
  reported_name   text,                     -- display name at report time, so the row survives a rename
  reason          text not null,
  detail          text,
  status          text not null default 'open'
                  check (status in ('open','reviewing','actioned','dismissed')),
  created_at      timestamptz default now()
);
create index user_reports_status_idx   on user_reports(status, created_at desc);
create index user_reports_reported_idx on user_reports(reported_id, created_at desc);

-- Reports are NOT public, unlike contributions. A report names a person and often
-- describes an incident, so exposing the table would turn a safety feature into a
-- way to see who has been reported and by whom.
--
-- Insert is open for the same reason contributions' is: the app has no accounts on
-- most paths yet, and a victim must never be blocked from filing by being signed
-- out. Read is limited to your own rows, so a reporter can see what they filed.
-- No update/delete policy on purpose -- append-only; triage is service-role only.
alter table user_reports enable row level security;
create policy "anyone can file a report"  on user_reports for insert with check (true);
create policy "reporters read their own"  on user_reports for select
  using (reporter is not null and reporter = auth.uid());

-- Triage query for whoever reviews these (run with the service key):
--   select created_at, reason, reported_name, reported_id, detail
--     from user_reports where status = 'open' order by created_at desc;
--
-- NOTE: nothing notifies anyone when a row lands here. Outbound mail was explicitly
-- deferred, so reports accumulate silently and only surface when this table is read.
-- Whoever owns moderation needs a habit of checking it, or reports will sit unseen.
