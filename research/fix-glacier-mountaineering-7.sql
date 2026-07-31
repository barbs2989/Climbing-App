-- Glacier crossed on the APPROACH counts too -- same rope, crampons and crevasse
-- rescue as crossing it higher up. Extends parts 1-4. Part 7.
-- Guarded on id + area_id + current discipline; a re-run affects 0 rows. Expect UPDATE 1 x1.

update routes set discipline='mountaineering' where id='wa_tenpeak_mountain_north_couloir' and area_id='wa_tenpeak_mountain' and discipline='alpine';

select count(*) filter (where discipline='mountaineering') as done, count(*) as total
  from routes where id in ('wa_tenpeak_mountain_north_couloir');
