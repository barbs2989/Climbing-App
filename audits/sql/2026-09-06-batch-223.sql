-- WA alpine audit -- batch 223 (2026-09-06, pass 4)
-- Routes: wa_olympus_traverse (Mount Olympus West/Middle/East Peaks),
-- wa_open_book_2 (Unicorn Peak), wa_ottohorn_southeast_route (Ottohorn),
-- wa_ottohorn_west_ridge (Ottohorn), wa_overcoat_peak_southeast_route
-- (Overcoat Peak), wa_pernod_spire_standard (Pernod Spire),
-- wa_phantom_peak_south_route (Phantom Peak), wa_phantom_peak_west_ridge
-- (Phantom Peak).
-- Each WHERE clause includes the current (wrong) value as a safety check.
-- Apply each UPDATE individually.

-- Mount Olympus Traverse: same off-by-one-year Upper Hoh Road defect found
-- and fixed on its sibling wa_olympus_blue_glacier_east_ramps in batch 222,
-- independently present on THIS row in three fields (road.status,
-- road.seasonalGate, access.closures). Corroborated the same way: Jefferson
-- County WA's own announcements, Washington State Standard, and NPS Olympic
-- news releases all agree the Dec 2024 storm-damage closure ended May 8,
-- 2025 (~5 months), not May 2026 (~17 months).
UPDATE routes
SET road = jsonb_set(
      jsonb_set(road, '{status}', '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2025"'::jsonb),
      '{seasonalGate}', '"Storm closures possible — as demonstrated by the ~5-month Dec 2024–May 2025 closure"'::jsonb
    )
WHERE id = 'wa_olympus_traverse'
  AND road->'status' = '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2026"'::jsonb
  AND road->'seasonalGate' = '"Storm closures possible — as demonstrated by the ~17-month Dec 2024–May 2026 closure"'::jsonb;

UPDATE routes
SET access = jsonb_set(access, '{closures}', '"Upper Hoh Road has a real washout history — most recently closed by December 2024 storm damage until repairs reopened it in May 2025; check current NPS road conditions before a trip"'::jsonb)
WHERE id = 'wa_olympus_traverse'
  AND access->'closures' = '"Upper Hoh Road has a real washout history — most recently closed by December 2024 storm damage until repairs reopened it in May 2026; check current NPS road conditions before a trip"'::jsonb;

-- Unicorn Peak, Open Book: the `rappels` summary field named the shared
-- summit-block anchor as "a block with tat and rings, or the bleached
-- snag" -- offering the snag as an equally-viable option. But this row's
-- own descent_text and approach_variants[0].baseFinding both explicitly
-- warn "Avoid the old dead tree/snag some older trip reports mention --
-- it's reported as no longer trustworthy." Internal contradiction on a
-- rappel anchor; corrected the summary line to match the two more
-- detailed fields rather than contradict them. No external source needed.
UPDATE routes
SET rappels = 'One rappel of about 50 ft (15 m) from the shared summit-block anchors — a block with tat and rings; avoid the old dead snag some trip reports mention, as it is no longer trustworthy. A 40 m rope is plenty; carry 60 m if the moat at the base is open late in the season.'
WHERE id = 'wa_open_book_2'
  AND rappels = 'One rappel of about 50 ft (15 m) from the shared summit-block anchors — a block with tat and rings, or the bleached snag. A 40 m rope is plenty; carry 60 m if the moat at the base is open late in the season.';

-- Ottohorn, West Ridge: the `fa` field credited this route's first ascent
-- to the 1961 party (Cooper/Denny/J. Firey/J. Firey/Whitmore) who climbed
-- Ottohorn's EAST ridge from the Otto-Himmel col -- appended with "This
-- route IS the first-ascent line," which is false for a route named "West
-- Ridge." This row's own overview, beta and hazards fields all agree
-- instead that the West Ridge was a separate 2017 first ascent (same
-- outing that established nearby new routes "Beep" and "Honk"), with no
-- climbers' names on record. Confirmed externally: a cascadeclimbers.com
-- trip report titled "FAs of Beep, Honk, and the West Ridge of Ottohorn
-- 7/25/2017" documents that exact date; the party's names could not be
-- retrieved (WebFetch egress-blocked for that domain), so none are
-- invented here. Corrected fa to describe the real 2017 West Ridge FA and
-- to stop misattributing the unrelated 1961 East Ridge ascent to it.
UPDATE routes
SET fa = 'First climbed July 25, 2017, in the same outing that established the nearby new routes ''Beep'' and ''Honk'' in the Southern Pickets; the first-ascent party''s names were not found in available sources. Not to be confused with Ottohorn''s original 1961 east-ridge ascent (Cooper/Denny/J. Firey/J. Firey/Whitmore), which is a different line.'
WHERE id = 'wa_ottohorn_west_ridge'
  AND fa = 'Ed Cooper, Glen Denny, Joan Firey, Joe Firey and George Whitmore — September 10, 1961, Class III via the east ridge from the Otto-Himmel col. This route IS the first-ascent line.';

-- Overcoat Peak, Southeast Route: access.land_manager and
-- access.parking_pass each carry a stray pair of literal double-quote
-- characters wrapping their entire text content (visible once the JSON is
-- parsed -- these are quote characters INSIDE the string value, not JSON
-- string delimiters). This reads as malformed text if rendered
-- ("\"Mount Baker-Snoqualmie...\""). The row's own parallel camelCase
-- fields (access.landManager, access.passRequired) carry the same
-- underlying facts with no stray quoting, confirming this is a formatting
-- artifact from an earlier edit (this row's own `corrections` field notes
-- both sub-fields were touched on 2026-07-31) rather than a factual
-- question. Stripped the stray quote characters; content unchanged.
UPDATE routes
SET access = jsonb_set(
      jsonb_set(access, '{land_manager}', '"Mount Baker-Snoqualmie National Forest (Snoqualmie Ranger District) — Alpine Lakes Wilderness"'::jsonb),
      '{parking_pass}', '"No day-use fee currently posted at the Dingford Creek Trailhead itself, a Northwest Forest Pass or America the Beautiful interagency pass is recommended in case requirements change."'::jsonb
    )
WHERE id = 'wa_overcoat_peak_southeast_route'
  AND access->>'land_manager' = '"Mount Baker-Snoqualmie National Forest (Snoqualmie Ranger District) — Alpine Lakes Wilderness"'
  AND access->>'parking_pass' = '"No day-use fee currently posted at the Dingford Creek Trailhead itself, a Northwest Forest Pass or America the Beautiful interagency pass is recommended in case requirements change."';

-- Phantom Peak, South Route: approach_logistics.trailheadDirection named
-- "the Nooksack Cirque Trailhead at the end of FR-34" -- a real trailhead,
-- but the one serving Mount Shuksan's Price Glacier/Nooksack Cirque area,
-- unrelated to this route. Every other record on this row --
-- approach_logistics.trailhead itself, the matching waypoint pin (lat
-- 48.9101, lng -121.5927), and the `approach` field's own Option 2
-- narrative (Hannegan Trailhead -> Ruth Creek Trail -> Chilliwack River
-- Trail -> Whatcom Pass) -- agree on the Hannegan Pass Trailhead at the
-- end of Ruth Creek Road / FR-32. This row's own approach_variants[0].notes
-- already flags the mismatch in passing ("the route's stored trailhead
-- record names a different trailhead than this prose does") but nothing
-- had corrected trailheadDirection itself. Internal correction; no
-- external source needed since the winning trailhead is already
-- corroborated three ways within the row.
UPDATE routes
SET approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}', '"From the Hannegan Pass Trailhead (end of Ruth Creek Rd / FR-32) via Hannegan Pass, the Chilliwack River Trail, Whatcom Pass and Perfect Pass to the southwest side of Phantom Peak"'::jsonb)
WHERE id = 'wa_phantom_peak_south_route'
  AND approach_logistics->'trailheadDirection' = '"From the Nooksack Cirque Trailhead at the end of FR-34 off Hannegan Pass Road (FR-32)"'::jsonb;

-- access_checked_at stamped for all 8 routes reviewed this batch (external
-- sources cross-checked 2026-09-06 -- summit elevations for Mount Olympus's
-- three peaks (7,980/7,929/7,762 ft), Unicorn Peak (6,971 ft), Ottohorn
-- (7,840 ft), Overcoat Peak (7,432 ft) and Phantom Peak (~8,000-8,016 ft,
-- within survey rounding) all corroborated against Wikipedia/PeakVisor/
-- listsofjohn.com/peakery; first-ascent claims for Overcoat Peak (Charlton/
-- Sylvester, July 1897), Ottohorn's 1961 peak FA, Ottohorn West Ridge's 2017
-- FA (corrected above), and Phantom Peak's two documented routes (1940
-- Beckey brothers South/Southwest Route; 2021 Wehrly/Larson West Ridge, per
-- AAC Publications) all corroborated; Olympic NP and North Cascades NP
-- wilderness permit fee schedules corroborated against current NPS/
-- Recreation.gov pages; no change to any other field on routes not touched
-- above. wa_pernod_spire_standard's aspect (N) vs. face ("North, ...between
-- Pernod and Chianti") vs. its own approach/descent text (climbs the WEST
-- face, rappels the EAST side) vs. its own rappel_count_note (cites a
-- "South Face description" and an unrelated "1989 first-ascent note") were
-- all read but NOT corrected -- see the audit log for why this is flagged
-- for human review rather than fixed).
UPDATE routes
SET access_checked_at = '2026-09-06T12:00:00+00:00'
WHERE id IN (
  'wa_olympus_traverse',
  'wa_open_book_2',
  'wa_ottohorn_southeast_route',
  'wa_ottohorn_west_ridge',
  'wa_overcoat_peak_southeast_route',
  'wa_pernod_spire_standard',
  'wa_phantom_peak_south_route',
  'wa_phantom_peak_west_ridge'
);
