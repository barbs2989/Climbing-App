-- `wa_shock_and_awe` carries another climb's data. Two different climbs share
-- the name, and the enrichment landed the wrong one on this row:
--
--   Hate Rock (Swiftwater, Tumwater Canyon) -- a V3 boulder problem. THIS row.
--   Goose Egg Mountain (Tieton River)       -- 7 pitches, III 5.10c, FA Joe
--                                              Puryear, April 2003. A different climb.
--
-- The row's area, grade and discipline are all CORRECT for the boulder problem:
-- wa_hate_rock is a bouldering crag whose other 8 routes are V1-V9 at 0 pitches,
-- and this problem shares its start with a sibling on the same rock.
--
-- Wrong are `pitches` (7, from the Goose Egg route) and `overview`, which
-- describes Goose Egg outright. Its closing clause even notes that the name
-- "surfaces unrelated same-named routes at other US crags" -- the collision was
-- observed and the wrong climb written up anyway.
--
-- Replacement overview is written from scratch, not copied from any source.
-- Guarded on the current wrong values; a re-run affects 0 rows.

update routes
   set pitches = 0,
       overview = 'A short problem on the overhanging face of Hate Rock, one of the '
                  'Swiftwater boulders in Tumwater Canyon. It shares a start with '
                  'Slap and Dangle before breaking right along the upper face.'
 where id = 'wa_shock_and_awe'
   and area_id = 'wa_hate_rock'
   and pitches = 7;

select id, area_id, grade, pitches, discipline, left(overview, 60) as overview_start
  from routes where id = 'wa_shock_and_awe';
