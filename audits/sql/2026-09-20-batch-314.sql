-- WA alpine audit batch 314 (pass 6)
-- Routes: wa_chalangin_peak_little_giant_pass_luahna_col,
--         wa_chianti_spire_east_face, wa_chimney_rock_east_face_direct,
--         wa_chimney_rock_west_face, wa_chiwawa_mountain_southwest,
--         wa_chockstone_route, wa_clark_mountain_west_ridge,
--         wa_classic_route_2

-- =========================================================================
-- Chalangin Peak, Little Giant Pass / Luahna Col Route
-- wa_chalangin_peak_little_giant_pass_luahna_col
-- =========================================================================
-- bivy carried 9 entries sharing the whole Glacier Peak Wilderness /
-- Dakobed corridor (Mackinaw Shelter and White Pass/Glacier Gap/Kennedy
-- Ridge/Boulder Basin -- all Glacier Peak's own Cool Glacier/Sitkum/
-- Kennedy Glacier camps; Buck Creek Pass -- Helmet Butte/Buck Mtn/Berge;
-- Boulder Pass and Thunder Basin -- Clark Mountain's WHITE RIVER approach,
-- a different trailhead than this route uses). Only two entries name
-- THIS route's own approach: "Napeequa Valley floor near Louis Creek"
-- ("This is the way into the Napeequa for Luahna Peak, Chalangin Peak...
-- From the Little Giant trailhead the very first obstacle is fording the
-- Chiwawa itself") and "Butterfly Butte and the Pilz Glacier basin
-- camps" ("This is the climbing camp for Luahna Peak and Chalangin Peak
-- ... Chalangin sits half a mile northwest of Luahna and is more often
-- taken by its own north side"), matching this row's own approach text
-- (Little Giant Trailhead -> Little Giant Pass -> Napeequa Valley ->
-- Butterfly Butte camp). Textbook audit:camp-route-fit regional
-- corridor contamination, same class documented in many prior batches.
UPDATE routes SET bivy = jsonb_build_array(bivy->6, bivy->7)
  WHERE id = 'wa_chalangin_peak_little_giant_pass_luahna_col'
  AND jsonb_array_length(bivy) = 9
  AND bivy->6->>'name' = 'Napeequa Valley floor near Louis Creek'
  AND bivy->7->>'name' = 'Butterfly Butte and the Pilz Glacier basin camps';

-- =========================================================================
-- Chimney Rock, East Face Direct -- wa_chimney_rock_east_face_direct
-- =========================================================================
-- bivy carried the identical 9-entry western-Alpine-Lakes-Wilderness
-- corridor blob (Pete Lake/Lemah, Chimney Glacier, Escondido Ridge,
-- Waptus/Spade Lake, Park Lakes Basin, Hardscrabble Horse Camp, Upper
-- Hardscrabble Lake, Williams Lake, Peggy's Pond) also found on this
-- same peak's West Face route below -- all for entirely different peaks
-- (Lemah Mountain, Little Big Chief Mountain, Three Queens, Burnt Boot
-- Peak, Big Snow Mountain, Iron Cap Mountain, Cathedral Rock) reached
-- from different valleys. Only two entries name THIS peak: "Pete Lake
-- and the Lemah Meadows camps" ("Parties bound for Chimney Rock also
-- pass through, but leave the PCT further north -- see the Chimney
-- Glacier basin entry") and "Chimney Glacier hanging basin" ("THIS IS
-- CHIMNEY ROCK'S REAL BASE ... The same basin serves the standard West
-- Face and South Summit line by way of the glacier and the notch").
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->1)
  WHERE id = 'wa_chimney_rock_east_face_direct'
  AND jsonb_array_length(bivy) = 9
  AND bivy->0->>'name' = 'Pete Lake and the Lemah Meadows camps'
  AND bivy->1->>'name' = 'Chimney Glacier hanging basin — the big boulder bivy';

-- gain_ft/loss_ft/dist_km were all null. This route's own approach text
-- states outright it "shares the same trailhead-to-basin approach as
-- the East Face" and its overview describes it as "a harder, more
-- direct 1954 variation ... before rejoining the East Face about
-- halfway up" -- same trailhead (Pete Lake), same high camp (Sunrise
-- Knob), same summit (7,727 ft main/central summit, matching this
-- row's own high_point_ft). This peak's standard "East Face" sibling
-- route (wa_east_face_6) stores dist_km 15.3 / gain_ft 6000 / loss_ft
-- 6000 for that identical approach+summit. Copied verbatim from the
-- sibling rather than typed, since the row's own text names it as the
-- same approach and no other figure for it exists anywhere in this row.
UPDATE routes SET dist_km = 15.3, gain_ft = 6000, loss_ft = 6000
  WHERE id = 'wa_chimney_rock_east_face_direct'
  AND dist_km IS NULL AND gain_ft IS NULL AND loss_ft IS NULL
  AND EXISTS (
    SELECT 1 FROM routes s WHERE s.id = 'wa_east_face_6'
    AND s.dist_km = 15.3 AND s.gain_ft = 6000 AND s.loss_ft = 6000
  );

-- =========================================================================
-- Chimney Rock, West Face / South Summit (Standard)
-- wa_chimney_rock_west_face
-- =========================================================================
-- Same 9-entry corridor-contamination bivy as East Face Direct above,
-- byte-identical text; same fix, same two relevant entries kept.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->1)
  WHERE id = 'wa_chimney_rock_west_face'
  AND jsonb_array_length(bivy) = 9
  AND bivy->0->>'name' = 'Pete Lake and the Lemah Meadows camps'
  AND bivy->1->>'name' = 'Chimney Glacier hanging basin — the big boulder bivy';

-- outing_shape was null despite descent_text explicitly reversing the
-- ascent to the same trailhead ("reverse the glacier crossing and the
-- moraine/climber's path back to Sunrise Knob and the Pete Lake
-- Trail"). gain_ft/loss_ft already agree (4950/4950), consistent with
-- an out-and-back.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_chimney_rock_west_face'
  AND outing_shape IS NULL;

-- =========================================================================
-- Chiwawa Mountain, Southwest Route / Standard
-- wa_chiwawa_mountain_southwest
-- =========================================================================
-- bivy carried 9 entries covering the whole Holden Village/Bonanza
-- Peak/Lyman Lakes/Spider Meadow/Leroy Basin/Ice Lakes corridor -- all
-- for other peaks (Bonanza, Martin, North Star, Cloudy, Dumbell, Maude,
-- Seven Fingered Jack, Fernow, Buckskin, Copper) reached by an entirely
-- different trailhead/ferry system. Two entries ("Lyman Lakes and
-- Cloudy Pass", "Spider Meadow and Phelps Basin") do name Chiwawa
-- Mountain, but only via the peak's OTHER approach -- this row's own
-- overview text says outright "A small remnant of the Lyman Glacier
-- clings to Chiwawa's northeast slope above Lyman Lake, but that is a
-- SEPARATE, MORE INVOLVED APPROACH ON THE FAR SIDE OF THE MOUNTAIN; the
-- standard southwest route described here is a non-glaciated ... scree
-- scramble" -- so keeping either would misdirect a climber reading this
-- (Trinity Trailhead / Chiwawa Basin / SW route) page toward the wrong
-- side of the peak and an unnecessary glacier crossing. Only one entry
-- describes this row's own trailhead without misdirection: "Phelps
-- Creek Campground and the Chiwawa River road campgrounds" ("the
-- Trinity trailhead at about 2,800 ft ... is a mile or so away, so one
-- night here stages" it), matching this row's own approach_logistics
-- trailhead field exactly.
UPDATE routes SET bivy = jsonb_build_array(bivy->8)
  WHERE id = 'wa_chiwawa_mountain_southwest'
  AND jsonb_array_length(bivy) = 9
  AND bivy->8->>'name' = 'Phelps Creek Campground and the Chiwawa River road campgrounds';

-- outing_shape was null despite descent_text explicitly reversing the
-- ascent line back through Chiwawa Basin to the Trinity Trailhead
-- ("retrace the Chiwawa River Trail #1550 and Buck Creek Trail #1513
-- back to the Trinity Trailhead"). gain_ft/loss_ft already agree
-- (5659/5659), consistent with an out-and-back.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_chiwawa_mountain_southwest'
  AND outing_shape IS NULL;

-- =========================================================================
-- Clark Mountain, West Ridge / Walrus Glacier -- wa_clark_mountain_west_ridge
-- =========================================================================
-- bivy carried the same 9-entry Glacier Peak Wilderness corridor blob
-- as Chalangin Peak above (byte-identical text). Only one entry
-- describes THIS row's own White River / Boulder Creek approach:
-- "Boulder Pass and Thunder Basin, White River" states outright "This
-- is the standard base for Clark Mountain and the reason Clark is a
-- White River peak rather than a Little Giant one ... the Walrus
-- Glacier route traverses the basin ... and gains the glacier for the
-- east side of the mountain" -- an exact match for this row's own West
-- Ridge/Walrus Glacier line. The two Napeequa-side entries ("Napeequa
-- Valley floor", "Butterfly Butte") explicitly serve Clark's OTHER
-- (west, Little-Giant-trailhead) approach, not the White-River one this
-- row documents, so keeping them would misdirect a climber toward the
-- wrong trailhead.
UPDATE routes SET bivy = jsonb_build_array(bivy->8)
  WHERE id = 'wa_clark_mountain_west_ridge'
  AND jsonb_array_length(bivy) = 9
  AND bivy->8->>'name' = 'Boulder Pass and Thunder Basin, White River';

-- loss_ft was null and outing_shape was null. descent_text explicitly
-- reverses the ascent to the same White River Trailhead for both the
-- Walrus Glacier and the south-side/West Ridge lines ("Reverse the
-- ascent line back to Boulder Creek Basin camp, then out via Boulder
-- Creek Trail #1562 and White River Trail #1507 to the trailhead") --
-- a genuine out-and-back, so loss should equal the row's own gain_ft.
UPDATE routes SET loss_ft = 6500, outing_shape = 'outback'
  WHERE id = 'wa_clark_mountain_west_ridge'
  AND loss_ft IS NULL AND gain_ft = 6500;

-- =========================================================================
-- Verified clean, no fix needed
-- =========================================================================
-- wa_chianti_spire_east_face: bivy (6 entries, Burgundy Col/Wine Spires
-- west-side camps plus the Silver Star Creek east-side alternate) all
-- genuinely serve this peak/massif via one of its two real approaches --
-- no contamination. FA (Bebie/Nelson, 1986, "Rebel Yell") confirmed via
-- WebSearch against SummitPost and Mountain Project; Chianti Spire's own
-- original 1952 aid FA (Hieb/Maki) in the area blurb confirmed via AAC
-- Publications' "The Environs of Silver Star."
--
-- wa_chockstone_route (North Early Winters Spire): bivy (4 entries, all
-- genuinely Washington Pass/Liberty Bell Group) clean. FA (Wesley Grande,
-- Pete Schoening, Dick Widrig, May 28 1950) confirmed via WebSearch
-- against gethighonaltitude.com, trailcatjim.com and spokalpine.com trip
-- reports, all independently naming this as the peak's original
-- first-ascent line via the gully/chasm between the two spires.
--
-- wa_classic_route_2 (Unicorn Peak): bivy (6 entries, all genuinely
-- Tatoosh Range / Mount Rainier NP) clean. Elevation 6,971 ft and status
-- as the Tatoosh Range high point confirmed via Wikipedia and
-- Peakbagger.com. Row's own `corrections` field already independently
-- cleared a prior 5.6-grade flag against Mountain Project (5.4
-- confirmed) -- left as-is, nothing further to fix.
--
-- Chimney Rock (area elevation 7,727 ft, FA Aug 27 1930 Farr/Winder/
-- Byington) and Chiwawa Mountain (area elevation 8,459 ft, FA 1921
-- Mountaineers party led by Lorenz A. Nelson) area blurbs both
-- confirmed via Wikipedia. Note: Wikipedia itself flags the Chiwawa
-- 1921 FA as the earliest RECORDED ascent rather than a certainty
-- ("no definite records exist") -- this matches the row's own fa field
-- phrasing ("the peak's overall first ascent via its easiest
-- scrambling line; not explicitly named 'Southwest Route'"), which
-- already carries appropriate hedging, so no change needed.
