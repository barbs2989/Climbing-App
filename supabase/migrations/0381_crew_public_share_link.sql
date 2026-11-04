-- 0381: a crew's public share link (owner decision 2026-10-28, Gora audit proposal 2).
--
-- A crew member can text a link to someone who is not on the app. The link opens a preview of the crew:
-- where, when, how many are going and how many spots are left, and FIRST NAMES ONLY of members who
-- show their name publicly (show_name). Anyone else is counted, never named. Joining needs an account:
-- the preview's Join signs the visitor up, then files the ordinary pending request (policy
-- "join or invite" on crew_members already allows auth.uid() = user_id AND status = 'pending').
--
-- The link stops working (the preview returns NULL) when:
--   * the crew's owner turns it off (share_on = false; the existing owner-only UPDATE policy covers it),
--   * the crew is dismissed, or
--   * the crew's climb date has passed: agreed_date if set, else the LAST proposed date.
-- A crew with no date at all stays shareable until the owner turns it off.
--
-- share_token is a random uuid, separate from the crew id, so a link can be revoked by turning sharing
-- off without exposing or changing the crew's identity. Members read it through the existing
-- "crew members can read" SELECT policy; nobody else can.

alter table public.crews
  add column if not exists share_token uuid not null default gen_random_uuid(),
  add column if not exists share_on boolean not null default true;

create unique index if not exists crews_share_token_key on public.crews (share_token);

create or replace function public.crew_share_preview(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with c as (
    select cr.*
      from crews cr
     where cr.share_token = p_token
       and cr.share_on
       and not cr.dismissed
  ),
  last_day as (
    select coalesce(
             case when c.agreed_date ~ '^\d{4}-\d{2}-\d{2}$' then c.agreed_date::date end,
             (select max(x::date) from jsonb_array_elements_text(c.dates) x where x ~ '^\d{4}-\d{2}-\d{2}$')
           ) as d
      from c
  ),
  ids as (
    select c.created_by as user_id from c where c.created_by is not null
    union
    select cm.user_id from c join crew_members cm on cm.crew_id = c.id and cm.status = 'confirmed'
  ),
  people as (
    select p.name, p.show_name from ids join profiles p on p.id = ids.user_id
  )
  select case
    when not exists (select 1 from c) then null
    when (select d from last_day) is not null and (select d from last_day) < current_date then null
    else jsonb_build_object(
      'crew_id',     (select id from c),
      'route_id',    (select route_id from c),
      'area_id',     (select area_id from c),
      'discipline',  (select discipline from c),
      'dates',       (select dates from c),
      'agreed_date', (select agreed_date from c),
      'cap',         (select cap from c),
      'going',       (select count(*) from ids),
      'first_names', (select coalesce(jsonb_agg(split_part(btrim(name), ' ', 1)), '[]'::jsonb)
                        from people where show_name and coalesce(btrim(name), '') <> ''),
      'place_name',  coalesce((select r.name from c join routes r on r.id = c.route_id),
                              (select a.name from c join areas a on a.id = c.area_id))
    )
  end;
$$;

revoke all on function public.crew_share_preview(uuid) from public;
grant execute on function public.crew_share_preview(uuid) to anon, authenticated;

comment on function public.crew_share_preview(uuid) is
  'Public preview of a crew behind its share link (0381): place, dates, size, first names of members who show their name. NULL when sharing is off, the crew is dismissed, or its date has passed.';
