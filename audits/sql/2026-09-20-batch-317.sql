-- WA alpine audit batch 317 (pass 6)
-- Routes: wa_crooked_thumb_peak_south_route, wa_cutthroat_peak_cauthorn_wilson_couloir,
--         wa_cutthroat_peak_northeast_face, wa_cutthroat_peak_southeast_buttress,
--         wa_cutthroat_south_buttress, wa_cutthroat_west_ridge,
--         wa_dark_peak_dark_glacier_route, wa_dark_side_of_liberty
--
-- OPERATIONAL NOTE, restated with fresh evidence (see log entry for detail):
-- this run independently re-confirmed the concern batches 248/249/250 raised on
-- 2026-09-09 -- audit SQL is not reliably being applied to the live DB. Checked
-- directly against the live table before writing this file: NONE of batch 315's
-- or batch 316's fixes (both dated 2026-09-20, 1-2 batches before this one) are
-- live yet, and batch 250's re-issue of batch 60's Cutthroat/Crooked Thumb/Dark
-- Peak fixes (2026-09-09) is STILL unapplied 11 days later. By contrast, batch
-- 1's fixes from pass 1 (2026-07-27) ARE live, so the backlog does eventually
-- clear -- just with a very long and unpredictable lag. Several statements below
-- (marked RE-ISSUE) are therefore a third attempt at facts first found correct
-- in pass 1/2 and re-verified live immediately before writing, not new research.
--
-- Headline NEW finding this batch: all five Cutthroat Peak routes audited here
-- shared one byte-identical, wrong `beta` string -- a generic "Grade II, 5.7,
-- quick uncrowded roadside scramble" placeholder that contradicts every one of
-- their own overview/grade/pitch_detail fields (ranging from a WI4 ice couloir
-- to a III 5.10 six-pitch face route to the peak's 12-pitch classic). This exact
-- defect was already NOTICED and FLAGGED (not fixed) by pass 5's batch 250 on
-- 2026-09-09 ("still needs authored per-route replacement text rather than a
-- find-replace") -- this batch writes that authored text. Rewrote all five from
-- each row's own already-populated fields.

-- =========================================================================
-- Cutthroat Peak, Cauthorn-Wilson Couloir -- wa_cutthroat_peak_cauthorn_wilson_couloir
-- =========================================================================
-- This row's `beta` was byte-identical to the generic placeholder text found
-- verbatim on all five Cutthroat Peak routes in this batch (Cauthorn-Wilson,
-- East Face, Southeast Buttress, South Buttress, West Ridge): "Grade II, 5.7
-- climbing... Quick alpine climb from Rainy Pass. Uncrowded route." That
-- description flatly contradicts this row's own overview/grade/pitch_detail
-- (a Grade III+ WI4 ice couloir, not a II/5.7 rock scramble). Rewrote beta
-- from this row's own overview, pitch_detail, and descent_text -- no new
-- facts introduced. Also fixed `commitment`, which held "13 hrs" (a duration,
-- not a commitment grade -- the app's own commit filter vocabulary is roman
-- numerals I-VI, and `commitment` is rendered as a grade chip on route rows)
-- instead of the roman-numeral commitment grade already sitting in this row's
-- own `grade` field ("III+"). Confirmed via WebSearch (climberkyle.com's
-- Cascade alpine-ice survey) that Cauthorn-Wilson is commonly cited as "Grade
-- III to IV" -- consistent with the row's own III+.
UPDATE routes SET beta = 'Grade III+, sustained WI4 ice couloir on Cutthroat''s East Face, first climbed by Dan Cauthorn and Tim Wilson. About 400 ft of snow/neve leads to a WI3-3+ pitch, then a sustained WI4 crux pitch easing to WI3+, then three to four more pitches of snow, ice, or mixed terrain to the summit ridge. A narrow spring window (Apr-May) before the face melts out. Real avalanche and wet-slide hazard once the sun-exposed face warms up. Most parties rappel the line.'
  WHERE id = 'wa_cutthroat_peak_cauthorn_wilson_couloir'
    AND beta = 'Grade II, 5.7 climbing. Short approach from highway. Rock improves significantly higher on ridge. Fair granite in approach, improves on ridge. Moderate exposure. Quick alpine climb from Rainy Pass. Uncrowded route.';
UPDATE routes SET commitment = 'III+'
  WHERE id = 'wa_cutthroat_peak_cauthorn_wilson_couloir'
    AND commitment = '13 hrs';

-- =========================================================================
-- Cutthroat Peak, East Face -- wa_cutthroat_peak_northeast_face
-- =========================================================================
-- Same contaminated placeholder `beta` as the other four Cutthroat Peak
-- routes in this batch (see Cauthorn-Wilson above) -- "Grade II, 5.7... Quick
-- alpine climb from Rainy Pass. Uncrowded route" describing an easy scramble,
-- on a row whose own overview/pitch_detail/corrections all independently
-- agree this is a III 5.10, 6-pitch technical face route. Rewrote from this
-- row's own overview/pitch_detail/corrections fields. Also RE-ISSUING a
-- rock_grade fix batch 250 already found and left unapplied: `rock_grade`
-- said "5.7" while this row's own `pitch_detail` ("Two pitches of 5.10 near
-- the center of the face are the technical crux"), `overview` ("two 5.10
-- pitches"), and `corrections` field (which already documents "grade (III
-- 5.10, 6 pitches)" as the confirmed value from a prior pass) all say 5.10 --
-- independently re-confirmed this run via WebSearch (AAC Publications and
-- Mountain Project both give "East Face... III, 5.10" for the Dale Bard/Yvon
-- Chouinard/John Cunningham 1976 route). And `commitment` held "12.5 hrs"
-- instead of the roman-numeral grade ("III") that is both externally
-- confirmed and already sitting in this row's own `grade` field.
UPDATE routes SET beta = 'Grade III, 5.10, one of Cutthroat''s earliest technical face routes, first climbed by Dale Bard, Yvon Chouinard, and John Cunningham in 1976. Six pitches up the center of the East Face, with two sustained 5.10 pitches as the crux. Tops out on a false summit — further scrambling and downclimbing is needed to reach the true summit. Loose rock in sections, and lighter traffic than the South Buttress.'
  WHERE id = 'wa_cutthroat_peak_northeast_face'
    AND beta = 'Grade II, 5.7 climbing. Short approach from highway. Rock improves significantly higher on ridge. Fair granite in approach, improves on ridge. Moderate exposure. Quick alpine climb from Rainy Pass. Uncrowded route.';
UPDATE routes SET commitment = 'III'
  WHERE id = 'wa_cutthroat_peak_northeast_face'
    AND commitment = '12.5 hrs';
UPDATE routes SET rock_grade = '5.10'
  WHERE id = 'wa_cutthroat_peak_northeast_face'
    AND rock_grade = '5.7';

-- =========================================================================
-- Cutthroat Peak, Southeast Buttress -- wa_cutthroat_peak_southeast_buttress
-- =========================================================================
-- Same contaminated placeholder `beta` as the other four Cutthroat Peak
-- routes in this batch -- describes a II/5.7 quick roadside scramble,
-- contradicting this row's own overview ("A long, moderate alpine rock
-- route... notable for its overall length and remote basin approach rather
-- than technical difficulty") and grade ("III"). Rewrote from this row's own
-- overview and approach fields (twin gullies to a notch below the buttress,
-- per this row's own approach text) -- no facts beyond what the row already
-- states. Also fixed `commitment`, which held "12 hrs" instead of matching
-- this row's own `grade` field ("III"); confirmed via WebSearch that
-- Southeast Buttress is commonly graded Grade III. And RE-ISSUING a
-- rock_grade fix batch 250 already found and left unapplied (5.6 -> 5.8):
-- batch 250 cites Mountaineers.org's dedicated "Cutthroat Peak/Southeast
-- Buttress" route page ("Grade III, 5.8 rock climb"); this run's own
-- independent WebSearch landed on the identical figure from the identical
-- page before either session's finding was compared -- two independent passes
-- converging on 5.8 is strong enough to act on, where this run had initially
-- been cautious about cross-contamination with the separately-named South
-- Buttress route (III+, 5.8).
UPDATE routes SET beta = 'Grade III, a long moderate alpine rock route on Cutthroat''s southeast side, where overall length and the remote basin approach are the real challenge rather than technical difficulty. From the basin south of the peak, twin gullies lead to a notch at the base of the buttress — start up the right-hand gully and traverse into the left before the notch. Faded trail markings and lighter traffic than the South Buttress, with a late, headlamp-assisted return common.'
  WHERE id = 'wa_cutthroat_peak_southeast_buttress'
    AND beta = 'Grade II, 5.7 climbing. Short approach from highway. Rock improves significantly higher on ridge. Fair granite in approach, improves on ridge. Moderate exposure. Quick alpine climb from Rainy Pass. Uncrowded route.';
UPDATE routes SET commitment = 'III'
  WHERE id = 'wa_cutthroat_peak_southeast_buttress'
    AND commitment = '12 hrs';
UPDATE routes SET rock_grade = '5.8'
  WHERE id = 'wa_cutthroat_peak_southeast_buttress'
    AND rock_grade = '5.6';

-- =========================================================================
-- Cutthroat Peak, South Buttress -- wa_cutthroat_south_buttress
-- =========================================================================
-- Same contaminated placeholder `beta` as the other four Cutthroat Peak
-- routes in this batch -- a II/5.7 "quick alpine climb... uncrowded route"
-- description sits on the row for Cutthroat's longest, most popular line,
-- whose own overview describes a "classic long moderate alpine route...
-- 12-pitch line (16 by a finer pitch breakdown)... memorable chockstone
-- crawl, a stembox crux, and a splitter offwidth". Rewrote from this row's
-- own overview and fa fields -- no new facts introduced. `commitment` (III)
-- already matched the row's own grade convention and external sources, so
-- left as-is.
--
-- Also RE-ISSUING two more fixes batches 59/60/250 already found and left
-- unapplied, both about the same stale figure: this peak's true elevation is
-- 8,066 ft (confirmed via WebSearch this run, Wikipedia), not 8,065 ft. This
-- row's own summit waypoint (index 2 -- batch 60 originally targeted index 1,
-- which was wrong even then per batch 250's note, and batch 250's corrected
-- index-2 targeting is re-verified live and still correct) and pitch 12's
-- notes both still carry the stale 8,065 ft figure, contradicting this same
-- row's own high_point_ft (8,066, already correct) and every sibling route's
-- summit waypoint on this peak.
UPDATE routes SET beta = 'Grade III+, 5.8, Cutthroat''s classic long moderate alpine route — a wandering 12-pitch line (16 by a finer pitch breakdown) up the road-visible south face, with a memorable chockstone crawl, a stembox crux, and a splitter offwidth on the summit ridge. First climbed by Fred Beckey and Don Gordon in 1958.'
  WHERE id = 'wa_cutthroat_south_buttress'
    AND beta = 'Grade II, 5.7 climbing. Short approach from highway. Rock improves significantly higher on ridge. Fair granite in approach, improves on ridge. Moderate exposure. Quick alpine climb from Rainy Pass. Uncrowded route.';
-- RE-ISSUE (batches 59/60/250, still unapplied): summit waypoint elev.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{2,elev}', '8066')
  WHERE id = 'wa_cutthroat_south_buttress'
    AND waypoints->2->>'name' = 'Cutthroat Peak summit'
    AND (waypoints->2->>'elev')::int = 8065;
-- RE-ISSUE (batches 59/60/250, still unapplied): pitch 12 notes text.
UPDATE routes SET pitch_detail = jsonb_set(pitch_detail, '{11,notes}', '"The final airy pitch to Cutthroat''s true summit (8,066 ft); exposed but moderate, after which most parties transition straight into the West Ridge or reversed-buttress descent."')
  WHERE id = 'wa_cutthroat_south_buttress'
    AND pitch_detail->11->>'notes' LIKE '%8,065 ft%';

-- =========================================================================
-- Cutthroat Peak, West Ridge -- wa_cutthroat_west_ridge
-- =========================================================================
-- Same contaminated placeholder `beta` as the other four Cutthroat Peak
-- routes in this batch. Coincidentally close in spirit to this route's actual
-- character (a short, easy line) but not an exact match -- this row's own
-- grade is 5.6, not 5.7, and the placeholder's "Rock improves significantly
-- higher on ridge" and "Quick alpine climb from Rainy Pass" language does not
-- correspond to anything in this row's own approach/pitch_detail (a Blue
-- Lake-area pullout well short of Rainy Pass, 3 short pitches at
-- 5.4/5.6/5.5). Rewrote from this row's own overview, approach, pitch_detail,
-- and fa fields -- no new facts introduced.
UPDATE routes SET beta = 'Grade II, 5.6, the easiest technical line on Cutthroat Peak and a quicker alternative to the long South Buttress. Short and scrambly, with a few low-fifth-class steps: from the notch at the base of the ridge, traverse ledges to a shallow gully onto the crest, then follow it to the summit. First climbed by Kenneth Adam, Raffi Bedayn, and W. Kenneth Davis on July 22, 1937 — also the peak''s overall first ascent.'
  WHERE id = 'wa_cutthroat_west_ridge'
    AND beta = 'Grade II, 5.7 climbing. Short approach from highway. Rock improves significantly higher on ridge. Fair granite in approach, improves on ridge. Moderate exposure. Quick alpine climb from Rainy Pass. Uncrowded route.';

-- =========================================================================
-- Cutthroat Peak (area row) -- wa_cutthroat_peak
-- =========================================================================
-- RE-ISSUE (batches 59/60/250, still unapplied 6+ weeks later -- re-verified
-- live immediately before writing, and re-confirmed via WebSearch this run,
-- Wikipedia: 8,066 ft). The area's own elevation_ft and blurb both still
-- carry the stale 8,065 ft figure, contradicting every route on this peak's
-- own summit waypoints/high_point_ft, which already say 8,066 ft.
UPDATE areas SET elevation_ft = 8066 WHERE id = 'wa_cutthroat_peak' AND elevation_ft = 8065;
UPDATE areas SET blurb = replace(blurb, '8,065 ft', '8,066 ft') WHERE id = 'wa_cutthroat_peak' AND blurb LIKE '%8,065 ft%';

-- =========================================================================
-- Crooked Thumb Peak, South Route -- wa_crooked_thumb_peak_south_route
-- =========================================================================
-- Three RE-ISSUES from batches 59/60/250, all still unapplied, all re-
-- verified live immediately before writing (values unchanged from what those
-- batches found):
--
-- (1) high_point_ft is still 8129 -- a regression of the deliberate pass-1
-- decision (reaffirmed pass-2/pass-5) to leave this field NULL, since it is
-- unconfirmed whether this route's south-ridge headwall actually tops the
-- true summit fin (the route's own cited 2016 trip report says the party
-- found "no feasible way to reach [the true summit thumb] directly").
--
-- (2) access.landManager still wrongly claims the approach crosses Ross Lake
-- National Recreation Area. This route's own approach/road fields describe
-- the Hannegan Trailhead -> Hannegan Pass -> Chilliwack River approach, which
-- per USFS (Trail #674) crosses directly from Mt. Baker-Snoqualmie NF into
-- North Cascades NP -- no Ross Lake NRA on this approach. Note this row ALSO
-- carries a separate snake_case `land_manager` key with different, already-
-- correct content -- left untouched, only the camelCase `landManager` key
-- (which the app's own field convention elsewhere renders) is fixed here.
--
-- (3) The 2026 early-access lottery window in access.notes is still off by a
-- day on both ends -- NPS lists March 3-14, 2026, not March 2-13.
UPDATE routes SET high_point_ft = NULL WHERE id = 'wa_crooked_thumb_peak_south_route' AND high_point_ft = 8129;
UPDATE routes SET access = jsonb_set(access, '{landManager}', '"North Cascades National Park Complex (National Park Service) — approach crosses Mt. Baker-Snoqualmie National Forest (Mt. Baker Wilderness) before entering the National Park proper."') WHERE id = 'wa_crooked_thumb_peak_south_route' AND access->>'landManager' LIKE '%Ross Lake National Recreation Area%';
UPDATE routes SET access = jsonb_set(access, '{notes}', '"60% of sites are reservable in advance via Recreation.gov (2026 lottery Mar 3-14); the remaining 40% are walk-up, obtained in person the day before at the Wilderness Information Center in Marblemount."') WHERE id = 'wa_crooked_thumb_peak_south_route' AND access->>'notes' LIKE '%Mar 2%13%';

-- =========================================================================
-- Dark Peak (area row) -- wa_dark_peak
-- =========================================================================
-- RE-ISSUE, prominence ONLY (batches 60/250, still unapplied): area
-- prominence_ft is still 273 ft. Two independent passes (batch 250 on
-- 2026-09-09, and this run today) both independently landed on SummitPost's
-- "Washington Top 100" list, which states Dark Peak's prominence as 264 ft
-- directly.
--
-- NOT re-issuing the paired elevation_ft fix (8518 -> 8504) that batch 250
-- proposed for this same area row, and NOT touching the Dark Glacier Route's
-- high_point_ft (8507) that depends on it. This run's own WebSearch
-- (PeakVisor) independently found "2,593 m (8,507 ft)" -- NOT 8,504 ft -- for
-- this exact peak, directly conflicting with batch 250's claim that PeakVisor
-- backs 8,504 ft. A 3 ft / 1 m gap is within ordinary rounding noise between
-- sources, but two sessions citing the same source for two different numbers
-- is worth a human resolving against a primary source (e.g. the actual USGS
-- quad) rather than a third competing citation. Flagged, not fixed -- see log
-- entry.
UPDATE areas SET prominence_ft = 264 WHERE id = 'wa_dark_peak' AND prominence_ft = 273;
