-- 0473 — Crag pass 3 follow-up, batch 4: Arrowhead Wall (Shoshone Canyon, Cody WY) moves its 2 routes to sport.
--
-- Batch 4 (2026-11-18, owner: "do more research") researched all 129 remaining "unsure" areas of crag pass 3 under
-- CRAG3.md's rule (research-data/crag-rows-out-of-alpine-pass3-2026-11-18/batch4-research.json). One qualifies:
-- Arrowhead Wall. The Rakkup guidebook states a "3 - 5 minute approach" and Mountain Project says "From the parking
-- area, it is the wall on your right"; it sits beside The Island ("The approach from your car is less than a minute"),
-- which pass 3 (0462) already moved. No summit, snow or rappel-in. Mountain Project types both routes Sport.
--   wy_arrowhead  Arrowhead 5.11c  sport
--   wy_redhead    Redhead   5.12d  sport
-- The other 128 areas stay alpine (batch4-research.json says why for each).
--
-- Guards as 0471: assert-then-set (still alpine, still in this area); a row the owner locked or a climber edited is left
-- alone. On an empty catalog (a replay or a preview) it matches nothing.
begin;

update routes r
   set discipline = 'sport', disciplines = '["sport"]'::jsonb
 where r.id in ('wy_arrowhead', 'wy_redhead')
   and r.area_id = 'wy_arrowhead_wall'
   and r.discipline = 'alpine'
   and not exists (select 1 from route_field_confidence f where f.route_id = r.id and f.field in ('discipline', 'rockStyle'))
   and not exists (select 1 from contributions c where c.route_id = r.id and c.kind = 'field'
                    and c.field in ('discipline', 'rockStyle') and c.status = 'approved');

-- Expect 2 sport (0 on an empty catalog).
select discipline, count(*) from routes where id in ('wy_arrowhead', 'wy_redhead') group by discipline order by 1;

commit;
