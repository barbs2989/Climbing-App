-- WA alpine audit -- pass 2, batch 1 (batch #52 overall) -- 2026-08-06
-- Routes: wa_a_servant_to_liberty (Liberty Bell), wa_abernathy_peak_south_ridge
--         (Abernathy Peak), wa_action_potential (Burgundy Spire), wa_agnes_mountain_west_route
--         (Agnes Mountain), wa_alpine_lookout_round_mountain_trail (Alpine Lookout),
--         wa_american_border_peak_northeast_face / _southeast_face (American Border Peak),
--         wa_amphitheater_mountain_finger_of_fatwa (Amphitheater Mountain)
-- Researched via 7 parallel agents, one per peak. See audits/wa-alpine-audit-log.md for
-- the full writeup. Every confirmed fix's current value was re-verified against a fresh
-- full-row fetch of the live DB before this file was written. All WHERE clauses include
-- the current (wrong) value as a safety check per project convention.

-- =========================================================================
-- Liberty Bell (wa_a_servant_to_liberty) -- the FA field and pro_tips both
-- mischaracterize Mikey Schaefer's Aug 6 2016 completing free ascent as
-- "rope-solo." Per AAC Publications, the rope-solo work was his 2015
-- scouting/equipping of the line; the actual FA send was a partnered lead
-- with Shanjean Lee belaying. Confirmed via AAC Publications, "Liberty
-- Bell: A Slave to Liberty."
-- =========================================================================
UPDATE routes SET fa = 'Mikey Schaefer, August 6, 2016 (led every pitch, belayed by Shanjean Lee; originally documented as ''A Slave to Liberty''). Schaefer''s 2015 scouting/equipping of the line was rope-solo, but the completing free ascent was not.'
WHERE id = 'wa_a_servant_to_liberty' AND fa = 'Mikey Schaefer, August 2016 (rope-solo; originally documented as ''A Slave to Liberty'')';

UPDATE routes SET pro_tips = '["Mikey Schaefer led every pitch of the FA with Shanjean Lee belaying — his earlier 2015 scouting/equipping pass was rope-solo, but the send was not; still a serious, committing outing", "The mega-slab P7 has 14 bolts and an amazing small ''bonsai tree'' feature worth knowing about for route-finding"]'::jsonb
WHERE id = 'wa_a_servant_to_liberty' AND pro_tips = '["Mikey Schaefer rope-soloed the FA specifically to make it more challenging — expect a serious, committing outing", "The mega-slab P7 has 14 bolts and an amazing small ''bonsai tree'' feature worth knowing about for route-finding"]'::jsonb;

-- =========================================================================
-- Abernathy Peak (wa_abernathy_peak_south_ridge) -- the permit field claims a
-- free self-issue Lake Chelan-Sawtooth Wilderness permit is required. The
-- USFS Okanogan-Wenatchee NF Lake Chelan-Sawtooth Wilderness recreation page
-- states no wilderness permit of any kind is needed in this wilderness
-- (unlike the neighboring Pasayten Wilderness, which does use self-issue
-- permits) -- only a Northwest Forest Pass for trailhead parking, which the
-- field already separately and correctly notes.
-- =========================================================================
UPDATE routes SET permit = 'No wilderness permit is required for the Lake Chelan-Sawtooth Wilderness. Northwest Forest Pass required at developed trailheads.'
WHERE id = 'wa_abernathy_peak_south_ridge' AND permit = 'Free self-issue Lake Chelan-Sawtooth Wilderness permit at the trailhead; no quota or fee. Northwest Forest Pass at developed trailheads.';

-- =========================================================================
-- Burgundy Spire (wa_action_potential) -- approach_logistics is mislabeled
-- "Silver Star Creek Trailhead" with a Silver Star Creek approach narrative,
-- but carries the coordinates of the route's own (correctly documented
-- elsewhere in the row) SR-20/Burgundy Col pullout. Silver Star Creek is a
-- real but distinct approach used for Silver Star Mountain's glacier route,
-- not this route's approach. Confirmed via The Mountaineers' Silver Star
-- Mountain route pages.
-- =========================================================================
UPDATE routes SET approach_logistics = '{"peakLat": 48.55186, "peakLng": -120.59014, "trailhead": "SR-20 Burgundy Col Pullout", "trailheadLat": 48.55, "trailheadLng": -120.6306, "trailheadDirection": "East-facing approach; from the SR-20 pullout, cross Early Winters Creek and climb the climbers'' trail via the Bench (~6,460 ft) to Burgundy Col (7,770 ft), then scramble down/around the north face to the East Face start."}'::jsonb
WHERE id = 'wa_action_potential' AND approach_logistics = '{"peakLat": 48.55186, "peakLng": -120.59014, "trailhead": "Silver Star Creek Trailhead", "trailheadLat": 48.55, "trailheadLng": -120.6306, "trailheadDirection": "North-facing approach; ascend Silver Star Creek east side 2 miles to basin at 4,800 ft, then scramble northeast toward Burgundy Col"}'::jsonb;

-- =========================================================================
-- Agnes Mountain (wa_agnes_mountain) -- area elevation_ft is 8131, but
-- Wikipedia, Peakbagger.com (peak ID 1882), and PeakVisor all independently
-- agree on 8,119 ft. The route's own high_point_ft (8119) already carries
-- the correct figure; only the area row was never updated to match.
-- =========================================================================
UPDATE areas SET elevation_ft = 8119
WHERE id = 'wa_agnes_mountain' AND elevation_ft = 8131;

-- =========================================================================
-- Agnes Mountain (wa_agnes_mountain_west_route) -- the permit field frames
-- the climb as North Cascades NP-regulated (Recreation.gov / Marblemount
-- WIC reservation), but Agnes Mountain and nearly all of this route's
-- approach lie in the Glacier Peak Wilderness (Okanogan-Wenatchee NF) --
-- the NPS/Lake Chelan NRA boundary sits only ~2 miles up Agnes Creek Trail
-- from High Bridge. Glacier Peak Wilderness uses free self-issue trailhead
-- permits, not NPS reservations. Confirmed via USFS Okanogan-Wenatchee NF's
-- Agnes Gorge Trail page.
-- =========================================================================
UPDATE routes SET permit = 'Agnes Mountain and nearly all of this route''s approach lie in the Glacier Peak Wilderness (Okanogan-Wenatchee NF), not North Cascades NP -- the NPS/Lake Chelan NRA boundary is only ~2 miles up the Agnes Creek Trail from High Bridge. Free self-issue Glacier Peak Wilderness permit at the trailhead; no quota, fee, or NPS reservation required.'
WHERE id = 'wa_agnes_mountain_west_route' AND permit = 'North Cascades NP complex: no permit for day climbs; all overnight backcountry stays require a backcountry permit (reserve on Recreation.gov or walk-up at the Marblemount Wilderness Information Center).';

-- =========================================================================
-- American Border Peak (wa_american_border_peak_southeast_face) -- the beta
-- field claims the route was "first climbed by Baker, Beckey, and Dudra in
-- 1952," which contradicts this same route's own (correct) fa field: the
-- peak's actual first ascent -- via this line -- was Sept 14, 1930 by
-- Dalgleish, Fyles, Henderson, and Fraser. Confirmed via Wikipedia and
-- Peakbagger.com. The 1952 Baker/Beckey/Dudra party climbed a different,
-- unidentified line on the peak -- not reintroduced here for lack of a
-- confirmed target route.
-- =========================================================================
UPDATE routes SET beta = 'The standard/easiest line on the peak, and the peak''s original first-ascent route: climbed Sept 14, 1930 by Alec Dalgleish, Tom Fyles, Stan Henderson, and R. A. Fraser. From High Pass the route crosses talus, scree, and heather on Mount Larrabee''s flank toward a saddle below the peak, then ascends slabby ledges and a snow gully to the base of the Great Chimney. Two short technical pitches (5.3 entry, 5.4 exit past a large chockstone, with a tight ''keyhole'' squeeze) provide the crux; reported difficulty varies by party and conditions, with some describing sections up to 5.8. Above the chimney, a loose, dirty trough leads to the summit ridge and an exposed step-across move to the top. Rock quality is poor throughout and route-finding is nontrivial — helmets and route-finding experience are essential.'
WHERE id = 'wa_american_border_peak_southeast_face' AND beta = 'The standard/easiest line on the peak, first climbed by Baker, Beckey, and Dudra in 1952. From High Pass the route crosses talus, scree, and heather on Mount Larrabee''s flank toward a saddle below the peak, then ascends slabby ledges and a snow gully to the base of the Great Chimney. Two short technical pitches (5.3 entry, 5.4 exit past a large chockstone, with a tight ''keyhole'' squeeze) provide the crux; reported difficulty varies by party and conditions, with some describing sections up to 5.8. Above the chimney, a loose, dirty trough leads to the summit ridge and an exposed step-across move to the top. Rock quality is poor throughout and route-finding is nontrivial — helmets and route-finding experience are essential.';

-- No other confirmed errors this batch. wa_alpine_lookout_round_mountain_trail,
-- wa_american_border_peak_northeast_face, and wa_amphitheater_mountain_finger_of_fatwa
-- all audited clean against external sources -- see the log for fields flagged
-- needs-human-verification (unconfirmable rather than wrong) on every route in
-- this batch.
