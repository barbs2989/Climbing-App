-- Behavioural probe for 0203 (confirmations need an aged, email-confirmed partner and are capped
-- per partner; photo and GPS evidence must agree with the climb; the trust score counts what Ranks
-- counts and reads the same to everyone). Rolls back by construction: the DO block ends in RAISE,
-- whose message carries the results. Nothing persists. Run:
--   npx supabase db query --linked -f scripts/oneoff/probe-ranks-anti-collusion.sql
-- Expected (verified 2026-09-24):
--   conf_aged confirmed, conf_fresh self, conf_noemail self, pair_cap_confirmed 12 of 14,
--   photo_same_day evidence, photo_week_off self, photo_far self, track_near evidence,
--   track_far self, track_wrong_day self, track_short self, rankable_logs_refused true,
--   trust_self = trust_other, my_counts.logs = a's rankable count (25), my_counts.reports 1
--   (the one log with notes), counted_catches 1, both internal functions refused to a client.
--   ...until 0208 (re-verified 2026-09-24): track_near and photo_same_day now read self -- this
--   probe's track carries no per-point times and its photo no fingerprint, which 0208 requires.
--   Every other value is unchanged. 0208's own rules: probe-ranks-evidence-0208.sql.
-- Route ids are real catalog rows; if one is ever deleted, pick another of the same shape.
begin;

alter table climb_logs alter column discipline set default 'sport';
do $probe$
declare
  a uuid := gen_random_uuid(); aged uuid := gen_random_uuid(); fresh uuid := gen_random_uuid();
  noemail uuid := gen_random_uuid(); capper uuid := gen_random_uuid();
  rt text := 'wa_custodians_of_the_useless';
  rlat double precision; rlng double precision;
  l uuid; ids jsonb := '{}'::jsonb; out jsonb := '{}'::jsonb; n int; t1 int; t2 int; k int;
  trk_near jsonb; trk_far jsonb;
begin
  select coalesce(ro.lat, ra.lat), coalesce(ro.lng, ra.lng) into rlat, rlng
    from routes ro join areas ra on ra.id = ro.area_id where ro.id = rt;
  if rlat is null then raise exception 'PROBE route % has no coordinate', rt; end if;

  insert into auth.users (id, instance_id, aud, role, email)
  select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-'||u||'@example.invalid'
    from unnest(array[a, aged, fresh, noemail, capper]) u;
  insert into profiles (id, name, username)
  values (a,'Probe A','probe_a'),(aged,'Probe Aged','probe_aged'),(fresh,'Probe Fresh','probe_fresh'),
         (noemail,'Probe NoEmail','probe_noemail'),(capper,'Probe Capper','probe_capper')
    on conflict (id) do update set name = excluded.name, username = excluded.username;
  update profiles set created_at = now() - interval '90 days' where id in (aged, noemail, capper);
  insert into verification_records (user_id, verification_type, status)
  values (aged,'email','verified'),(fresh,'email','verified'),(capper,'email','verified');
  insert into connections (requester, addressee, status)
  values (a, aged, 'accepted'), (a, fresh, 'accepted'), (a, noemail, 'accepted'), (a, capper, 'accepted');

  -- one confirmed log per kind of partner, each on its own day
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, partners) values (a, rt, current_date - 40, 'Redpoint', array[aged]) returning id into l;
  ids := ids || jsonb_build_object('conf_aged', l);
  insert into climb_log_confirmations (log_id, partner_id, verdict) values (l, aged, 'confirmed');
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, partners) values (a, rt, current_date - 41, 'Redpoint', array[fresh]) returning id into l;
  ids := ids || jsonb_build_object('conf_fresh', l);
  insert into climb_log_confirmations (log_id, partner_id, verdict) values (l, fresh, 'confirmed');
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, partners) values (a, rt, current_date - 42, 'Redpoint', array[noemail]) returning id into l;
  ids := ids || jsonb_build_object('conf_noemail', l);
  insert into climb_log_confirmations (log_id, partner_id, verdict) values (l, noemail, 'confirmed');

  -- fourteen confirmations from ONE partner in one year: only twelve may count
  for k in 1..14 loop
    insert into climb_logs (user_id, route_id, date_climbed, tick_type, partners)
    values (a, 'wa_i_can_see_your_house_from_here', date_trunc('year', current_date)::date + k, 'Redpoint', array[capper]) returning id into l;
    insert into climb_log_confirmations (log_id, partner_id, verdict) values (l, capper, 'confirmed');
  end loop;

  -- photo evidence
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, photos, photo_taken_on) values (a, rt, current_date - 50, 'Redpoint', '["x"]', current_date - 50) returning id into l;
  ids := ids || jsonb_build_object('photo_same_day', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, photos, photo_taken_on) values (a, rt, current_date - 51, 'Redpoint', '["x"]', current_date - 58) returning id into l;
  ids := ids || jsonb_build_object('photo_week_off', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, photos, photo_taken_on, photo_near_route) values (a, rt, current_date - 52, 'Redpoint', '["x"]', current_date - 52, false) returning id into l;
  ids := ids || jsonb_build_object('photo_far', l);

  -- a trip report that says something counts as one; every bare log above (visibility defaults to
  -- 'crew') must not
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, notes) values (a, rt, current_date - 55, 'Redpoint', 'Wet in the crack, dry above.');

  -- GPS evidence: 25 points walking north from the climb's own coordinate, and the same 1 degree away
  select jsonb_agg(jsonb_build_array(rlat + i * 0.0002, rlng, 3000)) into trk_near from generate_series(1, 25) i;
  select jsonb_agg(jsonb_build_array(rlat + 1 + i * 0.0002, rlng, 3000)) into trk_far from generate_series(1, 25) i;
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, gpx_track) values (a, rt, current_date - 60, 'Redpoint',
    jsonb_build_object('pts', trk_near, 'startedAt', ((current_date - 60)::timestamp + interval '7 hour')::text)) returning id into l;
  ids := ids || jsonb_build_object('track_near', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, gpx_track) values (a, rt, current_date - 61, 'Redpoint',
    jsonb_build_object('pts', trk_far, 'startedAt', null)) returning id into l;
  ids := ids || jsonb_build_object('track_far', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, gpx_track) values (a, rt, current_date - 62, 'Redpoint',
    jsonb_build_object('pts', trk_near, 'startedAt', ((current_date - 70)::timestamp)::text)) returning id into l;
  ids := ids || jsonb_build_object('track_wrong_day', l);
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, gpx_track) values (a, rt, current_date - 63, 'Redpoint',
    jsonb_build_object('pts', (select jsonb_agg(e) from (select e from jsonb_array_elements(trk_near) e limit 5) s))) returning id into l;
  ids := ids || jsonb_build_object('track_short', l);

  select out || jsonb_object_agg(k2, (select rl.tier from rankable_logs(array[a]) rl where rl.id = (ids ->> k2)::uuid))
    into out from jsonb_object_keys(ids) k2;
  select count(*) filter (where rl.tier = 'confirmed') into n
    from rankable_logs(array[a]) rl where rl.route_id = 'wa_i_can_see_your_house_from_here';
  out := out || jsonb_build_object('pair_cap_confirmed', n);

  -- belay: aged credits itself for catching a (ignored); a, who was caught, files one (counted)
  perform set_config('request.jwt.claims', json_build_object('sub', aged::text, 'role', 'authenticated')::text, true);
  insert into belay_catches (belayer_id, climber_id, date_occurred) values (aged, a, current_date - 4);
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role', 'authenticated')::text, true);
  insert into belay_catches (belayer_id, climber_id, date_occurred) values (aged, a, current_date - 6);
  out := out || jsonb_build_object('counted_catches', counted_catch_count(aged));

  -- the trust score reads the same to its owner and to anyone else, and matches my_trust_counts
  t1 := compute_trust_score(a);
  select count(*) into n from rankable_logs(array[a]);
  out := out || jsonb_build_object('a_rankable', n, 'a_raw_logs', (select count(*) from climb_logs where user_id = a));
  out := out || jsonb_build_object('my_counts', (select to_jsonb(m) from my_trust_counts() m));
  perform set_config('request.jwt.claims', json_build_object('sub', aged::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t2 := compute_trust_score(a);
  out := out || jsonb_build_object('trust_self', t1, 'trust_other', t2);
  begin
    perform count(*) from rankable_logs(array[a]);
    out := out || '{"rankable_logs_refused": false}';
  exception when insufficient_privilege then out := out || '{"rankable_logs_refused": true}';
  end;
  begin
    perform counted_catch_count(a);
    out := out || '{"counted_catch_refused": false}';
  exception when insufficient_privilege then out := out || '{"counted_catch_refused": true}';
  end;
  select count(*) into n from leaderboard('overall') lb where lb.user_id = a;
  out := out || jsonb_build_object('leaderboard_still_runs_as_client', n = 1);
  reset role;

  raise exception 'PROBE %', out;
end $probe$;
rollback;
