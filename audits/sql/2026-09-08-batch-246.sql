-- WA alpine audit batch 246 (pass 5)
-- Routes: wa_burgundy_spire_north_face, wa_burnt_boot_peak_north_ridge,
-- wa_cardinal_peak_nw_couloir_north_ridge, wa_cascade_peak_east_ridge,
-- wa_castle_peak_tatoosh_southeast_face, wa_cathedral_peak_pasayten_se_buttress,
-- wa_chair_bryant_traverse, wa_chair_peak_east_face

-- wa_cascade_peak_east_ridge: `approach_variants[0].notes` (the "Up the
-- Cascade-Johannesburg Couloir to the C-J col" approach) ended with "The East Ridge by
-- way of the C-J Couloir was first climbed in 1938 and is the most-used line on the
-- peak" -- this is Johannesburg Mountain's history, not Cascade Peak's. Independent
-- WebSearch (Mountaineers.org trip report, Wikipedia/Johannesburg Mountain, and a
-- CascadeClimbers.com TR literally titled "Johannesburg Mountain and Cascade Peak - CJ
-- Couloir to East Ridge and NW Chimney") confirms Johannesburg Mountain was first
-- climbed July 26, 1938 by Calder Bressler, Bill Cox, Ray W. Clough and Tom Myers via
-- its own East Ridge/C-J Couloir route (aka "Doug's Direct") -- a route up the OTHER
-- peak flanking the shared col, not up Cascade Peak. This row's own `fa` field already
-- correctly credits Cascade Peak's actual first ascent to Fred Beckey, Pete Schoening
-- and Phil Sharpe on July 23, 1950 (also externally confirmed via Wikipedia), so the
-- 1938 sentence directly contradicts the row's own verified FA. It is exactly the
-- residual conflation this row's own `data_quality.gaps` entry already warns about
-- ("...may still reference the prior conflated Johannesburg Mountain content"). Removed
-- the one erroneous closing sentence; the rest of the paragraph (approach description,
-- hazards) is unchanged and does describe Cascade Peak's own C-J Couloir approach.
UPDATE routes
SET approach_variants = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'name' = 'Up the Cascade-Johannesburg Couloir to the C-J col'
      THEN jsonb_set(
        elem,
        '{notes}',
        to_jsonb(
          E'The East Ridge is reached from the Cascade-Johannesburg col, and the direct way there is to climb the couloir that names it. The start is the Cascade Pass trailhead at about 3,600 ft: walk back down the road, drop the embankment into the valley, cross the Cascade River, and go over the moraine onto the couloir apron at roughly 3,300 ft — about twenty minutes from leaving the road. Then roughly 3,000 ft of booting to the col.\n\nThis is the fast way and the dangerous way. The couloir carries rock and ice fall from the Sill hanging glacier above, and the snow goes discontinuous where it narrows as the season progresses, so it is an early-season proposition.'
        )
      )
      ELSE elem
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(approach_variants) WITH ORDINALITY AS t(elem, ord)
)
WHERE id = 'wa_cascade_peak_east_ridge'
  AND approach_variants @> '[{"name": "Up the Cascade-Johannesburg Couloir to the C-J col"}]'::jsonb
  AND (approach_variants -> 0 ->> 'notes') LIKE '%first climbed in 1938 and is the most-used line on the peak%';


-- wa_castle_peak_tatoosh_southeast_face, fix 1 of 2: the `waypoints` summit entry
-- ("The Castle summit (true/northernmost ridge)") stores elev/elevFt of 6640 ft, 200 ft
-- above this row's own `high_point_ft` of 6440. Independently verified via WebSearch
-- (Wikipedia "The Castle (Washington)"): The Castle, Tatoosh Range, Mount Rainier
-- National Park, is 6,440 ft (1,963 m) -- matching this row's high_point_ft exactly and
-- contradicting only the waypoint's own elevation figures. Corrected the summit
-- waypoint's elev/elevFt to 6440 to agree with the row's own (externally-verified)
-- high_point_ft; nothing else on this waypoint (coordinates, name, type) changes.
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'name' = 'The Castle summit (true/northernmost ridge)'
      THEN jsonb_set(jsonb_set(elem, '{elev}', '6440'), '{elevFt}', '6440')
      ELSE elem
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(waypoints) WITH ORDINALITY AS t(elem, ord)
)
WHERE id = 'wa_castle_peak_tatoosh_southeast_face'
  AND waypoints @> '[{"name": "The Castle summit (true/northernmost ridge)", "elev": 6640, "elevFt": 6640}]'::jsonb;

-- wa_castle_peak_tatoosh_southeast_face, fix 2 of 2: `access._raw` is a leftover
-- scratch/source sub-object that describes a completely different peak -- altitude
-- "8,343 feet" (this row's own high_point_ft is 6,440 ft), land manager "USFS
-- Okanogan-Wenatchee National Forest - north Cascades Ranger District" (this row's
-- correctly-populated top-level access.landManager is "National Park Service (Mount
-- Rainier National Park)"), access routes "Provincial Park (north), PCT (west),
-- Freezeout Creek (east)" and hazards "Glacial terrain and ice sheets" / "Exposure on
-- North Face granite walls" -- none of which describes The Castle, a small
-- non-glaciated Tatoosh volcanic scramble peak reached from Reflection Lakes. This
-- reads as research/source data belonging to an unrelated North Cascades peak near the
-- Canadian border that was copy-pasted into this row during enrichment; the correctly
-- populated top-level access.* fields (landManager, land_manager, parking_pass, notes,
-- permit) for this row already describe Mount Rainier NP / Tatoosh correctly and are
-- unchanged. Removed the contaminated `_raw` sub-object rather than inventing a
-- replacement.
UPDATE routes
SET access = access - '_raw'
WHERE id = 'wa_castle_peak_tatoosh_southeast_face'
  AND access -> '_raw' ->> 'altitude' = '8,343 feet';


-- wa_chair_bryant_traverse: `disciplines` was ["alpine", "aid"]. Nothing on this row --
-- `gear`, `beta`, `pitch_detail` (which is null), `detailed_rack`, `what_to_bring`, or
-- the route's own `corrections` note (which explains at length that no canonical source
-- for this route's grade/pitch data was found) -- mentions aid climbing in any form;
-- the route is described throughout as 4th-to-low-5th-class ridge scrambling with a
-- single ~50 ft rappel off Bryant. This looks like a stray/default tag rather than a
-- researched fact, and no external source exists to adjudicate it either way (the row's
-- own corrections field already establishes that no dedicated page for this exact route
-- name was found on Mountain Project/SummitPost/Peakbagger). Removed the unsupported
-- "aid" tag; "alpine" (matching the row's own top-level `discipline` field) is
-- untouched.
UPDATE routes
SET disciplines = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(disciplines) WITH ORDINALITY AS t(elem, ord)
  WHERE elem <> '"aid"'
)
WHERE id = 'wa_chair_bryant_traverse'
  AND disciplines = '["alpine", "aid"]'::jsonb;


-- wa_burgundy_spire_north_face: confirmed clean. FA (Fred Beckey party, 1953, 3-day
-- aid/fixed-rope ascent, later free-climbed at 5.8 through a discovered "tunnel" at
-- Burgundy Ledge) independently corroborated via WebSearch (SummitPost, LemkeClimbs).
-- Elevation, waypoints, gpx track (551 points tracing a real approach line, endpoints
-- matching the trailhead waypoint), rappel/pitch detail, and the route's own
-- `corrections` field (already documenting a prior verification pass against
-- thepeakoftheweek.com/StephAbegg.com/Mountain Project) are all internally consistent.
-- No changes.

-- wa_burnt_boot_peak_north_ridge: confirmed clean. FA party (Don Williamson, Bill
-- Bucher, Tom Oas) and the near-verbatim first-ascent account (three leads of class 5
-- granite to a sharp crest, three leads of class 3-4 to the summit; only prior register
-- entry was the 1963 survey-party first ascent) independently confirmed via an AAC
-- Publications article titled "Burnt Boot Peak, North Ridge." Peak elevation (6,540 ft)
-- and summit coordinates independently confirmed via listsofjohn.com, matching this
-- row's waypoint to 4-5 decimal places. The row's own hedge on the exact climb year
-- ("reported 1972...may have been the preceding season") is left as-is since no source
-- found pins the date more precisely. No changes.

-- wa_cardinal_peak_nw_couloir_north_ridge: confirmed clean. Sparse by design (FA,
-- grade, pitches, gain/loss all correctly left null, matching the route's own
-- `corrections`-equivalent honesty about limited documentation for this alternate
-- line); approach_logistics trailhead coordinates match the sole waypoint exactly. No
-- changes.

-- wa_cathedral_peak_pasayten_se_buttress: confirmed clean. Peak elevation (8,606 ft)
-- and the peak's overall FA (Carl W. Smith and George O. Smith, 1901, easier scramble
-- line, distinct from this row's own 1973 Southeast Buttress FA) independently
-- confirmed via WebSearch (Wikipedia). `access._raw` content (Pasayten Wilderness,
-- Andrews Creek/Chewuch River/Boundary Trail approaches, Okanogan-Wenatchee NF) is
-- internally consistent with this row's own approach/road/access fields, unlike the
-- contaminated Castle Peak _raw block above. No changes.

-- wa_chair_peak_east_face: confirmed clean. FA (Don Blair and Art Winder, September 30,
-- 1933) independently confirmed via WebSearch (SummitPost route history), and Chair
-- Peak's elevation (6,238 ft) independently confirmed via Wikipedia/Facebook (Summit at
-- Snoqualmie), matching this row's high_point_ft and both waypoint summits (this row
-- and the sibling Chair-Bryant Traverse) exactly. No changes.
