# Supabase — schema + seed history

The schema for the geographic tree (`areas`/`routes`), with Mountain-Project hierarchy
rules enforced in the database. Started as a small seed ported 1:1 from the in-memory
`MOUNTAINS`/`ROUTES` in `ClimbMatch.jsx`; the schema has since grown across 14 migrations
(composite grades, multi-discipline, alpine-specific fields, auth profiles, contributions,
route lists — see `migrations/` for the current authoritative shape) and the DB now holds
Washington's full alpine + rock catalog (thousands of routes), loaded separately via
`import-alpine.mjs` / `load-wa-rock-safe.mjs` at the repo root — **not** through
`gen-seed.cjs`/`seed.sql` below, which only cover the original small Utah/LCC seed.

The app reads from this DB today behind the `USE_DB` flag (see `lib/supabase.js`) — this
is not just a staging area anymore.

## Files
- `migrations/0001_areas_routes.sql` … `migrations/0014_partner_and_conditions_panels.sql`
  — `areas` + `routes` tables, the 3 hierarchy triggers (path, leaf-only routes,
  leaf-XOR-parent), route-count aggregation, indexes, RLS public-read policies, and all
  schema growth since (auth profiles, contributions, alpine fields, route lists, etc.).
  Apply in order; this is the authoritative schema reference.
- `gen-seed.cjs` / `gen-seed-utah.cjs` / `gen-seed-lcc.cjs` — regenerate the small demo
  seeds from `ClimbMatch.jsx`'s in-memory data. Only relevant for the original toy seed,
  not the WA catalog.
- `seed.sql` / `seed-lcc.sql` — generated INSERTs for that small demo seed (originally 24
  areas, 14 routes), topologically ordered so the path trigger always finds the parent
  first.

## Apply it
```bash
# one-time: install CLI + link your project
brew install supabase/tap/supabase        # or: npm i -g supabase
supabase login
supabase init                              # if not already initialised
supabase link --project-ref <your-ref>

# apply schema + seed (local dev DB)
supabase db reset                          # runs migrations/*.sql then seed.sql
# …or against a remote project:
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

## Verify it worked
This originally verified the tiny demo seed (world => 14 total routes, utah => 11). Against
the current DB (WA catalog loaded), use these to sanity-check the tree instead:
```sql
-- route counts aggregated up the whole tree
select id, route_count from areas where parent_id is null;        -- world => total across all loaded states

-- a state rolls up its descendants
select route_count from areas where id = 'wa';                    -- => WA's total route count

-- breadcrumb for a crag (ancestors, root → leaf)
select id, name from areas
 where path @> (select path from areas where id='lcc_hellgate')
 order by nlevel(path);

-- routes in a crag, in cliff order ("by area")
select name, grade, sort_order from routes
 where area_id='lcc_secret_garden' order by sort_order nulls last, name;

-- the rules are live — these should ERROR:
insert into routes(id,area_id,name) values ('x','lcc','X');        -- lcc has sub-areas → rejected
insert into areas(id,name,parent_id) values ('y','Y','lcc_egg');   -- lcc_egg has routes → rejected
```

## Notes
- **IDs are slugs** (`lcc_hellgate`) used as primary keys — readable URLs and a
  direct 1:1 port from the existing data. They must be valid `ltree` labels
  (letters, digits, `_`; no dots or hyphens). The client-side `auditAreaData()`
  validator already guards the same invariants on the seed side.
- `route_count` and `path` are maintained automatically by triggers — never set them
  by hand.

## Status: done, and beyond
The "migrate one flow behind a flag" step this section used to describe is complete —
`lib/supabase.js` (client + `USE_DB` flag), `lib/db.js` (`useAreaRoutes`,
`submitContribution`), and `lib/DbAreaBrowser.jsx` are live and wired into `ClimbMatch.jsx`'s
Climbs tab. See `BACKEND.md` for what's built vs. still pending (social tables, offline,
national scale).
