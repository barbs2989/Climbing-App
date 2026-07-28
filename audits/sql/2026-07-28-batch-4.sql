-- WA alpine/mountaineering audit — batch 4 (pass 1)
-- Reviewed 2026-07-28. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a
-- human to review and run — not yet applied. Continues the same scope/ordering as batches 1-3
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').

-- Bonanza Peak routes (wa_bonanza_peak_mary_green_glacier, wa_bonanza_peak_northeast_buttress):
-- access.land_manager on both rows says "Chiwawa/Entiat Ranger Districts", contradicting the
-- same rows' own access.landManager/emergency.rangerStation fields ("Chelan Ranger District")
-- and USFS's own Okanogan-Wenatchee National Forest recreation pages, which list the trails this
-- route uses (Railroad Creek Trail #1240, Hart/Lyman Lake Trail #1256) under Chelan Ranger
-- District — there is no "Chiwawa" ranger district administering this area.
update routes set access = jsonb_set(
  access, '{land_manager}',
  '"Okanogan-Wenatchee National Forest (Chelan Ranger District) — Glacier Peak Wilderness"'::jsonb
) where id in ('wa_bonanza_peak_mary_green_glacier', 'wa_bonanza_peak_northeast_buttress');

-- Bonanza Peak Mary Green Glacier (wa_bonanza_peak_mary_green_glacier): FA climber's surname is
-- misspelled as "I. James" (two words) — it's one word, "Ijames". Confirmed via the Mazamas' own
-- 100-Year Index to the Mazama Annuals, which credits "Curtis Ijames" with authoring the 1937 FA
-- account, corroborated by independent secondary sources naming the same FA party.
update routes set fa = 'Curtis Ijames, Barrie James, and Joe Leuthold (Mazamas), 1937 — the peak''s first ascent; this easiest line is widely regarded as the original route'
  where id = 'wa_bonanza_peak_mary_green_glacier';

-- Bonanza Peak Mary Green Glacier (wa_bonanza_peak_mary_green_glacier): the summit waypoint's
-- own note says "about three rappels", contradicting this same row's rappels field ("4"),
-- descent field ("roughly four rappels"), 4-entry rappel_detail array, and rappel_count_note.
update routes set waypoints = jsonb_set(
  waypoints, '{6,note}',
  '"True summit reached after the moat and a short Class 3-4 finish; descent reverses the route with about four rappels off fixed stations."'::jsonb
) where id = 'wa_bonanza_peak_mary_green_glacier';

-- Bonanza Peak Mary Green Glacier (wa_bonanza_peak_mary_green_glacier): two waypoints have
-- geometrically impossible coordinates given this row's own distMi/approach text (the
-- "Railroad Creek Trail / Holden Lake Trail junction" is closer to Holden Village than its
-- stated distMi=1 allows, and "Holden Pass high camp" sits southeast of Holden Lake, contradicting
-- the route's own approach text, which describes traversing northwest to reach it). The sibling
-- route on the same peak (wa_bonanza_peak_northeast_buttress) has identically-named waypoints for
-- the same physical landmarks with coordinates that are geometrically consistent with this row's
-- own text — using those values here.
update routes set waypoints = jsonb_set(
  jsonb_set(waypoints, '{1,lat}', '48.2073719'::jsonb),
  '{1,lng}', '-120.788945525'::jsonb
) where id = 'wa_bonanza_peak_mary_green_glacier';

update routes set waypoints = jsonb_set(
  jsonb_set(waypoints, '{3,lat}', '48.2337274'::jsonb),
  '{3,lng}', '-120.84450373333334'::jsonb
) where id = 'wa_bonanza_peak_mary_green_glacier';

-- Bonanza Peak Northeast Buttress (wa_bonanza_peak_northeast_buttress): rock_grade stored as
-- plain "5.7", understating the route — contradicted by this row's own overview ("V, 5.7/5.8"),
-- detailed_rack, and a mid-buttress waypoint note ("pitches step up to 5.8"), and corroborated
-- externally by secondary sources summarizing the AAC Publications FA account as "V 5.7/5.8".
update routes set rock_grade = '5.7/5.8' where id = 'wa_bonanza_peak_northeast_buttress';

-- Boston Peak Southeast Face (wa_boston_peak_southeast_face): the stored `approach` field
-- describes the Cascade Pass Trail / Sahale Arm / Sahale Glacier Camp approach — which is Sahale
-- Peak's standard approach (Mountaineers.org), not this route's. Every other field on this same
-- row (beta, itinerary, gain_ft, waypoints) already describes the correct, direct Boston Basin
-- approach from Cascade River Road. Rewriting `approach` to match the row's own already-correct
-- fields rather than leaving two contradictory approaches on one row.
update routes set approach = 'From the Boston Basin Trailhead at the end of Cascade River Road (~3,200 ft, roughly mile 21.7), follow the unmaintained but well-established boot path through forest and slide alder, climbing steeply into Boston Basin (~3.2 mi, ~3,100 ft gain). Most parties camp at the basin''s high camp (~6,400 ft) to shorten summit day, though the low camp (~5,300 ft) is an option for slower groups. From high camp, an alpine start gets you roped up the Quien Sabe Glacier to the Sahale-Boston col (~8,200 ft), then across the head of the Boston Glacier past the bergschrund to the base of the southeast-side ledges. From there, ascend unroped via loose, sandy 3rd/4th-class ledges on the east/southeast face (to minimize rockfall exposure to parties below) to a crux move just below the summit ridge, then a short scramble to the top. Hazards: crevasse danger on the Quien Sabe/Boston Glacier crossing (worsens through the season as the bergschrund opens), loose rock on the face''s ledges and crux, and typical North Cascades afternoon rockfall/softening — an alpine start is standard.'
  where id = 'wa_boston_peak_southeast_face';

-- Boston Peak Southwest Face (wa_boston_peak_southwest_face): North Cascades National Park
-- charges no entrance fee at all and requires no pass for day use (NPS official fees page) — the
-- stored access.passRequired claiming a park-entrance pass is wrong, and contradicts the sibling
-- wa_boston_peak_southeast_face row's own (correct) access fields on the same area_id.
update routes set access = jsonb_set(
  access, '{passRequired}',
  '"None — North Cascades National Park charges no entrance fee for day use"'::jsonb
) where id = 'wa_boston_peak_southwest_face';

-- Boston Peak Southwest Face (wa_boston_peak_southwest_face): emergency.nearestHospital claims
-- Cascade Valley Hospital (Arlington) is "approximately 45 minutes from trailhead" — driving-
-- distance data puts Marblemount to either Arlington or Mount Vernon at roughly an hour by
-- itself, before the additional Cascade River Road drive from the actual trailhead, so 45 minutes
-- total isn't achievable. Aligning with the sibling SE Face row's own sourced value, which also
-- correctly identifies the closer, higher-level-of-care facility.
update routes set emergency = jsonb_set(
  emergency, '{nearestHospital}',
  '"Skagit Valley Hospital (Level III trauma center), 300 Hospital Pkwy, Mount Vernon — closer and more appropriate than Cascade Valley Hospital in Arlington, roughly 1.5-2 hrs from Marblemount via SR 20."'::jsonb
) where id = 'wa_boston_peak_southwest_face';

-- Prusik Peak Boving-Christensen (wa_boving_christensen): the first waypoint is named "Snow
-- Lakes Trailhead" but its stored coordinates (47.527315, -120.820942) match the real Stuart Lake
-- Trailhead, not Snow Lakes Trailhead (a different location ~3.3 mi south) — corroborated by this
-- same route's own approach/road text, which both describe starting from Stuart Lake Trailhead.
update routes set waypoints = jsonb_set(
  waypoints, '{0,name}', '"Stuart Lake Trailhead"'::jsonb
) where id = 'wa_boving_christensen';

-- Prusik Peak Boving-Christensen (wa_boving_christensen): that same waypoint's elevation (1300
-- ft) matches Snow Lakes Trailhead's real elevation, not Stuart Lake Trailhead's (~2,930 ft per
-- two independent sources for the same coordinates) — looks like the wrong trailhead's
-- name+elevation got copy-pasted onto the right coordinates.
update routes set waypoints = jsonb_set(
  waypoints, '{0,elev}', '2930'::jsonb
) where id = 'wa_boving_christensen';

-- Prusik Peak Boving-Christensen (wa_boving_christensen): the "Prusik Peak" summit waypoint's
-- elev (7916) contradicts this row's own high_point_ft (8008) and Wikipedia's confirmed Prusik
-- Peak elevation (8,008 ft).
update routes set waypoints = jsonb_set(
  waypoints, '{1,elev}', '8008'::jsonb
) where id = 'wa_boving_christensen';

-- Prusik Peak Boving-Christensen (wa_boving_christensen): itinerary.totalNote cites "~4,500 ft"
-- round-trip gain, but the itinerary's own day-by-day gainFt figures (4000+500+700) sum to 5,200
-- ft, matching this row's own top-level gain_ft/loss_ft fields exactly — a simple arithmetic
-- contradiction within the row.
update routes set itinerary = jsonb_set(
  itinerary, '{totalNote}',
  '"A 3-day trip (~19.5 mi, ~5,200 ft round-trip estimated) around a shorter, moderate 4-pitch 5.10 line on the south face — one of the quicker technical days on Prusik."'::jsonb
) where id = 'wa_boving_christensen';

-- South Early Winters Spire Boving Roofs (wa_boving_roofs): `face` says "West face", contradicting
-- this row's own `aspect` ("SW") — the route sits on/above the Southwest Rib, and a separately
-- named "West Face" route exists elsewhere on the same peak per Mountain Project, so this looks
-- like a conflation between the two features.
update routes set face = 'Southwest face, above the Southwest Rib' where id = 'wa_boving_roofs';

-- South Early Winters Spire Boving Roofs (wa_boving_roofs): rope_note says SEWS routes are
-- "commonly descended via multiple rappels down the SW Couloir", but this row's own
-- descent/descent_text/rappel_detail fields all specify the South Arete/Rabbit Ears descent
-- instead, corroborated by Mountain Project's route text for this specific line.
update routes set rope_note = '3-pitch trad line on South Early Winters Spire''s granite. Standard alpine rack to 3in, extra small cams for roof cracks. This route''s standard descent is via the South Arete (2-3 rappels past the Rabbit Ears), so many parties carry twin 60m ropes.'
  where id = 'wa_boving_roofs';

-- Buckner Mountain North Face (wa_buckner_mountain_north_face): commitment field says "III",
-- contradicting this row's own `grade` field ("Grade II, AI2-3") and Mountaineers.org's route
-- page, which independently states the North Face is "a Grade II ice or snow climb".
update routes set commitment = 'II' where id = 'wa_buckner_mountain_north_face';

-- Buckner Mountain Southwest Face (wa_buckner_mountain_southwest_face): dist_km stored as 9.4,
-- but this row's own itinerary.sourceNote explicitly cites the on-file distance as "32.19 km",
-- and the itinerary's day-by-day miles (5.5+7+5.5=18 mi ≈ 29 km) and totalNote ("~18-20 mi round
-- trip") corroborate a much larger figure — 9.4 km doesn't even match a one-way reading against
-- this row's own final waypoint (distMi 9.2, i.e. ~14.8 km one-way).
update routes set dist_km = 32.19 where id = 'wa_buckner_mountain_southwest_face';

-- Buckner Mountain Southwest Face (wa_buckner_mountain_southwest_face): gain_ft/loss_ft stored
-- as 3000/3000, but this row's own itinerary.sourceNote and itinerary.totalNote both explicitly
-- cite "7,400 ft" as the on-file total gain, and the itinerary's own day-by-day gainFt/lossFt sum
-- to 7,000/7,000 — using the two explicit textual citations already present in this row.
update routes set gain_ft = 7400, loss_ft = 7400 where id = 'wa_buckner_mountain_southwest_face';

-- Buckner Mountain Southwest Face (wa_buckner_mountain_southwest_face): obj_haz lists "Crevasses
-- in approach glaciers", directly contradicting this same row's seasonal_hazards.crevasses field
-- ("N/A — no glacier travel; the route crosses a permanent snowfield/shoulder but does not
-- involve glacier crevasse hazard"), which data_quality marks as the more recently researched
-- ("2026 research pass") assessment.
update routes set obj_haz = obj_haz - 'Crevasses in approach glaciers'
  where id = 'wa_buckner_mountain_southwest_face';

-- Burgundy Spire North Face (wa_burgundy_spire_north_face): pitches stored as 6, but this row's
-- own pitch_detail array enumerates 7 pitches (and watch_out references "P7") — external sources
-- (stephabegg.com, trip reports) also describe 7-8 pitches, never 6.
update routes set pitches = 7 where id = 'wa_burgundy_spire_north_face';

-- Burgundy Spire North Face (wa_burgundy_spire_north_face): length_m stored as 183, but this
-- row's own pitch_detail lengths sum to 244m, matching two independent trip-report sources that
-- title the route "North Face (5.8+, 800')" (800 ft = ~244m).
update routes set length_m = 244 where id = 'wa_burgundy_spire_north_face';

-- Burgundy Spire North Face (wa_burgundy_spire_north_face): access.passRequired and
-- access._raw.parking_pass_required both say "Northwest Forest Pass", but this same row's own
-- access.parking_pass narrative names only Washington Pass Overlook/Blue Lake/Cutthroat Lake as
-- requiring the pass — not the SR-20 climbers' pullout this route actually uses (per SummitPost
-- and general trip-report consensus for the Wine Spires cluster).
update routes set access = jsonb_set(
  jsonb_set(access, '{passRequired}', '"None — this SR-20 climbers'' pullout near Burgundy Col does not require a Northwest Forest Pass (unlike the developed Washington Pass Overlook, Blue Lake, and Cutthroat Lake trailheads)"'::jsonb),
  '{_raw,parking_pass_required}', '"None — no pass required at this SR-20 pullout"'::jsonb
) where id = 'wa_burgundy_spire_north_face';

-- Burgundy Spire North Face (wa_burgundy_spire_north_face): high_point_ft (8483) contradicts
-- this row's own summit waypoint (8400) and itinerary schedule text; multiple climbing-literature
-- sources (SummitPost, LemkeClimbs, Mountaineers/CMA) independently give 8,400 ft (2,560m) for
-- Burgundy Spire's summit. (Peak-database sources — listsofjohn/peakbagger — cite a third figure,
-- 8,492 ft; flagged separately below for a human to pick a convention.)
update routes set high_point_ft = 8400 where id = 'wa_burgundy_spire_north_face';

update routes set itinerary = jsonb_set(
  itinerary, '{days,0,schedule,4,label}', '"Summit (8,400 ft)"'::jsonb
) where id = 'wa_burgundy_spire_north_face';

-- Burgundy Spire North Face (wa_burgundy_spire_north_face): the `corrections` field's item (1)
-- claims what_to_bring says "rack to 3 inches" — but what_to_bring already reads "cam rack to 4
-- inches" in this row, matching detailed_rack. The described inconsistency doesn't exist; this
-- looks like stale audit metadata never cleared after a prior fix. Removing that item and
-- renumbering the remaining (still-accurate) notes.
update routes set corrections = 'Existing data is largely accurate and well-supported. (1) The ''5-rappel descent requiring doubles'' claim is confirmed by 3 independent sources (thepeakoftheweek.com with specific rap-length breakdown, StephAbegg.com TR, and MP/LemkeClimbs beta) — verified, high confidence. (2) The ''~10 alpine draws'' figure traces to a single original source (an MP route comment, echoed verbatim by LemkeClimbs'' aggregation) rather than fully independent corroboration — treat as verified-but-single-origin. (3) No source specifies sling sizes/counts separately from alpine draws or mentions any need for an ascender/jumar; sling_rack figures are inferred from standard alpine-tower rack practice, not directly sourced. (Note: what_to_bring already correctly reads ''cam rack to 4 inches'', matching detailed_rack — an earlier version of this note describing a 3-inch/4-inch mismatch was stale and has been removed.)'
  where id = 'wa_burgundy_spire_north_face';

-- Cascade Peak East Ridge (wa_cascade_peak_east_ridge): summit waypoint elevFt (7415)
-- contradicts this row's own high_point_ft (7428), approach text, and pitch_detail notes (all
-- 7,428 ft), and external sources (Wikipedia: 2,264m = 7,428 ft; PeakVisor).
update routes set waypoints = jsonb_set(
  waypoints, '{1,elevFt}', '7428'::jsonb
) where id = 'wa_cascade_peak_east_ridge';

-- Cascade Peak East Ridge (wa_cascade_peak_east_ridge): trailhead waypoint elevFt (3200)
-- contradicts this row's own approach text, which puts the Cascade Pass Trailhead at "~3,600
-- ft" — external sources agree the trailhead sits around 3,600 ft.
update routes set waypoints = jsonb_set(
  waypoints, '{0,elevFt}', '3600'::jsonb
) where id = 'wa_cascade_peak_east_ridge';

-- Cascade Peak East Ridge (wa_cascade_peak_east_ridge): top-level `grade` ("Grade III, Class 4")
-- contradicts this row's own rock_grade ("5.8") and pitch_detail (a documented 5.8 crux pitch) —
-- a route with a 5.8 crux isn't accurately summarized as Class 4. (The much larger question of
-- whether this route row actually documents Cascade Peak or a conflated Johannesburg Mountain
-- line is NOT resolved by this fix — see flagged items below.)
update routes set grade = 'Grade III, 5.8' where id = 'wa_cascade_peak_east_ridge';

-- =========================================================================
-- NOT fixed here (flagged for human review only — see audit log for detail):
--  - Cascade Peak East Ridge (wa_cascade_peak_east_ridge) — MOST SIGNIFICANT OPEN ISSUE THIS
--    BATCH. The row's own `overview` field states it was rewritten to describe Cascade Peak's
--    real route (the NW Chimney) after discovering the previously-stored content actually
--    described Johannesburg Mountain's East Ridge — but `aspect` ("E"), `face` ("gained via the
--    C-J Col"), and the ridge-walk portion of `approach` were never updated to match, and the
--    stale `corrections` blob and a `seasonal_guidance` block (which contradicts `season`/
--    `best_season` on the same row) both still reflect the old, wrong route too. This is a
--    half-corrected row that needs a human decision — full rewrite of aspect/face/approach/
--    corrections/seasonal_guidance, or splitting into two rows (Johannesburg's real East Ridge +
--    Cascade Peak's NW Chimney) — not a simple field patch. Also unresolved: alpine_grade/
--    commitment are self-flagged unverified; Cascade River Road closure status as of mid-2026
--    couldn't be confirmed (nps.gov blocked); waypoint distMi values look inconsistent with the
--    stated round-trip mileage.
--  - Boston Peak Southwest Face (wa_boston_peak_southwest_face) — SECOND MOST SIGNIFICANT: the
--    row is named/aspected as a "Southwest Face" (aspect SE, face "East/Southeast... via Quien
--    Sabe Glacier") but its beta is a near-duplicate of the sibling SE Face route's beta, while
--    its own `fa`/`corrections` fields correctly describe the real West Face route (Anderson &
--    Shonle, 1956; first winter ascent Gilbertson & Roy, Feb 2024) — aspect W, not SE/SW. The row
--    is internally incoherent about which route it documents. Needs a human to either rewrite it
--    to actually describe the West Face (correct aspect/approach/pitch count from the 2024 winter
--    account) or retire it as a mislabeled duplicate of the SE Face entry — too large a rewrite
--    for a single SQL fix. Also unresolved: `gain_ft` (2,100) appears to only cover trailhead-to-
--    camp, not the full route, unlike the sibling's full-route figure; sheriff dispatch number
--    couldn't be confirmed against conflicting sources.
--  - Boston Peak Southeast Face (wa_boston_peak_southeast_face): the `descent_text` claim that
--    "Boston has a real fatality history" couldn't be corroborated — only a nearby, distinct 2005
--    Sharkfin Tower incident in the same basin turned up. A minor (100 ft) Sahale-Boston col
--    elevation discrepancy (8,300 ft in `approach` vs 8,200 ft in `waypoints`) and a minor
--    elevation-source conflict (one AAC source says 8,883 ft vs. the widely-used 8,894 ft used
--    elsewhere) are both too small/ambiguous to auto-fix.
--  - Bonanza Peak Mary Green Glacier (wa_bonanza_peak_mary_green_glacier): the "Moat crossing,
--    glacier's upper corner" waypoint is already self-flagged in data_quality.gaps as corrupted;
--    confirmed geometrically impossible (only ~1 mi from the trailhead despite being 6.5 mi into
--    the route), but no authoritative replacement coordinate exists — needs fresh survey/GPS
--    data, not a guess.
--  - Bonanza Peak Northeast Buttress (wa_bonanza_peak_northeast_buttress): `disciplines` includes
--    "ice" (ice_grade AI2) despite no technical ice climbing described anywhere in the route
--    content (only standard glacier-crossing gear) — possible misclassification, same pattern as
--    prior batches' "Alpine Lookout"/"Blood Sport" flags; left as a human categorization call.
--  - Prusik Peak Boving-Christensen (wa_boving_christensen): pitch_detail lengths sum to 175m vs.
--    the row's own length_m (137m/450ft, well-sourced) — confirmed contradiction, but which
--    individual pitch(es) are wrong couldn't be determined (MP/SummitPost/stephabegg pitch pages
--    blocked from fetch). Also: a 30%-vs-25% daily-lottery-walk-up conflict between two fields on
--    the same row, a 12-vs-8 group-size figure that may describe two different legitimate scopes
--    (wilderness-wide vs. Enchantment Permit Area) rather than a real contradiction, and a 1-day
--    lottery-season-start discrepancy against one secondary 2026 source — none confirmed enough
--    to fix.
--  - South Early Winters Spire Boving Roofs (wa_boving_roofs): `itinerary`/`timing` fields
--    describe the party rappelling the route after 3 pitches (gainFt/lossFt both 1800, net-zero),
--    directly contradicting this row's own `descent`/`descent_text`/`rappel_detail` (continue to
--    the true summit via the remaining Southwest Rib pitches, descend via South Arete) — the
--    `rope_note` half of this contradiction is fixed above, but the itinerary/timing narrative
--    itself (schedule entries, gainFt/lossFt, totalHrs, miles) needs a full rewrite with
--    corrected numbers a human should research rather than have guessed here. Also unresolved:
--    FA (Boving & Pollock) year undocumented in any source found; Blue Lake TH elevation (5,200
--    vs 5,400 ft across sources); pitch 1 length (10m stored vs. Mountain Project's ~12m/40ft,
--    MP being secondary-only per this audit's rules).
--  - Buckner Mountain North Face (wa_buckner_mountain_north_face): `approach`/itinerary narrative
--    describes a Cascade Pass/Sahale Arm approach to the Boston-Sahale col, while `waypoints`/
--    `gpx` trace a Boston Basin/Quien Sabe Glacier/Sharkfin Col approach instead — both are real,
--    independently documented ways to reach this route, but the row mixes narrative from one with
--    geodata from the other. Needs a human to pick one and align both halves of the row.
--  - Buckner Mountain Southwest Face (wa_buckner_mountain_southwest_face): the specific "11th on
--    the Bulger list" ranking claim and an "August 2025 washout" access claim couldn't be
--    independently confirmed (found only a September 2025 bridge-maintenance closure instead).
--  - Burgundy Spire North Face (wa_burgundy_spire_north_face): elevation sourcing splits between
--    climbing literature (8,400 ft, used in the fix above) and peak databases/LIDAR surveys
--    (8,492 ft per listsofjohn/peakbagger) — a human should pick the convention. A waypoint note
--    also contains leftover analyst commentary referencing an unrelated "Early Winters Creek
--    Trailhead" data error that doesn't correspond to anything else in this row — needs a human
--    to trace and either relocate or remove it. `access.closures`="N/A" alongside populated
--    seasonal-closure fields elsewhere in the same object may be an intentional semantic split,
--    not an error; and a "no camping within 1/4 mile of Cutthroat Lake" rule reads like generic
--    regional boilerplate rather than curated content for this route's actual camps.
-- =========================================================================

-- Verify afterward:
select id, access from routes where id in ('wa_bonanza_peak_mary_green_glacier', 'wa_bonanza_peak_northeast_buttress');
select id, fa, waypoints from routes where id = 'wa_bonanza_peak_mary_green_glacier';
select id, rock_grade from routes where id = 'wa_bonanza_peak_northeast_buttress';
select id, approach from routes where id = 'wa_boston_peak_southeast_face';
select id, access, emergency from routes where id = 'wa_boston_peak_southwest_face';
select id, waypoints, itinerary from routes where id = 'wa_boving_christensen';
select id, face, rope_note from routes where id = 'wa_boving_roofs';
select id, commitment from routes where id = 'wa_buckner_mountain_north_face';
select id, dist_km, gain_ft, loss_ft, obj_haz from routes where id = 'wa_buckner_mountain_southwest_face';
select id, pitches, length_m, access, high_point_ft, itinerary, corrections from routes where id = 'wa_burgundy_spire_north_face';
select id, waypoints, grade from routes where id = 'wa_cascade_peak_east_ridge';
