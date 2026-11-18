-- WA alpine audit, batch 548 (pass 8)
-- wa_the_scoop_2 ("The Scoop", Colchuck Balanced Rock): fa field reads "...first ascent August 9,
-- 2010" but the only contemporaneous primary source -- a Cascade Climbers trip report titled
-- "Colchuck Balanced Rock - The Scoop III+ 5.11c (FA) Date: 8/9/2009", posted 2009-08-11 -- dates
-- the first ascent itself to 2009, not 2010. The route's Mountain Project page (same FA party:
-- Matt Clifton, Evan Cabodi, Stewart Matthiesen) was posted/shared on 2010-08-27 by Clifton, which
-- is almost certainly where the "2010" crept in -- a page-share date mistaken for the ascent date.
-- Day and month (August 9) agree across both sources; only the year is wrong.
UPDATE routes SET fa = 'Matt Clifton, Evan Cabodi and Stewart Matthiesen — cleaned in June and freed on an August ascent (first ascent August 9, 2009)' WHERE id = 'wa_the_scoop_2';
