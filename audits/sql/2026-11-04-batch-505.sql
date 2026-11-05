-- wa_le_conte_mountain_northern_aspect: fa names the 1938 first-ascent party's third
-- member "Ray W. Clough". Multiple independent copies of the Wikipedia article on
-- Le Conte Mountain (and its mirrors) consistently name him "Ralph W. Clough" --
-- Calder T. Bressler, Ralph W. Clough, Bill Cox and Tom Myers, July 23, 1938.
UPDATE routes
SET fa = replace(fa, 'Ray W. Clough', 'Ralph W. Clough')
WHERE id = 'wa_le_conte_mountain_northern_aspect';
