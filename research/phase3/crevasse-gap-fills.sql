-- Crevasse / glacier-travel warnings for six glacier routes that had none.
--
-- Source: the audit in scripts/audit-hazard-coverage.mjs found 16 WA glacier routes whose
-- routes.hazards prose never mentioned crevasses or snow bridges. Six of those are filled
-- here, each from route-specific research. The other ten are NOT in this file — see
-- crevasse-gap-notes.md for why (two were audit false positives, three are duplicate rows
-- needing dedup first, five still need research).
--
-- Targets routes.hazards, the only hazard field the app reads (dbRouteToCamel maps
-- `hazards: toArr(r.hazards)`, lib/db.js). NOT hazard_tags, NOT route_hazard_research —
-- both dropped in 0060.
--
-- IDEMPOTENT: each statement appends only if that exact text isn't already present, and
-- preserves existing order rather than re-sorting (the first entry reads as the headline
-- hazard on the route page).
--
-- Every id below was read back from the live database, not constructed. Guessed ids
-- no-op silently, which is how earlier hazard rounds "succeeded" while changing nothing.

begin;

-- Mount Shuksan — Price Glacier. The steepest, most heavily crevassed glacier on the
-- mountain. Early season the crevasses and bergschrunds bridge over; late season they
-- are open and must be climbed into and out of.
update routes set hazards = coalesce(hazards, '{}'::text[]) || array[
  'Heavily crevassed — early season a deep snowpack bridges the large crevasses and bergschrunds, but by late season expect bare glacier ice and having to drop into and climb out of their overhanging sides. Condition reports for the current season matter more here than the grade.'
] where id = 'wa_mount_shuksan_price_glacier'
  and not (coalesce(hazards, '{}'::text[]) @> array['Heavily crevassed — early season a deep snowpack bridges the large crevasses and bergschrunds, but by late season expect bare glacier ice and having to drop into and climb out of their overhanging sides. Condition reports for the current season matter more here than the grade.']);

-- Mount Rainier — Mowich Face. Approach descends off Ptarmigan Ridge onto the Mowich
-- Glacier and climbs the North Mowich to camp; the face is guarded by a bergschrund that
-- is often not directly passable.
update routes set hazards = coalesce(hazards, '{}'::text[]) || array[
  'Roped glacier travel on the approach — the route drops onto the Mowich Glacier and ascends the North Mowich to camp, with crevasses that thin snow bridges can hide. The bergschrund below the face is frequently not passable direct and has to be turned, so budget time for finding a way through.'
] where id = 'wa_mount_rainier_mowich_face'
  and not (coalesce(hazards, '{}'::text[]) @> array['Roped glacier travel on the approach — the route drops onto the Mowich Glacier and ascends the North Mowich to camp, with crevasses that thin snow bridges can hide. The bergschrund below the face is frequently not passable direct and has to be turned, so budget time for finding a way through.']);

-- Mount Rainier — Ptarmigan Ridge. Carbon Glacier approach. Rainier's glaciers move fast
-- for their latitude, so crevasse patterns and the workable line change year to year.
update routes set hazards = coalesce(hazards, '{}'::text[]) || array[
  'Crevassed glacier approach via the Carbon. Rainier''s glaciers flow fast for their size, so crevasses open early, snow bridges are unreliable, and the line that worked last season may not exist this one — treat old beta as a starting point, not a route description.'
] where id = 'wa_mount_rainier_ptarmigan_ridge'
  and not (coalesce(hazards, '{}'::text[]) @> array['Crevassed glacier approach via the Carbon. Rainier''s glaciers flow fast for their size, so crevasses open early, snow bridges are unreliable, and the line that worked last season may not exist this one — treat old beta as a starting point, not a route description.']);

-- Mount Rainier — Willis Wall. Reached across the Carbon Glacier beneath the icecap.
update routes set hazards = coalesce(hazards, '{}'::text[]) || array[
  'Crevassed glacier travel on the Carbon before the wall itself, and again on the summit icecap above it. Both ends of the route need full glacier-rescue capability on top of everything the wall throws down.'
] where id = 'wa_mount_rainier_willis_wall'
  and not (coalesce(hazards, '{}'::text[]) @> array['Crevassed glacier travel on the Carbon before the wall itself, and again on the summit icecap above it. Both ends of the route need full glacier-rescue capability on top of everything the wall throws down.']);

-- Forbidden Peak — West Ridge. Glacier crossing out of Boston Basin to the couloir, with
-- two bergschrunds at its base and a deep moat where the snow pulls off the rock wall.
update routes set hazards = coalesce(hazards, '{}'::text[]) || array[
  'Glacier crossing from Boston Basin to reach the couloir, then a lower and an upper bergschrund at its base — the lower is usually stepped across and the upper turned on the left. Late season the snow pulls away from the rock into a deep moat, and what is left of the glacier opens into moat-like slots straight down to rock.'
] where id = 'wa_forbidden_peak_west_ridge'
  and not (coalesce(hazards, '{}'::text[]) @> array['Glacier crossing from Boston Basin to reach the couloir, then a lower and an upper bergschrund at its base — the lower is usually stepped across and the upper turned on the left. Late season the snow pulls away from the rock into a deep moat, and what is left of the glacier opens into moat-like slots straight down to rock.']);

-- Eldorado Peak — West Arete. Long approach traversing the Eldorado and Inspiration
-- glaciers around to the base of the west face.
update routes set hazards = coalesce(hazards, '{}'::text[]) || array[
  'The approach traverses the Eldorado and Inspiration glaciers to reach the foot of the arête, and those crevasses open through the summer — by late season the traverse is genuinely more complex than the climbing grade suggests. Roped glacier travel and crevasse rescue are needed before the rock starts.'
] where id = 'wa_eldorado_peak_west_arete'
  and not (coalesce(hazards, '{}'::text[]) @> array['The approach traverses the Eldorado and Inspiration glaciers to reach the foot of the arête, and those crevasses open through the summer — by late season the traverse is genuinely more complex than the climbing grade suggests. Roped glacier travel and crevasse rescue are needed before the rock starts.']);

commit;

-- VERIFY: expect exactly 6 rows, each with a crevasse/bergschrund/moat mention.
-- If this result table does not appear, your paste was truncated.
select id,
       array_length(hazards, 1) as entries,
       (select count(*) from unnest(hazards) h
         where h ~* 'crevass|bergschrund|snow bridge|moat') as glacier_warnings
from routes
where id in (
  'wa_mount_shuksan_price_glacier',
  'wa_mount_rainier_mowich_face',
  'wa_mount_rainier_ptarmigan_ridge',
  'wa_mount_rainier_willis_wall',
  'wa_forbidden_peak_west_ridge',
  'wa_eldorado_peak_west_arete'
)
order by id;
