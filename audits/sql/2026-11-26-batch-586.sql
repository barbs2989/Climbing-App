-- WA alpine audit, batch 586 (pass 9)

-- wa_inner_constance_seans_route (Sean's Route/Second Wind, Inner Constance): gain_ft/loss_ft were
-- both NULL despite the route's own stored itinerary already giving a day-by-day breakdown (day 1
-- hike-in +2800 ft to Home Lake, day 3 hike-out -2800 ft, day 2 the technical climbing day
-- contributing no net change) -- filling the top-level scalars from the itinerary's own sum.
UPDATE routes SET gain_ft = 2800, loss_ft = 2800
WHERE id = 'wa_inner_constance_seans_route' AND gain_ft IS NULL AND loss_ft IS NULL;

-- wa_iron_peak_teanaway_scramble (Standard Scramble, Iron Peak): this is a simple out-and-back
-- (trailhead ~3800 ft to summit 6510 ft, no loop), so gain_ft should equal loss_ft -- loss_ft
-- (2710) already matches that pin-derived delta, but gain_ft was stored as 2543. External sources
-- (Wenatchee Outdoors ~2600 ft, SummitPost ~2900 ft, Mountaineers 2700-3300 ft) cluster around the
-- corrected 2710 figure, not 2543.
UPDATE routes SET gain_ft = 2710
WHERE id = 'wa_iron_peak_teanaway_scramble' AND gain_ft = 2543 AND loss_ft = 2710;

-- wa_jack_mountain_nohokomeen_headwall (Nohokomeen Glacier and Headwall, Jack Mountain): loss_ft
-- was NULL. gain_ft (10000) is independently corroborated by mountaineers.org's route page (30 mi
-- round trip, 10,000 ft elevation gain) -- the lower pin-derived and itinerary figures undercount
-- because they miss the long flat/bushwhack approach terrain a straight-line calc can't see. Since
-- this is an out-and-back to the same trailhead, loss should match the already-correct gain.
UPDATE routes SET loss_ft = 10000
WHERE id = 'wa_jack_mountain_nohokomeen_headwall' AND gain_ft = 10000 AND loss_ft IS NULL;

-- wa_jack_mountain_northeast_glacier (Northeast Glacier, Jack Mountain): gain_ft = 4501 is
-- confirmed impossible, independent of any external source -- this route's own stored waypoints
-- (trailhead 1880 ft -> summit 9075 ft) already require a one-way net gain of ~7195 ft, which a
-- round trip cannot gain less than. No authoritative sourced replacement figure was found (the
-- itinerary's own 9400/9400 is plausible but unsourced; Beckey's Cascade Alpine Guide Vol. 2,
-- cited by Wikipedia for this route, was not accessible to confirm a number). Clearing the
-- known-wrong value rather than guessing a replacement; needs human research to fill it back in.
UPDATE routes SET gain_ft = NULL
WHERE id = 'wa_jack_mountain_northeast_glacier' AND gain_ft = 4501 AND loss_ft IS NULL;

-- wa_jack_mountain_southeast_ridge_direct (Southeast Ridge Direct, Jack Mountain): permit was
-- NULL, but this route's own approach text says its overnight camps/approach are shared with the
-- South Face route on the same peak, whose row already documents the required NPS backcountry
-- permit. Copying that same permit text over rather than leaving this route silent about it.
UPDATE routes SET permit = 'North Cascades NP complex: no permit for day climbs. All overnight backcountry stays require a backcountry permit (reserve on Recreation.gov or walk-up at the Marblemount Wilderness Information Center).'
WHERE id = 'wa_jack_mountain_southeast_ridge_direct' AND permit IS NULL;

-- wa_johannesburg_mountain_cj_couloir (Cascade-Johannesburg Couloir / East Ridge, Johannesburg
-- Mountain): gain_ft/loss_ft (4900/4600) undercounted the round trip -- this route's own waypoints
-- (trailhead 3600 ft -> couloir base 3300 ft -> east-ridge col 6765 ft -> summit 8200 ft, reversed
-- on the way out) sum to 5200 ft of gain and 5200 ft of loss, not 4900/4600, which drop the final
-- ~300 ft re-gain back up from the couloir base to the trailhead.
UPDATE routes SET gain_ft = 5200, loss_ft = 5200
WHERE id = 'wa_johannesburg_mountain_cj_couloir' AND gain_ft = 4900 AND loss_ft = 4600;
