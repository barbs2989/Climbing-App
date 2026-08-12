-- WA alpine audit -- pass 2, batch 2 (batch #53 overall) -- 2026-08-06
-- Routes: wa_amphitheater_mountain_middle_finger_buttress_left_side / _right_side,
--         wa_amphitheater_mountain_north_ridge, wa_amphitheater_mountain_pilgrimage_to_mecca,
--         wa_amphitheater_mountain_west_route (Amphitheater Mountain, remaining routes),
--         wa_andersons_thumb_standard (Anderson's Thumb),
--         wa_argonaut_peak_east_ridge, wa_argonaut_peak_northeast_couloir (Argonaut Peak)
-- Researched via 3 parallel agents, one per peak. See audits/wa-alpine-audit-log.md for
-- the full writeup. Every confirmed fix's current value was re-verified against a fresh
-- full-row fetch of the live DB before this file was written. All WHERE clauses include
-- the current (wrong) value as a safety check per project convention.

-- =========================================================================
-- Anderson's Thumb (wa_andersons_thumb_standard) -- the Flypaper Pass waypoint's
-- elev (6500) contradicts this same route's own approach narrative ("toward
-- Flypaper Pass (6,600 ft)...") and SummitPost's published figure for the same
-- notch (6600 ft, between Mt. Anderson and 7033-ft "Echo Rock" -- the 7033 ft
-- figure matches this row exactly).
-- =========================================================================
UPDATE routes
SET waypoints = (
  SELECT jsonb_agg(
    CASE WHEN elem->>'name' = 'Flypaper Pass'
      THEN jsonb_set(elem, '{elev}', '6600')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(waypoints) AS elem
)
WHERE id = 'wa_andersons_thumb_standard'
  AND waypoints @> '[{"name": "Flypaper Pass", "elev": 6500}]'::jsonb;

-- =========================================================================
-- Anderson's Thumb (wa_andersons_thumb_standard) -- corrections wrongly labels
-- the peak's region as "Washington North Cascades," contradicted by every other
-- geographic field on the row (avy_zone "Olympics", path through
-- wa_olympic_np/wa_central_olympics, blurb "central Olympics", NWAC zone
-- "Olympics"). Anderson's Thumb is in the Olympics, not the North Cascades.
-- =========================================================================
UPDATE routes
SET corrections = replace(corrections, 'a Washington North Cascades peak/route', 'a Washington Olympics peak/route')
WHERE id = 'wa_andersons_thumb_standard'
  AND corrections LIKE '%a Washington North Cascades peak/route%';

-- =========================================================================
-- Southeast Ridge (wa_argonaut_peak_east_ridge; id still says east_ridge from a
-- pre-existing, already-tracked 2026-07-15 rename) -- top-level permit claims an
-- Enchantment Permit Area lottery requirement, contradicting this same row's own
-- access.fees/access.notes/access.permit, which already correctly state the
-- Teanaway-side Beverly Creek/Ingalls Creek approach sits entirely outside the
-- lottery boundary. Identical bug already fixed on this peak's sibling South Face
-- route (wa_south_face_12) in batch 43; never applied here.
-- =========================================================================
UPDATE routes
SET permit = 'Free self-issued USFS wilderness permit at the trailhead -- no quota, no lottery. This Teanaway-side (Beverly Creek/Ingalls Creek) approach sits entirely outside the Enchantment Permit Area boundary, which covers only the Stuart Lake/Colchuck/Snow Lakes/Eightmile/Core zones reached via the Icicle Creek corridor.'
WHERE id = 'wa_argonaut_peak_east_ridge'
  AND permit = 'Enchantment permit area: overnight stays May 15-Oct 31 require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use permit at the trailhead.';

-- =========================================================================
-- Southeast Ridge (wa_argonaut_peak_east_ridge) -- gain_ft/loss_ft don't match
-- this row's own itinerary day-by-day sums (day1 gain 2800/loss 300 + day2 gain
-- 1357/loss 4157 = gain 4157/loss 4457). loss_ft held the gain total by
-- coincidence.
-- =========================================================================
UPDATE routes
SET gain_ft = 4157, loss_ft = 4457
WHERE id = 'wa_argonaut_peak_east_ridge'
  AND gain_ft = 4300 AND loss_ft = 4157;

-- =========================================================================
-- Northeast Couloir (wa_argonaut_peak_northeast_couloir) -- commitment held
-- "III"; SummitPost consistently documents this route as NCCS commitment
-- grade II (5.6). No source found for III.
-- =========================================================================
UPDATE routes
SET commitment = 'II'
WHERE id = 'wa_argonaut_peak_northeast_couloir'
  AND commitment = 'III';

-- =========================================================================
-- Northeast Couloir (wa_argonaut_peak_northeast_couloir) -- loss_ft (843) is
-- drastically inconsistent with this row's own gain_ft (5057, independently
-- verified: it equals this row's own summit waypoint elev (8457) minus its
-- own Stuart Lake Trailhead waypoint elev (3400)). approach/descent_text both
-- describe a round trip back to that same trailhead, so loss should
-- approximate gain, not sit near zero.
-- =========================================================================
UPDATE routes
SET loss_ft = 5057
WHERE id = 'wa_argonaut_peak_northeast_couloir'
  AND gain_ft = 5057 AND loss_ft = 843;

-- =========================================================================
-- Northeast Couloir (wa_argonaut_peak_northeast_couloir) -- access.notes held
-- a raw escaped-JSON string instead of readable text (same leaked-structure
-- rendering bug seen elsewhere in this project), and that blob's own
-- overnightPermit sub-field asserted "June 15-October 15," contradicting this
-- same row's top-level permit and access.permit fields (both already
-- correctly say May 15-Oct 31, matching the official USFS/Recreation.gov
-- Enchantment Permit Area season).
-- =========================================================================
UPDATE routes
SET access = jsonb_set(
      access, '{notes}',
      '"Free self-issued day-use permit required at the trailhead year-round. Overnight camping requires an Alpine Lakes Wilderness Enchantments permit (Colchuck Lake Zone) May 15-Oct 31, allocated via the Recreation.gov advance lottery, matching this row''s own top-level permit and access.permit fields. Parking is $5/day or $30/annual (Northwest Forest Pass), Stuart Lake Trailhead lot on the right side of FR 7601 only. FR 7601 is typically closed to vehicles November-May. Recommended climbing season is June-October (late May-early June specifically for the couloir''s snow conditions). No dispersed camping between FR 7601 and Icicle Creek. Dogs prohibited in Alpine Lakes Wilderness. Motorized equipment prohibited."'::jsonb
    )
WHERE id = 'wa_argonaut_peak_northeast_couloir'
  AND access->>'notes' LIKE '{"permits":%';
