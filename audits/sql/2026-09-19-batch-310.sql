-- WA alpine audit batch 310 (pass 6)
-- Routes: wa_baring_mountain_r1, wa_bear_mountain_chilliwack_north_buttress,
--         wa_beckey_davis, wa_beckey_tate, wa_beyond_redlining,
--         wa_big_four_mountain_northwest_ridge (no fix -- see log),
--         wa_big_four_mountain_spindrift_couloir, wa_big_kangaroo_west_face

-- =========================================================================
-- Baring Mountain, North Face -- wa_baring_mountain_r1
-- =========================================================================
-- bivy carried 8 entries sharing the whole Skykomish-corridor (Baring /
-- Mount Index / Merchant-Gunn / Grotto) trailhead cluster. Only two name
-- THIS route/peak: "Barclay Lake" ("Baring's north face and Dolomite Tower
-- are reached by leaving the trail and grinding up the south side of the
-- valley") and "Money Creek Campground" ("a sensible base for ... Baring
-- and the Barclay Creek peaks"). Removed: "Eagle Lake and the old cabin"
-- (explicitly "the line a climber coming off Merchant or Gunnshy would
-- use" -- the north side of the valley, opposite Baring's approach),
-- "Lake Serene basin ..." and "On-wall ledges, Jotunheim ..." and "Middle
-- Peak crest bivouac, Mount Index traverse" (all three explicitly Mount
-- Index, reached from a DIFFERENT trailhead, Lake Serene TH), "Beckler
-- River Campground" (explicitly serves Eagle Rock/Grotto Mountain via a
-- different road, FR 65 -- never mentions Baring), and "Troublesome Creek
-- Campground" (explicitly "the obvious base for Mount Index," names no
-- Baring use). gain_ft/loss_ft/dist_km/outing_shape already agree with
-- this row's own itinerary and waypoint chain -- not touched.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->5)
  WHERE id = 'wa_baring_mountain_r1'
  AND jsonb_array_length(bivy) = 8
  AND bivy->0->>'name' = 'Barclay Lake'
  AND bivy->1->>'name' = 'Eagle Lake and the old cabin'
  AND bivy->5->>'name' = 'Money Creek Campground';

-- =========================================================================
-- Bear Mountain (Chilliwack), North Buttress -- wa_bear_mountain_chilliwack_north_buttress
-- =========================================================================
-- dist_km (14.5 km / 9.0 mi) contradicts this row's OWN approach text,
-- which states outright: "(the route's recorded 30.58 km distance matches
-- this ~19-mile one-way haul)" -- a direct citation of what dist_km is
-- meant to say, describing the one-way approach to the Chilliwack Trail /
-- Bear Creek / NW-ridge-saddle high camp. Corroborated externally: a
-- WebSearch of Mountain Project/Mountaineers/AAC sources on the Hannegan
-- Pass approach confirms "roughly 17 miles" to Bear Creek camp alone
-- (before the additional cross-country stretch to the 6,480 ft saddle),
-- consistent with the row's own ~19-mile figure. Corrected to match the
-- row's own stated value rather than inventing a new one.
UPDATE routes SET dist_km = 30.58
  WHERE id = 'wa_bear_mountain_chilliwack_north_buttress'
  AND dist_km = 14.5;

-- outing_shape was null. descent_text explicitly reverses the approach
-- back to the Hannegan Pass Trailhead ("reverse the approach: regain the
-- saddle, ... rejoin the Chilliwack River Trail for the long hike back
-- over Hannegan Pass to the trailhead") -- an out-and-back to the same
-- trailhead.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_bear_mountain_chilliwack_north_buttress'
  AND outing_shape IS NULL;

-- FLAGGED, not fixed: this row's itinerary.days (9 mi / 3 mi / 9 mi = 21
-- mi total, itinerary.totalNote calling that "19-21 miles ROUND TRIP") is
-- internally inconsistent with the row's own waypoint chain, which places
-- the saddle high camp at a CUMULATIVE ONE-WAY distance of 21 mi from the
-- trailhead and the summit at 23 mi one-way -- i.e. the days/totalNote
-- figures appear to describe the ONE-WAY distance to camp as though it
-- were the whole round trip, understating the true round trip by roughly
-- half (closer to ~40-46 mi). The itinerary's day-by-day gainFt/lossFt sums
-- (7,300 / 6,250) also disagree with the row's own top-level gain_ft/
-- loss_ft (5,950 / 5,950, now dist_km-corrected above). A full day-by-day
-- rewrite needs more granular sourcing on where the true camp/summit
-- mileage splits fall than is available here -- left for human review
-- rather than guessed.

-- =========================================================================
-- Beckey-Davis (Prusik Peak) -- wa_beckey_davis
-- =========================================================================
-- bivy carried 6 entries for the shared Enchantments/Colchuck approach
-- cluster. Only two name Prusik Peak specifically: "Perfection Lake and
-- Inspiration Lake basin camps" ("The natural base for Prusik Peak's West
-- Ridge and South Face") and "Gnome Tarn" ("sits almost directly under
-- Prusik's south side ... shortest approach ... to the South Face routes"
-- -- this route's own waypoint chain also names Gnome Tarn directly, at
-- 8.0 mi). Removed: "Colchuck Lake designated campsites" and "Talus and
-- boulder bivies below Dragontail's north side" (both explicitly the base
-- for Backbone Ridge/Serpentine Arete/Colchuck Balanced Rock on Dragontail
-- Peak, not Prusik), "Shield Lake, north of Prusik Pass" (explicitly for
-- Prusik's WEST RIDGE only, on the opposite/north side of the pass from
-- this South Face route's own Gnome Tarn approach), and "Bridge Creek and
-- Eightmile campgrounds" (explicitly "most parties on Backbone Ridge,
-- Serpentine Arete or Colchuck Balanced Rock" -- not Prusik).
UPDATE routes SET bivy = jsonb_build_array(bivy->2, bivy->3)
  WHERE id = 'wa_beckey_davis'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Colchuck Lake designated campsites'
  AND bivy->2->>'name' = 'Perfection Lake and Inspiration Lake basin camps'
  AND bivy->3->>'name' = 'Gnome Tarn';

-- outing_shape was null. Approach is via Aasgard Pass from Stuart Lake TH;
-- descent_text ends "scramble around to the base of the West Ridge" (i.e.
-- back to the same south-face/Gnome Tarn base used on approach), which
-- then reverses the same Aasgard Pass approach back to the trailhead.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_beckey_davis'
  AND outing_shape IS NULL;

-- =========================================================================
-- Beckey-Tate (Big Kangaroo) -- wa_beckey_tate
-- =========================================================================
-- bivy carried 6 entries. Unlike the Prusik/Dragontail cluster above, the
-- Hairpin Turn pullout genuinely serves SEVERAL peaks from one trailhead
-- (this row's own entry 0 lists "Kangaroo Temple, Half Moon, Big Kangaroo,
-- Poster Peak" together), and this row's own waypoints pass through
-- Kangaroo Pass and the Half Moon-Big Kangaroo col named in entries 3/4 --
-- a shared-basin cluster is legitimate, not contamination. Only "Bench
-- Camp -- larch bench above the Wine Spires pullout" is genuinely foreign:
-- a DIFFERENT pullout (Wine Spires, not the Hairpin) serving Vasiliki
-- Ridge/Tower and Juno Tower, neither reached from this route's trailhead.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->2, bivy->3, bivy->4, bivy->5)
  WHERE id = 'wa_beckey_tate'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'SR 20 climbers'' pullouts — the hairpin and the Silver Star Creek pullout'
  AND bivy->1->>'name' = 'Bench Camp — larch bench above the Wine Spires pullout';

-- outing_shape was null. This is a single-day car-to-car route (itinerary
-- Day 1 is the whole trip) that descends "out the climbers' trail to the
-- Hairpin Turn" -- the same trailhead as the approach.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_beckey_tate'
  AND outing_shape IS NULL;

-- =========================================================================
-- Beyond Redlining (Vega North Tower / Eros Tower) -- wa_beyond_redlining
-- =========================================================================
-- high_point_ft was null. Confirmed via WebSearch (Mountain Project-derived
-- summary and a named trip report at francisbaileyh.com, both independent
-- of each other and of this row): "Eros Tower is the northernmost sub peak
-- of Morning Star that stands at 5280' elevation," and this route's own
-- pitch_detail already says pitch 11 tops out "just below the summit
-- shared with Mile High Club" -- the same Eros Tower/Vega North Tower
-- summit. gain_ft/loss_ft (3,500/3,500) do not match 5,280 ft summit minus
-- the row's own 2,350 ft trailhead (= 2,930 ft); the stored 3,500 appears
-- to have been computed against a summit elevation that was never
-- recorded on the row (the summit field itself was null). Corrected
-- gain_ft/loss_ft to 2,930 to match the newly-confirmed summit, and
-- synced the day-1 itinerary gainFt/lossFt and the itinerary totalNote's
-- "3,500 ft of approach/return hiking" wording to the same figure.
-- (totalNote is rewritten with replace() rather than a full literal, since
-- the original sentence contains a semicolon -- a literal that a naive
-- statement-splitter, including this repo's own check:sql, would mistake
-- for the end of the statement.)
UPDATE routes
SET high_point_ft = 5280,
    gain_ft = 2930,
    loss_ft = 2930,
    itinerary = jsonb_set(
      jsonb_set(
        jsonb_set(itinerary, '{days,0,gainFt}', '2930'),
        '{days,0,lossFt}', '2930'
      ),
      '{totalNote}',
      to_jsonb(replace(itinerary->>'totalNote', '3,500 ft of approach/return hiking', '2,930 ft of approach/return hiking'))
    )
  WHERE id = 'wa_beyond_redlining'
  AND high_point_ft IS NULL
  AND gain_ft = 3500 AND loss_ft = 3500
  AND itinerary->>'totalNote' LIKE '%3,500 ft of approach/return hiking%'
  AND itinerary->'days'->0->>'gainFt' = '3500'
  AND itinerary->'days'->0->>'lossFt' = '3500';

-- outing_shape was null. Car-to-car single day from the Sunrise Mine
-- Trailhead; the shared talus approach/return is the only way in or out.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_beyond_redlining'
  AND outing_shape IS NULL;

-- bivy carried 6 entries for the shared Mountain Loop Highway / Sunrise
-- Mine / Barlow Pass corridor. Kept: "Vesper Creek basin and Lake Elan"
-- (shares the Sunrise Mine trail/ford this route uses, and explicitly
-- "puts Morning Star within reach" -- this route's own area_id is
-- wa_morning_star_peak) and "Verlot corridor campgrounds" (explicitly
-- "the fallback base for Vesper, Morning Star, Sperry and the Big Four
-- side ... closer to the Sunrise Mine and Big Four trailheads" -- names
-- both Morning Star and this exact trailhead). Removed: "Sloan Peak high
-- camp" (different trailhead, North Fork Sauk), "Foggy Lake, Gothic
-- Basin" (different trailhead, Barlow Pass, for Del Campo/Gothic), "Monte
-- Cristo townsite" (different trailhead, Barlow Pass; self-disqualifies:
-- "mainly ... deeper into the Monte Cristo group rather than for Vesper
-- or Sloan"), and "Bedal Campground" (explicitly "the Sloan Peak and Bedal
-- Creek trailheads" -- a different road/trailhead system entirely).
UPDATE routes SET bivy = jsonb_build_array(bivy->1, bivy->5)
  WHERE id = 'wa_beyond_redlining'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Sloan Peak high camp — heather benches above Cougar Creek'
  AND bivy->1->>'name' = 'Vesper Creek basin and Lake Elan, beyond Headlee Pass'
  AND bivy->5->>'name' = 'Verlot corridor campgrounds — Turlo, Verlot and Gold Basin';

-- =========================================================================
-- Big Four Mountain, Northwest Ridge -- wa_big_four_mountain_northwest_ridge
-- =========================================================================
-- No fix. This is the historic 1931 Farr/Winder first-ascent line, and
-- every gap on the row (grade fields null, dist_km/loss_ft/outing_shape
-- null, descent_text empty) is candidly documented by this row's own
-- overview: "detailed contemporary route-finding notes for this specific
-- ridge are sparse compared to those routes." WebSearch corroborates the
-- FA (Forest Farr and Art Winder, July 19, 1931) and the elevation
-- (6,170 ft matches published sources) but turned up no published grade,
-- descent description, or mileage for this specific ridge anywhere
-- (Mountain Project/Wikipedia/SummitPost all describe the peak's OTHER
-- routes -- Dry Creek, Tower, Spindrift Couloir -- in detail and are
-- silent on the Northwest Ridge). Verified genuinely sparse rather than
-- wrong; not fabricating a grade or descent. See log.

-- =========================================================================
-- Big Four Mountain, Spindrift Couloir -- wa_big_four_mountain_spindrift_couloir
-- =========================================================================
-- itinerary was a bare narrative string instead of the standard
-- {cal,days,totalNote} object every other route in the catalog uses --
-- the same schema-shape defect documented repeatedly in prior batches.
-- Converted with the narrative preserved verbatim as totalNote and an
-- honest empty days array; no content invented.
UPDATE routes SET itinerary = jsonb_build_object(
    'cal', '',
    'days', '[]'::jsonb,
    'totalNote', itinerary #>> '{}'
  )
  WHERE id = 'wa_big_four_mountain_spindrift_couloir'
  AND jsonb_typeof(itinerary) = 'string';

-- FLAGGED, not fixed: this row's own descent_text states "The route tops
-- out on the summit ridge well west of the true summit," yet the only
-- summit-type waypoint on the row (and high_point_ft = 6170) is "Big Four
-- Mountain Summit" -- the TRUE summit, shared verbatim with the Northwest
-- Ridge route above (which DOES top out at the true summit). A WebSearch
-- of AAC Publications/cascadeclimbers.com confirms the FA description and
-- descent (down the NW ridge to a col toward Hall Peak, matching this
-- row's descent_text closely) but did not yield a specific elevation for
-- the "well west of the true summit" point where the couloir actually
-- tops out, and one search summary conflated an unrelated route's
-- ("Fisher Chimneys," which is on Mount Shuksan, not Big Four) descent
-- into its answer, so it is not trusted here. Big Four's summit is
-- independently described (WTA) as having "five distinct nubs" along its
-- crest, consistent with a route topping out on a different nub than the
-- true high point, but no sourced elevation for that alternate point was
-- found. Needs a human pass with a topo map or guidebook (Beckey) rather
-- than a guess at how many feet lower the real topout sits.

-- =========================================================================
-- Big Kangaroo, West Face / West Route -- wa_big_kangaroo_west_face
-- =========================================================================
-- watch_out was a plain string with embedded newlines instead of a JSON
-- array of strings -- the same schema-shape defect documented repeatedly
-- in prior batches (e.g. wa_prusik_peak_der_sportsman). Converted via
-- string_to_array on the existing newlines; no content changed.
UPDATE routes SET watch_out = to_jsonb(string_to_array(watch_out #>> '{}', E'\n'))
  WHERE id = 'wa_big_kangaroo_west_face'
  AND jsonb_typeof(watch_out) = 'string';

-- dist_km (1.9) is a bare copy of this row's own waypoint chain's ONE-WAY
-- mileage to the summit (distMi 1.9 at "Big Kangaroo Summit") typed
-- directly into a field meant to hold kilometers, with no unit
-- conversion. The sibling route on this same peak/trailhead
-- (wa_beckey_tate) stores dist_km as its own itinerary's ROUND-TRIP
-- mileage correctly converted to km (4.3 mi -> 6.92 km); applying the
-- same convention here, this route's own itinerary round trip (4 mi) ->
-- 6.44 km.
UPDATE routes SET dist_km = 6.44
  WHERE id = 'wa_big_kangaroo_west_face'
  AND dist_km = 1.9;

-- outing_shape was null. Single-day car-to-car route; descent_text ends
-- "pick up the climbers' trail" back toward the same Hairpin Turn
-- trailhead used on approach.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_big_kangaroo_west_face'
  AND outing_shape IS NULL;

-- bivy carried the identical 6-entry list as wa_beckey_tate above (same
-- area, same trailhead cluster) -- same fix, same reasoning: only "Bench
-- Camp -- larch bench above the Wine Spires pullout" is foreign (a
-- different pullout serving Vasiliki Ridge/Tower and Juno Tower).
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->2, bivy->3, bivy->4, bivy->5)
  WHERE id = 'wa_big_kangaroo_west_face'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'SR 20 climbers'' pullouts — the hairpin and the Silver Star Creek pullout'
  AND bivy->1->>'name' = 'Bench Camp — larch bench above the Wine Spires pullout';
