-- 0469: the owner's alerts audit (2026-11-18), the two halves that need the database.
--
-- 1. A REVIEWED GPS TRACK TELLS ITS CLIMBER, IN ALERTS. review_gps_submission (0397, the owner's GPS queue)
--    approved or rejected a track and told nobody: the climber got a submission RECEIPT by email
--    (notify-gps-climber) and then silence, whatever the review decided. It now writes a user_notices row
--    through _notify (0309), the same way a route edit's outcome reaches the bell: approved reads
--    "Your GPS track is live: <climb>", rejected reads "...was turned down" with the reviewer's reason.
--    The existing contribution_approved / contribution_rejected kinds, so the bell's check and alert icons,
--    its tap (link.route opens the climb) and the kind constraint need no change. The function is
--    otherwise 0397's, unchanged.
--
-- 2. NOTIFICATION SWITCHES FOLLOW THE ACCOUNT. Settings > Notifications was saved in localStorage only,
--    so a switch turned off on a phone was on again in another browser. notification_state (0346) already
--    carries the account's read and cleared alerts; prefs joins it, the keys lib/notif-pref.js offers,
--    each true or false. An object, and small, so a client cannot park a blob in it.
begin;

alter table public.notification_state add column if not exists prefs jsonb not null default '{}'::jsonb;
alter table public.notification_state drop constraint if exists notification_state_prefs_check;
alter table public.notification_state add constraint notification_state_prefs_check
  check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) < 2000);

create or replace function public.review_gps_submission(p_id uuid, p_action text, p_to_area boolean default false, p_notes text default null)
returns text
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  s gps_submissions%rowtype;
  v_area text;
  v_old jsonb;
  v_by text := nullif(left(coalesce((select email::text from auth.users where id = auth.uid()), ''), 254), '');
  v_notes text := nullif(left(btrim(coalesce(p_notes, '')), 2000), '');
  v_user uuid;
  v_route text;
  v_place text;
begin
  if not is_admin(auth.uid()) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'Unknown action.' using errcode = 'P0001';
  end if;
  select * into s from gps_submissions where id = p_id for update;
  if not found then
    raise exception 'That submission no longer exists.' using errcode = 'P0001';
  end if;
  if s.status is distinct from 'pending' then
    raise exception 'That submission was already reviewed.' using errcode = 'P0001';
  end if;

  -- WHO SENT IT (0469). validate-gps stores only the signed-in caller's own verified address, so the address
  -- names one account; a row with no match (an old or anonymous one) gets no alert, as before.
  select id into v_user from auth.users where s.climber_email is not null and lower(email::text) = lower(btrim(s.climber_email)) limit 1;
  select coalesce(nullif(name, ''), 'your climb') into v_route from routes where id = s.route_id;
  v_route := coalesce(v_route, 'your climb');

  if p_action = 'reject' then
    update gps_submissions set status = 'rejected', admin_notes = coalesce(v_notes, 'Rejected by admin'), updated_at = now() where id = p_id;
    perform _notify(v_user, 'contribution_rejected', 'Your GPS track for ' || v_route || ' was turned down',
                    case when v_notes is not null then 'Reason: ' || v_notes end, jsonb_build_object('route', s.route_id));
    return 'rejected';
  end if;

  if jsonb_typeof(s.gpx_data) <> 'array' or jsonb_array_length(s.gpx_data) < 10 then
    raise exception 'This line has fewer than 10 points, and the map draws nothing under 10. Reject it and ask for a fuller trace.' using errcode = 'P0001';
  end if;

  if p_to_area then
    select area_id into v_area from routes where id = s.route_id;
    if v_area is null then
      raise exception 'This climb is not filed under a crag, so there is nowhere to save the walk in.' using errcode = 'P0001';
    end if;
    select walkin_gpx into v_old from areas where id = v_area for update;
    update areas set walkin_gpx = s.gpx_data,
                     walkin_kind = case when s.device_type = 'Traced on the map' then 'traced' else 'recorded' end,
                     walkin_submission_id = s.id
     where id = v_area;
    update gps_submissions set status = 'approved', approved_at = now(), approved_by = v_by, admin_notes = v_notes,
                               area_id = v_area, replaced_gpx = v_old, updated_at = now()
     where id = p_id;
    select coalesce(nullif(name, ''), 'this crag') into v_place from areas where id = v_area;
    perform _notify(v_user, 'contribution_approved', 'Your GPS track is live: ' || v_route,
                    'It now draws the walk in for every climb at ' || coalesce(v_place, 'this crag') || '.', jsonb_build_object('route', s.route_id));
    return 'approved:area:' || v_area;
  end if;

  select gpx into v_old from routes where id = s.route_id for update;
  -- elev_pts was sampled along the OLD line, so it goes with it; the profile is rebuilt from a new one.
  update routes set gpx = s.gpx_data, elev_pts = null, gps_contributor_name = left(s.climber_name, 80) where id = s.route_id;
  update gps_submissions set status = 'approved', approved_at = now(), approved_by = v_by, admin_notes = v_notes,
                             replaced_gpx = v_old, updated_at = now()
   where id = p_id;
  perform _notify(v_user, 'contribution_approved', 'Your GPS track is live: ' || v_route,
                  'It now draws on the climb''s map.', jsonb_build_object('route', s.route_id));
  return 'approved:route:' || s.route_id;
end;
$$;
revoke all on function public.review_gps_submission(uuid, text, boolean, text) from public, anon;
grant execute on function public.review_gps_submission(uuid, text, boolean, text) to authenticated;
comment on function public.review_gps_submission(uuid, text, boolean, text) is
  'Admin-only: approve a GPS submission (REPLACES the crag''s walk in when p_to_area, else the route''s line; the old line is kept in replaced_gpx) or reject it (0397).';

commit;
