-- WA alpine audit -- batch 323 (pass 6)
-- Routes checked: wa_forbidden_peak_north_ridge, wa_forbidden_peak_northeast_face,
-- wa_forbidden_peak_northwest_face, wa_forbidden_peak_west_ridge,
-- wa_fortress_mountain_east_ridge, wa_fortress_mountain_northeast_face,
-- wa_fortress_mountain_southwest_face, wa_fortune_peak_east_slope

-- =========================================================================
-- Forbidden Peak, North Ridge -- wa_forbidden_peak_north_ridge
-- =========================================================================
-- watch_out described this as a "Winter route requiring ice climbing or
-- snow climbing skills" with three more winter-only warnings, while every
-- other field on this same row -- season ("Jul-Sep"), best_season ("Mid to
-- late summer for dry rock and a more stable approach glacier"), and the
-- route's own grade (Grade III, 5.6) -- describes an established summer
-- alpine-rock route. Confirmed via WebSearch (The Mountaineers, spokalpine,
-- multiple secondary sources) that the North Ridge is a standard III 5.6
-- summer glacier-and-rock route with no documented winter-ascent
-- characterization; nothing found supports "winter route" as this route's
-- defining hazard. Checked the whole WA catalog for a sibling row sharing
-- this exact wording (to rule out a copy-paste source) and found none --
-- this looks like a one-off content error rather than cross-contamination
-- from an identifiable other route. Replaced with the row's own already-
-- correct, already-verified hazards (glacier crevasse crossing/bergschrund
-- rappel off Sharkfin Col, the long exposed ridge, approach-gully rockfall,
-- remote position) drawn directly from this row's own `hazards`/`obj_haz`
-- fields rather than inventing new content -- no new facts, only
-- re-homing what the row already states correctly elsewhere. Kept the
-- existing newline-separated string shape (matches the app's `toWarnArr()`
-- handling, per this audit's own established practice of not flagging that
-- shape as a defect).
UPDATE routes SET
  watch_out = to_jsonb(
    'Boston Glacier crevasse crossing and bergschrund rappel off Sharkfin Col'
    || E'\n' || 'Long, exposed ridge with limited retreat once committed'
    || E'\n' || 'Rockfall in the approach gully/notch below Sharkfin Col'
    || E'\n' || 'Remote location increases rescue difficulty'
  )
  WHERE id = 'wa_forbidden_peak_north_ridge'
    AND watch_out::text LIKE '%Winter route requiring ice climbing or snow climbing skills%'
    AND season = 'Jul-Sep';

-- =========================================================================
-- Forbidden Peak, Northeast Face -- wa_forbidden_peak_northeast_face
-- =========================================================================
-- Two separate defects on this row, both stemming from its documented
-- history of being confused with the East Ledges descent (this row's own
-- data_quality.gaps says East Ledges "was split into its own record on
-- 2026-07-15").
--
-- (1) obj_haz still describes the East Ledges route, not this one.
-- wa_forbidden_peak_east_ledges.obj_haz is ["extremely loose, largely
-- unprotectable rock", "steep, outward-sloping ledges with serious fall
-- consequences", "confusing route-finding across five rock ribs"] -- and
-- this row's obj_haz is near-verbatim the same two phrases plus
-- "documented fatal fall on the traverse (1975)", which is East Ledges'
-- own documented 1975 fatality (Joe O'Coner, per that row's `hazards`).
-- This row's own `hazards` field was CORRECTLY updated at the 2026-07-15
-- split -- it lists genuine Northeast Face hazards (steep ice, bergschrund,
-- cold aspect, remoteness) and explicitly warns "do not confuse this route
-- with the East Ledges ... that carries a documented 1975 fatality" -- but
-- obj_haz was left behind holding the pre-split East Ledges content.
-- Replaced obj_haz with a condensed version of this row's own (already
-- correct) hazards field, re-homing rather than inventing.
--
-- (2) descent says to retrace the ascent, contradicting this row's own
-- descent_text ("Do not reverse the Northeast Face ... descend via the
-- West Ridge"). A party following the short `descent` field instead of the
-- fuller `descent_text` would be told to reverse a steep, remote ice/mixed
-- face route that this row itself says not to reverse. Every other
-- Forbidden Peak alpine-face route's short `descent` field correctly names
-- the West Ridge couloir (see wa_forbidden_peak_northwest_face,
-- wa_forbidden_peak_north_ridge); brought this row in line with its own
-- descent_text and its siblings' pattern.
UPDATE routes SET
  obj_haz = '["steep firm ice and mixed terrain, best climbed early season while frozen", "bergschrund crossing at the base of the face", "shaded, cold aspect holds hazard later in the season", "remote position with a long, complex retreat -- do not confuse this route with the East Ledges descent, a different, looser line on the same aspect"]'::jsonb,
  descent = 'Do not reverse the Northeast Face. Descend via the West Ridge notch and couloir back into Boston Basin (see wa_forbidden_peak_west_ridge for full descent detail).'
  WHERE id = 'wa_forbidden_peak_northeast_face'
    AND obj_haz::text LIKE '%documented fatal fall on the traverse (1975)%'
    AND obj_haz::text LIKE '%extremely loose, largely unprotectable rock%'
    AND descent LIKE 'Descend via the standard descent route, retracing the ascent when possible%'
    AND descent_text LIKE 'Do not reverse the Northeast Face%'
    AND EXISTS (
      SELECT 1 FROM routes
      WHERE id = 'wa_forbidden_peak_east_ledges'
        AND obj_haz::text LIKE '%extremely loose, largely unprotectable rock%'
        AND hazards::text LIKE '%1975%'
    );

-- =========================================================================
-- Fortress Mountain, Northeast Ridge (id slug retains old "Northeast Face"
-- name; row already renamed 2026-07-29, see this row's own `corrections`)
-- -- wa_fortress_mountain_northeast_face
-- =========================================================================
-- This route shares the identical Trinity Trailhead / Chiwawa River Road
-- (FR 6200) access as its two siblings on the same peak (this row's own
-- `approach` says "Same Trinity Trailhead approach as the East Ridge"; all
-- three rows' Trinity Trailhead waypoints sit within ~30m of each other).
-- wa_fortress_mountain_east_ridge and wa_fortress_mountain_southwest_face
-- both already document (checked live, both still current) that FR 6200 is
-- closed to vehicles beyond Atkinson Flat Campground (~mile 16) under USFS
-- order #06-17-07-2026-11, effective May 20 2026 through Dec 31 2027, after
-- December 2025 storm damage -- adding ~7 miles of road-walking each way.
-- This row's `road`/`access` fields never picked up that closure: `road`
-- still described a merely "rough" gravel road with no mention that
-- vehicles cannot pass Atkinson Flat, and `access.closures` said only
-- "Access road unplowed in winter" -- true but incomplete, since the road
-- is also closed well past Atkinson Flat right now regardless of season.
-- Independently confirmed the closure is real and current via WebSearch
-- against the U.S. Forest Service's own Okanogan-Wenatchee alert page
-- (fs.usda.gov/r06/okanogan-wenatchee/alerts/storm-damaged-roads-closure-
-- wenatchee-river-district), which states the same order number and the
-- same May 20 2026 - Dec 31 2027 effective window. Propagated the
-- already-verified closure fact from the two sibling rows (never invented
-- a new figure) and recorded that access was checked against a primary
-- source today.
UPDATE routes SET
  road = road || jsonb_build_object(
    'status', 'Open to Atkinson Flat Campground (~mile 16). Closed to vehicles beyond that point to Trinity Trailhead under USFS order #06-17-07-2026-11 (effective May 20, 2026 through December 31, 2027 unless rescinded sooner) after December 2025 storm damage',
    'driveNote', 'Same access as the East Ridge and Southwest Face routes -- see those routes for full driving directions. Under the current closure, park near Atkinson Flat and walk the final ~7 miles each way.'
  ),
  access = access || jsonb_build_object(
    'closures', 'Chiwawa River Road (FR 6200) closed to vehicles beyond Atkinson Flat Campground under USFS order #06-17-07-2026-11 (effective May 20, 2026 through December 31, 2027 unless rescinded sooner) after December 2025 storm damage -- verify current status with the Wenatchee River Ranger District before driving in'
  ),
  access_checked_at = '2026-09-23T12:00:00+00:00'
  WHERE id = 'wa_fortress_mountain_northeast_face'
    AND road->>'status' LIKE 'Paved becoming gravel/dirt%'
    AND access->>'closures' = 'Access road unplowed in winter'
    AND access_checked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM routes
      WHERE id = 'wa_fortress_mountain_east_ridge'
        AND access->>'closures' LIKE '%USFS order #06-17-07-2026-11%'
        AND road->>'status' LIKE '%Atkinson Flat Campground%'
    )
    AND EXISTS (
      SELECT 1 FROM routes
      WHERE id = 'wa_fortress_mountain_southwest_face'
        AND access->>'closures' LIKE '%USFS order #06-17-07-2026-11%'
        AND road->>'status' LIKE '%Atkinson Flat Campground%'
    );
