-- 0221: merge the same-named AREAS that are one place stored twice.
--
-- Asked: "do those" — the ~250 same-named area pairs (same state, <3 km, different parent, both
-- holding climbs) left after 0215. Refreshed live: 247 pairs. Every pair was read, and they are:
--   * 137 PARALLEL DISCIPLINE TREES — Mountain Project files a crag's bouldering or ice under its
--     own tree ("*Joshua Tree Bouldering*", "* NH Ice and Mixed"). Left alone. The climbs they
--     share a name with are nearly all DIFFERENT climbs: Thresher 5.10 / WI3, Planet X 5.8 / V6,
--     Crocodile Tears 5.13 / V9. Whiteside's three ice climbs are the one exception (below).
--   * 86 DISTINCT features with a generic shared name. Left alone.
--   * 6 UNSURE and 3 more HELD (Longs Peak: its keeper has only faces, no leaf for Keyhole Route;
--     Talking Heads: its boulders are themselves named twice; Veiny: no climb in common).
--   * 15 MERGED here:
--     #21   keep ar_southern_cross_wall       drop ar_southern_cross_wall_2   one wall, one climb (Southern Cross, same FA), 80 m apart
--     #52   keep ca_little_stuff_crags_2      drop ca_little_stuff_crags      the copy holds only Short but Sweet, which the keeper has (same FA)
--     #116  keep co_kody_block                drop co_kody_block_2            one block, one problem (Corn on the Knob V2), 260 m apart
--     #58   keep ca_pin_cushion_wall_2        drop ca_pin_cushion_wall        the copy holds only Mild Steel, which the keeper has
--     #218  keep ut_needles_2                 drop ut_needles                 the copy holds only Needles Nirvana (same FA), which the keeper has
--     #219  keep ut_mt_ogden_2                drop ut_mt_ogden                the copy holds only The Gray Slabs (same FA), which the keeper has
--     #176  keep mn_quarry_boulder            drop mn_quarry_boulder_2        all 9 problems of the copy are on the keeper, same coordinate
--     #127  keep co_pike_s_peak_2             drop co_pikes_peak              Front Range › Pikes Peak holds only East Slopes; one peak
--     #136  keep co_torrey_s_peak             drop co_torreys_peak            one peak, 20 m apart (Kelso Ridge / South Slopes)
--     #117  keep co_la_plata                  drop co_la_plata_peak           one peak, 10 m apart
--     #132  keep co_snowdon_peak_2            drop co_snowdon_peak            one San Juans peak; the keeper is filed under the West Needle Mountains
--     #173  keep mn_carlton_peak              drop mn_carlton_peak_2          one peak; the copy's only child (Carlton Boulder) moves under the keeper
--     #214  keep tx_emerald_pools_sector_2    merge dup climbs of tx_emerald_pools_sector    flat copy of the sector: 17 of its 18 climbs are on the walls (same FAs); Unnamed 3 stays
--     #215  keep tx_painted_canyon_sector_2   merge dup climbs of tx_painted_canyon_sector   flat copy: 8 of its 9 climbs are on the walls (same FAs); Picnic (2022) stays
--     #208  keep nc_whiteside_ice             drop nc_starshine_area          Starshine, Junior, Mother Russia stored as ice climbs in both trees; the ice tree keeps them
--
-- Mechanics:
--   1. 42 climbs stored on both sides: the KEEPER fills each BLANK column from the
--      other row (nothing it holds is overwritten, 0220's rule) and the other row is deleted.
--   2. 5 other climbs move into the keeper area; 1 child area(s) re-parented.
--   3. 13 copy areas are deleted, only once empty.
--   4. route_count recounted on every ancestor of every touched area.
-- The migration ABORTS if any climber data (contributions cascade!) points at a row it deletes.
-- Rollback snapshot: audits/area-pairs-2026-09-26/rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key) on commit drop;
insert into m_merge values
  ('ar_southern_cross', 'ar_southern_cross_2'),
  ('ca_short_but_sweet_3', 'ca_short_but_sweet_2'),
  ('co_corn_on_the_knob', 'co_corn_on_the_knob_2'),
  ('ca_mild_steel_2', 'ca_mild_steel'),
  ('ut_needles_nirvana_2', 'ut_needles_nirvana'),
  ('ut_the_gray_slabs_2', 'ut_the_gray_slabs'),
  ('mn_slab_of_the_wasp', 'mn_slab_of_the_wasp_2'),
  ('mn_rain_with_a_chance_of_boulders', 'mn_rain_with_a_chance_of_boulders_2'),
  ('mn_david', 'mn_david_2'),
  ('mn_pieta', 'mn_pieta_2'),
  ('mn_perseus', 'mn_perseus_2'),
  ('mn_nike', 'mn_nike_2'),
  ('mn_gaia', 'mn_gaia_2'),
  ('mn_apollo_s_ar_te', 'mn_apollo_s_arete'),
  ('mn_uranus', 'mn_uranus_2'),
  ('tx_half_monty_2', 'tx_half_monty'),
  ('tx_sorry_2', 'tx_sorry'),
  ('tx_butt_crack_2', 'tx_butt_crack'),
  ('tx_the_river_2', 'tx_the_river'),
  ('tx_wally_gator_2', 'tx_wally_gator'),
  ('tx_hi_ho_cherry_o', 'tx_hi_ho_cherrio'),
  ('tx_gator_mcklusky_2', 'tx_gator_mcklusky'),
  ('tx_bass_a_la_pecos_2', 'tx_bass_a_la_pecos'),
  ('tx_candy_land', 'tx_candyland'),
  ('tx_corner_2', 'tx_corner'),
  ('tx_chutes_and_ladders_2', 'tx_chutes_and_ladders'),
  ('tx_crocodile_tears_2', 'tx_crocodile_tears'),
  ('tx_perch_jerk_2', 'tx_perch_jerk'),
  ('tx_gasper_goo_2', 'tx_gasper_goo'),
  ('tx_ten_d_nitis_2', 'tx_ten_d_nitis'),
  ('tx_unnamed_5_10_2', 'tx_unnamed_5_10'),
  ('tx_sugar_2', 'tx_sugar'),
  ('tx_piranha_3', 'tx_piranha_2'),
  ('tx_shake_n_flake_2', 'tx_shake_n_flake'),
  ('tx_rabbit_rodeo_2', 'tx_rabbit_rodeo'),
  ('tx_rockers_2', 'tx_rockers'),
  ('tx_over_under_sideways_down_2', 'tx_over_under_sideways_down'),
  ('tx_turtle_lasso_2', 'tx_turtle_lasso'),
  ('tx_crackalicious_2', 'tx_crackalicious'),
  ('nc_whiteside_ice_junior', 'nc_starshine_area_junior'),
  ('nc_whiteside_ice_mother_russia', 'nc_starshine_area_mother_russia'),
  ('nc_whiteside_ice_starshine', 'nc_starshine_area_starshine');

create temp table m_move(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_move values
  ('co_pikes_peak_east_slopes', 'co_pikes_peak', 'co_pike_s_peak_2'),
  ('co_torreys_peak_south_slopes', 'co_torreys_peak', 'co_torrey_s_peak'),
  ('co_la_plata_peak_northwest_ridge', 'co_la_plata_peak', 'co_la_plata'),
  ('co_ne_rib', 'co_snowdon_peak', 'co_snowdon_peak_2'),
  ('co_way_juan_nordwand', 'co_snowdon_peak', 'co_snowdon_peak_2');

create temp table m_drop_area(id text primary key) on commit drop;
insert into m_drop_area values ('ar_southern_cross_wall_2'), ('ca_little_stuff_crags'), ('co_kody_block_2'), ('ca_pin_cushion_wall'), ('ut_needles'), ('ut_mt_ogden'), ('mn_quarry_boulder_2'), ('co_pikes_peak'), ('co_torreys_peak'), ('co_la_plata_peak'), ('co_snowdon_peak'), ('mn_carlton_peak_2'), ('nc_starshine_area');

create temp table m_recount on commit drop as
  select distinct a.id from areas a, areas t
   where t.id in ('ar_southern_cross_wall', 'ar_southern_cross_wall_2', 'ca_little_stuff_crags_2', 'ca_little_stuff_crags', 'co_kody_block', 'co_kody_block_2', 'ca_pin_cushion_wall_2', 'ca_pin_cushion_wall', 'ut_needles_2', 'ut_needles', 'ut_mt_ogden_2', 'ut_mt_ogden', 'mn_quarry_boulder', 'mn_quarry_boulder_2', 'co_pike_s_peak_2', 'co_pikes_peak', 'co_torrey_s_peak', 'co_torreys_peak', 'co_la_plata', 'co_la_plata_peak', 'co_snowdon_peak_2', 'co_snowdon_peak', 'mn_carlton_peak', 'mn_carlton_peak_2', 'tx_emerald_pools_sector_2', 'tx_emerald_pools_sector', 'tx_painted_canyon_sector_2', 'tx_painted_canyon_sector', 'nc_whiteside_ice', 'nc_starshine_area', 'mn_carlton_boulder')
     and a.path @> t.path;

-- 0. refuse to cascade-delete anybody's data
do $$ declare n int; begin
  select (select count(*) from contributions where route_id in (select drop_id from m_merge))
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
       + (select count(*) from contributions where area_id in (select id from m_drop_area))
       + (select count(*) from topos where area_id in (select id from m_drop_area))
    into n;
  if n > 0 then raise exception '0221: % climber rows point at a row this deletes — stop and repoint them', n; end if;
end $$;

-- 1. merge climbs stored on both sides
update routes k set
  discipline = case when nullif(btrim(k.discipline), '') is null then o.discipline else k.discipline end,
  grade = case when nullif(btrim(k.grade), '') is null then o.grade else k.grade end,
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
  overview = case when nullif(btrim(k.overview), '') is null then o.overview else k.overview end,
  beta = case when nullif(btrim(k.beta), '') is null then o.beta else k.beta end,
  turnaround = case when nullif(btrim(k.turnaround), '') is null then o.turnaround else k.turnaround end,
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
  aid_grade_num = case when k.aid_grade_num is null then o.aid_grade_num else k.aid_grade_num end
from m_merge m join routes o on o.id = m.drop_id
where k.id = m.keep;

delete from routes o using m_merge m
 where o.id = m.drop_id and exists (select 1 from routes k where k.id = m.keep);

-- 2. move the rest, and re-parent
update routes r set area_id = m.to_area from m_move m where r.id = m.id and r.area_id = m.from_area;
update areas set parent_id = 'mn_carlton_peak' where parent_id = 'mn_carlton_peak_2';

-- 3. the copy areas, once empty
delete from areas a using m_drop_area d
 where a.id = d.id
   and not exists (select 1 from routes where area_id = a.id)
   and not exists (select 1 from areas s where s.parent_id = a.id);

-- 4. recount
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (select id from m_recount where id in (select id from areas));

commit;
