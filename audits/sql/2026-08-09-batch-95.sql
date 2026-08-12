-- WA alpine audit batch 95 (pass 2) -- 2026-08-09
-- Routes: Northwest Face (Boving-Pollock) (South Early Winters Spire),
-- Standard Route / Northwest Spire (Northwest Mox Peak),
-- Northwest Ridge (Dorado Needle), Northwest Ridge (Boston Peak),
-- NW Face Var. (Remsberg Variation) (Liberty Bell Mountain),
-- NW Ridge (Colchuck Balanced Rock),
-- East Side Route + Southwest Route (Old Guard Peak)

-- 1. Dorado Needle / Northwest Ridge (wa_northwest_ridge): stored alpine_grade and commitment
-- were both "III", but this is Dorado Needle's easiest, shortest technical line (3 short
-- pitches, first-ascent route). BC Adventure Guides, Cascade Mountain Ascents, and spokalpine.com
-- all independently grade it Grade II, distinct from Dorado Needle's harder Southwest Buttress
-- (III+) and East Ridge (III) -- no source found calling the NW Ridge Grade III.
UPDATE routes SET alpine_grade = 'II', commitment = 'II' WHERE id = 'wa_northwest_ridge';

-- 2. Dorado Needle / Northwest Ridge (wa_northwest_ridge): top-level gain_ft/loss_ft (7000/7000)
-- don't reconcile with this same route's own itinerary.days[] breakdown (5300+1100+0=6400 gain,
-- 0+1100+5300=6400 loss), which matches the route's own itinerary.totalNote ("~14 mi, ~6,400 ft
-- total gain"). Internal arithmetic fix, not an external-source correction.
UPDATE routes SET gain_ft = 6400, loss_ft = 6400 WHERE id = 'wa_northwest_ridge';

-- 3. Dorado Needle / Northwest Ridge (wa_northwest_ridge): access._raw.parking_pass_cost and
-- access._raw.parking_pass_required / access.passRequired implied a per-vehicle NPS entrance fee
-- ("$30 per vehicle (7-day pass)" / "America the Beautiful Annual ($80) or per-vehicle entrance
-- fee"). North Cascades National Park charges no entrance fee -- confirmed via multiple
-- NPS-derived sources ("There is no fee to enter North Cascades National Park Service Complex").
-- The field appears to have been conflated with a fee-charging park (e.g. Rainier's $30/7-day
-- format). A Northwest Forest Pass may apply at adjacent USFS trailheads, but not as an NPS
-- entrance fee here.
UPDATE routes SET access = jsonb_set(
  jsonb_set(
    jsonb_set(access, '{passRequired}', '"None -- North Cascades National Park charges no entrance fee (one of the few fee-free NPS units); a Northwest Forest Pass may apply at some adjacent USFS trailheads, not at the NPS-managed Eldorado Creek Trailhead itself."'::jsonb),
    '{_raw,parking_pass_required}', '"None -- no NPS entrance fee at North Cascades National Park"'::jsonb
  ),
  '{_raw,parking_pass_cost}', '"N/A -- no entrance fee charged"'::jsonb
) WHERE id = 'wa_northwest_ridge';

-- 4. Boston Peak / Northwest Ridge (wa_northwest_ridge_2): the `fa` field read "Boyce-Willis,
-- July 2018", contradicting this same route's own `overview`, `beta`, and `itinerary` fields,
-- which all state August 2018. AAJ's indexed record of the "Boston Marathon" enchainment
-- (publications.americanalpineclub.org) gives August 2018 -- the higher-authority published
-- source, and the value the rest of this record already uses.
UPDATE routes SET fa = 'Boyce-Willis, August 2018 (this specific ridge line; the peak''s overall first ascent was 1938 by a different party via the easier east side)' WHERE id = 'wa_northwest_ridge_2';

-- 5. Colchuck Balanced Rock (wa_colchuck_balanced_rock, area row): parent_peak was
-- "wa_colchuck_peak", but Colchuck Balanced Rock's topographic/prominence parent is Enchantment
-- Peak (8,543 ft), not Colchuck Peak (8,705 ft, a taller nearby but unrelated summit) --
-- confirmed via Wikipedia's infobox and PeakVisor.
UPDATE areas SET parent_peak = 'wa_enchantment_peak' WHERE id = 'wa_colchuck_balanced_rock';

-- 6. Old Guard Peak / Southwest Route (wa_old_guard_peak_southwest_route): loss_ft stored as
-- 14100, but this route's own itinerary.days[] lossFt values sum to 300+1800+2200+1400+2500+4200
-- = 12400 (gain_ft = 10600 is already internally correct, matching the same days' gainFt sum).
-- Internal arithmetic fix.
UPDATE routes SET loss_ft = 12400 WHERE id = 'wa_old_guard_peak_southwest_route';

-- 7. Old Guard Peak / Southwest Route (wa_old_guard_peak_southwest_route): itinerary.days[0].note
-- named Cache Col at "~6,100 ft", contradicting this SAME route's own waypoints ("Cache Col",
-- elev 6903) and its own approach text ("Cache Col (~6,900 ft)"). Wikipedia's Cache Col entry
-- independently confirms 6,903 ft.
UPDATE routes SET itinerary = jsonb_set(
  itinerary, '{days,0,note}',
  '"From the Cascade Pass trailhead, hike the maintained trail to Cascade Pass, then climb switchbacks to Cache Col (~6,900 ft) before dropping to a camp near Kool-Aid Lake / upper Basin Creek. This is the last on-trail day; everything after is off-trail glacier and ridge travel."'::jsonb
) WHERE id = 'wa_old_guard_peak_southwest_route';

-- 8. Old Guard Peak / Southwest Route (wa_old_guard_peak_southwest_route): waypoints[3]
-- ("Kool-Aid Lake") elev stored as 6119, outside this same route's own approach text range
-- ("Kool-Aid Lake basin (~6,320-6,800 ft depending on source)"). AllTrails independently lists
-- Kool-Aid Lake at 6,320 ft -- the low end of the route's own stated range.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{3,elev}', '6320') WHERE id = 'wa_old_guard_peak_southwest_route';

-- 9. Old Guard Peak / Southwest Route (wa_old_guard_peak_southwest_route): emergency.sheriffDispatch
-- named Skagit County Sheriff as the primary SAR dispatcher (with a trailing, contradictory note
-- that "Chelan County Sheriff covers the peak's home county"). Old Guard Peak is in Chelan County
-- (confirmed via topozone.com, mountainzone.com, mindat.org) -- this same peak's OWN East Side
-- Route record already states the correct dispatcher ("Chelan County Sheriff's Office coordinates
-- search-and-rescue in this part of Glacier Peak Wilderness"); aligned this route to match.
UPDATE routes SET emergency = jsonb_set(
  emergency, '{sheriffDispatch}',
  '"911; Chelan County Sheriff''s Office coordinates search-and-rescue in this part of Glacier Peak Wilderness."'::jsonb
) WHERE id = 'wa_old_guard_peak_southwest_route';

-- 10. Northwest Mox Peak / Standard Route (wa_northwest_mox_peak_standard): gain_ft stored as
-- 5450, but this same route's own itinerary.days[] gainFt values sum to 3550+1550+1900+0 = 7000
-- (loss_ft = 7050 is already internally correct, matching the same days' lossFt sum of
-- 0+100+1900+5050). Internal arithmetic fix.
UPDATE routes SET gain_ft = 7000 WHERE id = 'wa_northwest_mox_peak_standard';
