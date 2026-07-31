-- routes.pitches undercounts, corrected from each route's own pitch_detail.
--
-- pitch_detail here is a contiguous 1..N enumeration, each entry carrying its own
-- grade and notes. An enumeration of N distinct pitches is better evidence than a
-- single summary number, and two spot checks against published descriptions agree:
--   Forbidden Peak East Ridge  -- sources say "6 to 8 pitches"; detail enumerates 8, column said 6
--   Sherpa Peak West Ridge     -- sources say "5-6 pitches" and call Pitch 5 the crux;
--                                 detail enumerates 5, column said 3
--
-- Deliberately excluded:
--   * 280 routes whose pitch_detail is not contiguously numbered -- ambiguous.
--   * 21 where the detail lists FEWER than the column. pitch_detail is often a partial
--     highlight (Complete South Buttress: 22 pitches, 2 entries), so fewer proves nothing.
--   * rappel/approach entries, which are not pitches. Remmel Mountain NW Ridge looked
--     wrong at 4 vs 6 entries until two of the six turned out to be labelled "Rappel" --
--     the column was right. That check is why this set is 16 and not 66.
--
-- Guarded on the current value; a re-run affects 0 rows.

-- Southeast Face / South Ridge: 2 -> 3
update routes set pitches=3 where id='wa_american_border_peak_southeast_face' and area_id='wa_american_border_peak' and pitches=2;
-- Classic Route: 1 -> 2
update routes set pitches=2 where id='wa_classic_route_3' and area_id='wa_lane_peak' and pitches=1;
-- Diamond In The Rough: 8 -> 9
update routes set pitches=9 where id='wa_diamond_in_the_rough' and area_id='wa_sloan_peak' and pitches=8;
-- East Ridge Direct: 6 -> 8
update routes set pitches=8 where id='wa_forbidden_peak_east_ridge' and area_id='wa_forbidden_peak' and pitches=6;
-- Overexposure: 2 -> 4
update routes set pitches=4 where id='wa_liberty_bell_overexposure' and area_id='wa_liberty_bell' and pitches=2;
-- Northeast Face: 2 -> 3
update routes set pitches=3 where id='wa_little_big_chief_mountain_northeast_face' and area_id='wa_little_big_chief_mountain' and pitches=2;
-- West Ridge: 3 -> 5
update routes set pitches=5 where id='wa_sherpa_peak_west_ridge' and area_id='wa_sherpa_peak' and pitches=3;
-- Vanishing Point: 14 -> 20
update routes set pitches=20 where id='wa_vanishing_point' and area_id='wa_dolomite_tower' and pitches=14;
-- Wings: 1 -> 2
update routes set pitches=2 where id='wa_wings' and area_id='wa_steeple_rock' and pitches=1;
-- La Villa: 1 -> 2
update routes set pitches=2 where id='wa_castle_peak_tatoosh_la_villa' and area_id='wa_castle_peak_tatoosh' and pitches=1;
-- La Villa: 1 -> 2
update routes set pitches=2 where id='wa_la_villa_1' and area_id='wa_castle_the' and pitches=1;
-- Let it Burn: 8 -> 9
update routes set pitches=9 where id='wa_let_it_burn' and area_id='wa_colchuck_balanced_rock' and pitches=8;
-- East Ridge: 9 -> 10
update routes set pitches=10 where id='wa_east_ridge_4' and area_id='wa_inspiration_peak' and pitches=9;
-- North Ridge: 4 -> 5
update routes set pitches=5 where id='wa_mount_baker_north_ridge' and area_id='wa_mount_baker' and pitches=4;
-- East Peak (Standard Route): 1 -> 2
update routes set pitches=2 where id='wa_the_triad_east_peak' and area_id='wa_the_triad' and pitches=1;
-- Standard Scramble: 1 -> 3
update routes set pitches=3 where id='wa_monte_cristo_peak_scramble' and area_id='wa_monte_cristo_peak' and pitches=1;

-- Leche la Vaca: overview says "A 4-pitch, Grade III" and pitch_detail lists 4. Column says 5.
update routes set pitches=4 where id='wa_leche_la_vaca' and area_id='wa_colchuck_balanced_rock' and pitches=5;

select count(*) as corrected from routes where id in ('wa_american_border_peak_southeast_face','wa_classic_route_3','wa_diamond_in_the_rough','wa_forbidden_peak_east_ridge','wa_liberty_bell_overexposure','wa_little_big_chief_mountain_northeast_face','wa_sherpa_peak_west_ridge','wa_vanishing_point','wa_wings','wa_castle_peak_tatoosh_la_villa','wa_la_villa_1','wa_let_it_burn','wa_east_ridge_4','wa_mount_baker_north_ridge','wa_the_triad_east_peak','wa_monte_cristo_peak_scramble','wa_leche_la_vaca');
