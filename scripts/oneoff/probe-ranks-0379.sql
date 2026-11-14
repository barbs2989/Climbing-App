-- Behavioural probe for 0379 (each board's true top 100, and your standing past it). Rolls back:
-- the DO block ends in RAISE, whose message carries the results. Run once 0379 is applied:
--   npx supabase db query --linked -f scripts/oneoff/probe-ranks-0379.sql
begin;

alter table climb_logs alter column discipline set default 'sport';
do $probe$
declare
  me_id uuid := gen_random_uuid();
  v_id uuid := gen_random_uuid();
  ids uuid[] := array[]::uuid[];
  rts text[];
  u uuid; k int; j int;
  out jsonb := '{}'::jsonb; sd jsonb;
begin
  -- 13 different, non-classic, graded sport routes
  select array_agg(x.id) into rts from (
    select ro.id from routes ro where ro.discipline = 'sport' and ro.grade_system = 'yds' and ro.grade_num between 8 and 11
       and not coalesce(ro.classic, false) order by ro.id limit 13) x;
  for k in 1..132 loop
    u := case k when 131 then me_id when 132 then v_id else gen_random_uuid() end;
    insert into auth.users (id, instance_id, aud, role, email) values
      (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-'||u||'@example.invalid');
    insert into profiles (id, name, username) values (u, 'Probe '||k, 'probe'||k)
      on conflict (id) do update set name = excluded.name, username = excluded.username;
    if k <= 130 then
      ids := ids || u;
      -- climber k logs ceil(k/10) different routes on different days: 1..13
      for j in 1..ceil(k / 10.0)::int loop
        insert into climb_logs (user_id, route_id, date_climbed, tick_type) values (u, rts[j], current_date - j, 'Lead');
      end loop;
    elsif k = 131 then
      insert into climb_logs (user_id, route_id, date_climbed, tick_type) values (u, rts[1], current_date - 1, 'Lead');
    end if;
  end loop;
  -- V logs nothing but holds a vouch: they must still be listed (top of Vouched)
  insert into vouches (from_id, to_id, reason) values (ids[1], v_id, 'probe');

  perform set_config('request.jwt.claims', json_build_object('sub', me_id::text, 'role', 'authenticated')::text, true);
  create temp table lb on commit drop as select * from leaderboard('overall');
  select l.stats -> 'standing' into sd from lb l where l.is_me;
  out := jsonb_build_object(
    'rows', (select count(*) from lb),
    'probe_rows', (select count(*) from lb l where l.user_id = any(ids)),
    'min_probe_logged', (select min((l.stats->'all'->>'logged')::int) from lb l where l.user_id = any(ids)),
    'v_listed', (select count(*) from lb l where l.user_id = v_id),
    'me_first', (select l.is_me from lb l limit 1),
    'others_with_logs', (select count(*) from lb l where not l.is_me and not (l.user_id = any(ids)) and l.user_id <> v_id),
    'all|all|active', sd -> 'all|all|active', 'all|sport|points', sd -> 'all|sport|points',
    'all|all|vouched', sd -> 'all|all|vouched', 'backed|all|active', sd -> 'backed|all|active',
    'n_keys', (select count(*) from jsonb_object_keys(sd)));
  raise exception 'PROBE %', out::text;
end $probe$;
rollback;
