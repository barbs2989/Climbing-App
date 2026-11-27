-- wa_lundin_peak_south_face_left: hazards cites "a fatal fall on descent is documented
-- (1980)" on Lundin Peak. The only documented Lundin Peak climbing fatality found is the
-- American Alpine Club's accident report "Fall on Rock, Climbing Unroped, Washington,
-- Lundin Peak" (publications.americanalpineclub.org/articles/13198306002): Agris Moruss,
-- 40, fell roughly 450m to his death on Lundin Peak on May 9, 1982, leading a Boeing
-- Alpine Club student party. No 1980 Lundin Peak fatality turned up in repeated searches
-- (a second, separate Lundin fatality found -- Rob Crapo, 1997 -- is also not 1980).
-- Correcting the year to match the one sourced report.
UPDATE routes
SET hazards = array_replace(
  hazards,
  'Loose rock and talus on the peak generally, especially hazardous while descending scree — a fatal fall on descent is documented (1980).',
  'Loose rock and talus on the peak generally, especially hazardous while descending scree — a fatal fall on descent is documented (1982).'
)
WHERE id = 'wa_lundin_peak_south_face_left';

-- wa_lundin_peak_west_ridge: same claim, same wrong year, repeated on this sibling route.
UPDATE routes
SET hazards = array_replace(
  hazards,
  'loose rock/talus, especially hazardous while descending scree (documented fatal fall, 1980)',
  'loose rock/talus, especially hazardous while descending scree (documented fatal fall, 1982)'
)
WHERE id = 'wa_lundin_peak_west_ridge';
