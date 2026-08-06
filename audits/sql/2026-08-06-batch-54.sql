-- WA alpine audit -- pass 2, batch 3 (batch #54 overall) -- 2026-08-06
-- Routes: wa_austera_peak, wa_austera_peak_chockstone_route, wa_austera_peak_southwest_ridge
--         (Austera Peak), wa_bacon_peak_diobsud (Bacon Peak),
--         wa_bear_mountain_chilliwack_north_buttress (Bear Mountain, Chilliwack Range),
--         wa_beckey_davis (Prusik Peak), wa_beckey_tate (Big Kangaroo),
--         wa_beyond_redlining (Morning Star Peak),
--         wa_big_four_mountain_northwest_ridge / _spindrift_couloir (Big Four Mountain)
-- Researched via 7 parallel agents, one per peak. See audits/wa-alpine-audit-log.md for
-- the full writeup. Every confirmed fix's current value was re-verified against a fresh
-- full-row fetch of the live DB immediately before this file was written. All WHERE
-- clauses include the current (wrong) value as a safety check per project convention;
-- jsonb fields use containment (@>) checks rather than text equality to avoid
-- formatting/precision mismatches.

-- =========================================================================
-- Austera Peak, Southwest Ridge (wa_austera_peak_southwest_ridge) -- data_quality.gaps
-- claims "No public GPS track found for this route as of this research pass," but this
-- same row's own gpx field holds a populated 325-point track. Removing the stale claim.
-- =========================================================================
UPDATE routes
SET data_quality = jsonb_set(
      data_quality, '{gaps}',
      (SELECT jsonb_agg(g) FROM jsonb_array_elements(data_quality->'gaps') AS g
       WHERE g <> '"No public GPS track found for this route as of this research pass."')
    )
WHERE id = 'wa_austera_peak_southwest_ridge'
  AND data_quality->'gaps' @> '["No public GPS track found for this route as of this research pass."]'::jsonb;

-- =========================================================================
-- Austera Peak, Southwest Ridge (wa_austera_peak_southwest_ridge) -- waypoints[0]
-- ("Eldorado Creek Trailhead") holds lat/lng 48.5136/-121.1964, which contradicts this
-- same row's own approach_logistics.trailheadLat/Lng (48.49261/-121.11761) for the
-- identical physical trailhead, and contradicts the sibling route wa_austera_peak's
-- matching waypoint (48.4926/-121.1176) for the same trailhead. Correcting to the
-- coordinates both other on-file sources agree on.
-- =========================================================================
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{0,lat}', '48.49261'),
      '{0,lng}', '-121.11761'
    )
WHERE id = 'wa_austera_peak_southwest_ridge'
  AND waypoints @> '[{"lat": 48.5136, "lng": -121.1964, "name": "Eldorado Creek Trailhead"}]'::jsonb;

-- =========================================================================
-- Bacon Peak (wa_bacon_peak) -- area elevation_ft (7067) and prominence_ft (2512)
-- disagree with Wikipedia, Wikidata (Q4839936), and Peakbagger (pid 1644), which all
-- independently converge on 7,070 ft / 2,505 ft. elevation_ft is also internally
-- inconsistent with this peak's own route: wa_bacon_peak_diobsud's high_point_ft and
-- its summit waypoint elevFt are both already 7070.
-- =========================================================================
UPDATE areas
SET elevation_ft = 7070, prominence_ft = 2505
WHERE id = 'wa_bacon_peak' AND elevation_ft = 7067 AND prominence_ft = 2512;

-- =========================================================================
-- Bear Mountain, North Buttress (wa_bear_mountain_chilliwack_north_buttress) --
-- approach_logistics.trailheadLat/Lng (48.9583/-121.6417) does not match the real
-- Hannegan Pass Trailhead. This same row's own waypoints[0] entry for the identical
-- trailhead already holds the correct coordinates (48.9101/-121.5927), matching WTA
-- and Trailforks.
-- =========================================================================
UPDATE routes
SET approach_logistics = jsonb_set(
      jsonb_set(approach_logistics, '{trailheadLat}', '48.9101'),
      '{trailheadLng}', '-121.5927'
    )
WHERE id = 'wa_bear_mountain_chilliwack_north_buttress'
  AND approach_logistics @> '{"trailheadLat": 48.9583, "trailheadLng": -121.6417}'::jsonb;

-- =========================================================================
-- Prusik Peak, Beckey-Davis (wa_beckey_davis) -- access._raw.group_size_limits says
-- "Maximum party 12 people," contradicting this same row's own access.rules/
-- access.group_limit (8), and Recreation.gov's published Enchantment Permit Area cap
-- of 8 people per overnight group.
-- =========================================================================
UPDATE routes
SET access = jsonb_set(access, '{_raw,group_size_limits}', '"Maximum party 8 people"')
WHERE id = 'wa_beckey_davis'
  AND access->'_raw'->>'group_size_limits' = 'Maximum party 12 people';

-- =========================================================================
-- Prusik Peak, Beckey-Davis (wa_beckey_davis) -- waypoints[0] is labeled "Snow Lakes
-- Trailhead," but its coordinates (47.527315/-120.820942) match this same row's own
-- approach_logistics.trailheadLat/Lng for Stuart Lake Trailhead (47.5282/-120.82036,
-- ~70m away -- survey/rounding-level agreement), not the real Snow Lakes Trailhead,
-- which is a separate location ~4 mi from Leavenworth on Icicle Creek Road. Relabeling
-- to match the coordinates actually stored.
-- =========================================================================
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(
    CASE WHEN elem->>'name' = 'Snow Lakes Trailhead'
      THEN jsonb_set(
             jsonb_set(elem, '{name}', '"Stuart Lake Trailhead"'),
             '{note}',
             '"End of FR-7601 off Icicle Creek Road -- the standard/preferred access to Prusik Peak via Colchuck Lake and Aasgard Pass into the Core Enchantments. These coordinates are Stuart Lake Trailhead -- not the separate Snow Lakes Trailhead near Leavenworth that this record previously named here."'
           )
      ELSE elem
    END
  )
  FROM jsonb_array_elements(waypoints) AS elem
)
WHERE id = 'wa_beckey_davis'
  AND waypoints @> '[{"name": "Snow Lakes Trailhead", "lat": 47.527315, "lng": -120.820942}]'::jsonb;

-- =========================================================================
-- Prusik Peak, Beckey-Davis (wa_beckey_davis) -- length_m (198, ~650 ft) contradicts
-- this same row's own rope_note ("6 pitches, 700ft..."), and SummitPost/StephAbegg
-- both independently give 700 ft for this route.
-- =========================================================================
UPDATE routes
SET length_m = 213
WHERE id = 'wa_beckey_davis' AND length_m = 198;

-- =========================================================================
-- Big Kangaroo, Beckey-Tate (wa_beckey_tate) -- itinerary.days[0].gainFt/lossFt (2800)
-- and itinerary.totalNote ("2,800 ft gain") contradict this same row's own top-level
-- gain_ft/loss_ft (3166), which itself is independently verified: the route's own
-- approach text gives the Hairpin Turn trailhead at 5,160 ft and the summit at 8,326
-- ft (5160 -> 8326 = 3166 ft), matching gain_ft exactly. The itinerary's 2,800 is the
-- outlier.
-- =========================================================================
UPDATE routes
SET itinerary = jsonb_set(
      jsonb_set(
        jsonb_set(itinerary, '{days,0,gainFt}', '3166'),
        '{days,0,lossFt}', '3166'
      ),
      '{totalNote}',
      to_jsonb(replace(itinerary->>'totalNote', '2,800 ft gain', '3,166 ft gain'))
    )
WHERE id = 'wa_beckey_tate'
  AND itinerary->'days' @> '[{"gainFt": 2800, "lossFt": 2800}]'::jsonb;

-- =========================================================================
-- Morning Star Peak, Beyond Redlining (wa_beyond_redlining) -- overview text says the
-- route was "Established by Rad Roberts and Kurt Hicks in July 2020," contradicting
-- this same row's own fa field ("Rad Roberts and Kurt Hicks, May 2020") and AAC
-- Publications, which both give the first ascent as May 29, 2020.
-- =========================================================================
UPDATE routes
SET overview = replace(
      overview,
      'Established by Rad Roberts and Kurt Hicks in July 2020,',
      'Established by Rad Roberts and Kurt Hicks in May 2020,'
    )
WHERE id = 'wa_beyond_redlining'
  AND overview LIKE '%Established by Rad Roberts and Kurt Hicks in July 2020,%';

-- =========================================================================
-- Morning Star Peak (wa_morning_star_peak) -- area prominence_ft (1000) disagrees with
-- Wikipedia and peak-database sources, which consistently give 980 ft.
-- =========================================================================
UPDATE areas
SET prominence_ft = 980
WHERE id = 'wa_morning_star_peak' AND prominence_ft = 1000;

-- =========================================================================
-- Big Four Mountain (wa_big_four_mountain) -- area prominence_ft (1150) disagrees with
-- Wikipedia, listsofjohn.com, and peakery.com, which all independently converge on
-- 1,080 ft (parent peak Vesper Peak, 6,214 ft).
-- =========================================================================
UPDATE areas
SET prominence_ft = 1080
WHERE id = 'wa_big_four_mountain' AND prominence_ft = 1150;

-- =========================================================================
-- Big Four Mountain, Spindrift Couloir (wa_big_four_mountain_spindrift_couloir) --
-- max_angle (90) contradicts this same row's own beta text ("drytooling moves up to
-- roughly 95-degree angles") and the AAC/American Alpine Journal first-ascent report,
-- which explicitly grades the route "IV+ 5.9 95°" (Bart Paull & Doug Littauer, March
-- 2, 1996).
-- =========================================================================
UPDATE routes
SET max_angle = 95
WHERE id = 'wa_big_four_mountain_spindrift_couloir' AND max_angle = 90;
