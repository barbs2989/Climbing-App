-- WA alpine audit, batch 590 (pass 9)

-- wa_liberty_crack (Liberty Crack, Liberty Bell): loss_ft (2546) was stored equal to gain_ft
-- (2546), implying the route returns to the same elevation/trailhead it started from. But the
-- route's own stored approach and descent_text say otherwise: the approach starts at the SR-20
-- East Face hairpin pullout (~5200 ft), while descent_text explicitly warns "Liberty Crack
-- parties park at the East Face pullout on SR-20 rather than at the Blue Lake Trailhead, so this
-- descent puts you down on the far side of the mountain from the car, meaning either a shuttle or
-- roughly a mile back along the highway shoulder." A same-trailhead loss_ft cannot be correct for
-- a route that does not return to its own trailhead. Its structurally identical sibling,
-- wa_liberty_crack_free (same approach, same shared Beckey-side descent), already has loss_ft
-- left NULL for this exact reason. No stored waypoint marks the actual descent exit's elevation,
-- so there is no safe replacement value to compute -- nulling the field to match the sibling
-- route rather than leaving a confirmed-wrong number in place.
UPDATE routes SET loss_ft = NULL
WHERE id = 'wa_liberty_crack' AND gain_ft = 2546 AND loss_ft = 2546;
