-- WA alpine audit — batch 150 (2026-08-27, pass 3)
-- Routes: wa_mount_rainier_ptarmigan_ridge, wa_mount_rainier_sunset_ridge,
-- wa_mount_rainier_tahoma_glacier, wa_mount_rainier_willis_wall,
-- wa_mount_redoubt_south_face, wa_mount_seattle_noyes_basin,
-- wa_mount_seattle_seattle_creek, wa_mount_sefrit_bloody_head_couloir.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention.

-- =========================================================================
-- Mount Rainier (wa_mount_rainier) — wa_mount_rainier_tahoma_glacier
-- (Tahoma Glacier)
-- =========================================================================

-- gain_ft (5007) didn't match this row's own itinerary.days sum
-- (3300+3700+5000=12000) or its own itinerary.totalNote ("~12,000 ft
-- gain") -- the stored figure looks like it only counted the summit-day
-- glacier climb from high camp, dropping the ~6,900 ft two-day approach
-- from Westside Road. Net rise (trailhead 2,900 ft -> Columbia Crest
-- 14,406 ft = 11,506 ft) also corroborates a figure near 12,000 rather
-- than 5,007. This is the exact case CLAUDE.md's audit:gain entry already
-- names as an example finding, apparently never applied to the live row.
UPDATE routes SET gain_ft = 12000
WHERE id = 'wa_mount_rainier_tahoma_glacier' AND gain_ft = 5007;

-- =========================================================================
-- Mount Rainier (wa_mount_rainier) — wa_mount_rainier_willis_wall
-- (Willis Wall)
-- =========================================================================

-- waypoints[0] (White River Campground) was internally self-contradictory:
-- elev=4400 but elevFt=2320, with the same waypoint's own "directions"
-- text repeating the wrong figure ("at about 2,320 feet"). External
-- sources (NPS/recreation.gov) put White River Campground at ~4,440 ft,
-- matching this row's own elev field and this batch's sibling Ptarmigan
-- Ridge route, which uses the identical trailhead. elevFt and the
-- directions text corrected to match elev; elev itself (4400, already
-- close to the sourced 4,440) left untouched.
UPDATE routes SET
  waypoints = jsonb_set(
    jsonb_set(waypoints, '{0,elevFt}', '4400'),
    '{0,directions}',
    to_jsonb(replace(waypoints->0->>'directions', '2,320 feet', '4,400 feet'))
  )
WHERE id = 'wa_mount_rainier_willis_wall'
  AND (waypoints->0->>'elevFt')::numeric = 2320
  AND waypoints->0->>'name' = 'White River Campground'
  AND waypoints->0->>'directions' LIKE '%2,320 feet%';

-- =========================================================================
-- Mount Rainier (wa_mount_rainier) — wa_mount_rainier_sunset_ridge
-- (Sunset Ridge)
-- =========================================================================

-- fa omitted a third party member: mountaineers.org's own Sunset Ridge
-- route page credits the 1938 FA to "Lyman Boyer, Arnold Campbell and Don
-- Woods", not just the two named on file.
UPDATE routes SET fa = 'First climbed 1938 by a Seattle Mountaineers party of Lyman Boyer, Arnold Campbell, and Don Woods (per mountaineers.org); Boyer suggested the route''s name.'
WHERE id = 'wa_mount_rainier_sunset_ridge'
  AND fa = 'First climbed 1938 by a Seattle Mountaineers party that included Arnold Campbell and Lyman Boyer, who suggested the route''s name';

-- descent_text ("Descend Emmons-Winthrop to White River") is boilerplate
-- copied from this batch's Ptarmigan Ridge/Willis Wall rows, which
-- legitimately exit that way -- but Sunset Ridge is approached from
-- Westside Road on the opposite (SW) side of the mountain, and this
-- row's own itinerary Day 4 already reverses back down the Puyallup
-- Cleaver/Wonderland Trail/Westside Road, not Emmons-Winthrop/White
-- River. mountaineers.org's own route page states the standard descent
-- is via Disappointment Cleaver to Paradise with a prearranged car
-- shuttle back to Westside Road (matching this row's own totalNote,
-- "plan a car shuttle since the standard descent exits far from the
-- Westside Road start"), with an early-season Puyallup
-- Cleaver/Tahoma-Glacier reversal as the alternative already described
-- in the itinerary.
UPDATE routes SET descent_text = 'Standard descent is via the Disappointment Cleaver route to Paradise, requiring a prearranged car shuttle back to the Westside Road start since the exit is far from where the climb began (per mountaineers.org). Early-season parties who camped on the Puyallup Cleaver may instead reverse the approach via the Tahoma Glacier route back toward Westside Road, avoiding the shuttle.'
WHERE id = 'wa_mount_rainier_sunset_ridge' AND descent_text = 'Descend Emmons-Winthrop to White River';

-- =========================================================================
-- Mount Redoubt (wa_mount_redoubt) — wa_mount_redoubt_south_face
-- (South Face / Redoubt Glacier)
-- =========================================================================

-- gain_ft (5000) and loss_ft (null) didn't match this row's own
-- itinerary.days sum (3100+3300=6400 gain, 3300+3100=6400 loss) or its
-- own totalNote ("~17 miles and ~6,400 ft round trip"). Net rise
-- (trailhead 2,600 ft -> summit 8,969 ft = 6,369 ft) corroborates ~6,400
-- rather than 5,000. Set both to the round-trip figure the row already
-- states in two other places.
UPDATE routes SET gain_ft = 6400, loss_ft = 6400
WHERE id = 'wa_mount_redoubt_south_face' AND gain_ft = 5000 AND loss_ft IS NULL;

-- =========================================================================
-- Mount Seattle (wa_mount_seattle) — wa_mount_seattle_noyes_basin (Noyes
-- Basin Route) and wa_mount_seattle_seattle_creek (Seattle Creek Basin
-- Route)
-- =========================================================================

-- bivy held 8 entries, only 1 of which ("Low Divide -- the pass camp for
-- Mount Seattle and Mount Christie") is about a camp these routes'
-- own approach_logistics actually uses (North Fork Quinault Trailhead ->
-- Low Divide). The other 7 describe camps on the Elwha River corridor via
-- Whiskey Bend (staging for Mount Norton/the Bailey Range) and the East
-- Fork Quinault via Graves Creek (staging for Anderson's Thumb/Anderson
-- Pass) -- neither drainage this peak's three routes (confirmed via the
-- live area's third route, wa_mount_seattle_south) approach from. Same
-- audit:camp-route-fit contamination shape CLAUDE.md already documents
-- (a corridor zone file handed to every route/peak sharing the region)
-- and the same defect batch 148 fixed for wa_mount_pilchuck_standard_route.
-- Trimmed to the one entry genuinely about Mount Seattle; identical
-- 8-entry array on both rows, so one statement covers both.
UPDATE routes SET bivy = jsonb_build_array(bivy->5)
WHERE id IN ('wa_mount_seattle_noyes_basin', 'wa_mount_seattle_seattle_creek')
  AND jsonb_array_length(bivy) = 8
  AND bivy->5->>'name' = 'Low Divide — the pass camp for Mount Seattle and Mount Christie';
