-- An accessibility report can come from somebody who is NOT signed in, and the owner sees it.
--
-- 0343 gave the Accessibility statement a working report form, signed-in only. The 2026-10-22
-- accessibility risk audit named the gap that leaves: the person most likely to need the form is a
-- blind visitor who could not get through sign-up, and they were told to sign in first. And the
-- reports reached a table the owner had to remember to open in the Supabase dashboard; an
-- unanswered report is worse evidence than no form at all.
--
--   1. A guest may file, with an email address to reply to. Not by a table insert -- this project's
--      publishable key cannot write tables as anon (0078) -- but through file_accessibility_report(),
--      a definer function, as record_route_view() (0353) already lets a guest record a page view.
--      Signed-in callers file through it too, so there is ONE path and one set of limits.
--   2. Limits, since a guest form is an open door: 5 reports a day per account or per email, and
--      40 guest reports an hour across the whole app. A legitimate reporter never meets them.
--   3. accessibility_report_queue(): the admin's list, with the address to reply to -- the guest's
--      contact_email, else the account's sign-in email from auth.users, which no client can read.
--      The app counts open reports into the Review badge (useAdminQueueCounts) and lists them there.

begin;

alter table accessibility_reports alter column user_id drop not null;
alter table accessibility_reports add column if not exists contact_email text;
alter table accessibility_reports drop constraint if exists accessibility_reports_contact_email_ck;
alter table accessibility_reports add constraint accessibility_reports_contact_email_ck
  check (contact_email is null or (char_length(contact_email) <= 320 and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'));
-- Somebody must be reachable: an account, or an address.
alter table accessibility_reports drop constraint if exists accessibility_reports_reachable_ck;
alter table accessibility_reports add constraint accessibility_reports_reachable_ck
  check (user_id is not null or contact_email is not null);

comment on column accessibility_reports.contact_email is
  'Where to reply. Required from a guest; optional from a signed-in climber, whose account email is used otherwise (0354).';
comment on table accessibility_reports is
  'Accessibility problems filed from Settings -> Legal -> Accessibility, signed in or not (0354). Filed only '
  'through file_accessibility_report(); the owner reads them in Profile -> Review (accessibility_report_queue()) '
  'and replies by email. on delete cascade, as data_requests: a deleted account takes its reports with it.';

-- The direct insert policy goes: every report now arrives through the function below.
drop policy if exists "file own accessibility report" on accessibility_reports;
revoke insert on accessibility_reports from anon, authenticated;

create index if not exists accessibility_reports_guest_recent_idx on accessibility_reports (created_at desc) where user_id is null;

create or replace function public.file_accessibility_report(p_problem text, p_screen text default null, p_assistive text default null, p_email text default null)
returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_id uuid;
begin
  if v_uid is null and v_email is null then
    raise exception 'An email address is needed so we can reply.' using errcode = 'P0001';
  end if;
  if v_uid is not null and (select count(*) from accessibility_reports where user_id = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have sent 5 reports today. Please try again tomorrow.' using errcode = 'P0001';
  end if;
  if v_uid is null then
    if (select count(*) from accessibility_reports where user_id is null and lower(contact_email) = v_email and created_at > now() - interval '1 day') >= 5 then
      raise exception 'This address has sent 5 reports today. Please try again tomorrow.' using errcode = 'P0001';
    end if;
    if (select count(*) from accessibility_reports where user_id is null and created_at > now() - interval '1 hour') >= 40 then
      raise exception 'Too many reports right now. Please try again in an hour.' using errcode = 'P0001';
    end if;
  end if;
  insert into accessibility_reports (user_id, contact_email, screen, problem, assistive, status)
  values (v_uid, v_email, nullif(btrim(coalesce(p_screen, '')), ''), btrim(coalesce(p_problem, '')),
          nullif(btrim(coalesce(p_assistive, '')), ''), 'open')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.file_accessibility_report(text, text, text, text) from public;
grant execute on function public.file_accessibility_report(text, text, text, text) to anon, authenticated;
comment on function public.file_accessibility_report(text, text, text, text) is
  'The one way an accessibility report is filed, signed in or not (0354). Limits: 5/day per account or email, 40 guest reports/hour app-wide.';

create or replace function public.accessibility_report_queue(p_status text default 'open')
returns table (id uuid, created_at timestamptz, status text, problem text, screen text, assistive text, reply_to text, reporter_name text, from_guest boolean)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select r.id, r.created_at, r.status, r.problem, r.screen, r.assistive,
           coalesce(r.contact_email, u.email::text), p.name, (r.user_id is null)
      from accessibility_reports r
      left join auth.users u on u.id = r.user_id
      left join profiles p on p.id = r.user_id
     where p_status is null or r.status = p_status
     order by r.created_at asc
     limit 200;
end;
$$;
revoke all on function public.accessibility_report_queue(text) from public, anon;
grant execute on function public.accessibility_report_queue(text) to authenticated;
comment on function public.accessibility_report_queue(text) is
  'Admin-only list of accessibility reports with the address to reply to (0354). Oldest first: the reply clock is set by the oldest.';

commit;

-- Verify after applying, as separate statements:
--   select polname, cmd from pg_policies where tablename = 'accessibility_reports';      -- expect 2: select, update (no insert)
--   select proname, proacl from pg_proc where proname in ('file_accessibility_report','accessibility_report_queue');
