-- WA alpine route audit -- batch 252 (pass 5)
-- Routes: wa_dorado_needle_east_ridge, wa_dragontail_peak_backbone_ridge,
-- wa_dragontail_peak_east_ridge_aasgard_pass, wa_dragontail_peak_r1,
-- wa_dragontail_peak_r2, wa_dragontail_peak_r3, wa_dragontail_peak_r4,
-- wa_dragontail_peak_serpentine_arete
--
-- Elevation cross-checked and confirmed for the whole batch: Dragontail Peak
-- 8,840 ft (Wikipedia, per-route waypoint chains all agree) and Dorado Needle
-- 8,440+ ft (Wikipedia). No change needed to either high_point_ft.

-- wa_dorado_needle_east_ridge: gain_ft/loss_ft stored as 6000/6000. The row's
-- own approach/approach_logistics text gives the Eldorado Creek Trailhead at
-- ~2,100 ft (independently confirmed against a Washington Trails
-- Association/multiple guide-service descriptions of the Cascade River Road
-- mile-20 trailhead, all giving 2,100 ft), and the row's own Summit waypoint
-- gives 8,440 ft. A party that starts at the trailhead and stands on the
-- summit has gained at least 8,440-2,100 = 6,340 ft, so 6,000 ft is below the
-- floor the row's own numbers establish (by 340 ft, before any credit for the
-- documented "two short rappels drop into a notch below the true summit"
-- dip-and-regain near the top, which would only add to the true cumulative
-- total). Corrected to the row's own directly-derivable floor for both
-- gain_ft and loss_ft, matching this row's own existing gain_ft=loss_ft
-- convention.
UPDATE routes SET gain_ft = 6340, loss_ft = 6340
WHERE id = 'wa_dorado_needle_east_ridge' AND gain_ft = 6000 AND loss_ft = 6000;

-- Same route: fa carries a self-imposed hedge, "(this attribution is not
-- certain)", after crediting Joan and Joe Firey, Hans Hoesli, Dave Knudson
-- and Peter Renz on July 4, 1971. That exact party and date are independently
-- confirmed (Wikipedia's Dorado Needle article states the East Ridge "was
-- first ascended by Joan and Joe Firey, Hans Hoesli, Dave Knudson and Peter
-- Renz on July 4, 1971"; SummitPost's Dorado Needle page gives the same
-- names and date), so the uncertainty this row was carrying about its own
-- fa field is resolved -- removing the now-unsupported hedge rather than
-- leaving a correct, sourced fact reading as doubtful.
UPDATE routes
SET fa = 'Joan and Joe Firey, Hans Hoesli, Dave Knudson, and Peter Renz — July 4, 1971'
WHERE id = 'wa_dorado_needle_east_ridge'
  AND fa = 'Joan and Joe Firey, Hans Hoesli, Dave Knudson, and Peter Renz — July 4, 1971 (this attribution is not certain)';

-- wa_dragontail_peak_backbone_ridge: descent_text names a specific "documented
-- rappel station near 47.479°N, 120.832°W" for the icy-conditions rappel
-- alternative -- but this row's OWN rappel_count_note field already and
-- correctly says the opposite: "No verifiable coordinate is published for
-- the rappel station — the one that circulates sits almost exactly on the
-- peak's own summit coordinates, which is not a real station fix — so none
-- is given here. Find the station on the ground rather than by GPS." The
-- coordinate descent_text states (47.479, -120.832) is in fact within ~0.001°
-- of this row's own Dragontail Peak Summit waypoint (47.4789, -120.83318) --
-- i.e. it is exactly the debunked, summit-derived non-fix rappel_count_note
-- already warns against. This is a direct, internal self-contradiction: one
-- field of this same row states a coordinate should not be trusted/given,
-- the other still gives it. Rewriting descent_text to match the honest
-- framing already established elsewhere in the row rather than repeating the
-- bogus fix.
UPDATE routes
SET descent_text = 'Most parties descend the east ledges and sandy summit gully toward Aasgard Pass and down to Colchuck Lake. When the upper descent gully is icy (common late season), rappel instead — two rappels on a 70m rope (60m works) using rock anchors to avoid the ice slope. No verifiable coordinate is published for the rappel station (a coordinate that circulates for it sits almost exactly on the peak''s own summit position and is not a real station fix); find the anchors on the ground rather than by GPS. Watch for loose rock and verify anchor integrity on any rappel here.'
WHERE id = 'wa_dragontail_peak_backbone_ridge'
  AND descent_text = 'Most parties descend the east ledges and sandy summit gully toward Aasgard Pass and down to Colchuck Lake. When the upper descent gully is icy (common late season), rappel instead — two rappels on a 70m rope (60m works) using rock anchors to avoid the ice slope, with a documented rappel station near 47.479°N, 120.832°W. Watch for loose rock and verify anchor integrity on any rappel here.';

-- wa_dragontail_peak_east_ridge_aasgard_pass: commitment (which holds a
-- roman-numeral commitment grade on every other route in this batch -- III,
-- IV, II-III, etc.) instead stores the trip-stats prose "12.5 miles, 5,600 ft
-- gain, 8-10 hours" -- the wrong kind of content for this column, and not
-- even new information: this row's own gain_ft (5,600, an exact match) and
-- dist_km (10.1 km = 6.28 mi one-way, which the app doubles to a 12.55 mi
-- round trip -- matching "12.5 miles" almost exactly) already store the same
-- two facts properly. Clearing the misfiled duplicate rather than guessing a
-- numeral commitment grade with no source for one; nothing is lost, since the
-- distance/gain/hours figures already live in their own correct columns
-- (dist_km, gain_ft) and this route's own approach text already states the
-- hours ("8-10 hours" appears in the approach/waypoint text elsewhere in this
-- row).
UPDATE routes SET commitment = NULL
WHERE id = 'wa_dragontail_peak_east_ridge_aasgard_pass'
  AND commitment = '12.5 miles, 5,600 ft gain, 8-10 hours';

-- wa_dragontail_peak_r1 (Hidden Couloir): dist_km stored as 20 (12.43 mi),
-- which the app doubles to a displayed 24.86 mi round trip -- wildly larger
-- than this route's own approach text ("hike... about 4 miles to Colchuck
-- Lake... ascend talus to the base of the Hidden Couloir") and its own
-- waypoint chain, whose "Dragontail Peak summit" waypoint gives the one-way
-- distance from the trailhead as distMi=6.3 (6.3 mi = 10.14 km). 20 km is
-- within 1% of exactly DOUBLE that one-way figure (2 x 10.14 = 20.28 km) --
-- i.e. the round-trip total was stored where the app expects the one-way
-- distance it doubles for display, the same doubling bug documented and
-- fixed on this massif's other routes in earlier batches (236-238).
-- Corrected to the row's own one-way waypoint distance.
UPDATE routes SET dist_km = 10.14
WHERE id = 'wa_dragontail_peak_r1' AND dist_km = 20;

-- wa_dragontail_peak_r3 (Pandora's Box / W Couloir): gain_ft is stored as
-- 4,700 with loss_ft NULL. This route's own waypoint chain gives the
-- Trailhead at 3,400 ft and, per its own beta ("From the notch, drop down
-- and traverse northeast to the true summit"), reaches the same 8,840 ft
-- Dragontail Peak summit every other route on this peak reaches from this
-- same trailhead -- a net rise of 5,440 ft, which every sibling route in this
-- batch (backbone_ridge, r2, r4, serpentine_arete) independently stores as
-- gain_ft=5440 from the same trailhead/summit pair. 4,700 ft is below that
-- floor (and the true cumulative gain is if anything somewhat higher than
-- 5,440, given the documented drop-then-regain through the notch, which this
-- fix does not attempt to quantify precisely). Corrected to the row's own
-- directly-derivable floor for both gain_ft and loss_ft, matching the
-- gain_ft=loss_ft convention already used by every sibling route on this
-- peak.
UPDATE routes SET gain_ft = 5440, loss_ft = 5440
WHERE id = 'wa_dragontail_peak_r3' AND gain_ft = 4700 AND loss_ft IS NULL;

-- Flagged for human review, NOT auto-fixed (no confident, precisely-sourced
-- replacement value available):
--
-- wa_dragontail_peak_backbone_ridge and wa_dragontail_peak_serpentine_arete
-- both store dist_km = 26.55 (16.5 mi one-way, doubling to a displayed 33.0
-- mi round trip). This is wildly larger than either route's own approach
-- text (~4 mi one-way to Colchuck Lake per both approach_variants entries,
-- plus a further stretch of moraine/talus to the route base) and than
-- external sourcing: a Mountaineers.org trip report for the comparable
-- Colchuck Peak + Dragontail Peak combination via Colchuck Col and Pandora's
-- Box (a longer, two-summit outing from the same trailhead) gives a round
-- trip of "approximately 15-16 miles." 33.0 mi doubling to a round number is
-- itself the documented dist_km-bug tell CLAUDE.md describes for this
-- column, but unlike wa_dragontail_peak_r1 above, neither row's own waypoint
-- chain carries a distMi on its Summit waypoint (or any other figure) that
-- would pin down a specific, confidently-sourced replacement -- the true
-- one-way distance to each route's technical start could plausibly be
-- anywhere from ~4.5 to ~6 mi depending on how far up the moraine/glacier the
-- route actually starts, and inventing a precise figure would just replace
-- one guess with another. Needs a human with a guidebook mileage or GPS
-- track to pin down the correct one-way value.
--
-- wa_dragontail_peak_r2 (Gerber-Sink) and wa_dragontail_peak_r3 (Pandora's
-- Box) both store dist_km = 6.4 (3.98 mi one-way). This is smaller than each
-- route's own waypoint chain already gives for reaching its own technical
-- start: r2's "Face low point / route start" waypoint carries distMi=5.2 (5.2
-- mi = 8.37 km), and r3's "Colchuck Col" / "Pandora's Box notch" waypoints
-- carry distMi=5.6/5.8. 6.4 km (3.98 mi) matches almost exactly the distMi=4
-- given for reaching Colchuck Lake alone on both rows' own waypoint chains --
-- suggesting dist_km may have been set to "distance to the lake" rather than
-- "distance to the route," understating the true one-way approach by roughly
-- a mile. This is a softer, less clear-cut signal than the r1 doubling bug
-- above (no round-number "doubles to a whole mile figure" tell, and it is
-- plausible the app's convention for winter/glacier routes like these
-- intentionally measures to the basecamp/lake rather than to the technical
-- start) -- flagged rather than fixed, since which reading is "correct" here
-- is a product/convention question this audit cannot settle on its own.
