-- North Gardner Mountain is filed under "Washington Pass" but it's actually ~6-7 miles away
-- in the Lake Chelan-Sawtooth Wilderness (its own blurb confirms this), reached via the Wolf
-- Creek Trailhead near Winthrop, not the Washington Pass highway corridor. A real
-- wa_sawtooth_chelan area already exists holding 17 peaks of the same character (8,000+ ft
-- Sawtooth/Chelan summits).
update areas set parent_id = 'wa_sawtooth_chelan',
  path = 'usa.washington.wa_centraleast.wa_sawtooth_chelan.wa_north_gardner_mountain'
  where id = 'wa_north_gardner_mountain';

update areas set route_count = route_count - 1 where id = 'wa_sub_wapass';    -- 126 -> 125
update areas set route_count = route_count - 1 where id = 'wa_hwy20_ncnp';    -- 404 -> 403
update areas set route_count = route_count - 1 where id = 'wa_northwest';    -- 1026 -> 1025
update areas set route_count = route_count + 1 where id = 'wa_sawtooth_chelan'; -- 17 -> 18
update areas set route_count = route_count + 1 where id = 'wa_centraleast';  -- 1959 -> 1960

-- verify
select id, name, parent_id, path, route_count from areas where id in (
  'wa_north_gardner_mountain','wa_sub_wapass','wa_hwy20_ncnp','wa_northwest',
  'wa_sawtooth_chelan','wa_centraleast'
) order by id;
