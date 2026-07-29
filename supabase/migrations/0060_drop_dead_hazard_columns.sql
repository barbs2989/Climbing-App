-- Remove the two decoy hazard stores.
--
-- The app reads exactly one hazard field: `routes.hazards`. dbRouteToCamel maps
-- `hazards: toArr(r.hazards)` (lib/db.js).
--
-- CORRECTION (2026-07-29, after this migration was applied): the original wording
-- here claimed neither dropped object was referenced by any .jsx/.js in the repo.
-- That was true when written, but PR #372 ("Surface hazard_tags research on the
-- route Safety tab") merged shortly afterwards and added exactly such a reference —
-- `hazardTags: toArr(r.hazard_tags)` in lib/db.js, rendered as Safety-tab chips in
-- ClimbMatch.jsx. Because the column was already dropped, that feature was dead on
-- arrival: PostgREST's `select("*")` omits a column that does not exist and
-- toArr(undefined) returns [], so it rendered nothing and raised no error. Those
-- readers were reverted in PR #375. Do not re-add a reader for either object.
--
-- Keeping them has been actively harmful. Because they look like the hazard store,
-- enrichment work has repeatedly been aimed at them and then reported as shipped:
--   * `route_hazard_research` — live but EMPTY (0 rows). Created outside the tracked
--     migrations. The "Phase 3 Tier 1 shipped, 34 hazards live" claim referred to
--     this table; nothing was ever readable by the app.
--   * `routes.hazard_tags` — 420 rows, and most of it is misapplied. 314 non-WA
--     routes carry glacier hazards (crevasse / serac / icefall / bergschrund), and
--     294 of those are bouldering, trad, sport or aid — e.g. Arizona boulder problems
--     tagged 'crevasse', 'icefall', 'serac'. This is the LIKE-clause spray failure
--     mode: `WHERE id LIKE ...` patterns that matched far more than intended.
--
-- This data is deliberately NOT migrated into `routes.hazards`. Doing so would
-- publish glacier hazards onto desert sport climbs — currently invisible only
-- because nothing reads the column. The raw values are preserved for forensics at
-- research/phase3/hazard_tags-dump-2026-07-29.json.
--
-- Real coverage is unaffected: `routes.hazards` is populated on 4,211 of 8,392 WA
-- routes, with WA alpine at 447/453.

drop table if exists route_hazard_research;

alter table routes drop column if exists hazard_tags;

-- VERIFY: both should return 0 rows.
-- If these result tables do not appear, your paste was truncated.
select table_name from information_schema.tables
where table_name = 'route_hazard_research';

select column_name from information_schema.columns
where table_name = 'routes' and column_name = 'hazard_tags';
