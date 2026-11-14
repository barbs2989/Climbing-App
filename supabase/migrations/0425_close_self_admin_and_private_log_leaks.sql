-- 0425 — Security audit 2026-11-14: a climber could make themselves an admin, private reports could be
-- traced to their author, and approved GPS submissions published the submitter's email.
--
-- 1. SELF-GRANTED ADMIN. 0020's guard_self_admin fires BEFORE UPDATE only, but the "edit own profile"
--    policy is FOR ALL (select, insert, update, DELETE) on the caller's own row. So a signed-in climber
--    could `delete from profiles where id = auth.uid()` and then `insert ... (id, is_admin) values
--    (auth.uid(), true)`: no UPDATE ever happened, the trigger never ran, and is_admin() answered true —
--    unlocking set_account_standing (ban anyone), moderate_content, guide documents, every report queue.
--    Reproduced on a PGlite replay of 0001–0424 with Supabase's default grants. The guard now also runs on
--    INSERT, and an inserted row may only carry is_admin = true when the caller is already an admin.
--    0083's bootstrap path (disable trigger, update, enable) is unchanged.
--
-- 2. PRIVATE REPORTS DE-ANONYMIZED. route_private_conditions (0329/0358, callable signed out) keys each
--    private report by md5(user_id || ':' || route_id). Every user id is readable from profiles, so anyone
--    could hash every id with the route and name the author of each friends/crew/private report. It also
--    returned the log's real id, which rank_breakdown returns too (with grade and discipline), so the two
--    joined. The key is now salted with a secret no client can read (private.log_hash_salt, in a schema
--    PostgREST does not expose), and the id is an opaque per-log uuid from the same salt: still stable and
--    unique (React keys, the bell's "objlog_" ids), no longer joinable. objective_private_logs (0368) gets
--    the same opaque id. Nothing in lib/ uses either id to fetch a log (it cannot: they are private).
--
-- 3. GPS SUBMITTER EMAIL. "anyone_can_read_approved_gps" (00422) let anyone, signed out included, read
--    every approved submission row: climber_email, climber_name, admin_notes and the raw gpx_data. An
--    approved track is merged into the route, which is what the app reads; no client reads approved
--    submission rows (edge functions use the service key and are unaffected). The policy is dropped.
--    Admins (0397) and the submitter ("users_can_read_own_gps") keep their reads.

-- ── 1. is_admin can not be inserted ────────────────────────────────────────────────────────────────
create or replace function public.prevent_self_admin() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    if new.is_admin and not is_admin(auth.uid()) then
      raise exception 'only an admin can change is_admin' using errcode = '42501';
    end if;
  elsif new.is_admin is distinct from old.is_admin then
    if not is_admin(auth.uid()) then
      raise exception 'only an admin can change is_admin';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists guard_self_admin on public.profiles;
create trigger guard_self_admin before insert or update on public.profiles
  for each row execute function public.prevent_self_admin();

-- ── 2. a salt no client can read ───────────────────────────────────────────────────────────────────
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.log_hash_salt (
  only_row boolean primary key default true check (only_row),
  salt text not null
);
-- RLS on with NO policy: no client role can read it even if the schema were ever exposed. The two
-- definer functions below read it as the table owner, which RLS does not apply to.
alter table private.log_hash_salt enable row level security;
revoke all on private.log_hash_salt from public, anon, authenticated;
insert into private.log_hash_salt (salt)
  values (encode(extensions.gen_random_bytes(32), 'hex'))
  on conflict (only_row) do nothing;

-- An opaque, stable stand-in for a private log's id: same log → same uuid, not reversible, not the real id.
create or replace function private.opaque_log_id(p_id uuid) returns uuid
language sql stable security definer set search_path = pg_temp as $$
  select md5('log:' || (select salt from private.log_hash_salt) || ':' || p_id::text)::uuid;
$$;
revoke all on function private.opaque_log_id(uuid) from public, anon, authenticated;

create or replace function public.route_private_conditions(p_route text)
returns table(id uuid, reporter_key text, date_climbed date, tick_type text, discipline text,
  cond_tags text[], outcome_reasons text[], approach_minutes integer, climb_minutes integer,
  descent_minutes integer, car_to_car_minutes integer, snow_condition text, freezing_level_ft integer,
  water_level text, bug_pressure text, trail_condition text, protection_quality text, anchor_quality text,
  crowd_level text, temp_f integer, snow_depth text, seepage text, mud text, nights_out integer, camp_names text[])
language sql stable security definer set search_path = public, pg_temp as $$
  select private.opaque_log_id(l.id),
         md5('reporter:' || (select salt from private.log_hash_salt) || ':' || l.user_id::text || ':' || l.route_id),
         l.date_climbed, l.tick_type, l.discipline,
         l.cond_tags, l.outcome_reasons,
         l.approach_minutes, l.climb_minutes, l.descent_minutes, l.car_to_car_minutes,
         l.snow_condition, l.freezing_level_ft, l.water_level, l.bug_pressure, l.trail_condition,
         l.protection_quality, l.anchor_quality, l.crowd_level,
         l.temp_f, l.snow_depth, l.seepage, l.mud,
         l.nights_out, l.camp_names
    from climb_logs l
   where l.route_id = p_route
     and l.trip_report_visibility is distinct from 'public'
     and l.moderation = 'visible'
     and (auth.uid() is null or l.user_id <> auth.uid())
     and not (l.trip_report_visibility = 'friends' and is_my_friend(l.user_id))
     and not (l.trip_report_visibility = 'crew' and l.crew_id in (
           select cm.crew_id from crew_members cm where cm.user_id = auth.uid() and cm.status = 'confirmed'))
     and not exists (select 1 from blocked_users b
                      where (b.blocker = l.user_id and b.blocked = auth.uid())
                         or (b.blocker = auth.uid() and b.blocked = l.user_id))
   order by l.date_climbed desc nulls last
   limit 60;
$$;

create or replace function public.objective_private_logs(p_days integer default 30)
returns table(id uuid, route_id text, date_climbed date, tick_type text, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select private.opaque_log_id(l.id), l.route_id, l.date_climbed, l.tick_type, l.created_at
    from climb_logs l
   where auth.uid() is not null
     and l.route_id in (select o.route_id from objectives o where o.user_id = auth.uid())
     and l.user_id <> auth.uid()
     and l.date_climbed >= current_date - least(greatest(coalesce(p_days, 30), 1), 90)
     and l.trip_report_visibility is distinct from 'public'
     and l.moderation = 'visible'
     and not (l.trip_report_visibility = 'friends' and is_my_friend(l.user_id))
     and not (l.trip_report_visibility = 'crew' and l.crew_id in (
           select cm.crew_id from crew_members cm where cm.user_id = auth.uid() and cm.status = 'confirmed'))
     and not exists (select 1 from blocked_users b
                      where (b.blocker = l.user_id and b.blocked = auth.uid())
                         or (b.blocker = auth.uid() and b.blocked = l.user_id))
   order by l.date_climbed desc, l.created_at desc
   limit 40;
$$;

-- ── 3. approved GPS submissions are not public rows ────────────────────────────────────────────────
drop policy if exists "anyone_can_read_approved_gps" on public.gps_submissions;
