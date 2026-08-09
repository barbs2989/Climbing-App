-- WA alpine audit batch 94 (pass 2) -- 2026-08-09
-- Routes: North Ridge (Primus Peak), Northeast Buttress (Colchuck Peak),
-- Northeast Face Direct (Mount Formidable), Northeast Ridge 1963 Route (Johannesburg Mountain),
-- Northwest Arete (Argonaut Peak), Northwest Buttress (Sloan Peak),
-- Northwest Face (Kangaroo Temple), Northwest Face / Falcon Route (Little Big Chief Mountain)

-- 1. Primus Peak / North Ridge (wa_north_ridge_4): the route's own `beta` field dated the
-- Mark Bebie first ascent to "September 7, 1987", contradicting the route's own `fa` field
-- ("1986") and `overview` text ("first climbed by Mark Bebie in 1986"). AAC Publications/AAJ
-- 1987 volume, Washington-Cascades section, carries the trip report "Travel in the Austera Peak
-- Region and Primus Peak, North Ridge" describing this exact Sept. 7 solo ascent -- AAJ annuals
-- report the PRIOR calendar year's climbs, confirmed by other Bebie entries in the same volume
-- explicitly dated 1986. Correct year is 1986; only the `beta` field had the wrong year.
UPDATE routes SET beta = 'First recorded climbed by Mark Bebie on September 7, 1986, who reached it by descending a couloir onto an unnamed glacier north of Primus (accessed from the North Klawatti Glacier after climbing Austera Peak the same day) and traversing to the ridge''s base. The ridge took about an hour to climb once gained. It is very rarely repeated and only lightly documented; other parties have approached instead from McAllister Camp via Tricouni Peak''s lower north ridge, or via a north-south Primus-Eldorado glacier traverse.' WHERE id = 'wa_north_ridge_4';

-- 2. Kangaroo Temple / Northwest Face (wa_northwest_face_2): stored `pitches` = 5, but the
-- route's own `pitch_detail` array (P1-P5) stops one short of what the route's own `rope_note`
-- field says ("6-pitch 5.7+ face route"). Mountain Project, Mountaineers.org, and a Spokalpine
-- trip report all independently give 6 pitches for this route. `pitch_detail` is NOT extended
-- here with a fabricated P6 grade/notes -- flagged for human addition instead.
UPDATE routes SET pitches = 6 WHERE id = 'wa_northwest_face_2';

-- 3. Little Big Chief Mountain / Northwest Face (Falcon Route) (wa_northwest_face_4): the
-- route's own `approach` text named "Dutch Miller Gap Trailhead" as the drive-to starting point,
-- but a USFS gate installed in 2007 ended vehicle access there -- the actual modern drive-to
-- point is Dingford Creek Trailhead, which this SAME route's own `waypoints` field already names
-- correctly ("Dingford Creek / Middle Fork Snoqualmie Trailhead"). Confirmed via WTA trip reports
-- and USFS Dingford Creek / Dutch Miller Gap trailhead pages; the stored 14-15 mile approach
-- figure is consistent with measuring from Dingford Creek, reinforcing that it (not the old
-- Dutch Miller Gap TH) is the real starting point being described.
UPDATE routes SET approach = 'From the Dingford Creek Trailhead (the modern drive-to point — a gate installed in 2007 ended vehicle access to the old Dutch Miller Gap Trailhead itself), follow Dutch Miller Gap Trail 1030 up the Middle Fork Snoqualmie valley about 14-15 miles to Dutch Miller Gap, passing Hardscrabble Horse Camp and the Williams Lake trail junction along the way. Little Big Chief sits immediately southwest of the gap, reached by leaving the trail near Williams Lake for an off-trail scramble up the peak''s east slope/northeast ridge, with a short but exposed class 4 notch as the crux below the summit. An alternate, longer approach comes from the east via the Necklace Valley Trail off Foss River Road (Skykomish/US 2 side), crossing La Bohn Gap before dropping to Dutch Miller Gap. For this specific route: leave the main Middle Fork Snoqualmie trail at a small steel bridge well before Dutch Miller Gap and cut cross-country south into Summit Chief Valley; the Northwest Face is visible on the peak''s east side across that valley, roughly 3 hours from the trailhead — a distinctly different final leg than the Northeast Face''s direct ridge approach.' WHERE id = 'wa_northwest_face_4';

