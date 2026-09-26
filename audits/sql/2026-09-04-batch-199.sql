-- WA alpine audit batch 199 (pass 4)
-- wa_lena_lake_to_mt_stone_traverse .. wa_liberty_bell_nw_face

-- wa_lewis_creek_route: timing.sectionBreakdown[0].note was truncated mid-word
-- (ends '...Barclay Lake clim...' with a literal ellipsis character); completed the
-- obviously-intended word and closed the sentence. No new facts introduced -- the
-- clause was already fully legible up to the cut point.
UPDATE routes
SET timing = jsonb_set(timing, '{sectionBreakdown,0,note}', '"This is the historic 1915 first-ascent line up the Lewis Creek drainage on the peak''s north/west side, distinct from (and far less traveled than) the now-standard Barclay Lake climb."'::jsonb)
WHERE id = 'wa_lewis_creek_route'
  AND timing->'sectionBreakdown'->0->>'note' = 'This is the historic 1915 first-ascent line up the Lewis Creek drainage on the peak''s north/west side, distinct from (and far less traveled than) the now-standard Barclay Lake clim…';

-- wa_lexington_tower_east_face: Trailhead waypoint ('SR-20 Hairpin / Pond Pullout
-- (east of Washington Pass)', 48.51454,-120.64332) stored elev/elevFt=5450. The
-- IDENTICAL name+coordinate is used by 6 sibling routes in the adjacent wa_liberty_bell
-- area (wa_liberty_crack, wa_liberty_crack_free, wa_liberty_bell_thin_red_line,
-- wa_liberty_bell_east_face, wa_liberty_and_injustice_for_all, wa_liberty_bell_independence_route
-- [5160]) and all agree on 5200 ft; web sources describing this pullout ('just east of
-- Washington Pass' at 5,477 ft) are consistent with ~5,100-5,200 ft, not 5,450. Corrected
-- to 5200 to match the corroborated value. gain_ft/loss_ft (was 2171 = notch 7621 - old TH
-- 5450) recomputed against the corrected trailhead: 7621 - 5200 = 2421. (The notch waypoint's
-- own 7621 ft is itself flagged separately below -- it exceeds Lexington Tower's confirmed
-- summit elevation of 7,560 ft despite the route not tagging the true summit -- but no
-- sourced replacement value for the notch itself was found, so it is left as-is here and
-- gain_ft/loss_ft only reflect the corrected trailhead.)
UPDATE routes
SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,elev}', '5200'::jsonb), '{0,elevFt}', '5200'::jsonb),
    gain_ft = 2421,
    loss_ft = 2421
WHERE id = 'wa_lexington_tower_east_face'
  AND waypoints->0->>'elev' = '5450'
  AND gain_ft = 2171
  AND loss_ft = 2171;

-- wa_liberty_bell_east_face (Liberty Bell's own moderate 4-pitch 5.6 East Face -- NOT
-- to be confused with wa_lexington_tower_east_face, a harder 10-pitch 5.9+ route on the
-- neighboring Lexington Tower): two contamination bugs.
-- (a) `beta` read 'Ten pitches ... offwidth crux (pitch 6) passing a fixed 2x4 and two
--     bolts to an alcove' -- this is Lexington Tower's East Face pitch 6, not this
--     route's. Contradicts this row's own pitches=4 and its own self-consistent
--     pitch_detail (4 pitches, 5.4/5.6/5.5/5.4, no offwidth/2x4/bolts mentioned).
--     Re-homed a corrected beta summary from this route's own pitch_detail array
--     rather than inventing new facts.
-- (b) The Trailhead waypoint's `note` field described the Blue Lake Trailhead ('about
--     1.5 mi WEST of Washington Pass') -- copied verbatim from the Beckey Route/NW Face
--     waypoints at a DIFFERENT coordinate -- while this waypoint's own `directions`
--     field (and the route's own name/hazards) correctly describe the east-side hairpin
--     pullout and explicitly say 'not the Blue Lake Trailhead'. Replaced `note` with the
--     correct east-side description already used by sibling wa_liberty_bell_independence_route
--     at the identical coordinate.
UPDATE routes
SET beta = 'Four pitches of moderate face and crack climbing on the East Face talus, easier than the neighboring bolted testpieces at this cluster of routes: a 5.4 opening pitch, a sustained 5.6 crux on pitch 2, easier 5.5 climbing on pitch 3, and a final easy pitch/scramble. Most parties then descend via the standard Beckey Route notch rappels rather than topping out directly above this line.',
    waypoints = jsonb_set(waypoints, '{0,note}', '"Pullout on the north shoulder of SR-20 at the hairpin curve just east of Washington Pass, below Liberty Bell; walk back toward the pass to the small pond on the south side of the highway."'::jsonb)
WHERE id = 'wa_liberty_bell_east_face'
  AND beta = 'Ten pitches of varied crack, chimney and face climbing on the East Face, with a difficult-to-protect slopey pitch 1 traverse and an offwidth crux (pitch 6) passing a fixed 2x4 and two bolts to an alcove.'
  AND waypoints->0->>'note' = 'Signed pullout on SR-20 about 1.5 mi west of Washington Pass; Northwest Forest Pass required, privy at the lot.';

-- wa_liberty_bell_nw_face: loss_ft was null despite gain_ft=2520 being populated. The
-- route's own descent text says 'follow the standard Liberty Bell descent' -- the same
-- descent sibling wa_liberty_bell_beckey_route uses, whose loss_ft is 2546 (descent adds
-- ~26 ft of up/down vs the direct trailhead-summit rise). Filled from that sibling's value
-- rather than inventing a new number.
UPDATE routes
SET loss_ft = 2546
WHERE id = 'wa_liberty_bell_nw_face'
  AND gain_ft = 2520
  AND loss_ft IS NULL;
