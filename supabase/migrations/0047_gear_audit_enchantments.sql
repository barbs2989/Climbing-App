-- Gear audit: Enchantments (Dragontail Peak, Prusik Peak, Colchuck Peak) structured rack fields
-- Generated: 2026-07-16
-- Fills the structured gear-spec columns (rope_type, rope_length_m, rope_note, sling_rack,
-- alpine_draws, ascender) added by 0028_structured_rack_fields.sql for 9 routes that already
-- had free-text gear/pro_needs/detailed_rack populated but no structured spec fields.
-- Researched via independent WebSearch/WebFetch verification against Mountain Project, trip
-- reports (climberkyle.com, spokalpine.com, stephabegg.com, jeffreyjhebert.com,
-- engineeredforadventure.com), and NWAC/AAC accident writeups -- NOT copied from the unverified
-- draft file DRAGONTAIL_GEAR.json, whose named sources could not be independently confirmed.
-- All 9 rows marked gear_confidence='verified' have at least one independently-fetched
-- corroborating source per the corrections note; quantities not itemized by any source are
-- extrapolated from route grade/length convention and flagged as such in corrections.

BEGIN;

UPDATE routes SET
  rope_type = 'single dynamic ~9mm alpine rope',
  rope_length_m = 30,
  rope_note = 'A single ~30m thin rope suits the short (~800ft) Hidden Couloir entry gully for occasional belayed steps on steeper ice/mixed sections; parties typically walk off via Aasgard Pass (glissade) rather than rappelling the route, so raps are rare.',
  sling_rack = '{"ice_screws":"4 (10cm/13cm mix)","pickets":"2-4","cams":"0.2-1in (small set)","nuts":"small-medium set","pitons":"2 knifeblades + 1-2 angles (optional)"}',
  alpine_draws = 3,
  ascender = NULL,
  gear_confidence = 'verified',
  corrections = 'Verified via direct fetches of spokalpine.com and climberkyle.com trip reports for the ''Triple Couloirs'' line that Hidden Couloir is the technical entry gully of: real parties carried 2-4 pickets, ~4 ice screws (10cm proved most useful in thin conditions), a small cam set (.2-1in), small-medium nuts, and 1-2 optional pitons. Exact rope length wasn''t confirmed on any source directly accessible (mountaineers.org and a cascadeclimbers.com thread both 403''d), so 30m is a convention-based estimate, not a quoted spec.'
WHERE id = 'wa_dragontail_peak_r1';

UPDATE routes SET
  rope_type = 'single dynamic 9.5-10mm',
  rope_length_m = 70,
  rope_note = 'Directly confirmed: a Jeff Hebert trip report describes bringing a 70m rope and simul-climbing sections that ran beyond it; descent is normally a walk-off via the summit ridge/Aasgard Pass rather than rappelling the route.',
  sling_rack = '{"cordelette":"1-2x 7mm","slings":"4-6x 60cm","cams":"medium rack to 3in (summer) / single rack (winter)","nuts":"1 set"}',
  alpine_draws = 8,
  ascender = NULL,
  gear_confidence = 'verified',
  corrections = 'Verified directly: Mountain Project''s Gerber-Sink page and a jeffreyjhebert.com trip report both confirm a 70m rope and the season-split rack (''medium rack to 3in'' summer vs. ''4+ ice screws/single rack/pitons'' winter) already reflected in this route''s DB gear array. Alpine-draw count and sling composition are extrapolated from the 10-pitch, ~2,000ft mixed profile since no source itemized them.'
WHERE id = 'wa_dragontail_peak_r2';

UPDATE routes SET
  rope_type = 'optional 30m accessory/half rope (not always carried)',
  rope_length_m = 30,
  rope_note = 'Pandora''s Box itself is climbed unroped with axe and crampons per firsthand accounts; a short rope is only occasionally carried as belay backup for the exposed 4th-class summit traverse above the notch, not for the couloir.',
  sling_rack = '{"picket":"1 (optional)","runner":"1x sling for optional belay anchor on summit traverse"}',
  alpine_draws = 0,
  ascender = NULL,
  gear_confidence = 'verified',
  corrections = 'Directly confirmed via engineeredforadventure.com''s firsthand account: parties climb Pandora''s Box unroped with only ice axe and crampons (one party used strap-on crampons), no rack — independently corroborating this route''s existing DB correction away from a fabricated M4-M5 mixed description. The optional rope/picket for the summit traverse isn''t itemized in any source found, so that detail is inferred from the existing DB note.'
WHERE id = 'wa_dragontail_peak_r3';

UPDATE routes SET
  rope_type = 'single dynamic, 60m',
  rope_length_m = 60,
  rope_note = '5 single-rope rappels down the unfamiliar north-side gully (opposite the south-facing ascent line); a 60m single rope reaches each of the 5 stations per multiple trip reports, though stations mix bolts and gear so anchors should be checked/backed up on the way down.',
  sling_rack = '{"cams":"doubles small-#2, 1-2x #3 (per Mountain Project consensus)","nuts":"RP set + standard nut set","slings":"6-8 shoulder-length + 2-3 double-length for rope-drag management on wandering pitches","cordelette":"1, for backing up mixed bolt/gear rap anchors on the unfamiliar descent side"}',
  alpine_draws = 8,
  ascender = NULL,
  gear_confidence = 'verified',
  corrections = 'Rack composition and descent (60m rope, 5 single-rope raps down the north face) verified via the Mountain Project route page and independent trip reports (stephabegg.com, Wayne Wallace''s blog). Alpine-draw count and cordelette recommendation are extrapolated from standard convention for a 6-pitch sustained crack route since no source itemizes exact draw counts.'
WHERE id = 'wa_prusik_peak_der_sportsman';

UPDATE routes SET
  rope_type = 'single dynamic, 60m',
  rope_length_m = 60,
  rope_note = 'Only one rappel is typically needed to reach the base directly down the north side from the top of the technical climbing (many parties instead continue via the West Ridge to the true summit and do that route''s fuller descent); a single 60m rope is confirmed sufficient for this one rap per a first-hand trip report.',
  sling_rack = '{"cams":"doubles fingertip-#2, single #3 (per Mountain Project + trip report)","nuts":"1 set","slings":"6-8 shoulder-length for rope-drag management through the corner/crack pitches","cordelette":"1, for the single north-side rap anchor if it''s not already equipped"}',
  alpine_draws = 7,
  ascender = NULL,
  gear_confidence = 'verified',
  corrections = 'Rack (doubles fingertip-#2 plus one #3) and the single 60m north-side rappel are verified via Mountain Project and a stephabegg.com trip report. Alpine-draw count and cordelette note are extrapolated from route length/character since sources describe the rack but not draw counts.'
WHERE id = 'wa_prusik_peak_solid_gold';

UPDATE routes SET
  rope_type = 'single dynamic, 60m',
  rope_length_m = 60,
  rope_note = '5 single-rope rappels down the north side off slung belay stations; one first-hand trip report measured the rappels at roughly 30m each, comfortably within a 60m rope''s reach, though Mountain Project also notes double-rope rappels are used by some parties to cut the rappel count.',
  sling_rack = '{"cams":"doubles .75-2in, singles to #3/#4, TCUs useful in the finger-size range (per Mountain Project + 2 trip reports)","nuts":"1 set (historically hexes were used on early ascents, per a 2015 trip report)","slings":"8+ shoulder-length for slinging natural rap anchors, since there is little fixed gear on the route or at rap stations","cordelette":"1, since descent anchors are slung natural features (chockstones/horns), not bolts"}',
  alpine_draws = 6,
  ascender = NULL,
  gear_confidence = 'verified',
  corrections = 'Rack (doubles .75-2in + #3/#4) and descent (5 single-rope raps off slung stations, ~30m spacing) verified via Mountain Project and two independent trip reports (climberkyle.com, stephabegg.com). Alpine-draw count is extrapolated from standard convention for a 6-pitch moderate route since no source gives an exact draw count.'
WHERE id = 'wa_prusik_peak_south_face_burgner_stanley';

UPDATE routes SET
  rope_type = 'single dynamic, 60m',
  rope_length_m = 60,
  rope_note = '4 single-rope rappels down the unfamiliar north side; a 60m single rope adequately reaches every station per two independent trip reports, though one notes a 70m would be more comfortable for a party of three.',
  sling_rack = '{"cams":"0.3-2in range (a single rack, per Mountain Project + 2 trip reports)","nuts":"1 set, plus large hexes reported by one party","slings":"6+ long (double-length) slings recommended to cut rope drag on the wandering pitches","cordelette":"optional; some rap stations use slingable blocks/horns rather than bolts"}',
  alpine_draws = 5,
  ascender = NULL,
  gear_confidence = 'verified',
  corrections = 'Rack (single rack .3-2in, nuts, optional hexes) and descent (4 single-rope raps, 60m rope confirmed sufficient) verified via Mountain Project and two independent trip reports (climberkyle.com, spokalpine.com). Alpine-draw count is extrapolated from the route''s easy, 4-pitch character since sources don''t itemize draw counts.'
WHERE id = 'wa_prusik_peak_west_ridge';

UPDATE routes SET
  rope_type = 'single glacier travel rope, thin (8-9mm) or static glacier line',
  rope_length_m = 30,
  rope_note = 'A short 30m rope is standard for a 2-person rope team crossing this glacier; parties only extend to 60m if a larger group is roping together or pitching out the steeper snow near the col.',
  sling_rack = '{"pickets":"2-3","crevasse_rescue_kit":"1 per rope team (pulley, prusik cords, screw-gate biners)","ice_screws":"0-1, rarely placed"}',
  alpine_draws = 0,
  ascender = 'Prusik cords (2 per climber) for crevasse self-rescue',
  gear_confidence = 'verified',
  corrections = 'Ice axe/crampons and the 40-degree snow step near the Dragontail-Colchuck saddle are directly confirmed by Mountain Project''s route description. Rope length and crevasse-rescue-kit specifics are standard glacier-travel practice extrapolated from general references, not from a route-specific itemized gear list, since MP itself notes the glacier is ''not crevassed but can be icy.'''
WHERE id = 'wa_colchuck_peak_colchuck_glacier';

UPDATE routes SET
  rope_type = 'single dynamic rope, 60m',
  rope_length_m = 60,
  rope_note = 'A single 60m rope lets parties link the moderate snow sections into fewer, longer pitches and provides enough length to build picket/rock rappel anchors on the steeper ice steps and rock exit; some parties instead carry 2x50m ropes to allow full-length raps off the crux exit.',
  sling_rack = '{"ice_screws":"3-5, including 1-2 stubbies","pickets":"2-3","cams":"small set to 2in for the rock exit","nuts":"small set","pins":"1-2 optional for thin cracks"}',
  alpine_draws = 4,
  ascender = 'Not standard for the couloir itself (crux pitches are led/belayed, not jugged); still worth carrying a couple of prusik cords for crevasse self-rescue since the route is accessed via the upper Colchuck Glacier.',
  gear_confidence = 'verified',
  corrections = 'The steep 60+ degree snow finish, small rock rack/cams/pins at the exit, and T-slotted picket belay anchors are corroborated by multiple independent real sources (a first-person trip report, Wenatchee Outdoors, SummitPost) plus the NWAC/AAC accident writeups for the documented Feb 19, 2023 fatal avalanche, which confirm the route''s terrain and character. Exact screw/draw counts are extrapolated from general alpine-mixed rack conventions, not a single itemized source.'
WHERE id = 'wa_colchuck_peak_northeast_couloir';

COMMIT;
