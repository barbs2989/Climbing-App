-- Behavioural probe for 0194 (leaderboard anti-padding rules). Rolls back by construction:
-- the DO block ends in RAISE, whose message carries the results (the CLI returns only the last
-- statement, and a raise is how results escape). Nothing persists. Run:
--   npx supabase db query --linked -f scripts/oneoff/probe-ranks-anti-padding.sql
-- Expected (verified 2026-09-24): future_refused true, stranger_refused true, b_catches 1,
-- a_all.logged 8, a_backed.logged 2, a_all.points.sport 80, a_all.points.all 111,
--   ...until 0203 (re-verified 2026-09-24): a_all.backed 0, a_backed null, a_all.points.all 77,
--   points.sport 51. Its photo carries no taken-on date and partner B is a brand-new account with
--   no confirmed email, so NEITHER backs a climb any more; every other value is unchanged. The
--   0203 rules have their own probe, probe-ranks-anti-collusion.sql.
-- a_all.onsights.sport.life 1, a_all.peaks.life 1, confirmations_after_edit 0, near_no_origin true.
-- Route ids are real catalog rows; if one is ever deleted, pick another of the same shape.
begin;

alter table climb_logs alter column discipline set default 'sport';
do $probe$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  l_dup uuid; l_conf uuid; l_deny uuid; l_ctag uuid;
  out jsonb := '{}'::jsonb; st jsonb; v text; n int; err text;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-a-'||a||'@example.invalid'),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-b-'||b||'@example.invalid'),
    (c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-c-'||c||'@example.invalid');
  insert into profiles (id, name, username) values (a,'Probe A','probea'),(b,'Probe B','probeb'),(c,'Probe C','probec')
    on conflict (id) do update set name = excluded.name, username = excluded.username;
  insert into connections (requester, addressee, status) values (a, b, 'accepted');

  -- future date is refused
  begin
    insert into climb_logs (user_id, route_id, date_climbed, tick_type) values (a, 'wa_custodians_of_the_useless', current_date + 5, 'Redpoint');
    out := out || '{"future_refused": false}';
  exception when others then out := out || jsonb_build_object('future_refused', sqlstate = '22008');
  end;

  insert into climb_logs (user_id, route_id, date_climbed, tick_type, created_at) values
    (a, 'wa_custodians_of_the_useless', current_date - 10, 'Onsight', now() - interval '3 hour'),
    (a, 'wa_custodians_of_the_useless', current_date - 5,  'Redpoint', now() - interval '2 hour'),
    (a, 'wa_i_can_see_your_house_from_here', current_date - 20, 'Attempt', now()),
    (a, 'wa_i_can_see_your_house_from_here', current_date - 2, 'Flash', now()),
    (a, 'wa_mount_stuart_north_ridge', current_date - 30, 'Summit', now());
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, created_at) values
    (a, 'wa_custodians_of_the_useless', current_date - 10, 'Onsight', now()) returning id into l_dup;
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, photos) values
    (a, 'az_bill_s_problem_2', current_date - 1, 'Flash', '[{"url":"x","caption":null}]');
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, partners) values
    (a, 'wa_i_can_see_your_house_from_here', current_date - 3, 'Redpoint', array[b]) returning id into l_conf;
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, partners) values
    (a, 'wa_mount_stuart_north_ridge', current_date - 40, 'Summit', array[b]) returning id into l_deny;
  insert into climb_logs (user_id, route_id, date_climbed, tick_type, partners) values
    (a, 'wa_custodians_of_the_useless', current_date - 1, 'Redpoint', array[c]) returning id into l_ctag;

  -- belay: b credits itself (ignored); a, who was caught, files one (counted)
  perform set_config('request.jwt.claims', json_build_object('sub', b::text, 'role', 'authenticated')::text, true);
  insert into belay_catches (belayer_id, climber_id, date_occurred) values (b, a, current_date - 4);
  select count(*) into n from log_tags_for_me();
  out := out || jsonb_build_object('b_sees_tags', n);
  perform respond_to_log_tag(l_conf, 'confirmed');
  perform respond_to_log_tag(l_deny, 'denied');
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role', 'authenticated')::text, true);
  insert into belay_catches (belayer_id, climber_id, date_occurred) values (b, a, current_date - 6);

  -- c is tagged but not a connection: refused
  perform set_config('request.jwt.claims', json_build_object('sub', c::text, 'role', 'authenticated')::text, true);
  begin
    perform respond_to_log_tag(l_ctag, 'confirmed');
    out := out || '{"stranger_refused": false}';
  exception when others then out := out || jsonb_build_object('stranger_refused', sqlstate = '42501');
  end;
  select count(*) into n from leaderboard('friends');
  out := out || jsonb_build_object('c_friends_rows', n);

  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role', 'authenticated')::text, true);
  select l.stats into st from leaderboard('overall') l where l.user_id = a;
  out := out || jsonb_build_object('a_all', st -> 'all', 'a_backed', st -> 'backed');
  select l.catches into n from leaderboard('overall') l where l.user_id = b;
  out := out || jsonb_build_object('b_catches', n);
  select count(*) into n from leaderboard('friends');
  out := out || jsonb_build_object('a_friends_rows', n);
  select count(*) into n from leaderboard('area', 'washington') l where l.user_id in (a, b, c);
  out := out || jsonb_build_object('wa_area_rows_probe_users', n);
  select l.stats -> 'all' ->> 'logged' into v from leaderboard('area', 'az_alley_rocks') l where l.user_id = a;
  out := out || jsonb_build_object('a_logged_in_az_alley', v);
  select l.no_origin::text into v from leaderboard('near') l where l.user_id = a;
  out := out || jsonb_build_object('near_no_origin', v);

  -- editing the confirmed climb's date clears the verdict
  update climb_logs set date_climbed = current_date - 4 where id = l_conf;
  select count(*) into n from climb_log_confirmations where log_id = l_conf;
  out := out || jsonb_build_object('confirmations_after_edit', n);

  raise exception 'PROBE %', out::text;
end $probe$;
rollback;
