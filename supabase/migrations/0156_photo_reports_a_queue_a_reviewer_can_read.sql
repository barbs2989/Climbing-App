-- 0156 — reporting a photo, into a queue somebody can actually read.
--
-- 0152 gave admins the power to take a photo down and stopped there, because reporting needed
-- a decision rather than a guess. This is that decision, and the thing that forced a new table
-- rather than reuse is worth stating first.
--
-- WHY NOT user_reports. It is shaped around reporting a PERSON — `reported_id`,
-- `reported_name` — and, decisively, its SELECT policy is `reporter = auth.uid()`: the ONLY
-- person who can read a report is the person who filed it. No admin, no reviewer, nobody. A
-- photo report filed there would land in a queue with no reader, and a "Report" button over
-- that is a success message in front of a write nobody receives — the shape check:writes
-- exists to catch. Whatever else is true of moderation, a report has to be readable by
-- somebody who can act, and that is the one property user_reports does not have.
--
-- (That is a real gap in the person-reporting flow too. NOT fixed here: changing who can read
-- accusations about a climber is a policy call about a different feature, and quietly widening
-- it while shipping photo reports would be exactly the kind of unrelated change nobody asked
-- for. Recorded so it is not mistaken for an oversight.)
--
-- THE CASCADE IS THE RESOLUTION MECHANISM, and it is deliberate. `on delete cascade` from
-- contributions means taking the photo down deletes its reports with it, so the queue drains
-- by the reviewer doing the thing the queue exists to prompt. There is no "resolved" state to
-- forget to set, and no way to leave a report pointing at a photo that no longer exists.
-- `status` therefore has exactly two values: it is open, or a reviewer looked and decided the
-- photo may stay ('dismissed').
--
-- ONE REPORT PER CLIMBER PER PHOTO, enforced by a unique index rather than by the client.
-- Without it a single person can file the same complaint fifty times and manufacture the
-- appearance of consensus — which is the same reasoning 0002 gives for counting DISTINCT
-- contributors, applied to a surface where it matters more.
--
-- The reporter is NOT anonymous to a reviewer. That is a genuine trade: it discourages
-- malicious reporting and it means somebody filing a report about their own harassment is
-- identifiable to whoever reviews. It is the right default for a project of this size, where
-- the reviewer is the operator, and it should be revisited before there are reviewers the
-- operator does not personally trust.

create table if not exists content_reports (
  id              uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references contributions(id) on delete cascade,
  route_id        text references routes(id) on delete set null,
  reporter        uuid references profiles(id),
  reason          text not null,
  detail          text,
  status          text not null default 'open',
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'content_reports_status_chk') then
    alter table content_reports add constraint content_reports_status_chk
      check (status in ('open', 'dismissed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'content_reports_reason_chk') then
    alter table content_reports add constraint content_reports_reason_chk
      check (reason in ('not_this_route', 'inappropriate', 'not_their_photo', 'other'));
  end if;
end $$;

create unique index if not exists content_reports_one_per_reporter
  on content_reports (contribution_id, reporter);
create index if not exists content_reports_open_idx
  on content_reports (status, created_at desc);

alter table content_reports enable row level security;

-- File a report as yourself, and only as open. Both halves matter: `reporter = auth.uid()`
-- stops one climber filing under another's name, and `status = 'open'` stops a submitter
-- pre-marking their own report dismissed (the self-approval hole 0127 closed with a trigger).
drop policy if exists "file your own report" on content_reports;
create policy "file your own report" on content_reports
  for insert with check (reporter = auth.uid() and status = 'open');

-- The half user_reports is missing: a reviewer can read the queue.
drop policy if exists "your own reports, or an admin reads all" on content_reports;
create policy "your own reports, or an admin reads all" on content_reports
  for select using (reporter = auth.uid() or is_admin(auth.uid()));

-- Only a reviewer changes a report's state. A reporter cannot withdraw one, on purpose:
-- deleting the photo is what closes a report, and letting the reporter erase the record would
-- make pressure on a reviewer invisible after the fact.
drop policy if exists "only an admin reviews" on content_reports;
create policy "only an admin reviews" on content_reports
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- Confirm — expect three policies and the unique index:
--   select policyname, cmd from pg_policies where tablename = 'content_reports' order by cmd;
--   select indexname from pg_indexes where tablename = 'content_reports';
