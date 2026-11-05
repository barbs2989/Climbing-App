-- WA alpine route audit -- batch 303 (2026-09-19, pass 5)
-- Human-reviewable fixes. Nothing here is applied automatically.

-- wa_three_fingers_r1 (Three Fingers, North Peak)
-- Three related fields describe fixed wooden ladders leading to a fire-lookout summit --
-- but this route's OWN overview says so explicitly: "Contrary to this route's name, the
-- historic Three Fingers fire lookout actually sits on the South Peak, not here ... There
-- is no maintained trail, no ladders, and no register cabin". That is independently
-- confirmed by this same row's own beta, descent_text, pitch_detail (3 entries) and
-- climbing_route (3 entries), all of which describe a roped glacier-approach + 4th/low-5th
-- chimney climb with no ladders anywhere. The sibling South Peak route
-- (wa_three_fingers_south_peak_lookout) is the one that actually has the ladders/lookout,
-- and its own rope_note/ascender fields are both NULL -- so this is not simple
-- sibling-to-sibling duplication, just three fields on the wrong route:
--  1. pro_tips included "The fixed ladders to the lookout are exposed-move carefully",
--     which describes the South Peak route, not this one. Removed; kept the other,
--     correct tip about carrying an ice axe.
--  2. rope_note was entirely about the South Peak's standard route ("...three fixed wooden
--     ladders leading to the lookout on the south peak"), describing a different route in
--     full. Cleared rather than rewritten -- the route's own rope_type ('glacier rope (team
--     rope), optional') and rope_length_m (30) already carry the salient rope facts, and
--     climbing_route[2].notes already says "Carry a rope...glacier gear...even in a
--     scramble-grade season", so nothing is lost by removing it.
--  3. ascender read "...not because ascenders are used on the fixed ladders" -- the
--     qualifying clause is wrong for this route (no fixed ladders here). Trimmed to the
--     part that is correct and consistent with the row's own glacier-crevasse-hazard
--     content (a prefix of the original value, nothing invented).
UPDATE routes SET pro_tips = '["Carry an ice axe for the upper snow even in summer"]'::jsonb
  WHERE id = 'wa_three_fingers_r1'
  AND pro_tips = '["Carry an ice axe for the upper snow even in summer", "The fixed ladders to the lookout are exposed—move carefully"]'::jsonb;

UPDATE routes SET rope_note = NULL
  WHERE id = 'wa_three_fingers_r1'
  AND rope_note = 'Standard route crosses the Queest-Alb glacier before a rocky scramble and three fixed wooden ladders leading to the lookout on the south peak. Ice axe/crampons required whenever the glacier headwall/steep snow slope below the summit is present.';

UPDATE routes SET ascender = 'crevasse-rescue kit for the glacier crossing'
  WHERE id = 'wa_three_fingers_r1'
  AND ascender = 'crevasse-rescue kit for the glacier crossing, not because ascenders are used on the fixed ladders';

-- wa_three_queens_middle_peak (Three Queens, Middle Peak via South Face - South Chimney)
-- access.notes named the wrong ranger district/phone for a closure notice, and the closure
-- claim itself was vague and going stale.
--  1. "Contact Snoqualmie Ranger District: (425) 888-1421" contradicts this SAME row's own
--     access.landManager ("Okanogan-Wenatchee National Forest, Cle Elum Ranger District")
--     and its own emergency.rangerStation ("Cle Elum Ranger District, Okanogan-Wenatchee
--     National Forest ... (509) 852-1100"). Snoqualmie Ranger District is part of a
--     different national forest (Mt. Baker-Snoqualmie NF, I-90/North Bend corridor) and does
--     not administer this trailhead -- confirmed independently by this same batch's
--     wa_tooth_chair_traverse row, whose emergency contact for a genuine Snoqualmie-Pass-
--     corridor route is that exact district and phone number, and by the sibling
--     wa_three_queens_west_peak row, whose access.notes already correctly names Cle Elum
--     Ranger District/(509) 852-1100 for this identical fire closure.
--  2. "Currently restricted due to Three Queens Fire (as of July 2026)" was open-ended and
--     under-dated. Verified 2026-09-19 against the US Forest Service's own alert page
--     (fs.usda.gov/r06/okanogan-wenatchee/alerts/three-queens-fire-closure-cle-elum-ranger-
--     district): the closure order is in effect through October 31, 2026, unless rescinded
--     sooner, and access controls were tightened further in September 2026 (no new access
--     permits/waivers being issued), per an updated Forest Service release covered by
--     lakechelannow.com. Corrected to name the same closure order number the sibling
--     wa_three_queens_west_peak row already cites (06-17-03-2026-25) and to give the actual
--     through-date rather than an undated "currently".
-- access_checked_at stamped with the date this route's access/road claims were read against
-- the primary USFS source above.
UPDATE routes SET access = jsonb_set(access, '{notes}',
    '"Northwest Forest Pass required ($5/day or $30/annual). Free wilderness permit available (self-issue at trailhead). Day use accessible May 15 - October 31 (peak season July-September). Closed under a Forest Service area closure order for the Three Queens Fire (Closure Order 06-17-03-2026-25), in effect through October 31, 2026 unless rescinded sooner. Access controls were tightened further in September 2026, with no new access permits or waivers being issued as of this writing. Contact Cle Elum Ranger District: (509) 852-1100 for current conditions."'::jsonb
  ),
  access_checked_at = '2026-09-19'
  WHERE id = 'wa_three_queens_middle_peak'
  AND access #>> '{notes}' = 'Northwest Forest Pass required ($5/day or $30/annual). Free wilderness permit available (self-issue at trailhead). Day use accessible May 15 - October 31 (peak season July-September). Currently restricted due to Three Queens Fire (as of July 2026). Contact Snoqualmie Ranger District: (425) 888-1421 for current conditions.'
  AND access_checked_at IS NULL;
