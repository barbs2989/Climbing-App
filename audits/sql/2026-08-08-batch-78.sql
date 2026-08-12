-- WA alpine audit, pass 2, batch 78 (2026-08-08)
-- Routes checked: wa_mount_baker_boulder_park_cleaver, wa_mount_baker_cockscomb_ridge,
-- wa_mount_baker_coleman_deming, wa_mount_baker_coleman_headwall, wa_mount_baker_easton_glacier,
-- wa_mount_baker_north_ridge, wa_mount_baker_park_glacier_headwall, wa_mount_baker_squak_glacier

-- Five of this batch's eight routes share the identical access.permit value
-- "Mount Baker Climbing" -- not an actual permit name. No such permit exists (confirmed via
-- USFS: "The U.S. Forest Service does not require permits for climbing Mt. Baker... Registration
-- is optional"); the string is a truncated fragment of the USFS recreation-area page title
-- "Mt. Baker Summit - Climbing" (fs.usda.gov/r06/mbs/recreation/mt-baker-summit-climbing), not a
-- permit description. Each of these rows' OWN top-level `permit` column already states the real,
-- correct fact ("Free self-issue Mount Baker Wilderness permit or trailhead registration; no
-- quota or fee. Northwest Forest Pass at developed trailheads."), matching the other three
-- routes in this batch whose access.permit sub-field is already a full correct sentence
-- (wa_mount_baker_easton_glacier, wa_mount_baker_park_glacier_headwall, wa_mount_baker_squak_glacier).
-- Rewriting access.permit on the five truncated rows to match the row's own already-correct
-- top-level permit field -- a same-row consistency fix, no new external fact invented.
UPDATE routes SET access = jsonb_set(
  access, '{permit}',
  '"No formal climbing permit required. Free self-issue Mount Baker Wilderness permit or trailhead registration, plus Northwest Forest Pass at developed trailheads."'
)
WHERE id = 'wa_mount_baker_boulder_park_cleaver';

UPDATE routes SET access = jsonb_set(
  access, '{permit}',
  '"No formal climbing permit required. Free self-issue Mount Baker Wilderness permit or trailhead registration, plus Northwest Forest Pass at developed trailheads."'
)
WHERE id = 'wa_mount_baker_cockscomb_ridge';

UPDATE routes SET access = jsonb_set(
  access, '{permit}',
  '"No formal climbing permit required. Free self-issue Mount Baker Wilderness permit or trailhead registration, plus Northwest Forest Pass at developed trailheads."'
)
WHERE id = 'wa_mount_baker_coleman_deming';

UPDATE routes SET access = jsonb_set(
  access, '{permit}',
  '"No formal climbing permit required. Free self-issue Mount Baker Wilderness permit or trailhead registration, plus Northwest Forest Pass at developed trailheads."'
)
WHERE id = 'wa_mount_baker_coleman_headwall';

UPDATE routes SET access = jsonb_set(
  access, '{permit}',
  '"No formal climbing permit required. Free self-issue Mount Baker Wilderness permit or trailhead registration, plus Northwest Forest Pass at developed trailheads."'
)
WHERE id = 'wa_mount_baker_north_ridge';

-- wa_mount_baker_park_glacier_headwall: access.notes carried a trailing false location clause,
-- "...Mount Tom area, North Cascades." -- this is the SAME copy-paste boilerplate junk string
-- identified DB-wide in batch 15 (pass 1), found stamped onto 35 unrelated routes including a
-- Wyoming route with no possible North Cascades connection; two instances were fixed then
-- (wa_guye_peak_south_gully, wa_icy_peak_southwest_route) using this identical replacement text,
-- and this route -- on Mount Baker itself, nowhere near Mount Tom -- is a third confirmed
-- instance of that same known-bad string. Stripping the false clause; the rest of access.notes
-- already correctly describes this route's real Northwest Forest Pass / no-permit situation.
UPDATE routes SET access = jsonb_set(
  access, '{notes}',
  '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."'
)
WHERE id = 'wa_mount_baker_park_glacier_headwall';
