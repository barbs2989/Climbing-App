-- wa_chelan_butte (areas) elevation_ft: 3812 -> 3835. The row's own `corrections` note on
-- wa_chelan_butte_chelan_butte_trail already says Peakbagger/PeakVisor/WTA confirm 3,835 ft,
-- but the stored elevation was never updated to match. Independently re-confirmed via
-- SummitPost ("Elevation: 3835 ft"), WillhiteWeb ("Summit Elevation: 3,835 feet"), and a
-- third hiking-report source, all agreeing on 3,835 ft against no source for 3,812 ft.
UPDATE areas SET elevation_ft = 3835 WHERE id = 'wa_chelan_butte' AND elevation_ft = 3812;

-- wa_chelan_butte_chelan_butte_trail (routes) high_point_ft: same fix, same reason, on the
-- route's own copy of the summit elevation.
UPDATE routes SET high_point_ft = 3835 WHERE id = 'wa_chelan_butte_chelan_butte_trail' AND high_point_ft = 3812;

-- wa_chianti_spire_east_face (routes) approach/descent_text: both fields open with a dangling
-- self-reference to a route id, "wa_east_face_rebel_yell", that does not exist anywhere in the
-- live table -- this row (whose own name is "East Face (Rebel Yell area / standard)") is itself
-- Rebel Yell, so the sentence is a pipeline artifact pointing at a nonexistent sibling. Strips
-- the leading "This is the same ... as wa_east_face_rebel_yell" / "Same descent as the standard
-- East Face/Rebel Yell line:" preambles; the rest of each field is unchanged and already reads
-- correctly on its own.
UPDATE routes SET
  approach = 'From the SR-20 pullout near milepost ~166 (~0.7 mile west of the Cutthroat Lake Road turnoff), a steep, faint climber''s trail descends to Early Winters Creek — cross the creek and follow the climber''s path/talus benches switchbacking up the far side, gaining about 3,500 ft over just under 5 miles to Burgundy Col — roughly 3-4 hours car-to-col with an overnight pack. Stay climber''s-left toward the obvious col notch where the boot-path braids through timber and boulders lower down. A snow patch at/near the col is the last dependable water source but is unreliable by late summer, so carry water up from the creek if climbing after midsummer. From Burgundy Col, drop a short snow/rock step and traverse south below Burgundy Spire''s East Face, across a small snowy rib, onto the upper Silver Star Glacier, and around to Chianti Spire''s obvious east side and the base of the route (~7,900 ft) — under an hour from a col or Larch Bench camp. Carry an ice axe for this traverse through midsummer — the snow rib and glacier margin can be firm or icy in the morning.',
  descent_text = 'Rappel back down the route itself on fixed anchors rather than walking off. The usual descent is four double-rope rappels using two ropes (a single 60m may work for some stations but isn''t the norm), starting from the summit block, then anchors near the top of pitch 5, then continuing stations down the route generally trending climber''s-right. Anchors are fixed but should be visually checked each time — this isn''t a heavily-bolted sport-style descent. Rope-snag hazard exists in the chimney/offwidth pitches. After reaching the base, reverse the Silver Star Glacier traverse and snow step back to Burgundy Col, then descend the climber''s trail to Early Winters Creek and the highway — parties describe this exit as notably long and tiring relative to the climb, so plan daylight accordingly.'
WHERE id = 'wa_chianti_spire_east_face';
