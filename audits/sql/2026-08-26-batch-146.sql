-- wa_mount_logan_r1 (Mount Logan / Banded Glacier): `approach` described ONLY the Thunder
-- Creek/Fisher Creek Trail as if it were the route's approach, with no mention of Easy Pass.
-- But this row's own `beta`, `road`, and `access` fields all agree that the Easy Pass
-- trailhead (SR-20 near milepost 151, ~10 mi one-way to the lake camp) is the STANDARD,
-- shorter approach, and that Thunder Creek/Fisher Creek (~13 mi one-way, from Colonial Creek
-- Campground) is explicitly "a longer, always-open ALTERNATE approach ... useful when Easy
-- Pass Trailhead is gated by SR 20's seasonal closure." `descent_text` also defaults to
-- exiting "back out over Easy Pass," confirming Easy Pass is the primary line, not Thunder
-- Creek. The rewrite below only re-homes facts already present in this row's own `beta`
-- field (mileages, elevations, and the alternate/primary framing) -- nothing external or
-- invented. (Separately: this row's `gain_ft`/`loss_ft` (7027/13000) and `dist_km` (19.3,
-- vs. the row's own waypoint distMi of 14.51 mi = 23.3 km for the summit) look internally
-- inconsistent under either an out-and-back or a point-to-point reading of the route, but no
-- confident replacement values could be derived -- left for human verification, not fixed here.)
UPDATE routes
SET approach = 'The standard approach is via Easy Pass: from Highway 20 near milepost 151, climb to Easy Pass (6,500 ft), descend into Fisher Basin, then continue off-trail to a lake camp near 5,160 ft below the Banded Glacier -- about 10 miles one-way. A longer, always-open alternate follows the Thunder Creek Trail from Colonial Creek Campground (SR-20 MP130) about 9 miles to the Fisher Creek Trail junction, then Fisher Creek Trail about 3 miles to the same lake camp -- about 13 miles one-way -- useful when Easy Pass Trailhead is gated by SR 20''s seasonal winter closure.'
WHERE id = 'wa_mount_logan_r1'
  AND approach = 'Follow Thunder Creek Trail from Colonial Creek Campground (SR-20 MP130) about 9 miles to the Fisher Creek Trail junction, then Fisher Creek Trail about 3 miles to a lake camp near 5,160 ft below the Banded Glacier.';
