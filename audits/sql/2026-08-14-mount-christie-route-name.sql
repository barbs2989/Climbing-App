-- Mount Christie (Olympics): the name says West Slopes, everything else says north side.
--
--   wa_mount_christie_west  "West Slopes (Standard)" -> "North Couloir / Christie Glacier"
--
-- aspect N, and `face` already reads "North Couloir / Christie Glacier / Southeast Ridge
-- (the peak's only well-documented line, approaching via its north side" — so face agrees
-- with aspect and the name is the odd one out, the shape this audit keeps surfacing.
--
-- Published sources: the standard line is described as North Couloir -> North Saddle ->
-- Christie Glacier -> East Col -> Southeast Ridge, and the Christie Glacier itself "resides
-- in the NORTH cirque below the main summit" (Wikipedia / peakvisor). A trip report is
-- titled "Mt Christie via North Couloir". There is no published "West Slopes" route.
--
-- Named for the two features the approach actually climbs, matching the catalog's existing
-- slash convention (cf. "South Face / Southeast Ledges" on Formidable). The Southeast Ridge
-- finish is left to `face` rather than stuffed into the name.
--
-- No collision: Mount Christie holds this one route only. Checked live, not assumed.
-- Guarded on the exact current name, so a row renamed since this was written is left alone.

begin;

update routes
   set name = 'North Couloir / Christie Glacier'
 where id = 'wa_mount_christie_west'
   and name = 'West Slopes (Standard)';

commit;

-- Verify separately:
--   select id, name, aspect from routes where id = 'wa_mount_christie_west';
--   -- expect "North Couloir / Christie Glacier", aspect N
--   npm run audit:aspect-name   -- expect 6 -> 5
