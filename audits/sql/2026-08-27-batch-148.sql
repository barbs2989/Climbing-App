-- WA alpine audit batch 148 (2026-08-27)
-- Batch: wa_mount_pilchuck_standard_route, wa_mount_price_hester_lake_route,
--        wa_mount_rahm_standard, wa_mount_rainier_curtis_ridge,
--        wa_mount_rainier_disappointment_cleaver, wa_mount_rainier_edmunds_headwall,
--        wa_mount_rainier_emmons_glacier, wa_mount_rainier_fuhrer_finger

-- Fix 1: wa_mount_pilchuck_standard_route -- bivy field held 8 camping entries, 7 of
-- which describe camps on THREE ENTIRELY DIFFERENT MOUNTAINS (Three Fingers Lookout,
-- Tin Can Gap, Goat Flats, Saddle Lake -- all Three Fingers; two Whitehorse Mountain
-- entries; one Big Four Mountain entry), matching CLAUDE.md's own documented
-- audit:camp-route-fit example of a corridor zone-file bleeding onto Mount Pilchuck.
-- The 8th entry (Bathtub Lakes basin) is genuinely about Pilchuck but explicitly says
-- of itself: 'It has no bearing on the standard summit trail...and none needed.' The
-- route's own overview/descent_text/itinerary/bail all agree this is a single-day
-- out-and-back hike with no camping. Clearing bivy entirely matches the row's own text.
UPDATE routes SET bivy = NULL WHERE id = 'wa_mount_pilchuck_standard_route';

-- Fix 2: wa_mount_pilchuck_east_ridge (audited in a prior batch; not in this batch's
-- route list, but carries the IDENTICAL contaminated bivy array found via Fix 1 above,
-- discovered only because this batch's Standard Route shares the same corridor and the
-- same copy-pasted bivy data). Trim to the one entry (Bathtub Lakes basin) that is
-- actually about this route/mountain, per that entry's own text: 'This is the only
-- real camp on Pilchuck...' Removes the same 7 Three Fingers/Whitehorse/Big Four entries.
UPDATE routes SET bivy = '[{"elev": 4655, "name": "Bathtub Lakes basin, east of Mount Pilchuck", "type": "camp", "notes": "This is the only real camp on Pilchuck and it serves the east side rather than the standard route. It is reached from below, from the Bear Lake and Pinnacle Lake trailhead on a spur road off the loop east of Verlot, then up past the lower lake and into the gulch above \u2014 a loose, brushy, steep piece of ground with vegetation-pulling and poor rock that is the genuine difficulty of the East Ridge, not the ridge itself. Camping in the basin splits that so the gulch is climbed fresh. It has no bearing on the standard summit trail, which leaves the end of the Mount Pilchuck road on the other side of the mountain and is a straightforward day hike to the restored summit lookout with no camping along it and none needed. Treat this as a plan for the east side and as a contingency for anyone who commits to the gulch late and would rather not descend it in the dark.", "water": "The lakes and their outlets, dependable through the season and needing treatment. This is a wet basin, which is the whole reason it works as a camp.", "permit": "The summit and upper mountain are a STATE CONSERVATION AREA rather than national forest, but this basin and the approach to it are forest land and no camping permit applies. The parking requirement at the trailheads on this mountain is the FEDERAL pass \u2014 a state Discover Pass is not valid at them, which catches people out because of the state park name. No fires on the state land above, and fire bans are routine below in late summer.", "capacity": "Informal sites among the small lakes and benches of the basin; a few parties, nothing developed"}]'::jsonb WHERE id = 'wa_mount_pilchuck_east_ridge';

-- Fix 3: wa_mount_rainier_edmunds_headwall -- waypoints[0] ('Mowich Lake Trailhead')
-- carried self-contradictory elevation fields: elev=4930 (correct -- Mowich Lake itself
-- is documented at 4,929 ft per Wikipedia/NPS) but elevFt=2900 (no known feature at that
-- elevation on this approach; every other waypoint in this app's routes has elev==elevFt).
-- Correcting elevFt to match elev and the authoritative figure.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '4930', false)
  WHERE id = 'wa_mount_rainier_edmunds_headwall';

