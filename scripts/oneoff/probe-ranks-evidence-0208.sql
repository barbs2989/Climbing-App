-- Behavioural probe for 0208: confirmations need TWO different qualifying partners; a GPS track
-- must be a timed recording; a photo backs only the first log that used it. Rolls back by
-- construction (the DO block ends in RAISE). Nothing persists. Run:
--   npx supabase db query --linked -f scripts/oneoff/probe-ranks-evidence-0208.sql
-- Expected (verified 2026-09-24):
--   one_partner self -> after a second partner: one_partner confirmed, second_partner confirmed;
--   trk_recorded evidence; trk_untimed, trk_short, trk_fast, trk_backwards self;
--   photo_first evidence, photo_reused self (same hash, later log, other climber),
--   photo_near_copy self (3 bits off; the bar is 8), photo_different evidence (20+ bits off), photo_no_hash self.
begin;

alter table climb_logs alter column discipline set default 'sport';
do $probe$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); p1 uuid := gen_random_uuid(); p2 uuid := gen_random_uuid();
  rt text := 'wa_custodians_of_the_useless';
  rlat double precision; rlng double precision;
  l uuid; ids jsonb := '{}'::jsonb; out jsonb := '{}'::jsonb;
  pts_timed jsonb; pts_untimed jsonb; pts_short jsonb; pts_fast jsonb; pts_back jsonb;
  tier_of text;
begin
  select coalesce(ro.lat, ra.lat), coalesce(ro.lng, ra.lng) into rlat, rlng
    from routes ro join areas ra on ra.id = ro.area_id where ro.id = rt;

  insert into auth.users (id, instance_id, aud, role, email)
  select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-'||u||'@example.invalid'
    from unnest(array[a, b, p1, p2]) u;
  insert into profiles (id, name, username) values (a,'Probe A','probe7_a'),(b,'Probe B','probe7_b'),(p1,'Probe P1','probe7_p1'),(p2,'Probe P2','probe7_p2')
    on conflict (id) do update set name = excluded.name, username = excluded.username;
  update profiles set created_at = now() - interval '90 days' where id in (p1, p2);
  insert into verification_records (user_id, verification_type, status) values (p1,'email','verified'),(p2,'email','verified');
  insert into connections (requester, addressee, status) values (a, p1, 'accepted'), (a, p2, 'accepted');

  -- (a) one qualifying partner is not enough ...
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, partners) values (a, rt, current_date - 40, 'Redpoint', array[p1]) returning id into l;
  ids := ids || jsonb_build_object('one_partner', l);
  insert into climb_log_confirmations (log_id, partner_id, verdict) values (l, p1, 'confirmed');
  select rl.tier into tier_of from rankable_logs(array[a]) rl where rl.id = l;
  out := out || jsonb_build_object('one_partner_alone', tier_of);
  -- ... a second, different one carries both
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, partners) values (a, rt, current_date - 41, 'Redpoint', array[p2]) returning id into l;
  ids := ids || jsonb_build_object('second_partner', l);
  insert into climb_log_confirmations (log_id, partner_id, verdict) values (l, p2, 'confirmed');

  -- (b) tracks: 25 points walking north from the climb, one a minute (24 min)
  select jsonb_agg(jsonb_build_array(rlat + i * 0.0002, rlng, 3000, i * 60)) into pts_timed from generate_series(0, 24) i;
  select jsonb_agg(jsonb_build_array(rlat + i * 0.0002, rlng, 3000)) into pts_untimed from generate_series(0, 24) i;
  select jsonb_agg(jsonb_build_array(rlat + i * 0.0002, rlng, 3000, i * 10)) into pts_short from generate_series(0, 24) i;
  select jsonb_agg(jsonb_build_array(rlat + i * 0.02, rlng, 3000, i * 60)) into pts_fast from generate_series(0, 24) i;
  select jsonb_agg(jsonb_build_array(rlat + i * 0.0002, rlng, 3000, (24 - i) * 60)) into pts_back from generate_series(0, 24) i;
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, gpx_track) values
    (a, rt, current_date - 60, 'Redpoint', jsonb_build_object('pts', pts_timed, 'startedAt', ((current_date - 60)::timestamp + interval '7 hour')::text)) returning id into l;
  ids := ids || jsonb_build_object('trk_recorded', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, gpx_track) values
    (a, rt, current_date - 61, 'Redpoint', jsonb_build_object('pts', pts_untimed, 'startedAt', ((current_date - 61)::timestamp)::text)) returning id into l;
  ids := ids || jsonb_build_object('trk_untimed', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, gpx_track) values
    (a, rt, current_date - 62, 'Redpoint', jsonb_build_object('pts', pts_short, 'startedAt', ((current_date - 62)::timestamp)::text)) returning id into l;
  ids := ids || jsonb_build_object('trk_short', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, gpx_track) values
    (a, rt, current_date - 63, 'Redpoint', jsonb_build_object('pts', pts_fast, 'startedAt', ((current_date - 63)::timestamp)::text)) returning id into l;
  ids := ids || jsonb_build_object('trk_fast', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, gpx_track) values
    (a, rt, current_date - 64, 'Redpoint', jsonb_build_object('pts', pts_back, 'startedAt', ((current_date - 64)::timestamp)::text)) returning id into l;
  ids := ids || jsonb_build_object('trk_backwards', l);

  -- (c) photos, all dated the day of the climb
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, photos, photo_taken_on, photo_hash, created_at)
    values (a, rt, current_date - 70, 'Redpoint', '["x"]', current_date - 70, 'f0f0f0f0a5a5a5a5', now() - interval '1 hour') returning id into l;
  ids := ids || jsonb_build_object('photo_first', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, photos, photo_taken_on, photo_hash)
    values (b, rt, current_date - 71, 'Redpoint', '["x"]', current_date - 71, 'f0f0f0f0a5a5a5a5') returning id into l;
  ids := ids || jsonb_build_object('photo_reused', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, photos, photo_taken_on, photo_hash)
    values (b, rt, current_date - 72, 'Redpoint', '["x"]', current_date - 72, 'f0f0f0f0a5a5a5a2') returning id into l;
  ids := ids || jsonb_build_object('photo_near_copy', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, photos, photo_taken_on, photo_hash)
    values (b, rt, current_date - 73, 'Redpoint', '["x"]', current_date - 73, '0f0f0f0f5a5a5a5a') returning id into l;
  ids := ids || jsonb_build_object('photo_different', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, photos, photo_taken_on)
    values (b, rt, current_date - 74, 'Redpoint', '["x"]', current_date - 74) returning id into l;
  ids := ids || jsonb_build_object('photo_no_hash', l);

  select out || jsonb_object_agg(k, (select rl.tier from rankable_logs(array[a, b]) rl where rl.id = (ids ->> k)::uuid))
    into out from jsonb_object_keys(ids) k;
  raise exception 'PROBE %', out;
end $probe$;
rollback;
