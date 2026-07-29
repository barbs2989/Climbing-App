-- WA zone-level hazard tags, matched through areas (supersedes the 0044/0045 approach).
--
-- WHY THIS EXISTS: migrations 0044/0045/0046 matched peak names against routes.name.
-- WA route names are the line ("South Ridge", "West Route"), not the peak -- the peak
-- lives in areas.name. Those migrations were therefore near-no-ops. 0046 was additionally
-- malformed and has been deleted (PR #351).
--
-- SCOPE / HONESTY: these are conservative ZONE-level terrain hazards, not per-route
-- verified facts. Crevasse hazard on Mount Rainier routes is a terrain property, not a
-- claim about a specific line. Per-route specifics from the Tier 3 agent research
-- (research/phase3/) are NOT applied here -- those sources are unverified.
--
-- Dry-run verified 2026-07-29 against live data: 190 routes match, 173 previously empty,
-- sample area names checked for false positives (%adams% -> only Mount Adams, etc).
--
-- IDEMPOTENT: tags are unnested + DISTINCT + sorted on write, so re-running cannot
-- duplicate. (Earlier migrations used bare || which appends duplicates.)

-- ---------------------------------------------------------------------------
-- 1. Glaciated volcanoes -- Rainier, Baker, Adams, Glacier Peak, St. Helens
--    Real glacier terrain: crevasse/serac/icefall apply.
-- ---------------------------------------------------------------------------
UPDATE routes r
SET hazard_tags = (SELECT array_agg(DISTINCT t ORDER BY t) FROM unnest(
      COALESCE(r.hazard_tags, '{}'::text[]) || ARRAY[
        'crevasse','icefall','serac','rockfall','routefinding-whiteout',
        'altitude','volcanic-loose-rock','glacier-route-changes-annually'
      ]) t)
FROM areas a
WHERE a.id = r.area_id
  AND r.id LIKE 'wa_%'
  AND r.discipline = ANY(ARRAY['alpine','mountaineering','ice','mixed'])
  AND lower(a.name) LIKE ANY(ARRAY['%rainier%','%baker%','%adams%','%glacier peak%','%st. helens%']);

-- ---------------------------------------------------------------------------
-- 2. North Cascades glaciated peaks -- Forbidden, Eldorado, Boston, Challenger...
--    Glacier approaches + notoriously loose rock; remote for rescue.
-- ---------------------------------------------------------------------------
UPDATE routes r
SET hazard_tags = (SELECT array_agg(DISTINCT t ORDER BY t) FROM unnest(
      COALESCE(r.hazard_tags, '{}'::text[]) || ARRAY[
        'crevasse','bergschrund','serac','moat','rockfall','loose-rock',
        'routefinding','remote-rescue'
      ]) t)
FROM areas a
WHERE a.id = r.area_id
  AND r.id LIKE 'wa_%'
  AND r.discipline = ANY(ARRAY['alpine','mountaineering','ice','mixed'])
  AND lower(a.name) LIKE ANY(ARRAY['%shuksan%','%forbidden%','%boston%','%sahale%',
        '%eldorado%','%dome peak%','%buckner%','%challenger%']);

-- ---------------------------------------------------------------------------
-- 3. Stuart Range / Enchantments -- alpine rock with snow couloir approaches.
--    NOT primarily glacier: no serac/icefall.
-- ---------------------------------------------------------------------------
UPDATE routes r
SET hazard_tags = (SELECT array_agg(DISTINCT t ORDER BY t) FROM unnest(
      COALESCE(r.hazard_tags, '{}'::text[]) || ARRAY[
        'loose-rock','rockfall','routefinding','afternoon-thunderstorm',
        'long-approach','snow-couloir-conditions','descent-complexity'
      ]) t)
FROM areas a
WHERE a.id = r.area_id
  AND r.id LIKE 'wa_%'
  AND r.discipline = ANY(ARRAY['alpine','mountaineering','ice','mixed','rock'])
  AND lower(a.name) LIKE ANY(ARRAY['%stuart%','%dragontail%','%colchuck%','%argonaut%',
        '%sherpa%','%ingalls%','%prusik%']);

-- ---------------------------------------------------------------------------
-- 4. Washington Pass spires -- Liberty Bell, Burgundy, Cutthroat, Kangaroo.
--    Alpine ROCK. No glacier hazards; descent/rappel complexity dominates.
-- ---------------------------------------------------------------------------
UPDATE routes r
SET hazard_tags = (SELECT array_agg(DISTINCT t ORDER BY t) FROM unnest(
      COALESCE(r.hazard_tags, '{}'::text[]) || ARRAY[
        'rockfall','loose-rock','rappel-descent-complexity','afternoon-thunderstorm',
        'exposure','sudden-weather-change'
      ]) t)
FROM areas a
WHERE a.id = r.area_id
  AND r.id LIKE 'wa_%'
  AND r.discipline = ANY(ARRAY['alpine','rock','mixed'])
  AND lower(a.name) LIKE ANY(ARRAY['%liberty bell%','%early winters%','%burgundy%',
        '%silver star%','%cutthroat%','%kangaroo%']);

-- ---------------------------------------------------------------------------
-- 5. Olympics -- remote, long approaches, river crossings. Only Olympus is
--    meaningfully glaciated, so glacier tags are omitted at zone level.
-- ---------------------------------------------------------------------------
UPDATE routes r
SET hazard_tags = (SELECT array_agg(DISTINCT t ORDER BY t) FROM unnest(
      COALESCE(r.hazard_tags, '{}'::text[]) || ARRAY[
        'remote-rescue','routefinding','loose-rock','rockfall',
        'river-crossing','long-approach'
      ]) t)
FROM areas a
WHERE a.id = r.area_id
  AND r.id LIKE 'wa_%'
  AND r.discipline = ANY(ARRAY['alpine','mountaineering','ice','mixed'])
  AND lower(a.name) LIKE ANY(ARRAY['%olympus%','%constance%','%anderson%',
        '%ellinor%','%mount washington%']);

-- ---------------------------------------------------------------------------
-- VERIFY (run separately -- Supabase's editor shows only the last result set)
-- ---------------------------------------------------------------------------
-- Expect ~190 WA routes tagged, 0 with duplicate tags:
--
--   SELECT COUNT(*) FILTER (WHERE array_length(hazard_tags,1) > 0) AS wa_tagged,
--          COUNT(*) FILTER (WHERE array_length(hazard_tags,1)
--                > (SELECT COUNT(DISTINCT t) FROM unnest(hazard_tags) t)) AS dupes
--   FROM routes WHERE id LIKE 'wa_%';
--
-- Spot-check that tags suit the terrain (no 'crevasse' on Washington Pass rock):
--
--   SELECT a.name AS area, r.name AS route, r.discipline, r.hazard_tags
--   FROM routes r JOIN areas a ON a.id = r.area_id
--   WHERE r.id LIKE 'wa_%' AND array_length(r.hazard_tags,1) > 0
--   ORDER BY a.name LIMIT 30;
