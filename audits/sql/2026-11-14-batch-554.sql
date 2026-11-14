-- WA alpine audit, batch 554 (pass 9)

-- wa_amphitheater_mountain_finger_of_fatwa (Finger of Fatwa, Middle Finger Buttress,
-- Amphitheater Mountain, Pasayten Wilderness): fa is stored as "Scott Bennett and Blake
-- Herrington, 2012", but Herrington's own contemporaneous trip write-up (blakeclimbs.blogspot.com,
-- posted August 2011, describing an Aug 10-17 trip that produced this line plus two others on
-- Cathedral Peak and "The Deacon") puts the climb in 2011, not 2012 -- and a 2018 Cascade
-- Climbers trip report describing a repeat of the route also dates the first ascent to 2011.
-- 2012 looks like the American Alpine Journal's publication year (new routes climbed in 2011
-- are typically written up in the following year's AAJ) conflated with the climb year itself.
-- Fixing fa to read 2011.
UPDATE routes SET fa = 'Scott Bennett and Blake Herrington, 2011' WHERE id = 'wa_amphitheater_mountain_finger_of_fatwa';

-- verify: should return the corrected year
SELECT id, fa FROM routes WHERE id = 'wa_amphitheater_mountain_finger_of_fatwa';
