-- WA alpine audit -- batch 91 (pass 2) -- 2026-08-09
-- Routes: wa_mount_stuart_west_ridge, wa_mount_teneriffe_kamikaze_trail,
--         wa_mount_teneriffe_standard_route, wa_mount_terror_north_face,
--         wa_mount_terror_southeast_face, wa_mount_terror_stoddard_buttress,
--         wa_mount_terror_west_ridge, wa_mount_thomson_west_ridge
-- Researched via 4 parallel agents grouped by peak (Stuart x1; Teneriffe x2; Terror x4; Thomson x1).
-- Cross-corroborated via WebSearch citing SummitPost, Mountaineers.org, Mazamas, FastestKnownTime.com,
-- WTA, dnr.wa.gov, AAC Publications/AAJ, Mountain Project, CascadeClimbers.com -- same standard as
-- prior batches. WebFetch to most of these domains was blocked by this session's egress proxy, so
-- findings rest on WebSearch result snippets rather than full-page reads; noted per-item below.

-- wa_mount_stuart_west_ridge: dist_km (32.2) implied a ~40 mi round trip (doubled for display), matching
-- neither this row's own itinerary/totalNote (~16.5 mi RT) nor any external source. FastestKnownTime.com's
-- GPS-tracked West Ridge/Cascadian Couloir loop gives 19.3 km (12.0 mi) round trip, and this row's own
-- waypoints put the one-way distance to the summit at 6 mi -- both converge on the same one-way figure
-- already used for the sibling Cascadian Couloir route (fixed to 9.66 in batch 90). Fixed to match.
UPDATE routes SET dist_km = 9.66
WHERE id = 'wa_mount_stuart_west_ridge'
  AND dist_km = 32.2;

-- wa_mount_teneriffe_standard_route: approach_logistics.trailhead named "Mount Si Trailhead" -- a
-- separate, distinct parking lot ~2.9 mi back down SE Mount Si Road -- contradicting this row's own
-- approach text and waypoints (both keyed to the dedicated "Mount Teneriffe Trailhead" lot) and its
-- sibling Kamikaze Trail row, which already has the correct trailhead name. Confirmed via WTA/DNR/
-- AllTrails/Snoqualmie Valley Record coverage that these are two distinct trailhead facilities on the
-- same road, not alternate names for one lot.
UPDATE routes SET approach_logistics = jsonb_set(approach_logistics, '{trailhead}', '"Mount Teneriffe Trailhead"')
WHERE id = 'wa_mount_teneriffe_standard_route'
  AND approach_logistics->>'trailhead' = 'Mount Si Trailhead';

-- wa_mount_terror_southeast_face: descent field said to descend "retracing the ascent when possible,"
-- contradicting this same row's own descent_text and bail fields (which correctly describe the standard
-- West Ridge gully descent into Crescent Creek Basin, matching the sibling North Face/Stoddard Buttress
-- routes) -- confirmed via SummitPost's "Mount Terror, East Ridge" page and the Mountain Project
-- Stoddard Buttress page, both independently describing the West Ridge gully as the standard descent
-- for every route on this peak, never a reversal of this line.
UPDATE routes SET descent = 'Standard descent is via the West Ridge gully back into Crescent Creek Basin (multiple rappels off a large chockstone) -- not a reversal of the East Ridge ascent line. See this route''s own descent_text for the full description.'
WHERE id = 'wa_mount_terror_southeast_face'
  AND descent = 'Descend via the standard descent route, retracing the ascent when possible. Be aware of loose rock and snow bridge hazards. Maintain group cohesion on exposed sections.';

-- wa_mount_terror_stoddard_buttress: fa described two separate climbs (a July 16 1984 solo ascent, plus
-- a distinct "extended/left-side finish variant" climbed July 14-17 1985 and published in the AAJ) --
-- but every source found (AAC Publications' synopsis of "Mount Terror, North Face, Left Side," corroborated
-- by the Mountain Project Stoddard Buttress description) describes one continuous solo ascent, July 14-17
-- 1984, with the AAJ writeup appearing in the 1985 volume because AAJ volumes cover the prior climbing
-- season -- not evidence of a second, later climb. Rewritten as the single event sources support.
UPDATE routes SET fa = 'John Stoddard, solo, July 14-17, 1984 (single continuous ascent, crux 5.8+, published in the American Alpine Journal 1985 volume -- which covers the 1984 season -- as "Mount Terror, North Face, Left Side")'
WHERE id = 'wa_mount_terror_stoddard_buttress'
  AND fa LIKE 'John Stoddard, solo, July 16, 1984%';

-- wa_mount_thomson_west_ridge: itinerary.days[0].gainFt/lossFt (3600) was derived from a naive
-- trailhead(3000ft)-to-summit(6554ft) elevation difference, but that undercounts the real cumulative
-- gain/loss of the PCT approach, which climbs over Kendall Ridge Saddle, Kendall Pass, and undulates past
-- Ridge Lake and Bumblebee Pass before reaching the peak. A FastestKnownTime.com route page with matching
-- waypoints (same named trailhead, Kendall Ridge Saddle, Ridge Lake, Bumblebee Pass) gives ~5,200 ft
-- gained/lost for this exact loop, independently corroborated by a WTA trip report (Mountaineers Club,
-- 2022-08-19) logging 5,000 ft gain over a comparable 16.2 mi outing -- both matching this row's own
-- top-level gain_ft/loss_ft (5200), which were correct all along. Fixed the itinerary day to match.
UPDATE routes SET itinerary = jsonb_set(jsonb_set(itinerary, '{days,0,gainFt}', '5200'), '{days,0,lossFt}', '5200')
WHERE id = 'wa_mount_thomson_west_ridge'
  AND (itinerary->'days'->0->>'gainFt')::int = 3600
  AND (itinerary->'days'->0->>'lossFt')::int = 3600;
