-- WA alpine audit, batch 589 (pass 9)

-- wa_let_it_burn (Let it Burn, Colchuck Balanced Rock): loss_ft was NULL while gain_ft was
-- already 4760. This is a true out-and-back from the Stuart Lake Trailhead: the approach text
-- ends "Fill water here -- it's the last source" en route to the base of the climb, and the
-- route's own descent_text explicitly returns "back to the base of the climb" before reversing
-- the same approach out. Filling the missing field to match the route's own stored gain.
UPDATE routes SET loss_ft = 4760
WHERE id = 'wa_let_it_burn' AND gain_ft = 4760 AND loss_ft IS NULL;

-- wa_liberty_bell_girl_next_door (The Girl Next Door, Liberty Bell): loss_ft was NULL while
-- gain_ft was already 2520. The route's own descent_text says it "rejoins the Beckey Route line
-- near its top" and descends via the same two single-rope rappels down to the Liberty-Concord
-- notch that the Beckey Route uses -- the same side of the mountain (Blue Lake Trailhead) this
-- route's own approach text starts from, i.e. a true out-and-back. Filling the missing field to
-- match the route's own stored gain.
UPDATE routes SET loss_ft = 2520
WHERE id = 'wa_liberty_bell_girl_next_door' AND gain_ft = 2520 AND loss_ft IS NULL;
