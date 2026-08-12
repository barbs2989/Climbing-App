-- WA alpine route audit -- batch 64 (pass 2)
-- Peaks: Elephant Butte, Elephant Head, Prusik Peak, Sloan Peak, Vesper Peak, Flora Mountain, North Early Winters Spire, Forbidden Peak
-- Generated 2026-08-07. Proposed fixes only -- run npm run check:sql before applying.
-- Note: most WebFetch access to primary sources (Wikipedia, Mountain Project, NPS.gov, WTA.org, SuperTopo,
-- Mountaineers.org, CascadeClimbers.com) was blocked by this run's network egress policy; only WebSearch
-- snippets were reachable. Every fix below is still sourced (either an external snippet or the row's own
-- internal data), but yield this batch is lower than usual and several items were left flagged rather than
-- fixed purely because a primary source could not be reached to confirm them -- see the changelog entry.

-- wa_energizer_bunny (Prusik Peak): aspect (W) contradicted external sourcing -- AAC Publications titles this route "Prusik Peak, South Face, Energizer Bunny", and stephabegg.com groups it with other south-face lines (Solid Gold, Burgner-Stanley, Boving-Christensen). No source places it on the west face.
UPDATE routes SET aspect = 'S' WHERE id = 'wa_energizer_bunny';

-- wa_energizer_bunny: face field said "West Face (left of Solid Gold)", same west/south error as aspect above.
UPDATE routes SET face = 'South Face (left of Solid Gold)' WHERE id = 'wa_energizer_bunny';

-- wa_energizer_bunny: overview text said "Prusik's west face", contradicting the corrected aspect/face fields above.
UPDATE routes SET overview = replace(overview, 'Prusik''s west face', 'Prusik''s south face') WHERE id = 'wa_energizer_bunny';

-- wa_energizer_bunny: waypoints[0] was internally contradictory -- named "Snow Lakes Trailhead" at elev 1300ft, but its own coordinates (47.527315,-120.820942) match the Stuart Lake Trailhead, which is what this row's own approach/approach_logistics/road fields consistently describe as the actual start point. Snow Lakes TH is a real but geographically distant (~10+ mi) trailhead on a different Enchantments approach. USFS/AllTrails cite Stuart Lake TH at ~3,400 ft.
UPDATE routes SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,name}', '"Stuart Lake Trailhead"'), '{0,elev}', '3400') WHERE id = 'wa_energizer_bunny';

-- wa_fire_on_the_mountain (Sloan Peak): resolves a pass-1 flag left unfixed (3 disagreeing pitch/length figures). pitches (8) contradicted the route's own pitch_detail array (exactly 7 entries), its own overview ("climbs 7 pitches"), and its own rope_note ("7 pitches of 5.10d rock"); Mountain Project, stephabegg.com, and Blake Herrington's Cascades Rock guidebook (Herrington co-established the route) all agree on 7 pitches. The "8 pitches" figure traces to a single 2023 trip report using different pitch-splitting, already caveated in this row's own data_quality.gaps.
UPDATE routes SET pitches = 7 WHERE id = 'wa_fire_on_the_mountain';

-- wa_fire_on_the_mountain: length_m (457, i.e. ~1,500 ft) didn't match any of the well-attested "1,000 ft technical rock" figures -- stephabegg.com's page title itself states "1,000' of technical rock"; this row's own rope_note field independently states the same 1,000 ft figure. 1,000 ft = 305 m.
UPDATE routes SET length_m = 305 WHERE id = 'wa_fire_on_the_mountain';

-- wa_fire_on_the_mountain: beta field's "1,100 ft (333 m) ... across 8 pitches" contradicted the corrected pitches/length_m above and this row's own overview/rope_note fields.
UPDATE routes SET beta = replace(beta, '1,100 ft (333 m) of technical rock across 8 pitches', '1,000 ft (305 m) of technical rock across 7 pitches') WHERE id = 'wa_fire_on_the_mountain';

-- wa_fire_on_the_mountain: access.land_manager said "Glacier Peak Wilderness", contradicting the sibling key access.landManager in the same row ("the climb lies within the Henry M. Jackson Wilderness") and the DB's own area hierarchy (wa_sloan_peak.parent_id = wa_henry_m_jackson_wilderness). USFS confirms Sloan Peak sits in the Henry M. Jackson Wilderness, a separate adjacent wilderness area.
UPDATE routes SET access = jsonb_set(access, '{land_manager}', '"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) — Henry M. Jackson Wilderness"') WHERE id = 'wa_fire_on_the_mountain';

-- wa_fire_on_the_mountain: access.parking_pass named "Sunrise Mine TH for Vesper Peak" as its example trailhead -- a verbatim copy of sibling route wa_fish_whistle's (Vesper Peak) own access.parking_pass field, cross-contaminating an unrelated peak's trailhead onto this Sloan Peak route.
UPDATE routes SET access = jsonb_set(access, '{parking_pass}', '"Northwest Forest Pass required at Mountain Loop Highway trailheads (e.g. Bedal Creek TH for Sloan Peak) — $5/day or $30/year."') WHERE id = 'wa_fire_on_the_mountain';

-- wa_fish_whistle (Vesper Peak): gain_ft (4115) didn't equal loss_ft (4400) on a single-day car-to-car route with a non-technical walk-off descent back to the same trailhead (gain should equal loss); loss_ft and the route's own itinerary.days[0].gainFt (4400) already agree with each other, isolating gain_ft as the outlier.
UPDATE routes SET gain_ft = 4400 WHERE id = 'wa_fish_whistle';

-- wa_forbidden_peak_east_face_catscratch: access.notes gave the 2026 Boston Basin lottery window as "Mar 2–13"; NPS's own release states the window was March 3–14, 2026 (notification Mar 20, early-access window Mar 24–Apr 21).
UPDATE routes SET access = jsonb_set(access, '{notes}', to_jsonb(replace(access->>'notes', 'Mar 2–13', 'Mar 3–14'))) WHERE id = 'wa_forbidden_peak_east_face_catscratch';

-- wa_forbidden_peak_east_ridge: same lottery-date error as wa_forbidden_peak_east_face_catscratch above.
UPDATE routes SET access = jsonb_set(access, '{notes}', to_jsonb(replace(access->>'notes', 'Mar 2–13', 'Mar 3–14'))) WHERE id = 'wa_forbidden_peak_east_ridge';

-- wa_forbidden_peak_east_ridge: data_quality.gaps[0] still said this row "is very likely the same route as wa_east_ridge_direct... should probably be reconciled/deduplicated" -- that duplicate id no longer exists in the live DB and this row's own corrections field already documents a 2026-07-29 rename/merge that resolved it. Stale gap note updated so future audit passes stop re-flagging an already-solved problem.
UPDATE routes SET data_quality = jsonb_set(data_quality, '{gaps,0}', to_jsonb('Previously flagged as a likely duplicate of wa_forbidden_peak_east_ridge_direct; that id no longer exists in the live DB and this row''s own corrections field documents the 2026-07-29 rename/merge -- the duplicate has been resolved.'::text)) WHERE id = 'wa_forbidden_peak_east_ridge';

-- wa_forbidden_peak_north_ridge: beta's opening sentence said "Grade III, 5.7 climbing", contradicting this row's own grade/grade_num/rock_grade fields (all 5.6, confirmed correct via the batch-11 pass-1 fix, still live) and external sourcing ("North Ridge (III 5.6)"). The 5.7 figure correctly belongs later in the same sentence, describing one short technical move to gain Sharkfin Col ("10 feet of 5.7 rock and 200 feet of Class 3 gully") -- the opening grade label appears to have been copy-mixed with that single move's grade.
UPDATE routes SET beta = replace(beta, 'Grade III, 5.7 climbing', 'Grade III, 5.6 climbing') WHERE id = 'wa_forbidden_peak_north_ridge';
