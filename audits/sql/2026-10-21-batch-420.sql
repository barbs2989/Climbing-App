-- Live Free or Die! (Liberty Bell, East Face): fa credited a third climber, "Seth Keena-Levin",
-- alongside Blake Herrington and Nathan Hadley. The route's own first-ascensionist, Herrington,
-- published the only account found (AAC Publications, 2017 report) and names just the two of
-- them: "Over July and August, Nathan Hadley and I used fixed ropes and top-down tactics to
-- connect these crack pitches into a continuous route... We called the route Live Free or Die."
-- No source found anywhere documents a climber named Seth Keena-Levin on this or any Cascades
-- route.
UPDATE routes SET fa = 'Blake Herrington & Nathan Hadley, 2017' WHERE id = 'wa_live_free_or_die';

-- Luahna Peak (area row): elevation_ft was 8450, which matches no external source. Both
-- Wikipedia and PeakVisor independently give the true summit at exactly 8,445 ft (Wikipedia:
-- "Luahna Peak is an 8,445-foot... double summit mountain"; PeakVisor: same figure, northwest
-- subpeak 8,369 ft). The peak's own route (wa_luahna_peak_east_slopes) already stores
-- high_point_ft = 8445, correctly -- it's the area row that's the outlier.
UPDATE areas SET elevation_ft = 8445 WHERE id = 'wa_luahna_peak';
