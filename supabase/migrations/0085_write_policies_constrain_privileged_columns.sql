-- Sweep for the defect 0082 fixed on the guide tables: a write policy that gates WHO may
-- write a row but never WHAT they may put in a column that confers privilege, reputation,
-- or a review outcome. 42 live INSERT/UPDATE/ALL policies were read out of the migrations
-- and cross-checked against the LIVE column list (PostgREST OpenAPI, not the .sql files).
-- Five more instances of the same shape, plus one residual gap that needs a schema change.
--
-- Note on UPDATE policies with no WITH CHECK (climb_logs, objectives, crews, messages,
-- account_links, crew_reads): those are NOT part of this bug. Postgres reuses the USING
-- expression as the WITH CHECK for UPDATE, so ownership is still enforced on the new row.
-- They are listed here only so the next reader does not re-flag them.

-- ---------------------------------------------------------------------------
-- 1. reviews — a guide could rewrite the rating they were given.
-- "reviews guide reply" is UPDATE ... using (guide_id = auth.uid()), intended so a guide can
-- answer a review. It constrains no columns, so the same statement can set rating = 5 and
-- replace the text. On a hire-a-guide surface the rating IS the trust signal, and the only
-- other UPDATE policy on this table is... none: the climber who wrote it cannot edit it,
-- but the guide it judges can. postGuideReply() only writes guide_reply/guide_reply_at, so
-- the app is well-behaved — the anon key ships in the bundle, so the app is not the boundary.
create or replace function guard_review_content_immutable() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_admin(auth.uid()) then return new; end if;
  if new.rating     is distinct from old.rating
  or new.text       is distinct from old.text
  or new.inquiry_id is distinct from old.inquiry_id
  or new.guide_id   is distinct from old.guide_id
  or new.climber_id is distinct from old.climber_id
  or new.created_at is distinct from old.created_at then
    raise exception 'a review is immutable — a guide may only add or edit guide_reply';
  end if;
  return new;
end; $$;
drop trigger if exists reviews_guard_content on reviews;
create trigger reviews_guard_content before update on reviews
  for each row execute function guard_review_content_immutable();
-- Moderation runs as an admin. A service-role script has auth.uid() = null and is NOT an
-- admin, so it is blocked too; to correct a review out-of-band, disable this trigger for the
-- statement the way 0083 does, rather than weakening the rule.

-- ---------------------------------------------------------------------------
-- 2. verification_records — any user could mark their own verification 'verified'.
-- "add own verification" / "update own verification" gate only user_id = auth.uid(), and the
-- table carries status + verified_at. lib/db.js even ships verifyRecord(), which sets
-- status:'verified' directly. The app calls it only after Supabase's own
-- session.user.email_confirmed_at is set, so the shipped flow is honest — but nothing in the
-- database enforces that, and the badge feeds the trust score.
drop policy if exists "add own verification" on verification_records;
create policy "add own verification pending" on verification_records for insert
  with check (auth.uid() = user_id and status = 'pending' and verified_at is null);

drop policy if exists "update own verification" on verification_records;
create policy "update own verification unverified" on verification_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status <> 'verified' and verified_at is null);

-- The one verification the server can actually attest goes through a definer function that
-- reads auth.users itself, so 'verified' is never client-supplied. This is the replacement
-- for the addVerification(...)+verifyRecord(...) pair the client used to call.
create or replace function verify_my_email() returns verification_records
language plpgsql security definer set search_path = public as $$
declare rec verification_records; confirmed timestamptz;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select u.email_confirmed_at into confirmed from auth.users u where u.id = auth.uid();
  if confirmed is null then raise exception 'email is not confirmed'; end if;
  insert into verification_records (user_id, verification_type, status, verified_at)
       values (auth.uid(), 'email', 'verified', confirmed)
  on conflict (user_id, verification_type)
       do update set status = 'verified', verified_at = confirmed
    returning * into rec;
  return rec;
end; $$;
grant execute on function verify_my_email() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. inquiries — a climber could file one already marked 'accepted'.
-- "inquiries climber insert" checks only climber_id = auth.uid(); status defaults to 'new'
-- but is client-writable, and the guide's dashboard counts status='new' (that count is the
-- badge added in #579). A pre-'accepted' inquiry is invisible in that count.
drop policy if exists "inquiries climber insert" on inquiries;
create policy "inquiries climber insert new" on inquiries for insert
  with check (climber_id = auth.uid() and status = 'new' and guide_responded_at is null);

-- ---------------------------------------------------------------------------
-- 4. user_reports — a reporter could file a report pre-marked 'resolved'.
-- 0078 grants INSERT `to public with check (true)`, deliberately, so a signed-out user can
-- report. That part stays; only the moderation-state columns are pinned.
drop policy if exists "anyone can file a report" on user_reports;
create policy "anyone can file a report open" on user_reports for insert
  to public with check (status = 'open');

-- ---------------------------------------------------------------------------
-- 5. gps_submissions — anyone could insert an already-approved submission.
-- 0042's "anyone_can_submit_gps" is WITH CHECK (true) and the table carries status,
-- quality_score, approved_at, approved_by and admin_notes. quality_score is meant to be
-- computed by the validate-gps edge function; approval is meant to come from
-- approve-gps-submission behind its admin guard.
drop policy if exists "anyone_can_submit_gps" on public.gps_submissions;
create policy "anyone_can_submit_gps_pending" on public.gps_submissions for insert
  with check (
    status = 'pending' and approved_at is null and approved_by is null and admin_notes is null
  );
-- quality_score is intentionally NOT pinned to 0 here: the edge function inserts the row
-- with the score it just computed, using the service key, which bypasses RLS anyway.

-- ---------------------------------------------------------------------------
-- 6. crew_members — a user could insert themselves straight in as 'confirmed'.
-- "join or invite" allows auth.uid() = user_id with any status. Confirmed membership is not
-- cosmetic: datesAgreed() counts confirmed members, and 0081's "view crew logs" policy makes
-- a crew's trip reports readable to confirmed members.
drop policy if exists "join or invite" on crew_members;
create policy "join or invite" on crew_members for insert
  with check (
    -- the organizer may add anyone at any status (including themselves on creation)
    auth.uid() = (select created_by from crews where id = crew_id)
    -- anyone else may only put themselves in as not-yet-confirmed
    or (auth.uid() = user_id and status <> 'confirmed')
  );
-- KNOWN RESIDUAL GAP, deliberately not closed here. A user may still self-insert as
-- 'invited' and then flip themselves to 'confirmed' via "self or organizer can update
-- membership", because nothing records WHO created the row — an organizer's invite and a
-- self-invite are indistinguishable. Closing it needs a column (invited_by uuid, defaulted
-- to auth.uid() and checked against crews.created_by), which is a schema change and a
-- client change, not a policy tweak. Documented in
-- audits/WRITE-POLICY-SWEEP-2026-08-06.md.

-- ---------------------------------------------------------------------------
-- Confirm. Expect: reviews_guard_content present; verify_my_email present; and each policy
-- below replaced by its constrained version.
--   select tablename, policyname, cmd from pg_policies
--    where schemaname in ('public') and tablename in
--      ('verification_records','inquiries','user_reports','gps_submissions','crew_members')
--    order by tablename, policyname;
--   select proname from pg_proc where proname in ('verify_my_email','guard_review_content_immutable');
