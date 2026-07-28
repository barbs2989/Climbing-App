-- WA alpine/mountaineering audit — batch 9 (pass 1)
-- Reviewed 2026-07-28. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a
-- human to review and run — not yet applied. Continues the same scope/ordering as batches 1-8
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').
-- Column types were re-verified against supabase/migrations/*.sql before writing each
-- statement (rappels/pitches are integer, obj_haz/disciplines/waypoints/gpx/access/climate/
-- pitch_detail/itinerary are jsonb, descent/descent_text/bail/beta/approach/fa are text).

-- Pandora's Box (wa_dragontail_peak_r3, Dragontail Peak): a prior 2026-07-15 enrichment pass
-- rewrote this record's prose (overview/beta/approach/corrections) to correctly describe the
-- real, moderate, unroped SW-facing snow/scramble couloir (confirmed via engineeredfor
-- adventure.com and turns-all-year.com firsthand accounts, and the Mountaineers' "Basic Alpine
-- Climb" classification) — but never purged the structured fields that still described the
-- debunked fabricated WI6 ice/mixed route, leaving the record self-contradictory. grade_system/
-- grade_num asserted a WI6 ice grade with no basis; disciplines wrongly included ice/mixed;
-- pitches/pitch_detail invented a 7-pitch roped climb with an "M5 R" crux; rappels described a
-- rappel that contradicts the record's own bail/descent_text fields (no fixed anchor exists);
-- obj_haz retained a fabricated "R-rated crux"; climate framed this as a primary winter ice
-- route, contradicting the record's own season/best_season fields and the documented May-Jul
-- climbing window; and approach/timing/itinerary text mislabeled the route "Northeast Couloir"
-- in the same breath as correctly calling it the SW-facing "W Couloir". grade_system/grade_num
-- and pitches are reset to the "class"/integer convention already used by sibling scramble
-- routes in this same batch (e.g. wa_east_ridge_2, wa_e_se_face) rather than left null, since
-- the record's own grade text already says "Class 3 scramble".
update routes set grade_system = 'class', grade_num = 3
  where id = 'wa_dragontail_peak_r3';
update routes set disciplines = '["alpine"]'::jsonb
  where id = 'wa_dragontail_peak_r3';
update routes set pitches = 0
  where id = 'wa_dragontail_peak_r3';
update routes set pitch_detail = null
  where id = 'wa_dragontail_peak_r3';
update routes set rappels = 0
  where id = 'wa_dragontail_peak_r3';
update routes set obj_haz = '["loose, friable rock", "high wind exposure near the summit"]'::jsonb
  where id = 'wa_dragontail_peak_r3';
update routes set climate = jsonb_set(
    jsonb_set(climate, '{typical}', '"East-slope alpine; SW-facing snow couloir, primarily a spring/early-summer climb"'::jsonb),
    '{bySeason}',
    '{"spring":"Primary season - firm, consolidated snow typical (May-June per documented ascents)","summer":"Couloir typically melts out to talus/scree by mid-to-late summer","fall":"Usually melted out; not a typical season","winter":"Rarely climbed - short daylight and elevated avalanche danger"}'::jsonb
  )
  where id = 'wa_dragontail_peak_r3';
update routes set approach = replace(approach,
    'the Northeast Couloir (also called Pandora''s Box, or the W Couloir)',
    'Pandora''s Box (the W Couloir)')
  where id = 'wa_dragontail_peak_r3';
update routes set timing = jsonb_set(timing, '{sectionBreakdown,1,fromTo}', '"Climb Pandora''s Box (W Couloir), descend to camp"'::jsonb)
  where id = 'wa_dragontail_peak_r3';
update routes set itinerary = jsonb_set(itinerary, '{days,1,title}', '"Climb Pandora''s Box (W Couloir), descend to camp"'::jsonb)
  where id = 'wa_dragontail_peak_r3';

-- Triple Couloirs (wa_dragontail_peak_r4, Dragontail Peak): descent/descent_text/bail all
-- misspelled "Asgard Pass" — the pass above Colchuck Lake is "Aasgard Pass" (double-a) per
-- Wikipedia and virtually all Enchantments trip literature; the sibling duplicate row
-- wa_dragontail_peak_triple_couloirs (see note below) already spells it correctly throughout,
-- confirming r4 is the outlier.
update routes set descent = 'Traverse right (skier''s/climber''s right) toward the true summit, then descend via Aasgard Pass back to Colchuck Lake.'
  where id = 'wa_dragontail_peak_r4';
update routes set descent_text = 'From the top of the third couloir, a short snow scramble reaches the summit. Traverse to the true summit, then make a long descending traverse across the upper snowfields toward Aasgard Pass, and descend the pass''s gully back to the frozen/open lake and the approach trail.'
  where id = 'wa_dragontail_peak_r4';
update routes set bail = 'Below the Runnels, retreat down the Hidden Couloir is possible in good snow conditions; above the Runnels, bailing is difficult and continuing to the summit and Aasgard Pass descent is usually the safer option.'
  where id = 'wa_dragontail_peak_r4';

-- Triple Couloirs (wa_dragontail_peak_r4): alpine_grade held "IV" (an NCCS commitment-grade
-- value), but per the column's own definition (supabase/migrations/0006_composite_grades.sql:
-- "French adjectival F/PD/AD/D/TD/ED") alpine_grade should hold a French-scale value, not a
-- roman-numeral commitment grade — commitment (already "III-IV" on this row) is the correct
-- column for that. The duplicate sibling row wa_dragontail_peak_triple_couloirs already stores
-- the schema-correct "D" for the identical route; aligning r4 to match, per the documented
-- column format and the identical-route sibling's own value.
-- NOTE: a sub-agent auditing wa_dragontail_peak_triple_couloirs proposed the opposite fix
-- (changing its "D" to "IV") based on external sources that cite the NCCS grade — that
-- recommendation was reviewed against the schema comment above and rejected as a
-- misunderstanding of which grading system the alpine_grade column holds. Left uncorrected
-- (i.e. no fix applied to wa_dragontail_peak_triple_couloirs.alpine_grade).
update routes set alpine_grade = 'D'
  where id = 'wa_dragontail_peak_r4';

-- Serpentine Arête (wa_dragontail_peak_serpentine_arete, Dragontail Peak): the route's own
-- waypoints/gpx arrays contain two differently-coordinated entries both labeled "Aasgard
-- Pass" — index 2 (used in the primary gpx line) sits ~2,000 ft from the pass's true location,
-- while index 5 already matches the true location almost exactly. Wikipedia's Aasgard Pass
-- article (citing USGS/GNIS) gives 47.48028, -120.82056 at 7,841 ft, confirming index 2 is the
-- outlier and index 5 is correct.
update routes set waypoints = jsonb_set(
    jsonb_set(waypoints, '{2,lat}', '47.48028'::jsonb),
    '{2,lng}', '-120.82056'::jsonb
  )
  where id = 'wa_dragontail_peak_serpentine_arete';
update routes set gpx = jsonb_set(
    jsonb_set(gpx, '{2,0}', '47.48028'::jsonb),
    '{2,1}', '-120.82056'::jsonb
  )
  where id = 'wa_dragontail_peak_serpentine_arete';

-- E/SE Face (wa_e_se_face, Witches Tower): dist_km (12.9) and gain_ft (4200) both contradicted
-- the record's own itinerary block, which states "roughly 15 mi round trip" / "about 5,700 ft
-- of gain" and gives day-by-day gainFt/lossFt summing to 5,700 ft — an internal
-- self-contradiction, corrected to match the record's own more granular itinerary figures
-- (15 mi = 24.14 km).
update routes set dist_km = 24.14
  where id = 'wa_e_se_face';
update routes set gain_ft = 5700
  where id = 'wa_e_se_face';
-- NOTE (not fixed here, needs an editorial rewrite, not a value substitution): this record's
-- descent_text and itinerary describe a mandatory roped "5.6" pitch, directly contradicting its
-- own grade fields (grade="4th", rock_grade="4th class"). The record's own sourceNote admits no
-- trip report exists for "E/SE Face" by that name and that timing/descent detail was
-- extrapolated in part from Witches Tower's separate, real "Southeast Face" route (a documented
-- one-pitch 5.6 line up the "white rock") — content from that different route appears to have
-- bled into this 4th-class route's narrative fields. A human should either rewrite descent_text/
-- itinerary to match the 4th-class scrambling character already on file, or split "Southeast
-- Face 5.6" out as its own route record.

-- East McMillan Spire, West Ridge / Southwest Face (wa_east_mcmillan_spire_west_ridge): gain_ft
-- (5835) didn't match the record's own loss_ft (8500) despite this being a car-to-car
-- out-and-back via the same Terror Basin approach (gain must equal loss), and the record's own
-- itinerary.days breakdown sums to exactly 8,500 ft of gain and loss.
update routes set gain_ft = 8500
  where id = 'wa_east_mcmillan_spire_west_ridge';

-- Snowking Mountain, East Ridge (wa_east_ridge_2): access.land_manager wrongly named the
-- National Park Service / North Cascades NP as the land manager. Snowking Mountain sits in the
-- Glacier Peak Wilderness, Mount Baker-Snoqualmie National Forest (Wikipedia; fs.usda.gov Mt.
-- Baker Ranger District pages) — confirmed by this same record's own access.landManager field
-- and emergency.notes field, which both already correctly say Mt. Baker-Snoqualmie NF and
-- explicitly note NPS climbing rangers "have no jurisdiction here."
update routes set access = jsonb_set(access, '{land_manager}',
    '"Mount Baker-Snoqualmie National Forest — Glacier Peak Wilderness (Mt. Baker Ranger District)"'::jsonb)
  where id = 'wa_east_ridge_2';

-- Snowking Mountain, East Ridge (wa_east_ridge_2): access.notes/access.rules contained National
-- Park Service permit-lottery boilerplate (Boston Basin/Eldorado/Sulphide Glacier reservation
-- system, bear-canister requirement) that belongs to a North Cascades NP record, not this
-- Forest Service approach — matches the same NPS/USFS mix-up as the land_manager error above.
-- Snowking's actual access is the free self-issued Glacier Peak Wilderness trailhead permit,
-- which access.permit on this same record already correctly states.
update routes set access = access
    || jsonb_build_object('notes', 'No reservation, lottery, or quota system applies to this Glacier Peak Wilderness approach; access is via the free self-issued trailhead permit noted under "permit."')
    || jsonb_build_object('rules', 'Standard Wilderness Act group-size limit (12) applies; no bear-canister requirement or NPS-style off-trail cross-country zone cap is documented for this Forest Service approach.')
  where id = 'wa_east_ridge_2';

-- Snowking Mountain, East Ridge (wa_east_ridge_2): beta and pitch_detail both stated the route
-- "cross[es] onto the Snowking Glacier / summit snow slopes" near the top, contradicting the
-- record's own overview (which three times calls this the "non-glaciated" line specifically
-- because it avoids the Snowking Glacier) and itinerary note ("staying off the glacier to the
-- right"). External trip-report summaries describe the finish as snow/boulders to a 3rd-class
-- scramble, not a glacier crossing.
update routes set beta = replace(beta,
    'The final few hundred feet cross onto the Snowking Glacier / summit snow slopes before topping out from the south/SSE side.',
    'The final few hundred feet climb easy snow/scree below the summit block, staying off the Snowking Glacier proper, before a Class 3 scramble tops out from the south/SSE side.')
  where id = 'wa_east_ridge_2';
update routes set pitch_detail = jsonb_set(pitch_detail, '{3,notes}',
    '"Final few hundred feet of easy snow/scree below the summit block, staying off the Snowking Glacier itself, to a Class 3 scramble topping out from the S/SSE side."'::jsonb)
  where id = 'wa_east_ridge_2';

-- Snowking Mountain, East Ridge (wa_east_ridge_2): itinerary still cited the summit at
-- "7,439 ft" in two places, but this record's own corrections field already resolved the
-- summit elevation to 7,433 ft (matching Wikipedia, SummitPost, and ListsOfJohn, and this
-- record's own high_point_ft=7433) — the itinerary text was never updated to match.
update routes set itinerary = jsonb_set(
    jsonb_set(itinerary, '{days,1,objective}', '"Climb the East Ridge to the 7,433 ft summit, then hike out"'::jsonb),
    '{days,1,schedule,1,label}', '"Summit (7,433 ft)"'::jsonb
  )
  where id = 'wa_east_ridge_2';

-- Inspiration Peak, East Ridge (wa_east_ridge_4): fa gave "Fred Beckey, Ed Cooper, Dave
-- Collins, 1959", but multiple independent sources (AAC Publications/AAJ, Peak of the Week,
-- cascadeclimbers-derived trip-report summaries) confirm the climb occurred in October 1958 —
-- the AAJ report was merely published in 1959. This record's own overview/corrections/
-- data_quality.gaps fields already state 1958 correctly; only the fa field itself was never
-- updated to match.
update routes set fa = 'Fred Beckey, Ed Cooper, Dave Collins, 1958'
  where id = 'wa_east_ridge_4';
