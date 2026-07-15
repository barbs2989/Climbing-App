-- Verified gear-data correction for Mount Goode / Northeast Buttress (wa_mount_goode_northeast_buttress),
-- the flagship example from the gear-accuracy audit. Existing data was auto_generated
-- placeholder text ("alpine rack to three inches ... double ropes for the descent
-- rappels") that was never checked against real trip reports.
--
-- Corrected against 5 independent trip reports (2020-2025):
--   https://climberkyle.com/2020/07/18/mt-goode-ne-buttress-5-5/
--   https://spokalpine.com/2022/09/07/mt-goode-northeast-buttress-iv-5-5/
--   https://engineeredforadventure.com/goode-mountain-northeast-buttress/
--   https://www.rajahamid.com/journal/2025/7/14/goode-mountain-climb-beta
--   https://www.mountaineers.org/activities/routes-places/north-cascades-national-park-cross-country-zones/goode-mountain-northeast-buttress
--
-- Key corrections:
--   - Rope: a SINGLE 60m rope is standard, not double ropes. Rappels are 6 single-strand
--     ~30m raps (3 summit->Black Tooth Notch, 3 into the SW Couloir), well within a single
--     rope's reach. The prior "double rope" claim likely misread one party's use of a
--     skinny 7-8mm single-rated rope doubled over during simul-climbing (a technique
--     choice, not "bring two ropes").
--   - Rack: real parties cap out around #0.3-#1/#2 cams (some add small Aliens/C3
--     microcams), not "to 3 inches" as previously stated.
--   - Slings/alpine draws: never previously specified. Reports converge on roughly
--     8-14 alpine draws plus a handful of slings and a cordelette/double-length sling
--     for anchors and a personal anchor system.
--   - Ascender: never modeled in the app at all. One documented party carried a Micro
--     Traxion + 2 prusiks + guide-mode belay device (ATC Alpine) per climber for
--     crevasse-rescue capability crossing the Goode Glacier approach — a legitimate,
--     safety-relevant item for a glaciated approach that the app previously had no
--     field for.

update routes set
  gear = '["Rock shoes (or sturdy approach shoes)","Single rack of cams #0.3-#1, some parties add a few small Alien/C3 microcams","Set of nuts plus a few tricams for quick anchors","Single 60m rope (skinny 7-8mm ropes are common)","8-14 alpine draws","A handful of slings (60cm/120cm) plus a cordelette or double-length sling for anchors/PAS","Light ice axe and aluminum crampons for the Goode Glacier crossing","Helmet","Micro Traxion + 2 prusiks + guide-mode belay device, if you want crevasse-rescue capability on the glacier approach"]'::jsonb,
  detailed_rack = 'A single rack of cams from about #0.3 to #1 (some parties add a few small Aliens or C3 microcams, or double up 0.3-0.75, for long simul-climbing blocks), a set of nuts, and a few tricams -- useful for quick gear anchors on this mostly 3rd/4th-class buttress with short low-5th-class steps (5.5-5.7ish). Bring 8-14 alpine draws for the wandering, low-angle terrain, plus a handful of 60cm/120cm slings and a cordelette or double-length sling for anchors and a personal anchor system. No need for a heavy rack or doubled cams beyond the small-to-mid sizes.',
  pro_needs = 'Protection is intermittent -- most of the route is 3rd/4th-class scrambling with short low-5th-class steps, so gear placements are more about quick simul-climbing anchors than sustained crack climbing. A single light rack to about #1 plus a few tricams is standard; nobody needs a heavy or doubled rack.',
  what_to_bring = '["Rock shoes or approach shoes","Single rack to #1 plus nuts/tricams","8-14 alpine draws","Single 60m rope","Helmet","Light axe and aluminum crampons for the glacier crossing","Micro Traxion + prusiks if you want crevasse-rescue capability","Headlamp","Bivy gear (most parties do this over 2 days)","Extra layers for a long day"]'::jsonb,
  sling_rack = '[{"sizeCm": 60, "qty": 5}, {"sizeCm": 120, "qty": 3}, {"sizeCm": 240, "qty": 1}]'::jsonb,
  alpine_draws = 10,
  rope_type = 'single',
  rope_length_m = 60,
  rope_note = 'Rappels are 6 single-strand ~30m raps off the standard descent (3 summit-to-Black Tooth Notch, 3 into the SW Couloir) -- a single 60m rope is standard and sufficient. Do not bring a second rope; the "double rope" beta in older data appears to be a misreading of one party''s skinny single-rated rope doubled over for simul-climbing protection, not two full ropes.',
  ascender = 'Micro Traxion',
  corrections = 'Corrected from auto_generated placeholder text. Previous data claimed "double rope" (real parties use a single 60m rope -- see rope_note) and a rack "to 3 inches" (real trip reports cap around #1-2). Previously had zero sling/alpine-draw data; 5 independent trip reports (2020-2025) converge on 8-14 alpine draws and a handful of slings/cordelette. Ascender/crevasse-rescue gear was never modeled -- at least one documented party carries a Micro Traxion + prusiks for the Goode Glacier crossing.',
  auto_generated = false
where id = 'wa_mount_goode_northeast_buttress';
