-- 0503: catalog clean-up from the WA route research batches T-Z (2026-11-23).
--
-- Every row below was reported by a research batch (research-data/route-ledger-2026-11-18/batch-*-held.json),
-- read live, and then checked ONLINE by two independent verifiers (owner: "do what you recommend based on online
-- research"). The full dossier and both verdict files are in research-data/route-ledger-2026-11-18/cleanup-2026-11-23/.
--   * DELETE 6: three routes whose rock is gone (the Royal Columns pillar that carried Stress Management and The
--     Price of Complacency toppled 2017-04-28; Entrance Exam lost its chimney wall with it) and three Index Blues
--     Cliff "Open Project" rows that were never bolted or sent.
--   * MERGE 10: the same line filed twice. The keeper fills only its BLANK columns from its twin (0221/0271/0400),
--     never a placeholder FA, and takes the twin's name as an alt_name so a search for it still lands. A twin's
--     evidence row moves to the keeper when the keeper has no row for that field.
--   * RENAME 3: a grade, a wrong "aka" and a stray period removed from route names.
-- No climber row points at any row this deletes (26 referencing tables read 0 on 2026-11-23). ABORTS if one does
-- now, or if a row is no longer where the plan read it. The deleted rows are saved in the rollback file beside the dossier.

begin;

create temp table c_merge(keep text not null, drop_id text primary key, keep_name text not null, keep_area text not null, drop_name text not null, drop_area text not null) on commit drop;
insert into c_merge values
  ('wa_main_face_stopper_popper', 'wa_unknown_5_7', 'Stopper Popper', 'wa_main_face', 'Unknown 5.7', 'wa_main_face'),
  ('wa_main_face_watch_your_crotch', 'wa_unknown_5_6_left', 'Watch Your Crotch', 'wa_main_face', 'Unknown 5.6 (Left)', 'wa_main_face'),
  ('wa_main_face_belayer_slayer', 'wa_unknown_5_6', 'Belayer Slayer', 'wa_main_face', 'Unknown 5.6', 'wa_main_face'),
  ('wa_the_arete_acal', 'wa_orange_sunshine_area_thearetical', 'The Arete-Acal', 'wa_main_face', 'Thearetical', 'wa_orange_sunshine_area'),
  ('wa_south_face_4_blownout_to_1st_anchor', 'wa_blownout_direct', 'Blownout (to 1st anchor)', 'wa_south_face_4', 'Blownout Direct', 'wa_south_face_4'),
  ('wa_south_face_4_dod_s_dastardly_jam', 'wa_dod_s_jam_dastardly_crack_linkup', 'Dod''s Dastardly Jam', 'wa_south_face_4', 'Dod''s Jam + Dastardly Crack Linkup', 'wa_south_face_4'),
  ('wa_the_quin_konehead_pre_memorial_route_aka_the_kone', 'wa_three_o_clock_rock_the_kone', 'The Quin Konehead Pre-Memorial Route (aka The Kone)', 'wa_three_o_clock_rock', 'The Kone', 'wa_three_o_clock_rock'),
  ('wa_south_early_winter_spire_direct_east_buttress', 'wa_south_early_winters_spire_east_buttress_direct', 'Direct East Buttress', 'wa_south_early_winters_spire', 'East Buttress Direct', 'wa_south_early_winters_spire'),
  ('wa_news_nw_corner', 'wa_north_early_winters_spire_northwest_corner_a_k_a_boving_pollack_route', 'Northwest Corner (Boving-Pollack Route)', 'wa_north_early_winters_spire', 'Northwest Corner (a.k.a. Boving-Pollack Route)', 'wa_north_early_winters_spire'),
  ('wa_crowbar_crag_feelin_stabby', 'wa_feeling_stabby', 'Feelin'' Stabby', 'wa_crowbar_crag', 'Feeling Stabby', 'wa_crowbar_crag');

create temp table c_delete(id text primary key, name text not null, area text not null) on commit drop;
insert into c_delete values
  ('wa_stress_management', 'Stress Management', 'wa_orange_sunshine_area'),
  ('wa_the_price_of_complacency', 'The Price of Complacency', 'wa_orange_sunshine_area'),
  ('wa_entrance_exam_now_gone', 'Entrance Exam (Now gone)', 'wa_orange_sunshine_area'),
  ('wa_blues_cliff_the_open_project_accidental_discharge_p2', 'Open Project: Accidental Discharge P2', 'wa_blues_cliff_the'),
  ('wa_blues_cliff_the_open_project_12_gauge_iq_p2', 'Open Project: 12 Gauge IQ P2', 'wa_blues_cliff_the'),
  ('wa_blues_cliff_the_project', 'Project', 'wa_blues_cliff_the');

create temp table c_rename(id text primary key, old_name text not null, new_name text not null, area text not null) on commit drop;
insert into c_rename values
  ('wa_jacobs_ladder_5_10b_a_1_or_5_11b', 'Jacobs Ladder, 5.10b A-1 or 5.11b', 'Jacobs Ladder', 'wa_blueberry_hill_proxima_wall'),
  ('wa_drill_s_thrill_aka_heretic_s_highway', 'Drill''s Thrill (aka Heretic''s Highway)', 'Drill''s Thrill', 'wa_west_face_7'),
  ('wa_the_vertebrae', 'The Vertebrae.', 'The Vertebrae', 'wa_lower_castle');

do $$ declare n int; d text[]; begin
  -- an EMPTY database (a Supabase preview, check:migration-replay) has no catalog
  if not exists (select 1 from routes where id in (select keep from c_merge)) then raise notice '0503: no catalog'; return; end if;

  select count(*) into n from c_merge m
    join routes k on k.id = m.keep and k.area_id = m.keep_area and k.name = m.keep_name
    join routes o on o.id = m.drop_id and o.area_id = m.drop_area and o.name = m.drop_name;
  if n <> 10 then raise exception '0503: % of 10 merge pairs are as the plan read them', n; end if;
  select count(*) into n from c_delete x join routes r on r.id = x.id and r.name = x.name and r.area_id = x.area;
  if n <> 6 then raise exception '0503: % of 6 delete rows are as the plan read them', n; end if;
  select count(*) into n from c_rename x join routes r on r.id = x.id and r.name = x.old_name and r.area_id = x.area;
  if n <> 3 then raise exception '0503: % of 3 rename rows are as the plan read them', n; end if;

  select array_agg(id) into d from (select drop_id as id from c_merge union all select id from c_delete) z;
  select (select count(*) from climb_logs where route_id = any(d))
       + (select count(*) from content_reports where route_id = any(d))
       + (select count(*) from contributions where route_id = any(d))
       + (select count(*) from crews where route_id = any(d))
       + (select count(*) from gps_submissions where route_id = any(d))
       + (select count(*) from hazard_votes where route_id = any(d))
       + (select count(*) from objectives where route_id = any(d))
       + (select count(*) from route_base_checkins where route_id = any(d))
       + (select count(*) from route_base_pin_changes where route_id = any(d))
       + (select count(*) from route_difficulty_ratings where route_id = any(d))
       + (select count(*) from route_flags where route_id = any(d))
       + (select count(*) from route_partner_listings where route_id = any(d))
       + (select count(*) from route_ratings where route_id = any(d))
       + (select count(*) from route_views where route_id = any(d))
       + (select count(*) from topo_lines where route_id = any(d))
       + (select count(*) from topos where route_id = any(d))
       + (select count(*) from user_itineraries where route_id = any(d))
       + (select count(*) from review_ai_verdicts where route_id = any(d))
       + (select count(*) from route_link_ups where route_ids && d)
       + (select count(*) from user_lists where route_ids && d)
       + (select count(*) from comments c where exists (select 1 from unnest(d) x where c.target_id = x or c.target_id like x || '\_\_%' or c.target_id like x || '\_pitch\_%'))
       + (select count(*) from user_reports where reported_id = any(d))
       + (select count(*) from moderation_actions where target_id = any(d))
    into n;
  if n > 0 then raise exception '0503: % climber rows point at a row this deletes — stop and repoint them', n; end if;

  update routes k set hazards = case when k.hazards is null or k.hazards::text in ('', '[]', '{}', 'null', '""') then o.hazards else k.hazards end, difficulty = case when k.difficulty is null or k.difficulty::text in ('', '[]', '{}', 'null', '""') then o.difficulty else k.difficulty end
    from routes o where k.id = 'wa_main_face_stopper_popper' and o.id = 'wa_unknown_5_7';
  update routes k set hazards = case when k.hazards is null or k.hazards::text in ('', '[]', '{}', 'null', '""') then o.hazards else k.hazards end, difficulty = case when k.difficulty is null or k.difficulty::text in ('', '[]', '{}', 'null', '""') then o.difficulty else k.difficulty end
    from routes o where k.id = 'wa_main_face_watch_your_crotch' and o.id = 'wa_unknown_5_6_left';
  update routes k set hazards = case when k.hazards is null or k.hazards::text in ('', '[]', '{}', 'null', '""') then o.hazards else k.hazards end, difficulty = case when k.difficulty is null or k.difficulty::text in ('', '[]', '{}', 'null', '""') then o.difficulty else k.difficulty end
    from routes o where k.id = 'wa_main_face_belayer_slayer' and o.id = 'wa_unknown_5_6';
  update routes k set gear = case when k.gear is null or k.gear::text in ('', '[]', '{}', 'null', '""') then o.gear else k.gear end, guide_stars = case when k.guide_stars is null or k.guide_stars::text in ('', '[]', '{}', 'null', '""') then o.guide_stars else k.guide_stars end
    from routes o where k.id = 'wa_the_arete_acal' and o.id = 'wa_orange_sunshine_area_thearetical';
  update routes k set hazards = case when k.hazards is null or k.hazards::text in ('', '[]', '{}', 'null', '""') then o.hazards else k.hazards end, difficulty = case when k.difficulty is null or k.difficulty::text in ('', '[]', '{}', 'null', '""') then o.difficulty else k.difficulty end
    from routes o where k.id = 'wa_south_face_4_blownout_to_1st_anchor' and o.id = 'wa_blownout_direct';
  update routes k set hazards = case when k.hazards is null or k.hazards::text in ('', '[]', '{}', 'null', '""') then o.hazards else k.hazards end, permit = case when k.permit is null or k.permit::text in ('', '[]', '{}', 'null', '""') then o.permit else k.permit end, access = case when k.access is null or k.access::text in ('', '[]', '{}', 'null', '""') then o.access else k.access end, difficulty = case when k.difficulty is null or k.difficulty::text in ('', '[]', '{}', 'null', '""') then o.difficulty else k.difficulty end
    from routes o where k.id = 'wa_south_face_4_dod_s_dastardly_jam' and o.id = 'wa_dod_s_jam_dastardly_crack_linkup';
  update routes k set aid_grade_num = case when k.aid_grade_num is null or k.aid_grade_num::text in ('', '[]', '{}', 'null', '""') then o.aid_grade_num else k.aid_grade_num end
    from routes o where k.id = 'wa_south_early_winter_spire_direct_east_buttress' and o.id = 'wa_south_early_winters_spire_east_buttress_direct';
  update routes k set stars = case when k.stars is null or k.stars::text in ('', '[]', '{}', 'null', '""') then o.stars else k.stars end, lat = case when k.lat is null or k.lat::text in ('', '[]', '{}', 'null', '""') then o.lat else k.lat end, lng = case when k.lng is null or k.lng::text in ('', '[]', '{}', 'null', '""') then o.lng else k.lng end
    from routes o where k.id = 'wa_news_nw_corner' and o.id = 'wa_north_early_winters_spire_northwest_corner_a_k_a_boving_pollack_route';
  update routes k set hazards = case when k.hazards is null or k.hazards::text in ('', '[]', '{}', 'null', '""') then o.hazards else k.hazards end, difficulty = case when k.difficulty is null or k.difficulty::text in ('', '[]', '{}', 'null', '""') then o.difficulty else k.difficulty end
    from routes o where k.id = 'wa_crowbar_crag_feelin_stabby' and o.id = 'wa_feeling_stabby';

  update routes k set alt_names = (select array_agg(distinct a) from unnest(coalesce(k.alt_names, '{}') || array[m.drop_name]) a)
    from c_merge m where k.id = m.keep;
  update routes k set alt_names = (select array_agg(distinct a) from unnest(coalesce(k.alt_names, '{}') || array['The Kone']) a)
    from c_merge m where m.drop_id = 'wa_three_o_clock_rock_the_kone' and k.id = m.keep;

  update route_field_evidence e set route_id = m.keep
    from c_merge m
    where e.route_id = m.drop_id and not exists (select 1 from route_field_evidence k where k.route_id = m.keep and k.field = e.field);

  delete from routes where id = any(d);
  if exists (select 1 from routes where id = any(d)) then raise exception '0503: a deleted row survived'; end if;

  update routes r set name = x.new_name from c_rename x where r.id = x.id;
  select count(*) into n from c_rename x join routes r on r.id = x.id and r.name = x.new_name;
  if n <> 3 then raise exception '0503: % of 3 renames landed', n; end if;
end $$;

commit;
