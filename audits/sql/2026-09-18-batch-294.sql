-- WA alpine route audit — pass 5, batch 294
-- Routes: wa_silver_star_ne_ridge, wa_sinister_peak_north_face,
--   wa_sinister_peak_southwest_route, wa_sitkum_spire_standard,
--   wa_sloan_peak_corkscrew, wa_sloan_peak_r1, wa_snowfield_peak_neve_glacier,
--   wa_snowking_mountain_standard
-- All statements guarded on the row's current stored value, so a concurrent
-- edit or a re-run after this has already applied is a safe no-op rather than
-- a silent overwrite.

BEGIN;

-- wa_sinister_peak_north_face: bivy[5] ("Bachelor Creek forest and meadow
-- camps") states the Downey Creek trailhead elevation as "1,440 ft" in its
-- prose notes. This route's own `corrections` field documents that the
-- Downey Creek Trailhead waypoint elevation was already corrected to 1,450 ft
-- (matching the USFS figure and this route's own approach text, which also
-- says "elev. ~1,450'"), but that correction pass missed this one leftover
-- mention inside the bivy corridor prose. Fixing the stray substring only.
UPDATE routes
SET bivy = jsonb_set(
  bivy,
  '{5,notes}',
  to_jsonb(replace(bivy->5->>'notes', 'the Downey Creek trailhead at 1,440 ft', 'the Downey Creek trailhead at 1,450 ft'))
)
WHERE id = 'wa_sinister_peak_north_face'
  AND bivy->5->>'name' = 'Bachelor Creek forest and meadow camps'
  AND bivy->5->>'notes' LIKE '%the Downey Creek trailhead at 1,440 ft%';

-- wa_sinister_peak_southwest_route: identical stray figure in the same
-- shared corridor bivy entry (the two Sinister Peak routes carry the same
-- Ptarmigan Traverse corridor bivy list). This route's own `corrections`
-- field and `approach` field ("elev. ~1,450'") both already record 1,450 ft
-- as correct.
UPDATE routes
SET bivy = jsonb_set(
  bivy,
  '{5,notes}',
  to_jsonb(replace(bivy->5->>'notes', 'the Downey Creek trailhead at 1,440 ft', 'the Downey Creek trailhead at 1,450 ft'))
)
WHERE id = 'wa_sinister_peak_southwest_route'
  AND bivy->5->>'name' = 'Bachelor Creek forest and meadow camps'
  AND bivy->5->>'notes' LIKE '%the Downey Creek trailhead at 1,440 ft%';

-- wa_sloan_peak_r1: approach_logistics.trailheadLat/trailheadLng still hold
-- the pre-correction coordinate (48.0719,-121.3764). This route's own
-- `corrections` field says that exact coordinate was corrected to
-- (48.0701,-121.3753) "to match the same physical trailhead as recorded on
-- the sibling wa_sloan_peak_corkscrew route" — the sibling's waypoint (and
-- this route's own `waypoints` array) already carry the corrected value.
-- Only approach_logistics was missed by that earlier pass.
UPDATE routes
SET approach_logistics = jsonb_set(
  jsonb_set(approach_logistics, '{trailheadLat}', to_jsonb(48.0701)),
  '{trailheadLng}', to_jsonb(-121.3753)
)
WHERE id = 'wa_sloan_peak_r1'
  AND approach_logistics->>'trailheadLat' = '48.0719'
  AND approach_logistics->>'trailheadLng' = '-121.3764';

-- wa_snowking_mountain_standard: two independent defects in `itinerary`,
-- both from an earlier correction pass (see this row's own `corrections`
-- field, which already fixed a stale 7,439 ft summit figure to 7,433 ft in
-- this same itinerary object) that left artifacts behind.
--
-- (1) itinerary.days[1].schedule[2].label and itinerary.days[1].objective
-- both have literal double-quote characters embedded in the stored text
-- (e.g. the label's actual content is the 23-character string
-- `"Summit (7,433 ft)"`, quote marks included) — almost certainly an
-- artifact of that earlier fix's replacement value being quoted twice.
-- Every sibling label in the same schedule array ("Leave Cyclone Lake
-- camp", "Rope up at the glacier toe", etc.) has no such quoting, and no
-- other route in this catalog uses this convention. Stripping the leading/
-- trailing literal quote characters only; no other content changed.
--
-- (2) itinerary.days[0].objective says the Cyclone Lake camp sits at
-- "(~4,800 ft)". This route's own data disagrees with itself: the
-- `waypoints` entry named "Cyclone Lake meadows" is at 5,354 ft, and the
-- `bivy` entry "Cyclone Lake and the lakes just north of it" gives 5,442 ft
-- — both close to each other and far from 4,800 ft. The 4,800 ft figure
-- instead belongs to a DIFFERENT, lower camp: this row's own `waypoints`
-- names a separate "Boggy meadow low camp" at exactly 4,800 ft, and
-- `approach_variants[1]` explicitly says "parties splitting the approach
-- over two days also use the boggy bench near 4,800 ft as a LOW camp"
-- (i.e. not Cyclone Lake). Corrected to match the row's own more precise
-- "Cyclone Lake meadows" waypoint.
UPDATE routes
SET itinerary = jsonb_set(
  jsonb_set(
    jsonb_set(
      itinerary,
      '{days,1,schedule,2,label}',
      to_jsonb(regexp_replace(itinerary#>>'{days,1,schedule,2,label}', '^"|"$', '', 'g'))
    ),
    '{days,1,objective}',
    to_jsonb(regexp_replace(itinerary#>>'{days,1,objective}', '^"|"$', '', 'g'))
  ),
  '{days,0,objective}',
  to_jsonb(replace(itinerary#>>'{days,0,objective}', '(~4,800 ft)', '(~5,350 ft)'))
)
WHERE id = 'wa_snowking_mountain_standard'
  AND itinerary#>>'{days,1,schedule,2,label}' = '"Summit (7,433 ft)"'
  AND itinerary#>>'{days,0,objective}' LIKE '%(~4,800 ft)%';

-- wa_sitkum_spire_standard: itinerary.cal still reads "(in effect through
-- at least Dec 2025, per Mt. Baker-Snoqualmie NF alerts)" for the FS Road 23
-- (White Chuck River Road) closure, while this SAME row's own access.closures
-- and road.status fields have already been updated to the fuller, more
-- current statement "originally through Dec 31, 2025, and still active per
-- spring 2026 NF alerts" (citing Forest Order #06-05-25-02). Verified live
-- against the USFS Mt. Baker-Snoqualmie National Forest alerts page
-- (fs.usda.gov/r06/mbs/alerts/fsr-23-and-fsr-27-closure-order and the
-- "Current and Upcoming Road Closures" release, both retrieved 2026-09-18):
-- Order #06-05-25-02 is confirmed (effective March 19, 2025 through
-- Dec 31, 2025, unless rescinded sooner), and a subsequent Mt.
-- Baker-Snoqualmie release dated July 1, 2026 confirms FSR 23 from
-- milepost 3.7 to its terminus remains closed due to flood damage (with
-- "total road failure at mile 4"), i.e. the closure is still in force well
-- past its original 2025 end date. itinerary.cal is updated to match the
-- row's own already-corrected, and now externally-confirmed, language.
UPDATE routes
SET itinerary = jsonb_set(
  itinerary,
  '{cal}',
  to_jsonb(replace(
    itinerary#>>'{cal}',
    '(in effect through at least Dec 2025, per Mt. Baker-Snoqualmie NF alerts)',
    '(Forest Order #06-05-25-02, originally through Dec 31, 2025, still active per spring 2026 NF alerts)'
  ))
)
WHERE id = 'wa_sitkum_spire_standard'
  AND itinerary#>>'{cal}' LIKE '%(in effect through at least Dec 2025, per Mt. Baker-Snoqualmie NF alerts)%';

COMMIT;
