-- WA alpine audit -- pass 2, batch 4 (batch #55 overall) -- 2026-08-06
-- Routes: wa_big_kangaroo_west_face (Big Kangaroo),
--         wa_big_snow_mountain_east_ridge_hardscrabble_route / _north_slope_dingford_route
--         (Big Snow Mountain), wa_black_peak_east_buttress / _northeast_ridge (Black Peak),
--         wa_bonanza_peak_mary_green_glacier / _north_ridge / _northeast_buttress
--         (Bonanza Peak), wa_booker_mountain_northeast_face (Booker Mountain),
--         wa_boston_peak_southeast_face (Boston Peak)
-- Researched via 6 parallel agents, one per peak. See audits/wa-alpine-audit-log.md for
-- the full writeup. Every confirmed fix's current value was re-verified against a fresh
-- full-row fetch of the live DB immediately before this file was written. All WHERE
-- clauses include the current (wrong) value as a safety check per project convention;
-- jsonb fields use containment (@>) checks rather than text equality to avoid
-- formatting/precision mismatches.

-- =========================================================================
-- Big Kangaroo, West Face (wa_big_kangaroo_west_face) -- partner_requirements.approachTime
-- claims an 11.5 hr car-to-car day, contradicting three other fields on the same row
-- (timing.totalHrs=7, turnaround, itinerary.totalNote) which all independently agree on
-- roughly 6-8 hrs.
-- =========================================================================
UPDATE routes
SET partner_requirements = jsonb_set(
      partner_requirements, '{approachTime}',
      to_jsonb($$Off-trail approach of roughly 2-3 hrs to the base via Early Winters Creek and the west-face gullies; total car-to-car day is about 6-8 hrs per existing route timing data$$::text)
    )
WHERE id = 'wa_big_kangaroo_west_face'
  AND partner_requirements->>'approachTime' = 'Off-trail approach of roughly 2-3 hrs to the base via Early Winters Creek and the west-face gullies; total car-to-car day is about 11.5 hrs per existing route timing data';

-- =========================================================================
-- Big Kangaroo, West Face (wa_big_kangaroo_west_face) -- waypoints[0] ("Hairpin Turn
-- Pullout") holds lat/lng 48.5269/-120.6506 and a note claiming it is "~0.9 mi west of
-- Washington Pass." This contradicts the route's own approach text ("~1 mile east of
-- Washington Pass, near milepost 163"), its own approach_logistics.trailheadLat/Lng
-- (48.51454/-120.64332), and the CalTopo-sourced GPX track's first point
-- (48.514131/-120.642886) -- all three agree on the east-side location.
-- =========================================================================
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(
        jsonb_set(waypoints, '{0,lat}', '48.51454'),
        '{0,lng}', '-120.64332'
      ),
      '{0,note}',
      to_jsonb($$Large pullout on the outside of the SR-20 hairpin switchback ~1 mi east of Washington Pass; no permit required to park.$$::text)
    )
WHERE id = 'wa_big_kangaroo_west_face'
  AND waypoints @> '[{"lat": 48.5269, "lng": -120.6506, "name": "Hairpin Turn Pullout (SR-20)"}]'::jsonb;

-- =========================================================================
-- Big Snow Mountain (wa_big_snow_mountain) -- area prominence_ft (1402) disagrees with
-- Wikipedia, SummitPost, and Peakbagger-indexed sources, which converge on 1,360 ft.
-- The area's own blurb text ("3.75 mi to the ESE" isolation to parent Overcoat Peak)
-- is consistent with the 1,360 ft figure.
-- =========================================================================
UPDATE areas
SET prominence_ft = 1360
WHERE id = 'wa_big_snow_mountain' AND prominence_ft = 1402;

-- =========================================================================
-- Black Peak, Northeast Ridge (wa_black_peak_northeast_ridge) -- approach_logistics
-- .trailhead/trailheadLat/trailheadLng describe "Lake Ann Trailhead (SR-542)" at
-- 48.8500241/-121.6861633 -- the Lake Ann trailhead on Mount Baker Highway (SR-542)
-- near Artist Point, ~49 miles from this peak. The route's own approach_logistics
-- .trailheadDirection field, its waypoints[0], and external sources (WTA, The
-- Mountaineers) all agree the real trailhead is Rainy Pass/Lake Ann-Maple Pass on SR-20.
-- =========================================================================
UPDATE routes
SET approach_logistics = jsonb_set(
      jsonb_set(
        jsonb_set(approach_logistics, '{trailhead}', to_jsonb($$Rainy Pass / Lake Ann-Maple Pass Trailhead (SR-20)$$::text)),
        '{trailheadLat}', '48.5182'
      ),
      '{trailheadLng}', '-120.7339'
    )
WHERE id = 'wa_black_peak_northeast_ridge'
  AND approach_logistics @> '{"trailhead": "Lake Ann Trailhead (SR-542)", "trailheadLat": 48.8500241, "trailheadLng": -121.6861633}'::jsonb;

-- =========================================================================
-- Bonanza Peak (wa_bonanza_peak) -- area blurb misspells first-ascensionist "Curtis
-- Ijames" as "Curtis James" and wrongly credits the 1937 FA to "what's now the standard
-- Mary Green Glacier route." Sources (Wikipedia's Company Glacier page, corroborating
-- search results) agree the 1937 party (Ijames, James, Leuthold) summited via the
-- Company Glacier on the peak's north side, not the Mary Green Glacier on the east side.
-- =========================================================================
UPDATE areas
SET blurb = $$Bonanza Peak (9,516') is the highest non-volcanic summit in Washington and the highpoint of Chelan County, rising deep in the Glacier Peak Wilderness above Lake Chelan. The peak is split into three summits (main, west, and southwest) and flanked by three glaciers — Mary Green (east), Company (north), and Isella (south). It's reached only by a multi-day approach: the Lady of the Lake ferry up Lake Chelan to Lucerne, a bus to the remote village of Holden, and miles of trail/off-trail travel to Holden Lake or Holden Pass. First climbed in 1937 by Curtis Ijames, Barrie James, and Joe Leuthold (Mazamas) via the Company Glacier on the peak's north side, the peak is also home to the historically significant 1975 Soviet Route on its southwest summit — one of the most notable big alpine rock routes in the North Cascades.$$
WHERE id = 'wa_bonanza_peak'
  AND blurb = $$Bonanza Peak (9,516') is the highest non-volcanic summit in Washington and the highpoint of Chelan County, rising deep in the Glacier Peak Wilderness above Lake Chelan. The peak is split into three summits (main, west, and southwest) and flanked by three glaciers — Mary Green (east), Company (north), and Isella (south). It's reached only by a multi-day approach: the Lady of the Lake ferry up Lake Chelan to Lucerne, a bus to the remote village of Holden, and miles of trail/off-trail travel to Holden Lake or Holden Pass. First climbed in 1937 by Curtis James, Barrie James, and Joe Leuthold (Mazamas) via what's now the standard Mary Green Glacier route, the peak is also home to the historically significant 1975 Soviet Route on its southwest summit — one of the most notable big alpine rock routes in the North Cascades.$$;

-- =========================================================================
-- Bonanza Peak, Mary Green Glacier (wa_bonanza_peak_mary_green_glacier) -- fa field
-- names the 1937 party correctly (aside from the same "Curtis James" typo) but wrongly
-- implies this route was the peak's first-ascent line. Per the same sources as above,
-- the 1937 FA actually climbed the Company Glacier on the north side, a different route.
-- =========================================================================
UPDATE routes
SET fa = $$Curtis Ijames, Barrie James, and Joe Leuthold (Mazamas), 1937 — this was NOT the peak's first-ascent line; the 1937 FA climbed the Company Glacier on the north side, a different route from this east-side Mary Green Glacier line.$$
WHERE id = 'wa_bonanza_peak_mary_green_glacier'
  AND fa = $$Curtis Ijames, Barrie James, and Joe Leuthold (Mazamas), 1937 — the peak's first ascent; this easiest line is widely regarded as the original route$$;

-- =========================================================================
-- Bonanza Peak, Mary Green Glacier (wa_bonanza_peak_mary_green_glacier) -- overview
-- repeats the same name typo and false FA-route attribution as the area blurb.
-- =========================================================================
UPDATE routes
SET overview = $$Bonanza Peak (9,516') is the highest non-volcanic summit in Washington and the highpoint of Chelan County. The Mary Green Glacier route is the peak's classic standard line, ascending its eastern side (the 1937 first ascent by Curtis Ijames, Barrie James, and Joe Leuthold of the Mazamas actually climbed the Company Glacier on the north side, a different line). Reached only via the Lady of the Lake ferry up Lake Chelan and the remote trail-and-boat village of Holden, the climb combines glacier travel and a moat crossing with a short, exposed Class 3-4 rock finish to a summit deep in the Glacier Peak Wilderness. From the Holden Campground trailhead it's roughly 14 miles round trip with about 6,300 ft of elevation gain to the summit, on top of the multi-day boat-and-trail approach just to reach that trailhead.$$
WHERE id = 'wa_bonanza_peak_mary_green_glacier'
  AND overview = $$Bonanza Peak (9,516') is the highest non-volcanic summit in Washington and the highpoint of Chelan County. The Mary Green Glacier route — first climbed in 1937 by Curtis James, Barrie James, and Joe Leuthold (Mazamas) — is the peak's classic standard line, ascending its eastern side. Reached only via the Lady of the Lake ferry up Lake Chelan and the remote trail-and-boat village of Holden, the climb combines glacier travel and a moat crossing with a short, exposed Class 3-4 rock finish to a summit deep in the Glacier Peak Wilderness. From the Holden Campground trailhead it's roughly 14 miles round trip with about 6,300 ft of elevation gain to the summit, on top of the multi-day boat-and-trail approach just to reach that trailhead.$$;

-- =========================================================================
-- Bonanza Peak, North Ridge (wa_bonanza_peak_north_ridge) -- overview contains
-- unrelated-peak content ("Bonanza Peak is the highest point in the Wenatchee
-- Mountains") that contradicts this row's own accurate Holden-Village waypoints and
-- Bonanza's real range placement (Chiwawa/Entiat region, not the Wenatchee Mountains).
-- Primary sources (Mountaineers, SummitPost, Mountain Project) don't document an
-- independent "North Ridge" line and describe the Mary Green Glacier as the standard
-- easiest route.
-- =========================================================================
UPDATE routes
SET overview = $$Bonanza Peak (9,516'), the highest non-volcanic peak in Washington and the highpoint of Chelan County, is reached only via the Lady of the Lake ferry to Lucerne and the Holden Village shuttle bus. Primary sources (Mountaineers, SummitPost, Mountain Project) do not document an independent "North Ridge" line; this entry tracks the peak's easiest scramble, which those sources describe as the Mary Green Glacier route on the east side.$$
WHERE id = 'wa_bonanza_peak_north_ridge'
  AND overview = $$Bonanza Peak is the highest point in the Wenatchee Mountains, a popular mountaineering objective. The North Ridge is the most direct approach to the summit, a straightforward Class 2 scramble over talus and low-angle rock with good routefinding.$$;

-- =========================================================================
-- Bonanza Peak, North Ridge (wa_bonanza_peak_north_ridge) -- beta describes an
-- unrelated trailhead/approach ("Middle Fork Snoqualmie trailhead"), contradicting this
-- row's own approach/descent fields and Bonanza's real Lake Chelan/Holden Village access.
-- =========================================================================
UPDATE routes
SET beta = $$From Holden Village, hike the Railroad Creek and Holden Lake trails to a camp at Holden Lake or Holden Pass, then rope up and cross the Mary Green Glacier to the upper northeast ridge notch just north of the summit, finishing on Class 3-4 rock. Descend the same route.$$
WHERE id = 'wa_bonanza_peak_north_ridge'
  AND beta = $$From the Middle Fork Snoqualmie trailhead, approach via the alpine meadows to the north ridge base. Follow the ridge crest, staying on solid rock and stable talus. Most routefinding is straightforward and well-marked by cairns. Descend the same route.$$;

-- =========================================================================
-- Booker Mountain, Northeast Face (wa_booker_mountain_northeast_face) -- road.status
-- claims SR 20 (North Cascades Highway) is "generally open year-round." SR 20 closes
-- every winter for avalanche danger (WSDOT, KOMO, Cascadia Daily, King5), and the
-- western closure gate has historically retreated to Colonial Creek Campground itself
-- (MP 130) -- this route's own trailhead -- once snow falls.
-- =========================================================================
UPDATE routes
SET road = jsonb_set(
      road, '{status}',
      to_jsonb($$Paved; SR 20 (North Cascades Highway) closes seasonally each winter (typically Dec-Apr) due to avalanche danger, and the closure gate has moved back to Colonial Creek Campground itself (MP 130) once snow arrives -- not open year-round. Check the WSDOT SR 20 pass-status page each season.$$::text)
    )
WHERE id = 'wa_booker_mountain_northeast_face'
  AND road->>'status' = 'Paved, generally open year-round';

-- =========================================================================
-- Booker Mountain, Northeast Face (wa_booker_mountain_northeast_face) -- access.seasonal
-- blames washout/closure risk on "Cascade River Road," which serves the unrelated
-- Marblemount -> Cascade Pass/Eldorado/Boston Basin corridor. This route's Colonial
-- Creek/Thunder Creek trailhead sits directly on SR 20 with no Cascade River Road
-- involvement (NPS Cascade River Road pages, WTA Thunder Creek Trail description).
-- The real seasonal-closure risk is SR 20 itself (see road.status fix above).
-- =========================================================================
UPDATE routes
SET access = jsonb_set(
      access, '{seasonal}',
      to_jsonb($$This route is reached via SR 20 (North Cascades Highway) directly at Colonial Creek Campground, not via Cascade River Road, which serves the separate Cascade Pass/Eldorado/Boston Basin trailheads from Marblemount and is unrelated to this approach. SR 20 itself closes seasonally each winter due to avalanche danger -- check the WSDOT SR 20 pass-status page each season.$$::text)
    )
WHERE id = 'wa_booker_mountain_northeast_face'
  AND access->>'seasonal' = 'Cascade River Road (the access road for these trailheads) has a history of washouts/closures — check current NPS road-conditions page each season.';
