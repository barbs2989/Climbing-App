-- 0158 — let a reviewer read the safety reports climbers file about other climbers.
--
-- THE DEFECT, and it is the most serious one this table could have. `user_reports` has exactly
-- ONE write in the whole app (lib/db.js submitReport) and NO reader anywhere: no query, no
-- queue, no screen. Its SELECT policy is `reporter = auth.uid()`, so the only person who can
-- read a report is the person who filed it. A climber reports somebody for harassment, gets a
-- confirmation, and the report is visible to nobody who could act on it.
--
-- That is the same shape 0156 was written for — a success message in front of a write nobody
-- receives — except the content is an accusation about a person's safety rather than a photo.
-- The reasons the report modal offers include "Someone is in danger".
--
-- THE WORKFLOW WAS ALREADY DESIGNED. `status` has a four-value CHECK — open, reviewing,
-- actioned, dismissed — so somebody modelled a review process and the reading half was never
-- built. This adds no new concept; it connects one that exists.
--
-- WHAT THIS CHANGES: who can READ. Nothing about who may report, what reporting means, or what
-- follows from a review. Those are policy and stay open questions:
--   * whether a reviewed report leads to a warning, a suspension or a block
--   * whether the reporter is told the outcome
-- Neither is answerable by a migration, and both are the reason this is deliberately narrow.
-- Making an existing report readable by the operator is not the same as deciding what happens
-- next, and the report being unreadable helps nobody in the meantime.
--
-- THE INSERT POLICY IS UNTOUCHED, including that it accepts an anonymous report. 0075 is
-- explicit about why: somebody being harassed must not be blocked from reporting by being
-- logged out. `reporter` is therefore nullable and `reporter_label` carries whatever the app
-- knew — do not "tighten" this into requiring a session.
--
-- ONE ASYMMETRY WORTH NAMING. 0156 made photo reports readable by their reporter AND an admin;
-- this does the same for people. But a photo report is about a picture, and this is about a
-- person, so the reviewer sees an accusation attached to two named climbers. That is
-- unavoidable if anyone is to act on it, and it is the reason `reviewed_by` exists: a review is
-- attributable to whoever performed it.

drop policy if exists "reporters read their own" on user_reports;
create policy "your own reports, or an admin reads all" on user_reports
  for select using (
    (reporter is not null and reporter = auth.uid())
    or is_admin(auth.uid())
  );

-- Only a reviewer moves a report through the states the CHECK already models. A reporter
-- cannot withdraw or re-open one: an accusation that can be erased by the person who made it
-- makes pressure on a reviewer invisible after the fact, which is the same reasoning 0156 gives.
drop policy if exists "only an admin reviews a report" on user_reports;
create policy "only an admin reviews a report" on user_reports
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

alter table user_reports add column if not exists reviewed_by uuid references profiles(id);
alter table user_reports add column if not exists reviewed_at timestamptz;

create index if not exists user_reports_open_idx on user_reports (status, created_at desc);

-- Confirm — expect INSERT, SELECT and UPDATE policies, and the two review columns:
--   select policyname, cmd from pg_policies where tablename = 'user_reports' order by cmd;
--   select column_name from information_schema.columns
--    where table_name = 'user_reports' and column_name in ('reviewed_by','reviewed_at');
