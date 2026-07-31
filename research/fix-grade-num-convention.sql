-- routes.grade_num deviating from the convention its own grade string follows.
--
-- grade_num drives grade sorting and the min_grade/max_grade filter, so a wrong value
-- makes a route sort and filter as a different difficulty than it is.
--
-- The convention was measured, not invented. Letter grades map to quarter steps and the
-- data follows it overwhelmingly:
--   5.10a -> 10.25 (387/394)   5.10b -> 10.5 (299/309)
--   5.10c -> 10.75 (249/255)   5.10d -> 11   (187/193)
-- Only grades with at least 10 rows AND >=90% agreement are touched, and only rows that
-- disagree with their own grade's majority. Anything looser is left alone.
--
-- Guarded on the current value; a re-run affects 0 rows.

update routes set grade_num=10 where id='wa_south_face_direct' and area_id='wa_art_building' and grade='5.10' and grade_num=9;
update routes set grade_num=10.25 where id='wa_bear_mountain_chilliwack_north_buttress' and area_id='wa_bear_mountain_chilliwack' and grade='5.10a' and grade_num=10;
update routes set grade_num=10.25 where id='wa_czech_it_out' and area_id='wa_dikes_the' and grade='5.10a' and grade_num=10;
update routes set grade_num=10.25 where id='wa_internal_combustion' and area_id='wa_dikes_the' and grade='5.10a' and grade_num=10;
update routes set grade_num=10.25 where id='wa_lone_wolf' and area_id='wa_obelisk_the' and grade='5.10a' and grade_num=10;
update routes set grade_num=10.25 where id='wa_mile_high_club' and area_id='wa_morning_star_peak' and grade='5.10a' and grade_num=10;
update routes set grade_num=10.25 where id='wa_smears_jugs_and_rock_roll' and area_id='wa_viviane_campsite' and grade='5.10a' and grade_num=10;
update routes set grade_num=10.25 where id='wa_stanley_burgner' and area_id='wa_prusik_peak' and grade='5.10a' and grade_num=10;
update routes set grade_num=10.25 where id='wa_iceman' and area_id='wa_ice_box_left_side' and grade='5.10a/b' and grade_num=10;
update routes set grade_num=10.25 where id='wa_leche_la_vaca' and area_id='wa_colchuck_balanced_rock' and grade='5.10a/b' and grade_num=10;
update routes set grade_num=10.25 where id='wa_top_gun' and area_id='wa_north_side' and grade='5.10a/b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_asymptotic' and area_id='wa_half_moon_crag' and grade='5.10b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_boving_roofs' and area_id='wa_south_early_winters_spire' and grade='5.10b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_clast_from_the_past' and area_id='wa_north_side' and grade='5.10b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_firearms' and area_id='wa_dikes_the' and grade='5.10b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_flycatcher_buttress' and area_id='wa_north_early_winters_spire' and grade='5.10b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_heinous_thing' and area_id='wa_dikes_the' and grade='5.10b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_marvin_s_ear' and area_id='wa_morning_star_peak' and grade='5.10b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_roan_wall_stage_right' and area_id='wa_waterfall_basin' and grade='5.10b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_unnamed_4' and area_id='wa_spire_gully_right_alpenkuhl' and grade='5.10b' and grade_num=10;
update routes set grade_num=10.5 where id='wa_up_in_arms' and area_id='wa_upper_wall' and grade='5.10b' and grade_num=11;
update routes set grade_num=10.75 where id='wa_action_potential' and area_id='wa_burgundy_spire' and grade='5.10c' and grade_num=10;
update routes set grade_num=10.75 where id='wa_ignorant_bliss' and area_id='wa_goose_egg_mountain' and grade='5.10c' and grade_num=10;
update routes set grade_num=10.75 where id='wa_spoil_ill' and area_id='wa_goose_egg_mountain' and grade='5.10c' and grade_num=10;
update routes set grade_num=10.75 where id='wa_the_pillar_under_pale_streaks' and area_id='wa_east_face' and grade='5.10c' and grade_num=10;
update routes set grade_num=10.75 where id='wa_true_grit' and area_id='wa_postal_wall' and grade='5.10c' and grade_num=8;
update routes set grade_num=10.75 where id='wa_with_love_lie_ancients_nestled_within' and area_id='wa_east_face' and grade='5.10c' and grade_num=10;
update routes set grade_num=11 where id='wa_east_face' and area_id='wa_middle_peak' and grade='5.10d' and grade_num=10;
update routes set grade_num=11 where id='wa_fire_on_the_mountain' and area_id='wa_sloan_peak' and grade='5.10d' and grade_num=10;
update routes set grade_num=11 where id='wa_gorillas_direct' and area_id='wa_mount_stuart' and grade='5.10d' and grade_num=10;
update routes set grade_num=11 where id='wa_north_face_left_buttress' and area_id='wa_castle_peak_pasayten' and grade='5.10d' and grade_num=10;
update routes set grade_num=11 where id='wa_nw_face_var_remsberg_variation' and area_id='wa_liberty_bell' and grade='5.10d' and grade_num=10;
update routes set grade_num=11 where id='wa_southeast_arete' and area_id='wa_goose_egg_mountain' and grade='5.10d' and grade_num=10;
update routes set grade_num=11.25 where id='wa_chitlins_con_carne' and area_id='wa_summertime_crag' and grade='5.11a' and grade_num=11;
update routes set grade_num=11.25 where id='wa_labor_pains' and area_id='wa_north_early_winters_spire' and grade='5.11a' and grade_num=11;
update routes set grade_num=11.25 where id='wa_last_chance_for_gas_aka_tricky_start' and area_id='wa_shuksan_crag' and grade='5.11a' and grade_num=11;
update routes set grade_num=11.25 where id='wa_roan_wall_center_stage' and area_id='wa_waterfall_basin' and grade='5.11a' and grade_num=11;
update routes set grade_num=11.25 where id='wa_the_exorcism_of_mark_hanna' and area_id='wa_m_m_wall_aka_supercave_wall' and grade='5.11a' and grade_num=11;
update routes set grade_num=11.25 where id='wa_ultramega_ok' and area_id='wa_burgundy_spire' and grade='5.11a' and grade_num=11;
update routes set grade_num=11.25 where id='wa_northwest_face_boving_pollock' and area_id='wa_south_early_winters_spire' and grade='5.11a/b' and grade_num=11;
update routes set grade_num=11.25 where id='wa_wright_pond' and area_id='wa_cutthroat_creek_wall_or_little_liberty_bell' and grade='5.11a/b' and grade_num=11;
update routes set grade_num=11.5 where id='wa_commandho_pillar' and area_id='wa_goose_egg_mountain' and grade='5.11b' and grade_num=11;
update routes set grade_num=11.5 where id='wa_mojo_rising' and area_id='wa_south_early_winters_spire' and grade='5.11b' and grade_num=11;
update routes set grade_num=11.5 where id='wa_alice_in_wonderland' and area_id='wa_summertime_crag' and grade='5.11b/c' and grade_num=11;
update routes set grade_num=11.5 where id='wa_caravan' and area_id='wa_summertime_crag' and grade='5.11b/c' and grade_num=11;
update routes set grade_num=11.75 where id='wa_bowl_packer' and area_id='wa_goose_egg_mountain' and grade='5.11c' and grade_num=11;
update routes set grade_num=11.75 where id='wa_crescendo_of_the_sarcophagus_breathing' and area_id='wa_east_face' and grade='5.11c' and grade_num=11;
update routes set grade_num=11.75 where id='wa_summertime' and area_id='wa_summertime_crag' and grade='5.11c' and grade_num=11;
update routes set grade_num=11.75 where id='wa_the_scoop_2' and area_id='wa_colchuck_balanced_rock' and grade='5.11c' and grade_num=11;
update routes set grade_num=12 where id='wa_django' and area_id='wa_summertime_crag' and grade='5.11d' and grade_num=11;
update routes set grade_num=12 where id='wa_ephemeral' and area_id='wa_ice_box_right_side' and grade='5.11d' and grade_num=11;
update routes set grade_num=12 where id='wa_south_early_winter_spire_passenger' and area_id='wa_south_early_winters_spire' and grade='5.11d' and grade_num=11;
update routes set grade_num=12 where id='wa_southern_man' and area_id='wa_south_early_winters_spire' and grade='5.11d' and grade_num=11;
update routes set grade_num=12.25 where id='wa_tooth_and_claw' and area_id='wa_lexington_tower' and grade='5.12a' and grade_num=12;
update routes set grade_num=12.5 where id='wa_liberty_and_injustice_for_all' and area_id='wa_liberty_bell' and grade='5.12b' and grade_num=12;
update routes set grade_num=12.5 where id='wa_vanishing_point' and area_id='wa_dolomite_tower' and grade='5.12b' and grade_num=12;
update routes set grade_num=13.5 where id='wa_liberty_crack_free' and area_id='wa_liberty_bell' and grade='5.13b' and grade_num=13;
update routes set grade_num=4 where id='wa_the_fin_scramble' and area_id='wa_the_fin' and grade='5.4' and grade_num=3;
update routes set grade_num=6 where id='wa_concord_tower_north_face' and area_id='wa_concord_tower' and grade='5.6' and grade_num=7;
update routes set grade_num=6 where id='wa_ez_way' and area_id='wa_shark_rock' and grade='5.6' and grade_num=5;
update routes set grade_num=6 where id='wa_north_face_6' and area_id='wa_north_peak_2' and grade='5.6' and grade_num=7;
update routes set grade_num=8 where id='wa_junior_s_farm' and area_id='wa_full_montey_the' and grade='5.8+' and grade_num=9;

select grade, grade_num, count(*) from routes
 where id in ('wa_south_face_direct','wa_bear_mountain_chilliwack_north_buttress','wa_czech_it_out','wa_internal_combustion','wa_lone_wolf','wa_mile_high_club','wa_smears_jugs_and_rock_roll','wa_stanley_burgner','wa_iceman','wa_leche_la_vaca','wa_top_gun','wa_asymptotic','wa_boving_roofs','wa_clast_from_the_past','wa_firearms','wa_flycatcher_buttress','wa_heinous_thing','wa_marvin_s_ear','wa_roan_wall_stage_right','wa_unnamed_4','wa_up_in_arms','wa_action_potential','wa_ignorant_bliss','wa_spoil_ill','wa_the_pillar_under_pale_streaks','wa_true_grit','wa_with_love_lie_ancients_nestled_within','wa_east_face','wa_fire_on_the_mountain','wa_gorillas_direct','wa_north_face_left_buttress','wa_nw_face_var_remsberg_variation','wa_southeast_arete','wa_chitlins_con_carne','wa_labor_pains','wa_last_chance_for_gas_aka_tricky_start','wa_roan_wall_center_stage','wa_the_exorcism_of_mark_hanna','wa_ultramega_ok','wa_northwest_face_boving_pollock','wa_wright_pond','wa_commandho_pillar','wa_mojo_rising','wa_alice_in_wonderland','wa_caravan','wa_bowl_packer','wa_crescendo_of_the_sarcophagus_breathing','wa_summertime','wa_the_scoop_2','wa_django','wa_ephemeral','wa_south_early_winter_spire_passenger','wa_southern_man','wa_tooth_and_claw','wa_liberty_and_injustice_for_all','wa_vanishing_point','wa_liberty_crack_free','wa_the_fin_scramble','wa_concord_tower_north_face','wa_ez_way','wa_north_face_6','wa_junior_s_farm')
 group by grade, grade_num order by grade, grade_num;
