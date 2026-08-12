-- WA alpine audit batch 100 (pass 2)
-- Sharkfin Tower, Sherman Peak (Mount Baker), Sherpa Balanced Rock,
-- Mount Stuart (Sherpa Glacier), Sherpa Peak, Silver Star Mountain (Okanogan)
-- Generated 2026-08-12. Proposed fixes for human review before running.

-- =========================================================================
-- Sharkfin Tower
-- =========================================================================

-- wa_sharkfin_tower_southeast_ridge: access.group_limit was 6, contradicted
-- by this row's own access.rules text ("Group size capped at 12 in the
-- Boston Basin/Eldorado/Sulphide Glacier high-occupancy cross-country
-- zones... (6 in other cross-country zones)") and its own corrections log,
-- which already documents this exact fix but never touched the scalar.
-- NPS's own cross-country zone rules confirm Boston Basin is the 12-person
-- zone.
UPDATE routes SET access = jsonb_set(access, '{group_limit}', '12'::jsonb) WHERE id = 'wa_sharkfin_tower_southeast_ridge';

-- wa_sharkfin_tower_southeast_ridge: top-level rappels said "2 raps",
-- contradicted by this row's own descent_text ("roughly 4-5 rappels
-- total"), rappel_detail (5 numbered stations), and rappel_count_note
-- ("Trip reports converge on roughly 4-5 rappels total... used 5 as
-- representative"). The 2-rap figure only covers the upper ridge and
-- omits the couloir -- the section where the 2005 fatal anchor failure
-- occurred.
UPDATE routes SET rappels = '4-5 raps total: one or two short raps off the upper ridge to regain the notch/gully, then two to three longer raps down the couloir back to the glacier; a single 60m rope is sufficient per station.' WHERE id = 'wa_sharkfin_tower_southeast_ridge';

-- wa_sharkfin_tower_southeast_ridge: gain_ft/loss_ft were 4870/4870,
-- contradicting this row's own itinerary.days sum (2500+2420=4920 gain,
-- 0+4920=4920 loss) -- an out-and-back route, so gain should equal loss,
-- which the itinerary breakdown already does at 4920.
UPDATE routes SET gain_ft = 4920, loss_ft = 4920 WHERE id = 'wa_sharkfin_tower_southeast_ridge';

-- wa_sharkfin_tower_southeast_ridge: length_m was 61, not matching this
-- row's own pitch_detail lengths (30+35+30=95m).
UPDATE routes SET length_m = 95 WHERE id = 'wa_sharkfin_tower_southeast_ridge';

-- =========================================================================
-- Sherman Peak (Mount Baker)
-- =========================================================================

-- wa_sherman_peak_baker_route: access.land_manager falsely claimed some
-- upper routes cross into North Cascades National Park. Congress
-- deliberately excluded Mount Baker from NCNP in 1968; it remains entirely
-- USFS/Wilderness. Contradicts this row's own access.landManager field and
-- the sibling squak_glacier route, both correctly USFS-only.
UPDATE routes SET access = jsonb_set(access, '{land_manager}', '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) — Mount Baker Wilderness"'::jsonb) WHERE id = 'wa_sherman_peak_baker_route';

-- wa_sherman_peak_baker_route: itinerary.days[0].gainFt was 2300,
-- understating gain to Sandy Camp (day 1's own destination, per its own
-- 4-mile distance matching the Sandy Camp waypoint's distMi=4). Trailhead
-- is 3400 ft per this row's own waypoint; Sandy Camp is ~5900 ft, so gain
-- should be ~2500. As stored, days[0]+days[1] summed to 6500, matching
-- neither gain_ft (6800) nor the itinerary's own totalNote ("~6,700 ft
-- gain round trip"). 2500 brings the sum to 6700, matching totalNote.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,gainFt}', '2500'::jsonb) WHERE id = 'wa_sherman_peak_baker_route';

-- wa_sherman_peak_baker_route: access.fees said "~$5/day or annual" with no
-- dollar figure for the annual pass, implying it's also ~$5. This row's own
-- access.parking_pass field correctly says "$30/year or $5/day", matching
-- current USFS Northwest Forest Pass pricing.
UPDATE routes SET access = jsonb_set(access, '{fees}', to_jsonb(replace(access->>'fees', '~$5/day or annual', '~$5/day or $30/year'))) WHERE id = 'wa_sherman_peak_baker_route';

-- =========================================================================
-- Mount Stuart (Sherpa Glacier)
-- =========================================================================

-- wa_sherpa_glacier: alpine_grade/commitment overstated as "III". Multiple
-- independent sources (SummitPost, citing Beckey) consistently describe
-- Sherpa Glacier as Grade II, snow to 40 degrees -- never III. This row's
-- own overview calls it "the easiest and most direct of Mount Stuart's
-- three north-side glacier routes" at the lowest max_angle (40) of the
-- three, yet shared commitment:"III" with the harder Ice Cliff Glacier
-- (max_angle 70) on the same peak; Cascadian Couloir, the peak's other
-- easy/moderate route, is rated II in this same table.
UPDATE routes SET alpine_grade = 'II', commitment = 'II' WHERE id = 'wa_sherpa_glacier';

-- wa_sherpa_glacier: waypoints/gpx were stored out of route order
-- (icefall -> topout -> trailhead -> summit), which GPXMap draws straight
-- in array order, producing a backwards, self-crossing track. Reordered to
-- trailhead -> icefall -> topout -> summit per this row's own distMi
-- values (0 implicit, 6, 6.5). Also corrects the trailhead elevation from
-- 2930 to 3400 ft, which contradicted this row's own
-- approach_logistics.trailheadDirection text ("~3,540 ft" for the same
-- point) and was inconsistent with gain_ft=6000 (9415-3400=6015 vs.
-- 9415-2930=6485, an 8% mismatch); external sources for this trailhead
-- (shared with Stuart Lake/Colchuck Lake trails) converge around
-- 3,400-3,430 ft. Flagged for a human topo-map check since no primary
-- source was directly reachable (see log).
UPDATE routes SET waypoints = '[{"lat":47.52808,"lng":-120.82071,"elev":3400,"name":"Stuart Lake Trailhead (end of FR 7601, Eightmile Creek Rd)","type":"Trailhead","elevFt":3400},{"lat":47.47854,"lng":-120.88416,"elev":6600,"name":"Sherpa Glacier toe/icefall","note":"Glacier terminates as an icefall here; crevasses present, cross high where the glacier is flatter.","type":"Hazard","distMi":6},{"lat":47.47227,"lng":-120.89263,"elev":7600,"name":"Top of Sherpa Glacier","note":"Tops out at the notch gaining Mount Stuart''s upper North Ridge.","type":"Topout","distMi":6.5},{"lat":47.4751179,"lng":-120.9031444,"elev":9415,"name":"Mount Stuart summit","type":"Summit","elevFt":9415}]'::jsonb,
    gpx = '[[47.52808,-120.82071],[47.47854,-120.88416],[47.47227,-120.89263],[47.4751179,-120.9031444]]'::jsonb
WHERE id = 'wa_sherpa_glacier';

-- =========================================================================
-- Sherpa Peak
-- =========================================================================

-- wa_sherpa_peak_east_ridge: trailhead waypoint (index 0) elev/elevFt was
-- 3500, off by 743 ft from the same physical trailhead's correct 4243 ft
-- (confirmed via external aggregate sources, and matching the sibling
-- west_ridge route's identical trailhead waypoint). 3500 also made gain_ft
-- (4325) internally inconsistent (8630-4243=4387, close to 4325; 8630-3500
-- would imply ~5130 ft of gain).
UPDATE routes SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,elev}', '4243'::jsonb), '{0,elevFt}', '4243'::jsonb) WHERE id = 'wa_sherpa_peak_east_ridge';

-- wa_sherpa_peak_east_ridge: grade said "Grade III, 5.7" while commitment
-- said "II" on the same row -- the same NCCS commitment concept
-- contradicting itself. The comparable sibling west_ridge (similar pitch
-- count/length) has both fields agreeing at "II"; the much longer
-- (13-pitch) north_ridge is the one that should carry "III".
UPDATE routes SET grade = 'Grade II, 5.7' WHERE id = 'wa_sherpa_peak_east_ridge';

-- wa_sherpa_peak_east_ridge: top-level permit field wrongly claimed the
-- Enchantment Permit Area lottery applies to this route's Longs
-- Pass/Ingalls Creek (Teanaway-side) approach. External sources confirm
-- that approach is outside the lottery zone, using only a free self-issued
-- wilderness permit -- which is exactly what this row's own access.permit
-- field already (correctly) says. The two fields contradicted each other.
UPDATE routes SET permit = 'Not within the Recreation.gov Enchantment Permit Area lottery zone: this route''s Longs Pass/Ingalls Creek approach uses a free self-issued wilderness permit at the trailhead for both day trips and overnight stays. (The Enchantment Permit Area quota system applies to the Stuart Lake Trailhead approach used by the North Ridge instead.)' WHERE id = 'wa_sherpa_peak_east_ridge';

-- wa_sherpa_peak_east_ridge: access.notes described a 2026 Recreation.gov
-- lottery window that does not apply to this route's approach, directly
-- contradicting access.permit on the same row ("the lottery does not apply
-- here").
UPDATE routes SET access = jsonb_set(access, '{notes}', to_jsonb('This route''s Longs Pass/Ingalls Creek approach is outside the Enchantment Permit Area lottery zone (see the permit field); the Feb 15-Mar 1 Recreation.gov lottery window applies only to the Stuart Lake Trailhead approach used by the North Ridge.'::text)) WHERE id = 'wa_sherpa_peak_east_ridge';

-- wa_sherpa_peak_north_ridge: access.permit wrongly claimed the
-- Enchantment Permit Area lottery does not apply. This route approaches
-- via the Stuart Lake Trailhead (Icicle Creek Rd/FR 7600 -> FR 7601),
-- which is within the Enchantment Permit Area's Stuart Zone (overnight
-- quota permit required May 15-Oct 31 per USFS). This row's own top-level
-- permit field already says this correctly; access.permit contradicted it.
UPDATE routes SET access = jsonb_set(access, '{permit}', to_jsonb('Overnight stays require a Recreation.gov Enchantment Permit Area (Stuart Zone) quota permit, obtained via advance lottery, May 15-Oct 31; day trips need only the free self-issued wilderness permit at the trailhead.'::text)) WHERE id = 'wa_sherpa_peak_north_ridge';

-- wa_sherpa_peak_north_ridge: access.landManager named Cle Elum Ranger
-- District, but this route's own emergency.rangerStation field (and USFS
-- Stuart Lake Trailhead info) point to the Wenatchee River Ranger
-- District, Leavenworth. Cle Elum RD manages the Teanaway (Esmeralda/Longs
-- Pass) side used by the East/West Ridge siblings, not Icicle Creek.
UPDATE routes SET access = jsonb_set(access, '{landManager}', to_jsonb('Okanogan-Wenatchee National Forest (Wenatchee River Ranger District), Alpine Lakes Wilderness'::text)) WHERE id = 'wa_sherpa_peak_north_ridge';

-- wa_sherpa_peak_north_ridge: access.fees named the Esmeralda/Longs Pass
-- trailhead -- copy-pasted from the East/West Ridge siblings' Teanaway-side
-- trailhead. This route's own road/approach/waypoint fields all point to
-- the Stuart Lake Trailhead instead.
UPDATE routes SET access = jsonb_set(access, '{fees}', to_jsonb('Northwest Forest Pass or America the Beautiful interagency pass required to park at the Stuart Lake Trailhead ($5 day / $30 annual)'::text)) WHERE id = 'wa_sherpa_peak_north_ridge';

-- wa_sherpa_peak_north_ridge: access.rules named the Longs Pass and
-- Ingalls Way trails (the East/West siblings' trails); this route's own
-- approach is via the Stuart Lake trail, where dogs are also prohibited
-- (within the Enchantment Permit Area), per USFS-sourced text.
UPDATE routes SET access = jsonb_set(access, '{rules}', to_jsonb('Dogs prohibited on the Stuart Lake and Colchuck Lake trails and within the Enchantment Permit Area; standard wilderness group-size/campsite rules apply'::text)) WHERE id = 'wa_sherpa_peak_north_ridge';

-- wa_sherpa_peak_north_ridge: access.closures described FR 9737 to the
-- Esmeralda Trailhead (the Teanaway/Esmeralda road used by the East/West
-- siblings); this route's own road field says FR 7600 (Icicle Creek Road)
-- to the Stuart Lake Trailhead, which USFS sources describe as closed to
-- vehicles every winter to protect the roadbed.
UPDATE routes SET access = jsonb_set(access, '{closures}', to_jsonb('FR 7600 (Icicle Creek Road) to the Stuart Lake Trailhead is closed to vehicles every winter to protect the roadbed and prevent hazardous travel on the steep, snow-covered grade; typically open in summer.'::text)) WHERE id = 'wa_sherpa_peak_north_ridge';

-- wa_sherpa_peak_north_ridge: access was missing the lottery-window notes
-- field that its now-corrected permit field needs -- the East/West
-- siblings carry this exact (verified) text despite not needing it, since
-- their approach is outside the lottery zone; this route is the one that
-- actually requires it.
UPDATE routes SET access = jsonb_set(access, '{notes}', to_jsonb('2026 lottery application window Feb 15-Mar 1 (results after Mar 17, accept/pay by Mar 31). ~25% of overnight slots also released as a walk-up daily lottery the day before entry. Season requiring the overnight permit: May 15-Oct 31. A single-day ascent with no camp inside the boundary never needs the lottery.'::text)) WHERE id = 'wa_sherpa_peak_north_ridge';

-- wa_sherpa_peak_west_ridge: top-level permit field wrongly claimed the
-- Enchantment Permit Area lottery applies. Same issue and rationale as
-- east_ridge above -- this route shares the Longs Pass/Ingalls Creek
-- approach, outside the lottery zone, and its own access.permit field
-- already says the lottery doesn't apply, contradicting this field.
UPDATE routes SET permit = 'Not within the Recreation.gov Enchantment Permit Area lottery zone: this route''s Longs Pass/Ingalls Creek approach uses a free self-issued wilderness permit at the trailhead for both day trips and overnight stays. (The Enchantment Permit Area quota system applies to the Stuart Lake Trailhead approach used by the North Ridge instead.)' WHERE id = 'wa_sherpa_peak_west_ridge';

-- wa_sherpa_peak_west_ridge: access.notes described a 2026 lottery window
-- contradicting access.permit on the same row -- identical issue to
-- east_ridge's notes fix above.
UPDATE routes SET access = jsonb_set(access, '{notes}', to_jsonb('This route''s Longs Pass/Ingalls Creek approach is outside the Enchantment Permit Area lottery zone (see the permit field); the Feb 15-Mar 1 Recreation.gov lottery window applies only to the Stuart Lake Trailhead approach used by the North Ridge.'::text)) WHERE id = 'wa_sherpa_peak_west_ridge';

-- =========================================================================
-- Silver Star Mountain (Okanogan)
-- =========================================================================

-- wa_silver_star_glacier: gain_ft (4000) contradicted loss_ft (4400) on an
-- out-and-back climb, where they must be equal. This row's own itinerary
-- (day1 gainFt 3500 + day2 gainFt 900 = 4400) matches loss_ft exactly --
-- gain_ft was the outlier.
UPDATE routes SET gain_ft = 4400 WHERE id = 'wa_silver_star_glacier';

-- wa_silver_star_glacier: waypoints[2] (Early Winters Creek crossing) elev
-- was 4450, 50 ft HIGHER than the trailhead waypoint (4400), contradicting
-- this row's own approach text ("drop down the embankment roughly 150-200
-- ft to Early Winters Creek" -- a descent). Corrected to reflect a ~200 ft
-- drop from the 4400 ft trailhead; independent trip reports describe the
-- same "drop down 200 feet to the river" from this pullout.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{2,elev}', '4200'::jsonb) WHERE id = 'wa_silver_star_glacier';

-- wa_silver_star_glacier: access._raw.seasonal_closures said "Year-round
-- access with winter vehicle pass requirement", contradicting this row's
-- own (corrected) access.seasonal field, which correctly states SR-20
-- (North Cascades Highway) closes gate-to-gate roughly early
-- December-mid/late April, making the whole corridor car-inaccessible in
-- winter -- a well-documented WSDOT fact.
UPDATE routes SET access = jsonb_set(access, '{_raw,seasonal_closures}', to_jsonb('Closed seasonally with SR-20 (North Cascades Highway) gate-to-gate closure, roughly early December through mid/late April; the corridor is not accessible by vehicle during that period.'::text)) WHERE id = 'wa_silver_star_glacier';

-- wa_silver_star_glacier: rappels was "1", reading as a required count,
-- but this row's own descent_text explicitly frames the rappel as
-- optional ("treat this as an optional, not mandatory, rappel with a
-- natural anchor... not bolts") and notes many parties downclimb the whole
-- way and skip it entirely.
UPDATE routes SET rappels = NULL WHERE id = 'wa_silver_star_glacier';

-- wa_silver_star_ne_ridge: access.fees/passRequired said "None currently
-- required", contradicting this row's own road.driveNote ("Same trailhead
-- pullout near milepost 166 as the Silver Star Glacier route") -- the
-- sibling glacier route correctly documents a Northwest Forest Pass
-- requirement to park at that same shared trailhead.
UPDATE routes SET access = jsonb_set(jsonb_set(access, '{fees}', to_jsonb('Northwest Forest Pass required to park at the trailhead ($5/day or $30/annual)'::text)), '{passRequired}', to_jsonb('Northwest Forest Pass ($5/day or $30/annual)'::text)) WHERE id = 'wa_silver_star_ne_ridge';
