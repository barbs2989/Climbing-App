-- Make two promises in the published policy real.
--
-- 1. "By creating an account you agree to these Terms" -- record WHICH text was agreed to.
-- 2. "You can access, correct, export, or delete your data, and opt out of non-essential
--    processing" -- give that a mechanism instead of two addresses on the reserved .example
--    TLD, an unnamed "support", and a Feedback button whose own toast says nothing was sent.
--
-- Both from audits/POLICY-VS-PRODUCT-2026-08-13.md, sections C and E.
--
-- WHY THIS DOES NOT TOUCH handle_new_user(), which is where the acceptance stamp would
-- most obviously go: 0070's header records that "the unqualified-name/search_path bug in the
-- original handle_new_user broke ALL signups for a day". That fix lives in the LIVE database
-- and in NO migration file, so `create or replace` from 0009's text would silently revert it
-- and break every signup again. 0070 hit the same wall and solved it by adding a SECOND
-- trigger on the same event; this follows that precedent exactly.
--
-- Ordering is by trigger NAME (Postgres fires same-event triggers alphabetically):
--   on_auth_user_created  <  on_auth_user_created_claim_invites  <  on_auth_user_created_stamp_policy
-- so the profile row exists before this stamps it. Same reasoning 0070 spells out.

begin;

-- ── 1. what each account accepted ────────────────────────────────────────────────────
alter table profiles add column if not exists terms_accepted_version text;
alter table profiles add column if not exists terms_accepted_at      timestamptz;

comment on column profiles.terms_accepted_version is
  'lib/policy.js POLICY_VERSION presented at signup. Records that the app showed version X and '
  'the account was created anyway -- which is what acceptance is. Not proof of reading, and '
  'null for accounts created before 0143 or through a path that sends no metadata (OAuth).';

-- Explicit search_path, and every name schema-qualified. This is the exact bug 0070 warns
-- about: without it a security-definer trigger on auth.users resolves `profiles` against the
-- caller's search_path and every signup fails.
create or replace function public.stamp_policy_acceptance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Only stamp when the client actually sent a version. A null must stay null rather than
  -- become now(), or an account that was never shown the Terms would be indistinguishable
  -- from one that was -- the fail-open coercion this repo keeps getting bitten by.
  -- Deliberately NOT the `?` jsonb-existence operator: `?` is a bind placeholder to several
  -- Postgres clients, so a file containing it can fail on the way in rather than in the
  -- database. `->>` returns null for a missing key, so coalesce covers absent and empty alike.
  if coalesce(new.raw_user_meta_data->>'terms_version', '') <> '' then
    update public.profiles
       set terms_accepted_version = new.raw_user_meta_data->>'terms_version',
           terms_accepted_at      = now()
     where id = new.id;
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_stamp_policy on auth.users;
create trigger on_auth_user_created_stamp_policy after insert on auth.users
  for each row execute function public.stamp_policy_acceptance();

-- ── 2. a data-rights request that actually goes somewhere ────────────────────────────
create table if not exists data_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  kind       text not null check (kind in ('export','delete','access','correction','optout','other')),
  note       text,
  status     text not null default 'open' check (status in ('open','in_progress','done','rejected')),
  created_at timestamptz not null default now()
);

comment on table data_requests is
  'Data-rights requests raised from Settings. The owner reads these in the Supabase dashboard; '
  'there is no mailbox. on delete cascade is deliberate -- a deletion request that outlived the '
  'account it asked to delete would defeat the request, at the cost of losing the audit row.';

create index if not exists data_requests_open_idx on data_requests (created_at desc) where status = 'open';

alter table data_requests enable row level security;

-- You may raise a request as yourself, and you may read your own. You may NOT set its status:
-- without the with-check on status a user could insert one already marked 'done', which is the
-- defect 0085 swept across five tables ([[insert-policies-must-constrain-status]]).
drop policy if exists "raise own data request" on data_requests;
create policy "raise own data request" on data_requests for insert
  with check (user_id = auth.uid() and status = 'open');

drop policy if exists "read own data requests" on data_requests;
create policy "read own data requests" on data_requests for select
  using (user_id = auth.uid() or is_admin(auth.uid()));

-- No update/delete policy for users, on purpose: a request you can silently edit or withdraw
-- is not a record. Triage happens with the service key, which bypasses RLS.
drop policy if exists "admin manages data requests" on data_requests;
create policy "admin manages data requests" on data_requests for update
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

commit;

-- Verify AFTER applying, as SEPARATE statements (a pasted script is one transaction, and a
-- failing select would roll the whole thing back -- 0097's writes were lost exactly that way):
--
--   select column_name from information_schema.columns
--    where table_name = 'profiles' and column_name like 'terms_accepted%';
--   -- expect 2 rows
--
--   select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
--   -- expect on_auth_user_created, on_auth_user_created_claim_invites,
--   --        on_auth_user_created_stamp_policy
--
--   select polname, cmd from pg_policies where tablename = 'data_requests';
--   -- expect 3
--
-- Then create an account in the app and confirm profiles.terms_accepted_version is set. A
-- signup that FAILS after this is the 0070 search_path bug returning -- drop the new trigger
-- first, then investigate.
