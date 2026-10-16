-- Tatoosh: two routes off the Pinnacle-Plummer saddle name the wrong direction.
--
-- Both rows were left UNRESOLVED by the 2026-08-13 triage ("name suspect, UNRESOLVED for
-- rename; data self-consistent; no published route name found"). Published descriptions of
-- the SIDE each route climbs have now been found, which is what was missing. In both cases
-- `aspect` and `face` were already right and only the direction word in the name is wrong —
-- the shape this audit keeps finding.
--
--   wa_pinnacle_peak_tatoosh_r1   "Pinnacle Saddle / North Gully"      -> "... / South Gully"
--        aspect S, face "South face via gullies"
--        The Mountaineers / willhiteweb / WTA trip reports: from Pinnacle Saddle you "work
--        around the SOUTH side to steep paths up loose rock and rock gullies leading to the
--        top", and the scramble is described as "the south gully".
--
--   wa_plummer_peak_r1            "Pinnacle Saddle / Southeast Slopes" -> "... / North Slopes"
--        aspect N, face "North side/ridge directly above the Pinnacle-Plummer Saddle"
--        SummitPost / Visit Rainier / WTA: approaching from the saddle "the trail passes on
--        the NORTH flank of Plummer", and "snow often clings to these steep NORTHERN slopes".
--
-- Only the direction word changes. The "Pinnacle Saddle /" prefix is accurate for both and
-- is kept — it records the approach, which is genuinely how both routes are described.
--
-- No collision: Pinnacle Peak also holds "East Ridge" (E) and "Southwest Scramble" (SW), and
-- "South Gully" collides with neither; Plummer Peak holds only this one route. Checked live
-- before writing this, not assumed.
--
-- Each UPDATE is guarded on the exact CURRENT name, so a row renamed by anyone else since
-- this file was written is left alone rather than silently overwritten.

begin;

update routes
   set name = 'Pinnacle Saddle / South Gully'
 where id = 'wa_pinnacle_peak_tatoosh_r1'
   and name = 'Pinnacle Saddle / North Gully';

update routes
   set name = 'Pinnacle Saddle / North Slopes'
 where id = 'wa_plummer_peak_r1'
   and name = 'Pinnacle Saddle / Southeast Slopes';

commit;

-- Verify as SEPARATE statements:
--
--   select id, name, aspect from routes
--    where id in ('wa_pinnacle_peak_tatoosh_r1','wa_plummer_peak_r1');
--   -- expect "Pinnacle Saddle / South Gully" (S) and "Pinnacle Saddle / North Slopes" (N)
--
--   npm run audit:aspect-name   -- expect 8 -> 6
