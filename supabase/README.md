# Supabase — Phase 0 (areas + routes)

This is the first real backend artifact: the schema for the geographic tree, with
Mountain-Project hierarchy rules enforced in the database, plus a seed ported 1:1
from the current in-memory `MOUNTAINS`/`ROUTES` in `ClimbMatch.jsx`.

It does **not** touch the running prototype — the app still reads its bundle today.
This just makes the DB ready so we can migrate the area→route flow to fetch-on-demand.

## Files
- `migrations/0001_areas_routes.sql` — `areas` + `routes` tables, the 3 hierarchy
  triggers (path, leaf-only routes, leaf-XOR-parent), route-count aggregation,
  indexes, and RLS public-read policies.
- `gen-seed.cjs` — regenerates `seed.sql` from `ClimbMatch.jsx`. Run after editing
  the seed data: `node supabase/gen-seed.cjs`.
- `seed.sql` — generated INSERTs (24 areas, 14 routes), topologically ordered so the
  path trigger always finds the parent first.

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
```sql
-- route counts aggregated up the whole tree (root should equal total routes = 14)
select id, route_count from areas where parent_id is null;        -- world => 14

-- a state rolls up its descendants
select route_count from areas where id = 'utah';                  -- => 11

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

## Next step (needs your Supabase project URL + anon key)
Migrate **one flow** to the DB behind a flag, proving the architecture end-to-end:
1. `npm i @supabase/supabase-js @tanstack/react-query`
2. Add a tiny data layer: `useArea(id)`, `useAreaChildren(id)`, `useAreaRoutes(id)`.
3. Behind a `USE_DB` flag, have the Climbs tab's area browser + route list read from
   those hooks instead of `MOUNTAINS`/`ROUTES`. Everything else keeps using the bundle.

Hand me the project URL + anon key (or just say "go") and I'll write that data layer
and the flag-gated area-browse fetch.
