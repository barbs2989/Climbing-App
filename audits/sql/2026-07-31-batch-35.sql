-- WA Alpine Audit — Pass 1, Batch 35 — 2026-07-31
-- Peaks: Lexington Tower (North Face), Concord Tower (North Face Var. Right /
--        Directisimo), Castle Peak (Fight or Flight), North Gardner Mountain
--        (Northwest Couloir), Whatcom Peak (North Ridge), Cutthroat Peak
--        (North Ridge), Primus Peak (North Ridge), Colchuck Peak
--        (Northeast Buttress)

-- =========================================================================
-- Lexington Tower
-- =========================================================================

-- wa_north_face_3: audited clean. FA (Tim Kelley & Dick McGowan, July 5
-- 1954), grade (5.7, 3 pitches), summit elevation (7,560 ft), the
-- "Stegosaur" ridge descent detail, and the 2-rappel-to-the-col descent are
-- all independently corroborated (StephAbegg.com, Mountaineers.org,
-- SummitPost, Wikipedia). Blue Lake Trailhead coordinates confirmed.

-- =========================================================================
-- Concord Tower
-- =========================================================================

-- wa_north_face_var_right_directisimo: `high_point_ft` (7569) contradicted
-- both externally and by this same row's own data. Independent sources
-- (search-synthesized SummitPost/Mountain Project results, queried
-- specifically for Concord Tower to rule out cross-contamination with the
-- neighboring Lexington Tower entry) repeatedly and consistently give
-- Concord Tower's summit as 7,560 ft, never 7,569. More directly: this
-- route's own `waypoints` array already stores the Concord Tower Summit
-- point at elev 7560 -- the row contradicted itself. Corrected
-- `high_point_ft` to match the row's own summit waypoint and external
-- sources. Route existence, 5.8 grade, and the "Directisimo/Directissima"
-- naming are independently confirmed; FA remains correctly marked unknown
-- (no source found credits a specific party/date for this variation, as
-- opposed to the standard North Face route's separately-documented
-- Beckey/Parrott 1956 FA).
UPDATE routes
SET high_point_ft = 7560,
    corrections = corrections || ' Also corrected high_point_ft from 7569 to 7560 (2026-07-31): the value contradicted this same routes own summit waypoint (stored at 7560) and external sources, which consistently give Concord Tower a 7,560 ft summit.'
WHERE id = 'wa_north_face_var_right_directisimo'
  AND high_point_ft = 7569;

-- =========================================================================
-- Castle Peak (Pasayten)
-- =========================================================================

-- wa_north_face_left_buttress: audited clean. "Fight or Flight" is a real,
-- well-documented route (AAC Publications, Alpinist newswire, Blake
-- Herrington's own account) -- FA by Blake Herrington and Peter Hirst,
-- August 3 2008, forced left of an attempted repeat of the Colorado Route
-- by a detached hanging snow patch, matches exactly. Route height (14
-- pitches / ~1400 ft = 427 m) matches. high_point_ft (8343) matches Eric
-- Gilbertson's differential-GPS resurvey (8343.4 ft), now the commonly
-- cited current figure superseding the older 8306 ft USGS quad value. The
-- Canada-side Manning Park / Frosty Mountain approach is independently
-- corroborated by multiple trip reports.

-- =========================================================================
-- North Gardner Mountain
-- =========================================================================

-- wa_north_gardner_mountain_nw_couloir: `high_point_ft` (8963) contradicted.
-- Wikipedia, Wikidata, Mountaineers.org, and peakery.com all consistently
-- give North Gardner Mountain's summit as 8,956 ft, not 8,963 ft (the
-- stored summit waypoint coordinate itself -- 48.515229,-120.501667 --
-- matches Wikidata's point to within ~10m, so only the elevation number is
-- wrong, not the location). Corrected both the top-level field and the
-- matching summit waypoint.
UPDATE routes
SET high_point_ft = 8956,
    waypoints = jsonb_set(waypoints, '{1,elevFt}', '8956', false)
WHERE id = 'wa_north_gardner_mountain_nw_couloir'
  AND high_point_ft = 8963
  AND waypoints->1->>'name' = 'North Gardner Mountain Summit'
  AND (waypoints->1->>'elevFt')::numeric = 8963;

-- wa_north_gardner_mountain_nw_couloir: the Cedar Creek Trailhead waypoint
-- was missing lat/lng entirely (stored as null), the only trailhead in this
-- batch lacking coordinates. A real, signed Cedar Creek Trailhead (USFS
-- Trail #476) exists off SR-20 between mileposts 175-176 near Winthrop, and
-- two independent sources (WTA, Trailforks) agree on its coordinates:
-- 48.5792, -120.4787. Filling the gap with this corroborated value. Not
-- touching `elevFt` (stored 2961): WTA/USFS give this trailhead's elevation
-- as ~3,040-3,075 ft, a real but unresolved ~100 ft discrepancy -- flagged
-- below rather than picked at random.
UPDATE routes
SET waypoints = jsonb_set(
  waypoints, '{0}',
  '{"lat": 48.5792, "lng": -120.4787, "name": "Cedar Creek Trailhead", "type": "trailhead", "distMi": 0, "elevFt": 2961, "note": "Coordinates added 2026-07-31 (previously null on both lat/lng) -- USFS Trail #476 trailhead off SR-20 near milepost 175-176, west of Winthrop; corroborated by WTA and Trailforks."}'::jsonb,
  false
)
WHERE id = 'wa_north_gardner_mountain_nw_couloir'
  AND waypoints->0->>'name' = 'Cedar Creek Trailhead'
  AND waypoints->0->'lat' = 'null'::jsonb;

-- Flagged, not fixed (North Gardner Mountain):
-- wa_north_gardner_mountain_nw_couloir: Cedar Creek Trailhead `elevFt`
--   (2961) is ~80-115 ft lower than WTA/USFS published figures for this
--   trailhead (~3,040-3,075 ft). Not corrected -- sources themselves
--   disagree by more than rounding, and the source used for the stored
--   2961 figure could not be identified. A human should check the primary
--   USFS trailhead page before picking a value.

-- =========================================================================
-- Whatcom Peak
-- =========================================================================

-- wa_north_ridge_2: `hazards` conflated two adjacent glaciers. The cited
-- source (NPS North Cascades climbing ranger blog, "Mt. Challenger &
-- Whatcom Peak", posted Aug 26 2017 describing an Aug 21 2017 trip --
-- confirmed as a real, matching primary page by title/URL/date, though it
-- 403'd on direct fetch this pass and this correction relies on
-- search-engine synthesis of that same page) attributes the "bare ice,
-- shallow crevasse crossing" observation to Whatcom Glacier, not Challenger
-- Glacier as stored -- the same account describes Challenger Glacier's
-- crevasses (crossed separately, from Perfect Pass) as "open but easy to
-- navigate." Corrected the hazard text to attribute each observation to the
-- correct glacier. Recommend a human re-check the primary NPS page directly
-- once accessible, given the 403.
UPDATE routes
SET hazards = jsonb_set(
  hazards, '{4}',
  '"Route passes near Whatcom Glacier, reported down to bare ice with a shallow crevasse crossing by late August (2017 NPS climbing ranger account) -- the adjacent Challenger Glacier, crossed separately from Perfect Pass, had crevasses described as open but easy to navigate on that same trip."'::jsonb,
  false
)
WHERE id = 'wa_north_ridge_2'
  AND hazards->>4 = 'Route passes near Challenger Glacier crevasse terrain, reported increasingly bare-ice/crevassed by late August (2017 NPS ranger account)';

-- wa_north_ridge_2: also appended a corrections note (see below) on the
-- unresolved "original first ascent via the North Ridge" framing.
UPDATE routes
SET corrections = corrections || ' 2026-07-31: the 1936 Berry/Buchanan first ascent of Whatcom Peak itself is well corroborated, but no accessible source specifically ties that ascent to the North Ridge line (as opposed to another route) -- flagged for human review, not corrected, since the peak-level FA is not in question, only which line it climbed.'
WHERE id = 'wa_north_ridge_2'
  AND corrections = 'General exposure/roping behavior verified by trip reports, but no specific rack was published.';

-- Flagged, not fixed (Whatcom Peak):
-- wa_north_ridge_2: `fa` calls the North Ridge "the original first ascent
--   of Whatcom Peak." The 1936 Berry/Buchanan ascent of the peak itself is
--   solidly corroborated (Wikipedia and others), but no source found ties
--   that ascent to this specific ridge line rather than another route
--   (e.g. the South Side line via Perfect Pass). Left as-is pending a
--   source (Beckey's Cascade Alpine Guide text itself) that confirms the
--   line.

-- =========================================================================
-- Cutthroat Peak
-- =========================================================================

-- wa_north_ridge_3: audited clean overall. FA party/date (Fred Beckey, Jim
-- Crooks, and a third climber, August 19 1940), summit elevation (8065 ft,
-- 1 ft off an 8066 ft independent figure -- immaterial), the SR-20 pullout
-- approach via State Creek, and the II-III/5.7/8-pitch grade are all
-- consistent with independent sources. Two minor details flagged rather
-- than changed:

-- Flagged, not fixed (Cutthroat Peak):
-- wa_north_ridge_3: the third 1940 FA climber's surname ("Ed Kenney") could
--   not be confirmed -- searches repeatedly surfaced "Ed Kennedy" instead,
--   but no primary source (AAC Journal archive, Beckey's guidebook text)
--   was reachable to settle the spelling either way. Left as-is.
-- wa_north_ridge_3: the descent's rappel count ("4-5 rappels" on the West
--   Ridge line) is higher than at least one independently found description
--   of that same descent (two 30m rappels plus downclimbing). Not
--   corrected -- both figures could reflect real party-to-party variation
--   depending on which anchors are used, and no single authoritative source
--   settled on a specific count.

-- =========================================================================
-- Primus Peak
-- =========================================================================

-- wa_north_ridge_4: audited clean; existing data-quality gap stands
-- unchanged. Summit elevation (8508 ft), the Thunder Creek Trailhead
-- coordinates/elevation, and the McAllister Camp -> Tricouni ridge ->
-- Borealis Glacier -> Lucky Pass (7200 ft) approach are all independently
-- confirmed. The FA ("1986", previously flagged as "Mark Bebie, unconfirmed
-- details") is circumstantially well supported this pass -- an AAC
-- Publications 1987 American Alpine Journal entry titled "Travel in the
-- Austera Peak Region and Primus Peak, North Ridge" matches the expected
-- one-year reporting lag, and a separate AAC obituary confirms Mark Bebie
-- was an active North Cascades first-ascensionist in this exact era -- but
-- the AAJ article's text itself could not be read to confirm authorship, so
-- the existing "needs more research" flag is left in place rather than
-- marked resolved.

-- =========================================================================
-- Colchuck Peak
-- =========================================================================

-- wa_northeast_buttress_4: `fa` ("Mark Weigelt and Julie Brugger, 1970") is
-- a confirmed misattribution -- classic cross-peak contamination between
-- neighboring summits. Mark Weigelt's documented 1970 first ascent is
-- Backbone Ridge on Dragontail Peak (the adjacent summit), climbed with
-- John Bonneville, not with anyone named Julie Brugger, and not on
-- Colchuck's Northeast Buttress (independently confirmed via Climbing.com,
-- an AAC Publications listing for "Dragontail, Backbone Ridge", and
-- SummitPost). No source found gives an actual, correctly-attributed FA
-- party/date for Colchuck Peak's Northeast Buttress itself (available
-- sources reference "the Beckey route" and "the Kearney route" without a
-- dated FA credit) -- so rather than guess a replacement, the field is set
-- to note the fact is unverified and explain why the old value was wrong.
UPDATE routes
SET fa = 'Not documented in sources checked (previously listed here as "Mark Weigelt and Julie Brugger, 1970" -- that is actually the FA of Dragontail Peaks Backbone Ridge, climbed by Weigelt and John Bonneville, a different route on the neighboring peak; corrected 2026-07-31 pending a source for this routes actual FA)',
    corrections = corrections || ' 2026-07-31: fa field corrected -- see the field itself for detail. The Weigelt/Brugger/1970 credit previously stored here belongs to Dragontail Peaks Backbone Ridge, not this route.'
WHERE id = 'wa_northeast_buttress_4'
  AND fa = 'Mark Weigelt and Julie Brugger, 1970';
