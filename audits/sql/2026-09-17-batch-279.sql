-- WA alpine audit batch 279 (pass 5)
-- Routes checked: wa_mount_rainier_fuhrer_finger, wa_mount_rainier_fuhrer_thumb,
-- wa_mount_rainier_gibraltar_ledges, wa_mount_rainier_ingraham_direct,
-- wa_mount_rainier_kautz_glacier, wa_mount_rainier_kautz_headwall,
-- wa_mount_rainier_liberty_ridge, wa_mount_rainier_mowich_face

-- Fix 1: wa_mount_rainier_fuhrer_finger -- `fa` names only four climbers (Hans Fuhrer,
-- Heine Fuhrer, Joseph Hazard, Thomas Hermans). Three independently-phrased web
-- searches (drawing on SummitPost's Fuhrer Finger/Thumb history page and related
-- sources) consistently return a five-person first-ascent party for July 2, 1920,
-- adding "Peyton Farrer". Added rather than replacing anything, since the other four
-- names and the date are already correct.
UPDATE routes
SET fa = 'Hans Fuhrer, Heine Fuhrer, Joseph Hazard, Peyton Farrer, and Thomas Hermans, July 2, 1920'
WHERE id = 'wa_mount_rainier_fuhrer_finger'
  AND fa = 'Hans Fuhrer, Heine Fuhrer, Joseph Hazard, and Thomas Hermans, July 2, 1920';

-- Fix 2: wa_mount_rainier_fuhrer_thumb -- `beta` contains a stray clause claiming
-- "best season June-September," directly contradicting this same row's own `season`
-- field ("Apr-Jun"), its own `best_season` field ("Spring (roughly April-June) for firm
-- south-facing snow before the couloir melts out"), and its own `turnaround` field
-- ("descend before south-aspect warming triggers rockfall and wet-snow release") --
-- three independent fields on the row all agree the window is spring, not summer.
-- External sources (route-condition writeups for the Fuhrer Thumb/Finger couloirs)
-- likewise describe these as spring "corn season" lines, notorious for rockfall once
-- the snow bares out in summer -- the opposite of a June-September recommendation.
-- The clause reads like a boilerplate fragment from an unrelated summer-season alpine
-- route template. Removed rather than replaced, since the row already states the
-- correct window twice over in `season` and `best_season`.
UPDATE routes
SET beta = 'Grade II alpine climb (50° snow/ice couloir); 5-7 hours summit day from camp (~9,000 ft); requires prior glacier travel experience, cramponing on firm ice, two ice tools competency; hazards include ice fall from Kautz Ice Cliff, rockfall, avalanche danger (early start essential), crevasses on Wilson and Nisqually Glaciers; technical skills: rope team travel, secure belay placement, avalanche awareness'
WHERE id = 'wa_mount_rainier_fuhrer_thumb'
  AND beta = 'Grade II alpine climb (50° snow/ice couloir); 5-7 hours summit day from camp (~9,000 ft); requires prior glacier travel experience, cramponing on firm ice, two ice tools competency; hazards include ice fall from Kautz Ice Cliff, rockfall, avalanche danger (early start essential), crevasses on Wilson and Nisqually Glaciers; best season June-September; technical skills: rope team travel, secure belay placement, avalanche awareness';

-- Fix 3: wa_mount_rainier_ingraham_direct -- `season` claims the route is "Typically
-- climbed January through end of May, often under winter-like conditions," which
-- contradicts this same row's own `overview` ("usually in best shape from late May
-- through June while the headwall is still filled and continuous"), `best_season`
-- ("Late May through June... By mid/late summer the direct breaks into crevasses"),
-- and `seasonal_guidance.monthBreakdown` (May/June marked optimal, July marginal,
-- August risky). Full winter (Jan-Apr) ascents of Rainier's upper mountain are rare
-- expedition-style outings, not the "typical" pattern for this route. External sources
-- (route-condition writeups distinguishing the Ingraham Direct from the Disappointment
-- Cleaver) confirm it is specifically an early-season (May-June) alternative that
-- becomes uncrossable by crevasses as the season progresses -- not a winter route.
-- Corrected to match the row's own overview/best_season window; no new information
-- introduced.
UPDATE routes
SET season = 'Late May through June, when the Ingraham headwall is filled and continuous -- before the bergschrund opens and parties switch to the Disappointment Cleaver for the summer'
WHERE id = 'wa_mount_rainier_ingraham_direct'
  AND season = 'Typically climbed January through end of May, often under winter-like conditions, before the Disappointment Cleaver route opens up for the summer';

-- Fix 4: wa_mount_rainier_liberty_ridge -- `waypoints` and `gpx` are cross-route
-- contamination from a different, unrelated Mount Rainier line. Liberty Ridge is
-- approached exclusively from the NORTHEAST (White River Campground -> Glacier Basin
-- -> St. Elmo Pass -> Winthrop Glacier -> Curtis Ridge -> Carbon Glacier -> the ridge
-- itself), as stated consistently and repeatedly elsewhere on this same row
-- (`approach`, `approach_logistics.trailheadDirection`, `bivy[0]` naming Curtis Ridge
-- as the standard first-night camp, `descent_text`, and every `itinerary.days[].note`).
-- This matches the route's published description (The Mountaineers' route page:
-- "From White River Campground... Ascend to St. Elmo Pass... descend to and cross the
-- Winthrop Glacier... Traverse around lower Curtis Ridge... Ascend the Carbon Glacier
-- to base of Liberty Ridge... campsite at Thumb Rock").
-- Instead, the stored `waypoints` array (after the correct White River trailhead)
-- names "Mowich Lake Camp," "Puyallup Winthrop Junction Camp," and "Puyallup Glacier
-- Serac Zone" -- all real places, but on the mountain's opposite (northwest/southwest)
-- side, near Mowich Lake and the Puyallup Glacier below the Mowich Face/Sunset
-- Amphitheater (per this same batch's wa_mount_rainier_mowich_face row and independent
-- sources describing Liberty Cap as sitting "above the... Mowich Face"). None of these
-- three places, nor the Puyallup Glacier, appear anywhere in this route's own approach,
-- descent, bivy, or itinerary text, and they are 12+ km from the route's own White
-- River trailhead in a direction the route never travels. The stored `gpx` track traces
-- the identical wrong path (Mowich Lake area -> Puyallup Glacier area), not St. Elmo
-- Pass/Winthrop/Curtis Ridge/Carbon Glacier.
-- Fixed by removing the three contaminated waypoints and clearing the wrong gpx track,
-- rather than fabricating a corrected track -- no source for this run gave precise
-- coordinates for St. Elmo Pass/Curtis Ridge/Thumb Rock on this route to reconstruct
-- one. The two waypoints kept (White River trailhead and Liberty Cap summit) are each
-- independently corroborated elsewhere on the row: the trailhead matches
-- approach_logistics.trailheadLat/Lng (46.9024,-121.6438) exactly, and the Liberty Cap
-- coordinate (46.86298,-121.77486) is within ~30 m of the independently-published
-- coordinate (46.8628855,-121.7750975) and matches high_point_ft (14112) exactly.
UPDATE routes
SET waypoints = '[{"lat": 46.9024, "lng": -121.6438, "elev": 4800, "name": "White River Campground (Glacier Basin Trailhead)", "type": "Trailhead", "distMi": 0}, {"lat": 46.86298, "lng": -121.77486, "elev": 14112, "name": "Liberty Cap", "type": "Summit", "distMi": 15}]'::jsonb,
    gpx = NULL
WHERE id = 'wa_mount_rainier_liberty_ridge'
  AND waypoints = '[{"lat": 46.9024, "lng": -121.6438, "elev": 4800, "name": "White River Campground (Glacier Basin Trailhead)", "type": "Trailhead", "distMi": 0}, {"lat": 46.952, "lng": -121.818, "elev": 4900, "name": "Mowich Lake Camp", "type": "Campsite", "distMi": 0.5}, {"lat": 46.89, "lng": -121.8, "elev": 7300, "name": "Puyallup Winthrop Junction Camp", "type": "Campsite", "distMi": 9}, {"lat": 46.875, "lng": -121.775, "elev": 8500, "name": "Puyallup Glacier Serac Zone", "type": "Hazard", "distMi": 11}, {"lat": 46.86298, "lng": -121.77486, "elev": 14112, "name": "Liberty Cap", "type": "Summit", "distMi": 15}]'::jsonb;

-- No further UPDATEs this batch. Remaining checked facts and one flagged item below.
