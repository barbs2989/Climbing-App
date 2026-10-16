-- 0254: fold "A Block" into "A and B Blocks", and finish the topo-number renames the duplicate
-- trigger refused.
--
-- strip-route-topo-labels.mjs (2026-10-07) renamed 863 of 875 climbs; refuse_duplicate_route (0216)
-- refused 12, each a same-named climb nearby. Read one by one:
--   * 7 are ONE boulder filed twice: Massachusetts' Hotel Boulders holds "A Block" (7 climbs, "1. Sloppy
--     Seconds" .. "7. New Sheriff in Town") and "A and B Blocks" (22), at the SAME coordinate, every A
--     Block climb also on A and B Blocks with its FA (Pete Otis) and an equal or higher grade. Folded:
--     the A and B copy fills its blank columns from the A Block copy (0221's rule), keeps its own grade
--     (the higher one), and A Block, emptied, is deleted.
--   * 4 are DIFFERENT climbs sharing a name with a neighbour: "Mr. Clean" V6+ (others V5), "Sixth Sense"
--     5.6 (the other 5.10c), "Slippery Slope" V0 (the other V2), "Downclimb" on its own boulder. Renamed
--     with the trigger bypassed, these four rows only.
--   * 1 is NOT settled and keeps its number: "2. Microagression" V4 on a "Second Boulder" 4 km from
--     another "Second Boulder" with a "Microagression" V4, under a different parent, whose neighbour
--     "Micro Transaction" is graded V4+ against this one's V6-. Not proven one boulder.
-- No climber data on any row here (read 2026-10-07). ABORTS if one appears, or a row has changed.

begin;

create temp table m_merge(keep text not null, drop_id text primary key) on commit drop;
insert into m_merge values
  ('ma_sloppy_seconds', 'ma_a_block_1_sloppy_seconds'),
  ('ma_walking_on_sunshine', 'ma_a_block_2_walking_on_sunshine'),
  ('ma_a_better_mousetrap', 'ma_a_block_3_a_better_mousetrap'),
  ('ma_the_line', 'ma_a_block_4_the_line'),
  ('ma_gnome_sit_start', 'ma_a_block_5_gnome_sit_start'),
  ('ma_crimpfest', 'ma_a_block_6_crimpfest'),
  ('ma_new_sheriff_in_town', 'ma_a_block_7_new_sheriff_in_town');

create temp table m_rename(id text primary key, from_name text not null, to_name text not null) on commit drop;
insert into m_rename values
  ('ks_south_side_11_slippery_slope', '11. Slippery Slope', 'Slippery Slope'),
  ('ma_3_mr_clean', '3. Mr. Clean', 'Mr. Clean'),
  ('or_east_wall_6_sixth_sense', '6. Sixth Sense', 'Sixth Sense'),
  ('ut_1_downclimb', '1. Downclimb', 'Downclimb');

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog.
  if not exists (select 1 from areas where id = 'ma_a_block') then raise notice '0254: no catalog'; return; end if;
  select count(*) into n from m_merge m join routes k on k.id = m.keep and k.area_id = 'ma_a_and_b_blocks'
    join routes o on o.id = m.drop_id and o.area_id = 'ma_a_block';
  if n <> 7 then raise exception '0254: % of 7 pairs are as read', n; end if;
  select count(*) into n from routes where area_id = 'ma_a_block' and id not in (select drop_id from m_merge);
  if n > 0 then raise exception '0254: A Block holds % climbs the plan did not read', n; end if;
  if exists (select 1 from areas where parent_id = 'ma_a_block') then raise exception '0254: A Block has sub-areas'; end if;
  select count(*) into n from m_rename m join routes r on r.id = m.id and r.name = m.from_name;
  if n <> 4 then raise exception '0254: % of 4 renames still carry the planned name', n; end if;
  select (select count(*) from contributions where route_id in (select drop_id from m_merge) or area_id = 'ma_a_block')
       + (select count(*) from topos where area_id = 'ma_a_block')
       + (select count(*) from topo_lines where route_id in (select drop_id from m_merge))
       + (select count(*) from gps_submissions where route_id in (select drop_id from m_merge))
       + (select count(*) from content_reports where route_id in (select drop_id from m_merge))
       + (select count(*) from route_base_checkins where route_id in (select drop_id from m_merge))
       + (select count(*) from objectives where route_id in (select drop_id from m_merge))
       + (select count(*) from hazard_votes where route_id in (select drop_id from m_merge))
       + (select count(*) from climb_logs where route_id in (select drop_id from m_merge))
       + (select count(*) from crew_listings where route_id in (select drop_id from m_merge))
       + (select count(*) from user_itineraries where route_id in (select drop_id from m_merge))
       + (select count(*) from crews where route_id in (select drop_id from m_merge))
       + (select count(*) from user_lists where route_ids && (select array_agg(drop_id) from m_merge))
    into n;
  if n > 0 then raise exception '0254: % climber rows point at a row this deletes — stop and repoint them', n; end if;
end $$;

update routes k set
  discipline = case when nullif(btrim(k.discipline), '') is null then o.discipline else k.discipline end,
  grade_system = case when nullif(btrim(k.grade_system), '') is null then o.grade_system else k.grade_system end,
  grade_num = case when k.grade_num is null then o.grade_num else k.grade_num end,
  pitches = case when coalesce(k.pitches, 0) = 0 then o.pitches else k.pitches end,
  length_m = case when k.length_m is null then o.length_m else k.length_m end,
  stars = case when k.stars is null then o.stars else k.stars end,
  fa = case when nullif(btrim(k.fa), '') is null then o.fa else k.fa end,
  lat = case when k.lat is null then o.lat else k.lat end,
  lng = case when k.lng is null then o.lng else k.lng end,
  aspect = case when nullif(btrim(k.aspect), '') is null then o.aspect else k.aspect end,
  season = case when nullif(btrim(k.season), '') is null then o.season else k.season end,
  description = case when nullif(btrim(k.description), '') is null then o.description else k.description end,
  gear = case when (k.gear is null or k.gear in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.gear else k.gear end,
  hazards = case when coalesce(cardinality(k.hazards), 0) = 0 then o.hazards else k.hazards end,
  verif = case when (k.verif is null or k.verif in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.verif else k.verif end,
  overview = case when nullif(btrim(k.overview), '') is null then o.overview else k.overview end,
  beta = case when nullif(btrim(k.beta), '') is null then o.beta else k.beta end,
  turnaround = case when nullif(btrim(k.turnaround), '') is null then o.turnaround else k.turnaround end,
  auto_generated = case when k.auto_generated is null then o.auto_generated else k.auto_generated end,
  alpine_grade = case when nullif(btrim(k.alpine_grade), '') is null then o.alpine_grade else k.alpine_grade end,
  rock_grade = case when nullif(btrim(k.rock_grade), '') is null then o.rock_grade else k.rock_grade end,
  ice_grade = case when nullif(btrim(k.ice_grade), '') is null then o.ice_grade else k.ice_grade end,
  gain_ft = case when k.gain_ft is null then o.gain_ft else k.gain_ft end,
  loss_ft = case when k.loss_ft is null then o.loss_ft else k.loss_ft end,
  dist_km = case when k.dist_km is null then o.dist_km else k.dist_km end,
  max_angle = case when k.max_angle is null then o.max_angle else k.max_angle end,
  rappels = case when nullif(btrim(k.rappels), '') is null then o.rappels else k.rappels end,
  commitment = case when nullif(btrim(k.commitment), '') is null then o.commitment else k.commitment end,
  face = case when nullif(btrim(k.face), '') is null then o.face else k.face end,
  permit = case when nullif(btrim(k.permit), '') is null then o.permit else k.permit end,
  comms = case when nullif(btrim(k.comms), '') is null then o.comms else k.comms end,
  descent = case when nullif(btrim(k.descent), '') is null then o.descent else k.descent end,
  obj_haz = case when (k.obj_haz is null or k.obj_haz in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.obj_haz else k.obj_haz end,
  waypoints = case when (k.waypoints is null or k.waypoints in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.waypoints else k.waypoints end,
  gpx = case when (k.gpx is null or k.gpx in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.gpx else k.gpx end,
  elev_pts = case when (k.elev_pts is null or k.elev_pts in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.elev_pts else k.elev_pts end,
  disciplines = case when (k.disciplines is null or k.disciplines in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.disciplines else k.disciplines end,
  timing = case when (k.timing is null or k.timing in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.timing else k.timing end,
  detailed_rack = case when nullif(btrim(k.detailed_rack), '') is null then o.detailed_rack else k.detailed_rack end,
  what_to_bring = case when (k.what_to_bring is null or k.what_to_bring in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.what_to_bring else k.what_to_bring end,
  pro_tips = case when (k.pro_tips is null or k.pro_tips in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.pro_tips else k.pro_tips end,
  watch_out = case when (k.watch_out is null or k.watch_out in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.watch_out else k.watch_out end,
  pro_needs = case when nullif(btrim(k.pro_needs), '') is null then o.pro_needs else k.pro_needs end,
  best_season = case when nullif(btrim(k.best_season), '') is null then o.best_season else k.best_season end,
  high_point_ft = case when k.high_point_ft is null then o.high_point_ft else k.high_point_ft end,
  aid_grade = case when nullif(btrim(k.aid_grade), '') is null then o.aid_grade else k.aid_grade end,
  approach = case when nullif(btrim(k.approach), '') is null then o.approach else k.approach end,
  descent_text = case when nullif(btrim(k.descent_text), '') is null then o.descent_text else k.descent_text end,
  bail = case when nullif(btrim(k.bail), '') is null then o.bail else k.bail end,
  pitch_detail = case when (k.pitch_detail is null or k.pitch_detail in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.pitch_detail else k.pitch_detail end,
  itinerary = case when (k.itinerary is null or k.itinerary in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.itinerary else k.itinerary end,
  access = case when (k.access is null or k.access in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.access else k.access end,
  road = case when (k.road is null or k.road in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.road else k.road end,
  climate = case when (k.climate is null or k.climate in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.climate else k.climate end,
  emergency = case when (k.emergency is null or k.emergency in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.emergency else k.emergency end,
  lists = case when coalesce(cardinality(k.lists), 0) = 0 then o.lists else k.lists end,
  crowds = case when (k.crowds is null or k.crowds in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.crowds else k.crowds end,
  partner_requirements = case when (k.partner_requirements is null or k.partner_requirements in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.partner_requirements else k.partner_requirements end,
  seasonal_guidance = case when (k.seasonal_guidance is null or k.seasonal_guidance in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.seasonal_guidance else k.seasonal_guidance end,
  seasonal_hazards = case when (k.seasonal_hazards is null or k.seasonal_hazards in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.seasonal_hazards else k.seasonal_hazards end,
  data_quality = case when (k.data_quality is null or k.data_quality in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.data_quality else k.data_quality end,
  difficulty = case when (k.difficulty is null or k.difficulty in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.difficulty else k.difficulty end,
  approach_logistics = case when (k.approach_logistics is null or k.approach_logistics in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.approach_logistics else k.approach_logistics end,
  sling_rack = case when (k.sling_rack is null or k.sling_rack in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.sling_rack else k.sling_rack end,
  alpine_draws = case when k.alpine_draws is null then o.alpine_draws else k.alpine_draws end,
  rope_type = case when nullif(btrim(k.rope_type), '') is null then o.rope_type else k.rope_type end,
  rope_length_m = case when k.rope_length_m is null then o.rope_length_m else k.rope_length_m end,
  rope_note = case when nullif(btrim(k.rope_note), '') is null then o.rope_note else k.rope_note end,
  ascender = case when nullif(btrim(k.ascender), '') is null then o.ascender else k.ascender end,
  corrections = case when nullif(btrim(k.corrections), '') is null then o.corrections else k.corrections end,
  gear_confidence = case when nullif(btrim(k.gear_confidence), '') is null then o.gear_confidence else k.gear_confidence end,
  rappel_detail = case when (k.rappel_detail is null or k.rappel_detail in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.rappel_detail else k.rappel_detail end,
  rappel_count_note = case when nullif(btrim(k.rappel_count_note), '') is null then o.rappel_count_note else k.rappel_count_note end,
  rack = case when coalesce(cardinality(k.rack), 0) = 0 then o.rack else k.rack end,
  features = case when coalesce(cardinality(k.features), 0) = 0 then o.features else k.features end,
  classic = case when k.classic is null then o.classic else k.classic end,
  gear_bucket = case when (k.gear_bucket is null or k.gear_bucket in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.gear_bucket else k.gear_bucket end,
  assumed_gear = case when (k.assumed_gear is null or k.assumed_gear in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.assumed_gear else k.assumed_gear end,
  gps_contributor_name = case when nullif(btrim(k.gps_contributor_name), '') is null then o.gps_contributor_name else k.gps_contributor_name end,
  outing_shape = case when nullif(btrim(k.outing_shape), '') is null then o.outing_shape else k.outing_shape end,
  approach_variants = case when (k.approach_variants is null or k.approach_variants in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.approach_variants else k.approach_variants end,
  climbing_route = case when (k.climbing_route is null or k.climbing_route in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.climbing_route else k.climbing_route end,
  bivy = case when (k.bivy is null or k.bivy in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.bivy else k.bivy end,
  prot_rating = case when nullif(btrim(k.prot_rating), '') is null then o.prot_rating else k.prot_rating end,
  start_type = case when nullif(btrim(k.start_type), '') is null then o.start_type else k.start_type end,
  landing = case when nullif(btrim(k.landing), '') is null then o.landing else k.landing end,
  pads = case when k.pads is null then o.pads else k.pads end,
  rock = case when nullif(btrim(k.rock), '') is null then o.rock else k.rock end,
  crux = case when nullif(btrim(k.crux), '') is null then o.crux else k.crux end,
  access_checked_at = case when k.access_checked_at is null then o.access_checked_at else k.access_checked_at end,
  ice_grade_num = case when k.ice_grade_num is null then o.ice_grade_num else k.ice_grade_num end,
  mixed_grade_num = case when k.mixed_grade_num is null then o.mixed_grade_num else k.mixed_grade_num end,
  aid_grade_num = case when k.aid_grade_num is null then o.aid_grade_num else k.aid_grade_num end,
  bolts = case when k.bolts is null then o.bolts else k.bolts end,
  guide_stars = case when k.guide_stars is null then o.guide_stars else k.guide_stars end,
  alt_names = case when coalesce(cardinality(k.alt_names), 0) = 0 then o.alt_names else k.alt_names end,
  variations = case when (k.variations is null or k.variations in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.variations else k.variations end,
  ffa = case when nullif(btrim(k.ffa), '') is null then o.ffa else k.ffa end,
  fwa = case when nullif(btrim(k.fwa), '') is null then o.fwa else k.fwa end,
  anchor = case when nullif(btrim(k.anchor), '') is null then o.anchor else k.anchor end,
  location = case when nullif(btrim(k.location), '') is null then o.location else k.location end,
  snow_grade_num = case when k.snow_grade_num is null then o.snow_grade_num else k.snow_grade_num end,
  rack_items = case when (k.rack_items is null or k.rack_items in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb)) then o.rack_items else k.rack_items end,
  sun = case when nullif(btrim(k.sun), '') is null then o.sun else k.sun end,
  wet = case when nullif(btrim(k.wet), '') is null then o.wet else k.wet end,
  rock_quality = case when nullif(btrim(k.rock_quality), '') is null then o.rock_quality else k.rock_quality end,
  fixed_gear = case when nullif(btrim(k.fixed_gear), '') is null then o.fixed_gear else k.fixed_gear end
from m_merge m join routes o on o.id = m.drop_id
where k.id = m.keep;
delete from routes o using m_merge m
 where o.id = m.drop_id and exists (select 1 from routes k where k.id = m.keep);
delete from areas a where a.id = 'ma_a_block'
  and not exists (select 1 from routes where area_id = a.id) and not exists (select 1 from areas where parent_id = a.id);

set local catalog.allow_duplicate = 'on';
update routes r set name = m.to_name from m_rename m where r.id = m.id and r.name = m.from_name;
set local catalog.allow_duplicate = 'off';

do $$ declare n int; begin
  if not exists (select 1 from routes where id = 'ma_the_line') then return; end if;
  if exists (select 1 from areas where id = 'ma_a_block') then raise exception '0254: A Block survived'; end if;
  select count(*) into n from m_rename m join routes r on r.id = m.id and r.name = m.to_name;
  if n <> 4 then raise exception '0254: % of 4 renames landed', n; end if;
end $$;

commit;
