-- Feedback and the app rating reach somebody.
--
-- The Menu's Feedback sheet copied the climber's note to their clipboard and said "nothing here is
-- sent anywhere" (no inbox existed, and the owner asked for no email address until one does). Rate app
-- drew five stars, thanked a 4-5 star climber "for rating", and recorded nothing: the stars went
-- nowhere, and ClimbMatch is not listed in any app store for them to go to. The owner asked for both
-- to actually work (2026-10-24).
--
-- Shaped like accessibility_reports (0343, 0354): ONE definer function files a note or a rating,
-- signed in or not (this project's publishable key cannot insert into a table as anon, 0078); the
-- owner reads them in Profile -> Review (app_feedback_queue()), counted into the Review badge.
--
-- A rating with no comment is filed already 'done': it is a number to count, not a note to answer,
-- and the Review badge must count only what needs reading. app_rating_summary() counts the ratings,
-- each climber's LATEST one only, so re-rating moves your rating rather than adding a second vote.

begin;

create table if not exists app_feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id) on delete cascade,
  kind          text not null check (kind in ('bug','idea','other','rating')),
  stars         smallint check (stars is null or stars between 1 and 5),
  message       text check (message is null or char_length(btrim(message)) between 1 and 4000),
  contact_email text check (contact_email is null or (char_length(contact_email) <= 320 and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  platform      text check (platform is null or char_length(platform) <= 40),
  app_version   text check (app_version is null or char_length(app_version) <= 40),
  status        text not null default 'open' check (status in ('open','done')),
  created_at    timestamptz not null default now(),
  -- A rating carries stars; a note carries words.
  constraint app_feedback_shape_ck check (case when kind = 'rating' then stars is not null else message is not null and stars is null end)
);

comment on table app_feedback is
  'Feedback notes and app ratings from the Menu (0365). Filed only through file_app_feedback(); the owner '
  'reads them in Profile -> Review (app_feedback_queue(), app_rating_summary()). on delete cascade, as '
  'accessibility_reports: a deleted account takes its feedback with it.';

create index if not exists app_feedback_open_idx on app_feedback (created_at) where status = 'open';
create index if not exists app_feedback_guest_recent_idx on app_feedback (created_at desc) where user_id is null;
create index if not exists app_feedback_user_idx on app_feedback (user_id, created_at desc);

alter table app_feedback enable row level security;

drop policy if exists "read own feedback" on app_feedback;
create policy "read own feedback" on app_feedback for select
  using (user_id = auth.uid() or is_admin(auth.uid()));

drop policy if exists "admin manages feedback" on app_feedback;
create policy "admin manages feedback" on app_feedback for update
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- No insert policy: every row arrives through the function below.
revoke insert on app_feedback from anon, authenticated;

create or replace function public.file_app_feedback(p_kind text, p_message text default null, p_stars int default null,
  p_email text default null, p_platform text default null, p_version text default null)
returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_msg text := nullif(btrim(coalesce(p_message, '')), '');
  v_id uuid;
begin
  if p_kind not in ('bug','idea','other','rating') then
    raise exception 'Unknown kind of feedback.' using errcode = 'P0001';
  end if;
  if p_kind = 'rating' and (p_stars is null or p_stars not between 1 and 5) then
    raise exception 'Pick from 1 to 5 stars.' using errcode = 'P0001';
  end if;
  if p_kind <> 'rating' and v_msg is null then
    raise exception 'Write something first.' using errcode = 'P0001';
  end if;
  if v_uid is not null and (select count(*) from app_feedback where user_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have sent 10 today. Please try again tomorrow.' using errcode = 'P0001';
  end if;
  if v_uid is null then
    if v_email is not null and (select count(*) from app_feedback where user_id is null and lower(contact_email) = v_email and created_at > now() - interval '1 day') >= 10 then
      raise exception 'This address has sent 10 today. Please try again tomorrow.' using errcode = 'P0001';
    end if;
    if (select count(*) from app_feedback where user_id is null and created_at > now() - interval '1 hour') >= 60 then
      raise exception 'Too many messages right now. Please try again in an hour.' using errcode = 'P0001';
    end if;
  end if;
  insert into app_feedback (user_id, kind, stars, message, contact_email, platform, app_version, status)
  values (v_uid, p_kind, case when p_kind = 'rating' then p_stars end, v_msg, v_email,
          nullif(left(btrim(coalesce(p_platform, '')), 40), ''), nullif(left(btrim(coalesce(p_version, '')), 40), ''),
          case when p_kind = 'rating' and v_msg is null then 'done' else 'open' end)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.file_app_feedback(text, text, int, text, text, text) from public;
grant execute on function public.file_app_feedback(text, text, int, text, text, text) to anon, authenticated;
comment on function public.file_app_feedback(text, text, int, text, text, text) is
  'The one way feedback or an app rating is filed, signed in or not (0365). Limits: 10/day per account or email, 60 guest messages/hour app-wide.';

create or replace function public.app_feedback_queue(p_status text default 'open')
returns table (id uuid, created_at timestamptz, status text, kind text, stars smallint, message text,
               platform text, app_version text, reply_to text, sender_name text, from_guest boolean)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select f.id, f.created_at, f.status, f.kind, f.stars, f.message, f.platform, f.app_version,
           coalesce(f.contact_email, u.email::text), p.name, (f.user_id is null)
      from app_feedback f
      left join auth.users u on u.id = f.user_id
      left join profiles p on p.id = f.user_id
     where p_status is null or f.status = p_status
     order by f.created_at asc
     limit 200;
end;
$$;
revoke all on function public.app_feedback_queue(text) from public, anon;
grant execute on function public.app_feedback_queue(text) to authenticated;
comment on function public.app_feedback_queue(text) is
  'Admin-only list of feedback notes and ratings with the address to reply to (0365). Oldest first.';

-- Each signed-in climber's LATEST rating counts once; every guest rating counts (a guest has no identity to dedupe by).
create or replace function public.app_rating_summary()
returns table (ratings bigint, average numeric, one bigint, two bigint, three bigint, four bigint, five bigint)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    with latest as (
      select distinct on (coalesce(user_id::text, id::text)) stars
        from app_feedback where kind = 'rating'
       order by coalesce(user_id::text, id::text), created_at desc
    )
    select count(*), round(avg(stars)::numeric, 2),
           count(*) filter (where stars = 1), count(*) filter (where stars = 2), count(*) filter (where stars = 3),
           count(*) filter (where stars = 4), count(*) filter (where stars = 5)
      from latest;
end;
$$;
revoke all on function public.app_rating_summary() from public, anon;
grant execute on function public.app_rating_summary() to authenticated;
comment on function public.app_rating_summary() is
  'Admin-only: how many climbers rated the app and the average, each account''s latest rating once (0365).';

commit;

-- Verify after applying, as separate statements:
--   select polname, cmd from pg_policies where tablename = 'app_feedback';     -- expect 2: select, update (no insert)
--   select proname, proacl from pg_proc where proname in ('file_app_feedback','app_feedback_queue','app_rating_summary');
