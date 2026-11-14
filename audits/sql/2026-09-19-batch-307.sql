-- WA alpine route audit -- batch 307 (2026-09-19, pass 6, batch 1)
-- Human-reviewable fixes. Nothing here is applied automatically.

-- =========================================================================
-- A Servant To Liberty -- wa_a_servant_to_liberty
-- =========================================================================

-- access.fees said "No climbing permit; NW Forest Pass $5 (day) or $30 (annual)" --
-- directly contradicting this same row's own access.passRequired ("No parking pass
-- required -- this route's approach starts at a free roadside pullout on SR-20 east
-- of Washington Pass (East Face climbers' trail), not the Blue Lake Trailhead") and
-- access._raw.parking_pass_required (which independently says the same). Verified
-- 2026-09-19 against Mountaineers/climbing-guide sourcing for this specific pullout:
-- the SR-20 hairpin pullout used by all East Face Liberty Bell routes (Liberty Crack,
-- Thin Red Line, Freedom or Death, this route) is free roadside parking, distinct from
-- the Blue Lake Trailhead (which does require a Northwest Forest Pass and serves the
-- separate west-side/Beckey routes). access.passRequired and access._raw already had
-- it right; access.fees was generic developed-trailhead boilerplate wrongly applied to
-- this route's actual free approach.
UPDATE routes SET access = jsonb_set(access, '{fees}',
    '"None — this route''s approach starts at the free SR-20 hairpin pullout east of Washington Pass; no parking fee or Northwest Forest Pass required (unlike Blue Lake, Cutthroat, or Washington Pass Overlook trailheads elsewhere in the corridor)."'
  ),
  access_checked_at = '2026-09-19'
  WHERE id = 'wa_a_servant_to_liberty'
  AND access->>'fees' = 'No climbing permit; NW Forest Pass $5 (day) or $30 (annual)'
  AND access_checked_at IS NULL;

-- FLAGGED, not fixed: dist_km (8.05) disagrees sharply with this row's own approach
-- text ("about a mile through forest to the East Face talus", i.e. roughly 1.6 km
-- one-way) -- an ~5x discrepancy. This is not an isolated data-entry slip on this one
-- row: every route sharing the identical East Face hairpin-pullout approach text in
-- this same area (wa_liberty_bell) carries one of three different dist_km values for
-- the same walk-in -- 1.6 (wa_liberty_bell_thin_red_line, whose approach text is
-- nearly word-for-word identical to this row's), 4.02 (wa_liberty_crack,
-- wa_liberty_bell_east_face, wa_liberty_crack_free, wa_liberty_bell_independence_route),
-- and 8.05 (this row, plus wa_live_free_or_die and wa_liberty_and_injustice_for_all,
-- neither of which is in this audit's scope this batch). Per CLAUDE.md's documented
-- caution against bulk-normalizing dist_km (it is known to hold multiple conventions
-- across the catalog and a blanket transform "breaks as many rows as it fixes"), this
-- looks like a genuine three-way convention split across a whole approach corridor --
-- worth a dedicated human/systematic review of the wa_liberty_bell area's dist_km
-- values together, rather than a single-row guess here.

-- =========================================================================
-- Abernathy Peak (South Ridge / Scatter Lake) -- wa_abernathy_peak_south_ridge
-- =========================================================================

-- Top-level `permit` field said "Free self-issue Lake Chelan-Sawtooth Wilderness
-- permit at the trailhead; no quota or fee" -- directly contradicting this same row's
-- own bivy[0].permit ("No wilderness permit is needed to hike or camp on the Forest
-- Service side of this range. A Northwest Forest Pass or Interagency pass is required
-- to park at the Scatter Creek trailhead"). Verified 2026-09-19 against USFS/WTA
-- sourcing: Lake Chelan-Sawtooth Wilderness does NOT require a self-issue wilderness
-- permit (unlike some other Washington wildernesses, e.g. Boulder River Wilderness,
-- which does -- confirmed separately in batch 306 for a different peak, so this is
-- not a blanket assumption that every wilderness works the same way), but the Scatter
-- Creek trailhead does require a Northwest Forest Pass or Interagency pass to park
-- (confirmed via WTA trip-report sourcing for this exact trailhead). bivy[0].permit
-- had it right; the top-level `permit` field was the wrong one.
UPDATE routes SET permit =
    'No wilderness permit required for Lake Chelan-Sawtooth Wilderness. Northwest Forest Pass or Interagency pass required to park at the Scatter Creek trailhead.'
  WHERE id = 'wa_abernathy_peak_south_ridge'
  AND permit = 'Free self-issue Lake Chelan-Sawtooth Wilderness permit at the trailhead; no quota or fee. Northwest Forest Pass at developed trailheads.';

-- Everything else on this row checked clean: high_point_ft (8,321 ft) matches
-- hikeoftheweek.com and AllTrails/WTA sourcing exactly; Scatter Lake's elevation
-- (~7,047-7,100 ft stored) is consistent with sourcing giving 7,030 ft (small,
-- immaterial rounding spread typical of independently sourced trailhead/lake
-- elevations, not a fix candidate); dist_km (8) is internally consistent with this
-- row's own itinerary ("roughly 9-11 miles round trip") when read as a one-way figure
-- doubled by the app, and with independently sourced round-trip mileage to the lake
-- (9.2 mi RT to the lake alone, per WTA) plus the additional ridge distance above it --
-- no fix needed there.

-- =========================================================================
-- Action Potential -- wa_action_potential
-- =========================================================================

-- access.passRequired said "Northwest Forest Pass" and access._raw.parking_pass_
-- required carried the identical claim -- but this route's own access.parking_pass
-- field names the specific trailheads in this corridor that actually require one
-- (Washington Pass Overlook, Blue Lake, and Cutthroat), and this route's own trailhead
-- (the SR-20 Burgundy Col pullout near milepost 166, opposite Silver Star -- per this
-- row's own waypoints, "the climbers' path is not signed, it drops off the east side
-- of the embankment") is not on that list. Verified 2026-09-19 against Mountaineers/
-- guidebook sourcing specific to this pullout: "no red tape to climb this peak nor is
-- a northwest forest pass required for parking at the pullout." Corrected both fields
-- to match access.parking_pass's own (correct) enumeration and the external sourcing.
UPDATE routes SET access = jsonb_set(
    jsonb_set(access, '{passRequired}',
      '"None — the SR-20 Burgundy Col pullout near milepost 166 is a free roadside pullout; no Northwest Forest Pass is required here, unlike the developed Washington Pass Overlook, Blue Lake, and Cutthroat trailheads elsewhere in the corridor."'),
    '{_raw,parking_pass_required}',
    '"None — free roadside pullout, no pass required."'
  ),
  access_checked_at = '2026-09-19'
  WHERE id = 'wa_action_potential'
  AND access->>'passRequired' = 'Northwest Forest Pass'
  AND access->'_raw'->>'parking_pass_required' = 'Northwest Forest Pass'
  AND access_checked_at IS NULL;

-- FLAGGED, not fixed: gain_ft (4,170) and loss_ft (4,300) differ by ~3% on what this
-- row's own descent_text describes as essentially an out-and-back (reverse the
-- Burgundy Col approach both ways). This row's own rappel_count_note is unusually
-- careful about NOT inventing precision it doesn't have ("Per-station distances are
-- not published in any account read for this route; the figures given come from the
-- route's own descent text rather than from measurement"), and a ~130 ft gain/loss
-- spread on a ~4,200 ft outing is well within the kind of rounding/measurement
-- variance that note already flags -- not confident enough to call this a data error
-- worth touching mechanically.
--
-- NOT flagged, checked and left alone deliberately: road.seasonalGate names a dated
-- 2025-26 SR-20 winter closure window ("closed Dec 12, 2025-June 14, 2026... exact
-- dates varying by year"). This is the shape CLAUDE.md already documents as a known,
-- deliberately-propagated example belonging to a separate future "transient-closure
-- sweep" rather than to per-route content audits like this one -- it self-limits (it
-- names the season it describes and hedges that exact dates vary), so it meets this
-- app's own "date it or drop the claim" bar for an acceptable seasonal-gate note even
-- though the named window has since passed (today's date, 2026-09-19, is well within
-- the following open season).
