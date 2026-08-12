-- WA Alpine Audit — Pass 1, Batch 34 — 2026-07-31
-- Peaks: Mount Torment (South Ridge, Torment-Forbidden Traverse),
--        Cathedral Peak (NE Ridge), Needle Peak (North Ridge),
--        Snowfield Peak (Neve Glacier / West Ridge),
--        North Early Winters Spire (Northwest Corner),
--        Nooksack Tower (East Ridge/Beckey Route, South Face)

-- =========================================================================
-- Mount Torment
-- =========================================================================

-- wa_mount_torment_south_ridge: `grade` ("Grade II-III, 5.4") and its
-- matching commitment/alpine_grade ("III") overstate the route's NCCS
-- grade. Multiple independent sources agree this is a Grade II route --
-- SummitPost's dedicated page for it is literally titled "South Ridge, II,
-- 5.4", and a separate SummitPost summary states "Mount Torment is a Grade
-- II, 5.4 rock climb... Beckey calls it 5.4." No source found supports
-- "II-III" or "III".
UPDATE routes
SET grade = 'Grade II, 5.4',
    commitment = 'II',
    alpine_grade = 'II'
WHERE id = 'wa_mount_torment_south_ridge'
  AND grade = 'Grade II-III, 5.4'
  AND commitment = 'III'
  AND alpine_grade = 'III';

-- Flagged, not fixed (Mount Torment):
-- wa_mount_torment_south_ridge: `pitch_detail` lists three of four pitches
--   at 5.5, which runs hotter than the well-corroborated Grade II/5.4 cap
--   fixed above. No primary pitch-by-pitch source was found to assert a
--   specific replacement grade per pitch, so left as-is pending a source
--   that actually breaks the route down pitch by pitch.
-- wa_mount_torment_south_ridge / wa_mount_torment_torment_forbidden_traverse:
--   `fa` spells the second climber "Walter Sellers" on the South Ridge row
--   but "Walt Sellers" on the Traverse row -- both spellings appear in
--   reputable sources (SummitPost uses "Walter"; Climbing.com's topo and
--   desktodirtbag use "Walt", the more common form) for what is almost
--   certainly the same person, but no primary source (AAJ 1959, Beckey's
--   guide) was reachable to settle which the guidebook of record uses.
--   Left both as-is rather than force one spelling without a primary cite.
-- wa_mount_torment_south_ridge / wa_mount_torment_torment_forbidden_traverse:
--   `dist_km` (4.8 on both rows) reads low against external figures --
--   independent sources put the South Ridge round trip at ~10 mi and
--   Mountain Project's stats page for the Traverse at 9.0 mi one-way, while
--   4.8 km (~3.0 mi) matches neither convention cleanly. Per this repo's
--   documented caution that `dist_km` mixes one-way and half-round-trip
--   conventions across the table (see CLAUDE.md), flagged rather than
--   guessed at a replacement.

-- =========================================================================
-- Cathedral Peak
-- =========================================================================

-- Flagged, not fixed (no confirmed fix applied to wa_ne_ridge this batch):
-- wa_ne_ridge: `gain_ft` (4700) is arithmetically too low given the row's
--   own already-confirmed trailhead (~3,050 ft) and summit (8,606 ft)
--   elevations -- net gain alone is already 5,556 ft before accounting for
--   the approach's known mid-route dip into the Spanish Creek drainage
--   after Andrews Pass, which pushes true cumulative gain higher still
--   (plausibly ~6,500-7,000 ft). Not fixed because no source gives an exact
--   figure and the drop into Spanish Creek isn't precisely quantified --
--   recommend a human recompute from the full elevation profile rather than
--   patching in a guessed number.
-- wa_ne_ridge: `fa` ("August 1973 (Mountain Project)") and the
--   grade/commitment/pitches trio (5.3 / II / 7 pitches) could not be
--   matched to a real, locatable Mountain Project route page under the
--   name "NE Ridge". The one Cathedral Peak ridge route independently
--   confirmed by URL (mountainproject.com/route/109096133, "North Ridge")
--   is a different, better-documented line -- up to 5.5, starting from
--   Cathedral Pass, with no mention of "The Pope". Possible this route is
--   genuinely obscure and only documented in Beckey's guide (not flagged as
--   wrong), but it's also possible this row conflates or misidentifies a
--   different named route -- needs a human with direct Mountain
--   Project/Beckey access to confirm before any field is touched.

-- =========================================================================
-- Needle Peak
-- =========================================================================

-- wa_needle_peak_north_ridge: audited clean. The FA claim (Blake
-- Herrington & Tim Halder, Aug 19-20 2006, opening the Needle Peak -> North
-- Ridge leg of a first-ascent traverse to Bonanza Peak's NW Ridge) is
-- corroborated by the American Alpine Journal account, independently
-- cross-checked against the same pair's documented Tupshin Peak climb ten
-- days earlier. Summit coordinates match Peakery exactly; elevation
-- (7,896 ft) is a 1-ft rounding difference from listsofjohn.com's 7,897 ft
-- (a ~100 ft outlier on TopoZone/Peakery traces to a likely DEM error on
-- their end, not this row -- their coordinates match this row's exactly).
-- "Anonymity Towers", "Dark Peak", and "Dark Glacier" are all confirmed
-- real, correctly-positioned features. The mostly-null grade/pitch/gain
-- fields are appropriate, not a data gap: the only documented source rates
-- the entire two-day traverse (V, 5.8), not the Needle Peak segment alone.

-- =========================================================================
-- Snowfield Peak
-- =========================================================================

-- wa_neve_glacier_west_ridge: the first waypoint's `elev` (2500) for
-- "Pyramid Lake Trailhead" contradicts both external trail data
-- (AllTrails/Trailforks put the trailhead at ~1,143-1,154 ft) and this same
-- row's own `approach` text, which correctly states "Pyramid Lake
-- Trailhead (~1,150 ft)". 2500 ft is actually roughly Pyramid Lake's own
-- elevation, not the trailhead's -- looks like a value copied from the
-- wrong point. The trailhead's lat/lng (48.7098, -121.1452) are themselves
-- correct and match an independently-found trailhead location, so only the
-- elevation is wrong.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '1150', false)
WHERE id = 'wa_neve_glacier_west_ridge'
  AND waypoints->0->>'name' = 'Pyramid Lake Trailhead'
  AND (waypoints->0->>'elev')::numeric = 2500;

-- Re-confirmed clean (Snowfield Peak): the summit waypoint's embedded note
-- documents a prior-pass fix (48.7098,-121.145 duplicate-of-trailhead bug
-- corrected to 48.63528,-121.13833) -- independently re-verified this
-- batch against Wikipedia's Snowfield Peak infobox (48.63528,-121.13833,
-- 8,351 ft), which matches exactly. That earlier fix was correct and
-- stands; only the trailhead elevation above needed a new correction.

-- =========================================================================
-- North Early Winters Spire
-- =========================================================================

-- wa_news_nw_corner: the first waypoint's embedded note claims a prior
-- audit pass "corrected" the Blue Lake Trailhead coordinate from
-- (48.5191,-120.6742) to (48.5168,-120.6573) because the former was
-- "~1.3km off". Independent re-verification this batch found the opposite:
-- Trailforks, WTA, and The Mountaineers all independently place the real
-- Blue Lake Trailhead at essentially (48.51899,-120.67409) -- i.e. the
-- point the embedded note calls wrong, not the one it proposes. The
-- proposed "fix" coordinate doesn't correspond to any documented trailhead,
-- viewpoint, or landmark on that stretch of Hwy 20. This looks like an
-- earlier, unrelated correction pass got the direction of its own fix
-- backwards and introduced a ~1.3km regression. Reverting to the original
-- coordinate and rewriting the note to record why. Also fixing the same
-- waypoint's `elevFt` (5200), which is inconsistent with external sources
-- (~5,383-5,400 ft) and with this row's own `approach` text ("elev.
-- ~5,400 ft").
UPDATE routes
SET waypoints = jsonb_set(
  waypoints, '{0}',
  '{"lat": 48.5191, "lng": -120.6742, "elevFt": 5400, "name": "Blue Lake Trailhead", "type": "Trailhead", "note": "Reverted an incorrect correction applied by an earlier pass (which had moved this point to 48.5168,-120.6573, ~1.3km away, on a note whose claimed direction of error was backwards). Independent sources (Trailforks, WTA, The Mountaineers) confirm the real Blue Lake Trailhead sits at ~48.5190,-120.6741, matching this reverted value. elevFt also corrected to ~5,400 ft to match this rows own approach text and external trail data."}'::jsonb,
  false
)
WHERE id = 'wa_news_nw_corner'
  AND waypoints->0->>'name' = 'Blue Lake Trailhead'
  AND (waypoints->0->>'lat')::numeric = 48.5168
  AND (waypoints->0->>'lng')::numeric = -120.6573;

-- wa_news_nw_corner: the `hazards` entry describing the 2025 Early Winter
-- Couloir anchor-failure fatalities dates the accident "May 11, 2025". The
-- event, cause, toll, and location are all independently well-corroborated
-- (Spokesman-Review, NBC News, CNN, Methow Valley News, an official
-- investigative report), but every source consistently dates the fall
-- itself to the evening of Saturday, May 10, 2025 -- the survivor reached
-- help and called 911 around 11:30am Sunday, May 11, which is the likely
-- source of the one-day discrepancy on file. Corrected to May 10.
UPDATE routes
SET hazards = jsonb_set(hazards, '{1}', to_jsonb(replace(hazards->>1, 'on May 11, 2025,', 'on May 10, 2025,')), false)
WHERE id = 'wa_news_nw_corner'
  AND hazards->>1 LIKE '%on May 11, 2025,%';

-- Flagged, not fixed (North Early Winters Spire):
-- wa_news_nw_corner: the summit waypoint (48.51291,-120.65557) is
-- plausible -- right massif, right elevation (7,760 ft, confirmed) -- but
-- no source independently pins decimal coordinates for the *North* spire
-- specifically as opposed to the more commonly cited South Spire point
-- (~48.5122,-120.6553). Low-priority; left as-is pending a source that
-- distinguishes the two summits precisely.

-- =========================================================================
-- Nooksack Tower
-- =========================================================================

-- wa_nooksack_tower_beckey_route: `name` ("East Ridge / Beckey Route")
-- contradicts this same row's own `aspect` ("N/NE") and `face` ("North
-- Face / NE Face") fields, and every external source found (AAC
-- Publications FA account, Wikipedia, Mountain Project, multiple
-- cascadeclimbers.com trip-report titles) calls this the "Beckey-Schmidtke"
-- or "North Face" route -- it climbs a north-facing ice couloir to a north
-- arete, never an east ridge. The route's own beta/approach/pitch_detail
-- all correctly describe the real Beckey-Schmidtke north-side line, so only
-- the name field is wrong, not the row's content.
UPDATE routes
SET name = 'North Face (Beckey-Schmidtke Route)'
WHERE id = 'wa_nooksack_tower_beckey_route'
  AND name = 'East Ridge / Beckey Route';

-- Flagged, not fixed (Nooksack Tower):
-- wa_nooksack_tower_beckey_route: the first waypoint ("Nooksack Cirque
--   Trailhead", 48.8899,-121.6749, elev 2,200 ft) doesn't cleanly match
--   either the USFS-published Nooksack Cirque Trailhead coordinates
--   (48.89411,-121.65268, ~1 mi away) or this row's own `approach` text,
--   which separately describes a "washout/parking point" at 2,156 ft two
--   miles short of the "actual trailhead" at 2,550 ft. The waypoint's
--   elevation is much closer to the washout/parking figure than to either
--   trailhead figure -- looks like the waypoint may be the parking point
--   mislabeled as the trailhead, an internal inconsistency between the
--   row's own `waypoints` array and its own `approach` prose. Needs a human
--   decision on which point the waypoint is meant to represent before
--   picking a fix.
-- wa_nooksack_tower_beckey_route: the "Off-trail ford of the Nooksack
--   River" waypoint (48.866122,-121.6357) sits about 1.1 mi from the ford
--   coordinate given in this row's own `approach` text ("log crossing at
--   N48.87097 W121.61267") -- another self-inconsistency between the
--   waypoints array and the prose describing the same point. Neither could
--   be independently verified against a third-party source, so left
--   flagged rather than picking one arbitrarily.
-- wa_nooksack_tower_beckey_route: `season` ("Jun-Aug") and `best_season`
--   ("Mid-July through September") disagree with each other on both ends
--   of the window; no source found settles which is intended. Minor, left
--   as-is.
-- Context, not a data flag: current (2026) operational status of Forest
--   Road 32/Ruth Creek specifically could not be confirmed beyond general
--   regional flood-damage reporting (a June 2026 Cascadia Daily News piece
--   on flood-damaged Whatcom-area forest roads did not name this road
--   specifically). Worth a human checking the current Mt. Baker Ranger
--   District alert page before anyone relies on this row's approach
--   description for trip planning, but this is an access-conditions
--   question, not a database fact error.

-- wa_nooksack_tower_south_face: audited clean. FA (Jens Klubberud & Ben
-- Manfredi, July 2002), pitch count (12), grade (V, 5.10-), max_angle
-- (55 deg), and descent description (reversing via the standard north-face
-- Beckey-Schmidtke line) are all independently confirmed against AAC
-- Publications and secondary sources. Shares the same, already-confirmed
-- Nooksack Tower summit elevation/coordinates as the Beckey route above.
