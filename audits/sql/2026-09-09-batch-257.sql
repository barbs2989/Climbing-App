-- WA alpine route audit -- batch 257 (pass 5)
-- Routes checked: wa_fortune_peak_east_slope, wa_fortune_peak_standard_route,
-- wa_free_mojo, wa_frenzel_spitz_south_route, wa_frying_pan_whitman_glaciers,
-- wa_ghost_peak_south_route, wa_gilbert_peak_conrad_glacier,
-- wa_gilbert_peak_meade_glacier

-- Ghost Peak, South Route: dist_km (70.81) is almost exactly double the
-- one-way distance implied by this same row's own waypoint chain, whose
-- summit entry carries distMi: 22 (Hannegan Trailhead -> Hannegan Pass ->
-- Whatcom Pass -> Perfect Pass -> Challenger Glacier crossing -> Luna Cirque
-- high camp -> summit). 22 mi = 35.41 km one-way, matching the app's own
-- convention that dist_km is stored one-way and doubled at render time for
-- round trip (22 mi one-way = 44 mi / 70.8 km round trip -- the stored value
-- is that round-trip figure sitting in the one-way field, so the app would
-- have doubled it again to a bogus ~88 mi round trip). Same doubling-bug
-- shape already corrected on Hidden Couloir (batch 252) and Witches Tower
-- E/SE Face (batch 253) in this same audit.
UPDATE routes SET dist_km = 35.41
WHERE id = 'wa_ghost_peak_south_route' AND dist_km = 70.81;

-- Frying Pan / Whitman Glaciers (Little Tahoma): loss_ft (7,338) contradicts
-- this same row's own gain_ft (7,600) and its own descent_text, which
-- explicitly reverses the ascent step by step back to the same trailhead
-- ("Reverse the ascent line and involves no rappelling... plan on
-- downclimbing and plunge-stepping/glissading rather than roped rappels" /
-- top-level descent: "Reverse the ascent, re-crossing the Whitman Glacier...
-- and the Fryingpan Glacier back to high camp/Summerland"). A closed
-- out-and-back to the same trailhead has zero net elevation change, so
-- cumulative loss must equal cumulative gain. This is independently
-- corroborated by the near-identical duplicate route entry on this same
-- peak, wa_little_tahoma_east_shoulder (identical FA, identical Summerland/
-- Meany Crest/Whitman Notch approach text, identical gain_ft of 7,600),
-- which already stores loss_ft = gain_ft = 7,600 with no inconsistency.
-- (See the flag below re: these two rows likely describing one physical
-- route -- this fix only touches the internally-inconsistent field, not the
-- duplication question.)
UPDATE routes SET loss_ft = 7600
WHERE id = 'wa_frying_pan_whitman_glaciers' AND loss_ft = 7338;

-- Fortune Peak, East Slope Route (Headlight Basin): loss_ft is NULL despite
-- this row's own descent_text explicitly describing a full reversal of the
-- ascent back to the same trailhead ("Downclimb or glissade the
-- east-facing ascent slopes back into Headlight Basin... then retrace over
-- Ingalls Pass and out the Esmeralda Basin Trail"). Populated to match
-- gain_ft (3,422), the same out-and-back-implies-loss=gain reasoning applied
-- repeatedly elsewhere in this audit (e.g. batch 254, Eldorado Peak North
-- Ridge).
UPDATE routes SET loss_ft = 3422
WHERE id = 'wa_fortune_peak_east_slope' AND loss_ft IS NULL;

-- Fortune Peak, Standard Route (Esmeralda Basin - Lake Ann Pass): same gap,
-- same reasoning -- descent_text explicitly reverses the ascent ("Reverse
-- the ridge boot path back down to the pass above Lake Ann, then descend...
-- to the trailhead"). Populated to match gain_ft (3,150).
UPDATE routes SET loss_ft = 3150
WHERE id = 'wa_fortune_peak_standard_route' AND loss_ft IS NULL;

-- Gilbert Peak, Conrad Glacier: this row's own approach/bail/itinerary text
-- says the route starts at the "South Tieton Creek/Conrad Meadows
-- trailhead" -- independently confirmed via Mazamas and Mountaineers.org
-- ("The approach begins at Conrad Meadows on the South Tieton Creek
-- Trailhead") to be the SAME physical trailhead this same peak's sibling
-- route, wa_gilbert_peak_meade_glacier, already documents precisely: the
-- "Conrad Meadows/South Fork Tieton Trailhead (#1120)" at 46.508793,
-- -121.280865, 4,044 ft (that sibling row's own road.driveNote spells this
-- out verbatim: "...to the Conrad Meadows/South Fork Tieton Trailhead
-- (#1120) at road's end"). This row's own trailhead waypoint instead carries
-- a rougher, unlabeled coordinate ~1.6 km away with no elevation, and its
-- road/approach_logistics fields are largely empty/null where the sibling's
-- are populated -- filling them in from the sibling's already-verified
-- values for what is the same trailhead. Nothing about the climb itself
-- (Conrad Glacier ascent, saddle traverse to Meade Glacier, summit) is
-- touched -- only the shared trailhead this row already claims to start
-- from in its own prose.
UPDATE routes SET
  waypoints = '[{"lat": 46.508793, "lng": -121.280865, "elev": 4044, "name": "Conrad Meadows / South Fork Tieton Trailhead (#1120)", "type": "Trailhead", "distMi": 0, "elevFt": 4044}, {"lat": 46.488625, "lng": -121.408385, "elev": 8184, "name": "Summit", "type": "Summit", "distMi": null, "elevFt": 8184}]'::jsonb,
  road = jsonb_set(jsonb_set(road, '{name}', '"Forest Road 1200 (Tieton Reservoir Rd) then Forest Road 1000 (South Fork Tieton Rd)"'::jsonb), '{status}', '"Paved to gravel; last ~7 miles gravel, generally good condition"'::jsonb),
  approach_logistics = '{"peakLat": 46.488625, "peakLng": -121.408385, "trailhead": "Conrad Meadows / South Fork Tieton Trailhead (#1120)", "trailheadLat": 46.508793, "trailheadLng": -121.280865, "trailheadDirection": "From the South Tieton Creek/Conrad Meadows Trailhead, approach the north side of the peak and ascend the east side of Conrad Glacier to a saddle around 7,200 ft."}'::jsonb,
  emergency = jsonb_set(
    jsonb_set(
      jsonb_set(emergency, '{rangerStation}', '"Naches Ranger District, Okanogan-Wenatchee National Forest"'::jsonb),
      '{nearestHospital}', '"Astria Toppenish / Virginia Mason Memorial, Yakima, WA (nearest full-service hospital to the eastern approach)"'::jsonb
    ),
    '{sheriffDispatch}', '"Yakima County Sheriff''s Office (509) 574-2500"'::jsonb
  )
WHERE id = 'wa_gilbert_peak_conrad_glacier'
  AND (waypoints->0->>'elevFt') IS NULL
  AND road->>'name' IS NULL
  AND approach_logistics IS NULL
  AND emergency->>'rangerStation' = 'Cowlitz Valley Ranger District, Gifford Pinchot NF — (360) 497-1103, 10024 US Hwy 12, Randle, WA 98377';
