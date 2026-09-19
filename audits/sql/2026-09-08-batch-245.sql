-- WA alpine audit batch 245 (pass 5)
-- Routes: wa_bonanza_peak_north_ridge, wa_bonanza_peak_northeast_buttress,
-- wa_booker_mountain_northeast_face, wa_boston_peak_southeast_face,
-- wa_boving_christensen, wa_boving_roofs, wa_buckner_mountain_north_face,
-- wa_buckner_mountain_southwest_face

-- wa_bonanza_peak_north_ridge ("North Ridge" / Mary Green Glacier route): `beta` describes
-- "From the Middle Fork Snoqualmie trailhead, approach via the alpine meadows to the north
-- ridge base" -- the Middle Fork Snoqualmie is a completely different range/drainage near
-- North Bend, roughly 100+ miles from Bonanza Peak, and is never mentioned anywhere else on
-- this row. Every other field (`approach`, `waypoints`, `bivy`, `access`, `road`,
-- `approach_logistics`, `corrections`) consistently and in detail describes the real approach:
-- Holden Village (reached by Lake Chelan ferry + shuttle bus) -> Railroad Creek Trail ->
-- Holden Lake/Holden Pass high camp -> Mary Green Glacier -> upper NE ridge notch -> summit.
-- `what_to_bring` even notes "heavy mosquitoes/black flies near Holden Lake," confirming the
-- Holden approach. Rewrote `beta` to correctly describe this route using only facts already
-- present elsewhere on this same row (approach text + pitch_detail's glacier/upper-rock-band/
-- summit-ridge breakdown) -- a re-home, not new research.
UPDATE routes
SET beta = 'From Ballpark Campground at Holden Village (~3,300 ft), take Railroad Creek Trail (#1240) to its junction with Holden Lake Trail (#1251), then continue to Holden Lake or Holden Pass high camp. From high camp, follow a climbers'' path to the base of the Mary Green Glacier and ascend along its north edge, roped, watching for crevasses/bergschrund. Route-find between two loose class 3-4 gully/rib systems to a notch on the upper northeast ridge, then a short exposed class 3-4 ridge scramble to the true summit. Descend the same route.'
WHERE id = 'wa_bonanza_peak_north_ridge'
  AND beta = 'From the Middle Fork Snoqualmie trailhead, approach via the alpine meadows to the north ridge base. Follow the ridge crest, staying on solid rock and stable talus. Most routefinding is straightforward and well-marked by cairns. Descend the same route.';


-- wa_bonanza_peak_northeast_buttress and wa_booker_mountain_northeast_face: checked, clean.
-- Bonanza NE Buttress's waypoints/gpx/timing/itinerary are all internally consistent and the FA
-- is properly qualified (corrections field explains why it is credited as "first documented
-- ascent to the main summit via this line" rather than an unqualified FA). Booker Mountain's FA
-- (Dan Davis and John Holland, August 22, 1964) was independently confirmed via AAC Publications
-- (matches this row's fa field, approach narrative and pitch sequence exactly). No changes.


-- wa_boston_peak_southeast_face: `waypoints` (and the matching `gpx` track) contain a
-- "Cascade Pass" waypoint at 5,392 ft / 48.4683,-121.06, distMi 4.2 -- the EXACT same
-- coordinate/elevation as the "Cascade Pass" waypoint on the neighboring Buckner Mountain
-- Southwest Face and North Face routes, which approach via the Cascade Pass Trailhead. Boston
-- Peak's Southeast Face never goes anywhere near Cascade Pass: its own `approach`,
-- `approach_variants`, `itinerary`, and every other waypoint describe the Boston Basin
-- Trailhead -> Boston Basin -> Sahale-Boston col -> summit line exclusively, and the spurious
-- point shares the SAME distMi (4.2) as the adjacent Sahale-Boston col waypoint, which is
-- itself the tell of a copy-paste collision from a sibling row's waypoint set. Its presence
-- also makes the `gpx` track geographically incoherent (descending ~2,800 ft from the
-- Sahale-Boston col to Cascade Pass, then jumping to a different trailhead entirely, before
-- climbing back to the summit). Removed the contaminated waypoint and its corresponding gpx
-- point; the remaining 4 waypoints (Trailhead/Boston Basin/Sahale-Boston col/Summit) and 4 gpx
-- points are exactly this route's own documented line and are otherwise unchanged.
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(waypoints) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'name' <> 'Cascade Pass'
)
WHERE id = 'wa_boston_peak_southeast_face'
  AND waypoints @> '[{"name": "Cascade Pass", "elev": 5392}]'::jsonb;

UPDATE routes
SET gpx = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(gpx) WITH ORDINALITY AS t(elem, ord)
  WHERE elem <> '[48.4683, -121.06]'::jsonb
)
WHERE id = 'wa_boston_peak_southeast_face'
  AND gpx @> '[[48.4683, -121.06]]'::jsonb;


-- wa_boving_christensen (Prusik Peak, "Boving-Christensen"): `fa` reads "Paul Boving and Matt
-- Christensen (year not given by available sources)" while this row's own `overview` states,
-- specifically, "put up by Paul Boving and Matt Christensen in 1977 using nuts and hexes" --
-- a direct internal contradiction about whether a year is known at all. Independent WebSearch
-- (Mountain Project, SummitPost, StephAbegg.com, CascadeClimbers.com, AAC Publications) could
-- not independently confirm or refute 1977, but the overview's specificity (the exact gear
-- used) indicates it was drawn from a real source rather than invented, so `fa` was corrected
-- to match the row's own more detailed field rather than left contradicting it. Flagged in the
-- log as internally-corroborated only, not externally confirmed.
UPDATE routes
SET fa = 'Paul Boving and Matt Christensen, 1977'
WHERE id = 'wa_boving_christensen'
  AND fa = 'Paul Boving and Matt Christensen (year not given by available sources).';

-- Same route: `timing.sectionBreakdown`'s three entries have their `section` labels shifted
-- by one relative to their own `fromTo`/`note` text and the parallel (and correctly labelled)
-- `itinerary.days` array. Entry 0 (fromTo "Approach to Gnome Tarn camp") is labelled section
-- "Climb"; entry 1 (fromTo "Climb Boving-Christensen") is labelled section "Descent"; entry 2
-- (fromTo "Hike out") is correctly labelled "Descent". Corrected the first two labels to match
-- what they actually describe.
UPDATE routes
SET timing = jsonb_set(timing, '{sectionBreakdown,0,section}', '"Approach"'::jsonb)
WHERE id = 'wa_boving_christensen'
  AND timing->'sectionBreakdown'->0->>'fromTo' = 'Approach to Gnome Tarn camp'
  AND timing->'sectionBreakdown'->0->>'section' = 'Climb';

UPDATE routes
SET timing = jsonb_set(timing, '{sectionBreakdown,1,section}', '"Climb"'::jsonb)
WHERE id = 'wa_boving_christensen'
  AND timing->'sectionBreakdown'->1->>'fromTo' = 'Climb Boving-Christensen'
  AND timing->'sectionBreakdown'->1->>'section' = 'Descent';


-- wa_boving_roofs (South Early Winters Spire, "Boving Roofs"): `timing.sectionBreakdown[0].note`
-- and `itinerary.days[0].note` both assert "Most parties rappel the route back to the base
-- rather than continuing to the summit" -- directly contradicting THREE other fields on this
-- same row: `descent_text` ("Most parties continue up the remaining Southwest Rib pitches to
-- the true summit ... rather than reversing it (rappelling back through an overhanging roof
-- feature is awkward and not the documented practice)"), `approach_variants[0].baseFinding`
-- ("parties do not reverse this pitch ... Most continue up the remaining Southwest Rib pitches
-- to the true summit"), and the structured `rappel_detail` array, whose three rappels are
-- explicitly described as reached "after continuing up to the true summit and downclimbing to
-- the Rabbit Ears" (the South Arete descent). Corrected both contradicting fields to match the
-- corroborated majority account.
UPDATE routes
SET timing = jsonb_set(
    timing, '{sectionBreakdown,0,note}',
    '"Climbs the first three pitches of the Southwest Rib, then breaks left through the classic double roofs (~100 ft of powerful 5.10b jamming). Most parties continue to the true summit rather than reversing the roof pitch, then descend via the standard South Arete rappels."'
  )
WHERE id = 'wa_boving_roofs'
  AND timing->'sectionBreakdown'->0->>'note' = 'Climbs the first three pitches of the Southwest Rib, then breaks left through the classic double roofs (~100 ft of powerful 5.10b jamming). Most parties rappel the route back to th…';

UPDATE routes
SET itinerary = jsonb_set(
    itinerary, '{days,0,note}',
    '"Climbs the first three pitches of the Southwest Rib, then breaks left through the classic double roofs (~100 ft of powerful 5.10b jamming). Most parties continue up the remaining Southwest Rib pitches to the true summit rather than reversing the roof pitch, then descend via the standard South Arete rappels, making it a shorter day than the full Rib summit push alone."'
  )
WHERE id = 'wa_boving_roofs'
  AND itinerary->'days'->0->>'note' = 'Climbs the first three pitches of the Southwest Rib, then breaks left through the classic double roofs (~100 ft of powerful 5.10b jamming). Most parties rappel the route back to the base rather than continuing to the summit, making it a shorter day than the full Rib.';


-- wa_buckner_mountain_north_face: `season` reads "Jul-Sep" while FOUR other fields on this same
-- row all describe an earlier, non-overlapping window: `best_season` ("Late May through early
-- July"), `seasonal_guidance.optimalWindow` ("Late May through early July, per existing
-- best_season, with June generally offering the best balance of ice quality and access"),
-- `overview` ("comes into the best shape in late spring and early summer"), and `pro_tips`
-- ("Climb in late spring for the most reliable neve"). `watch_out` also lists "thin late-season
-- ice," consistent with a spring/early-summer window rather than a Jul-Sep one. Corrected
-- `season` to match the corroborated best_season window.
UPDATE routes SET season = 'May-Jul'
WHERE id = 'wa_buckner_mountain_north_face' AND season = 'Jul-Sep';

-- Same route: NOT fixed, flagged for human review below. `approach_logistics.trailhead`
-- ("Cascade Pass Trailhead") and the first three `waypoints` (Cascade Pass Trailhead 3,600 ft
-- / Cascade Pass 5,392 ft / Sahale Glacier Camp 7,600 ft) are coordinate-for-coordinate
-- identical to the sibling wa_buckner_mountain_southwest_face route's own trailhead/waypoints,
-- which genuinely does approach via Cascade Pass. But this North Face route's own `approach`
-- field, `approach_variants[0]` (titled "Boston Basin, Sharkfin Col rappel, and south across
-- the Boston Glacier..."), `itinerary.days[0]`, and `timing.sectionBreakdown[0]` all instead
-- describe the BOSTON BASIN trailhead as the route's real, standard approach (via the Quien
-- Sabe Glacier and a Sharkfin Col rappel/downclimb) -- and independently, a WebSearch this
-- session (Mountain Madness, The Mountaineers, jeffreyjhebert.com trip report) confirms the
-- documented standard approach to Buckner's North Face is indeed via Boston Basin, camping at
-- either the Boston-Sahale col or high on the Quien Sabe Glacier below Sharkfin Col -- not via
-- Cascade Pass/Sahale Arm. So approach_logistics/the first 3 waypoints on this row appear to be
-- copied from the Southwest Face sibling rather than reflecting this route's own documented
-- approach. The row's own text (waypoint[0]'s directions) even inconsistently calls Boston
-- Basin "this route's alternate approach," while approach_variants[0]'s own closing sentence
-- calls the Sahale/Cascade-Pass line "a second way in" -- i.e. the row contradicts itself about
-- which approach is primary. Fixing this properly means replacing approach_logistics and the
-- first 3 waypoints with real Boston Basin Trailhead / Quien Sabe Glacier / Sharkfin Col
-- coordinates, which this session does not have from an authoritative source -- a researcher
-- rewrite, not a mechanical field patch. Left unfixed; the map pin and "Directions to trailhead"
-- currently point a climber to Cascade Pass while the written approach describes starting from
-- Boston Basin, a real (if minor) navigation defect.


-- wa_buckner_mountain_southwest_face: checked, clean. Waypoints proceed in a monotonic,
-- geographically coherent sequence (Cascade Pass Trailhead -> Cascade Pass -> Sahale Glacier
-- Camp -> Sahale-Buckner notch -> Horseshoe Basin traverse -> cowskull snowfield -> summit)
-- with distMi increasing throughout; high_point_ft (9,114 ft) matches the summit waypoint;
-- gain_ft/loss_ft (7,400/7,400) are self-consistent for a round trip; timing.sectionBreakdown
-- section labels (Approach/Climb/Descent) correctly match their own fromTo text (unlike the
-- Boving-Christensen defect above); FA is properly hedged ("historically presumed... though the
-- exact line Ryan climbed is not explicitly documented"). No changes.
