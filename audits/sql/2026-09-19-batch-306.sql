-- WA alpine route audit -- batch 306 (2026-09-19, pass 5, FINAL batch of pass 5)
-- Human-reviewable fixes. Nothing here is applied automatically.

-- =========================================================================
-- Whitehorse Mountain (Northwest Shoulder) -- wa_whitehorse_mountain_nw_shoulder
-- =========================================================================

-- access.permit and access.parking_pass both contradicted other fields on this same
-- row, and both are wrong per direct sourcing.
--
-- 1. access.permit said "No self-issue or quota wilderness permit required for
--    Boulder River Wilderness" -- directly contradicting this row's own top-level
--    `permit` field ("Free self-issue Boulder River Wilderness permit or trailhead
--    registration; no quota or fee"). Verified 2026-09-19: Boulder River Wilderness
--    (Mt. Baker-Snoqualmie NF, Darrington Ranger District) uses the standard USFS
--    Region 6 self-issue wilderness permit system -- permits are self-issued at the
--    trailhead at no fee, per USFS/WTA sourcing. The row's own `permit` field had it
--    right; access.permit was the wrong one.
-- 2. access.parking_pass said "Northwest Forest Pass required at Mountain Loop
--    Highway trailheads -- $5/day or $30/year" -- directly contradicting this same
--    row's own access.passRequired ("None -- no Northwest Forest Pass or Discover
--    Pass needed to park at the trailhead"). Verified 2026-09-19 against USFS/trip-
--    report sourcing for this specific trailhead: the Niederprum Trailhead is an
--    undeveloped, unsigned pullout at a boulder barricade with no fee station -- no
--    Northwest Forest Pass or day-use fee applies here, unlike the developed fee
--    trailheads elsewhere on the Mountain Loop Highway that sentence was describing.
--    access.passRequired had it right; access.parking_pass was boilerplate wrongly
--    carried over from a developed-trailhead route.
UPDATE routes SET access = jsonb_set(
    jsonb_set(access, '{permit}',
      '"Free self-issue Boulder River Wilderness permit required at the trailhead; no quota or fee."'),
    '{parking_pass}',
    '"None — the undeveloped Niederprum Trailhead has no fee station and does not require a Northwest Forest Pass, unlike developed Mountain Loop Highway trailheads elsewhere."'
  ),
  access_checked_at = '2026-09-19'
  WHERE id = 'wa_whitehorse_mountain_nw_shoulder'
  AND access->>'permit' = 'No self-issue or quota wilderness permit required for Boulder River Wilderness.'
  AND access->>'parking_pass' = 'Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year.'
  AND access_checked_at IS NULL;

-- FLAGGED, not fixed: gain_ft/loss_ft (7,000/7,000) disagree with this row's own
-- itinerary day-1 gainFt/lossFt (6,300/6,300) by ~11%. This row's own data_quality
-- field already documents the ambiguity ("Published elevation gain figures vary
-- (~6,300-7,000 ft) depending on whether the Lone Tree Pass/High Pass up-and-down is
-- counted; no GPS-verified figure found"), so there is no single obvious replacement
-- value -- both readings are plausible depending on which up-and-down segments are
-- counted. Needs a human call rather than a mechanical pick.

-- =========================================================================
-- Whitehorse Mountain (Northwest Shoulder / Northwest Face, ice/snow) -- wa_whitehorse_mountain_r1
-- =========================================================================

-- Same access.permit / access.parking_pass contradiction as the sibling NW Shoulder
-- route above (identical boilerplate text on both rows) -- same fix, same sourcing.
UPDATE routes SET access = jsonb_set(
    jsonb_set(access, '{permit}',
      '"Free self-issue Boulder River Wilderness permit required at the trailhead; no quota or fee."'),
    '{parking_pass}',
    '"None — the undeveloped Niederprum Trailhead has no fee station and does not require a Northwest Forest Pass, unlike developed Mountain Loop Highway trailheads elsewhere."'
  ),
  access_checked_at = '2026-09-19'
  WHERE id = 'wa_whitehorse_mountain_r1'
  AND access->>'permit' = 'No self-issue or quota wilderness permit required for Boulder River Wilderness.'
  AND access->>'parking_pass' = 'Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year.'
  AND access_checked_at IS NULL;

-- bivy[0].permit carried the identical false claim ("no permit to camp, no quota, no
-- self-issue box") about Boulder River Wilderness's self-issue permit system that the
-- access.permit fix above corrects. The rest of that entry's permit text ("No fee at
-- the trailhead, which is unusual for this area") is independently correct (confirmed
-- above: this specific trailhead genuinely has no fee station) and is left untouched
-- -- only the wilderness-permit claim is wrong.
UPDATE routes SET bivy = jsonb_set(bivy, '{0,permit}',
    '"Boulder River Wilderness — free self-issue wilderness permit at the trailhead; no quota. No fee at the trailhead, which is unusual for this area and reflects how minimal the parking is. Fires are a bad idea on this ground and are commonly banned outright in late summer."'
  )
  WHERE id = 'wa_whitehorse_mountain_r1'
  AND bivy->0->>'name' = 'Whitehorse high camp, benches near Lone Tree Pass'
  AND bivy->0->>'permit' = 'Boulder River Wilderness — no permit to camp, no quota, no self-issue box. No fee at the trailhead, which is unusual for this area and reflects how minimal the parking is. Fires are a bad idea on this ground and are commonly banned outright in late summer.';

-- FLAGGED, not fixed: gain_ft/loss_ft (7,000/7,000, identical to the sibling NW
-- Shoulder route since both share the same trailhead/lower approach) disagree with
-- this row's own itinerary day-1 gainFt/lossFt (6,400/6,400). This row's own
-- data_quality field already flags the itinerary figures themselves as uncertain
-- ("No GPS-verified elevation-gain/distance figures found; the ~6,400 ft / 13 mi
-- figures come from a single ski-touring trip report and should be treated as
-- approximate"), so neither figure is a confident replacement for the other. Needs a
-- human call.

-- =========================================================================
-- Witches Tower (South Face / Standard Route) -- wa_witches_tower_south_face
-- =========================================================================

-- descent_text twice calls the technical crux move "the 5.5" move, but this row's own
-- top-level `grade` field ("Grade II, 5.4") and its own pitch_detail[0] ("grade":
-- "5.4", "crux": true, describing this exact move -- "the short technical crux of
-- this quick summit add-on") both agree on 5.4. Two fields on this row agree with
-- each other and disagree with descent_text alone; corrected descent_text to match
-- the row's own grade and pitch_detail rather than inventing a third figure. (This
-- row's own data_quality field already flags that published grade/route naming for
-- Witches Tower is inconsistent across outside sources -- this fix only resolves the
-- row's internal self-contradiction, it does not adjudicate which external source is
-- "correct.")
UPDATE routes SET descent_text = replace(
    replace(descent_text, 'the single 5.5 step-up/short face move', 'the single 5.4 step-up/short face move'),
    'downclimbing the 5.5 move', 'downclimbing the 5.4 move'
  )
  WHERE id = 'wa_witches_tower_south_face'
  AND descent_text LIKE '%the single 5.5 step-up/short face move%'
  AND descent_text LIKE '%downclimbing the 5.5 move%'
  AND grade = 'Grade II, 5.4';

-- Everything else on this row checked clean against authoritative sourcing (2026-09-
-- 19): high_point_ft (8,566 ft) matches Wikipedia and SummitPost exactly, and this
-- row's own `corrections` field already documents that verification; the "0.4 mi
-- east-southeast of Dragontail Peak" relationship in `overview` matches Wikipedia's
-- peak-relationship data exactly; the Enchantment Permit Area fee figures in `access`
-- ($6 non-refundable lottery application fee, $5/person/day for successful overnight
-- permits, Feb 15-Mar 1 2026 lottery window) all match current Recreation.gov/USFS-
-- sourced reporting exactly. No fix needed for any of these; not flagged.
