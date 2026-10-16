-- Behavioural probe for 0323 (one grade scale, top-rope/follow a grade lower, conditions reports
-- are not climbs, vert counts finished climbs and crag height, per-discipline stats). Rolls back by
-- construction: the DO block ends in RAISE, whose message carries the results. Run:
--   npx supabase db query --linked -f scripts/oneoff/probe-ranks-0323.sql
-- Expected (verified 2026-10-15):
--   g_yds_5_10 10, g_v5 12.5, g_vb 9.5, g_wi5 10.25, g_wi3_5 8.25, g_m8 12.25, g_class 0, g_null 0
--   logged 3 (the Conditions report is not one), sends.sport.life 1, onsights.sport.life 1 (the
--   onsight came AFTER a conditions report and still counts), points.sport 22 (5.10 onsight,
--   unbacked: (8 + 10*10*0.35) * 0.5 = 21.5), points.toprope 21 (the same 5.10 on top-rope scores
--   a letter lower, 9.75: 20.6), points.all 42, vertYr 26 (the top-rope route's 8 m; the onsight
--   route stores no height, and the Attempt adds nothing), by.sport.logged 2, by.toprope.logged 1.
-- Route ids are real catalog rows; if one is ever deleted, pick another of the same shape.
begin;

alter table climb_logs alter column discipline set default 'sport';
do $probe$
declare
  a uuid := gen_random_uuid();
  out jsonb := '{}'::jsonb; st jsonb; tr text;
begin
  out := out || jsonb_build_object(
    'g_yds_5_10', rank_grade('yds', 10), 'g_v5', rank_grade('v', 5), 'g_vb', rank_grade('v', -1),
    'g_wi5', rank_grade('wi', 5), 'g_wi3_5', rank_grade('wi', 3.5), 'g_m8', rank_grade('m', 8),
    'g_class', rank_grade('class', 3), 'g_null', rank_grade('yds', null));

  insert into auth.users (id, instance_id, aud, role, email) values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-a-'||a||'@example.invalid');
  insert into profiles (id, name, username) values (a,'Probe A','probea')
    on conflict (id) do update set name = excluded.name, username = excluded.username;

  -- any top-rope-discipline route at 5.10, for the style penalty on its own key
  select ro.id into tr from routes ro where ro.discipline = 'toprope' and ro.grade_system = 'yds' and ro.grade_num = 10 limit 1;

  insert into climb_logs (user_id, route_id, date_climbed, tick_type, created_at) values
    (a, 'wa_custodians_of_the_useless', current_date - 12, 'Conditions', now() - interval '3 hour'),
    (a, 'wa_custodians_of_the_useless', current_date - 10, 'Onsight', now() - interval '2 hour'),
    (a, 'wa_i_can_see_your_house_from_here', current_date - 8, 'Attempt', now()),
    (a, tr, current_date - 6, 'Top-rope', now());

  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role', 'authenticated')::text, true);
  select l.stats -> 'all' into st from leaderboard('overall') l where l.user_id = a;
  out := out || jsonb_build_object('logged', st -> 'logged', 'sends', st -> 'sends', 'onsights', st -> 'onsights',
    'points', st -> 'points', 'vertYr', st -> 'vertYr', 'by', st -> 'by', 'tr_route', tr);

  raise exception 'PROBE %', out::text;
end $probe$;
rollback;
