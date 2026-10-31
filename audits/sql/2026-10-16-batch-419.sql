-- Little Sister (Twin Sisters Range), North Face: high_point_ft was 6526, which matches
-- no external source and contradicts this peak's own area row (areas.id = 'wa_little_sister',
-- elevation_ft = 6600) and its sibling route (Southeast Ridge, already 6600). SummitPost's
-- Twin Sisters Range table independently gives 6,600 ft (a 2015 trip report gives 6,620 ft,
-- within normal survey variance of 6600; nothing supports 6526).
UPDATE routes SET high_point_ft = 6600 WHERE id = 'wa_little_sister_north_face';

-- Little Sister, West Face: same error, same reasoning as North Face above.
UPDATE routes SET high_point_ft = 6600 WHERE id = 'wa_little_sister_west_face';
