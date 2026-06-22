# ClimbMatch — Backend & Data Architecture Scope

How to turn the current front-end-only prototype (all data hardcoded in `ClimbMatch.jsx`)
into a national-scale app. The single-bundle approach can't hold national data
(Mountain Project has 250k+ routes), so the core change is **fetch-by-area on demand**
instead of loading everything up front.

---

## 1. Recommended stack

**Supabase** (managed Postgres + Auth + Realtime + Storage + row-level security).

Why this over a custom Node/Postgres backend, for your situation:
- The app already *simulates* auth, realtime chat, photo storage, and a relational
  data model. Supabase gives all of those out of the box, so you build features, not plumbing.
- **Postgres** is the right DB for a hierarchical area tree + geo queries. Add the
  **`ltree`** extension (fast subtree queries — "everything under Utah") and **PostGIS**
  (nearby/"climbing near me").
- Front-end stays React; you swap the in-memory constants for the `@supabase/supabase-js`
  client (or REST). Realtime channels replace the faked `aiTyping`/`setTimeout` chat.

**If you'd rather go custom:** Node (Fastify) + Postgres + Prisma + a separate auth
(Clerk/Auth0) + S3 for storage + a websocket layer. More control, much more to build/operate.
Everything below (schema, endpoints) is identical either way.

---

## 2. Database schema (mapped from today's in-memory data)

### Geographic tree — `areas`  (was `MOUNTAINS`)
```
areas(
  id            uuid pk,
  slug          text unique,            -- "little-cottonwood-canyon"
  name          text,
  parent_id     uuid fk areas(id),      -- self-reference (the tree)
  path          ltree,                  -- materialized path for fast subtree queries
  area_type     text,                   -- display label only: state/range/canyon/crag/wall…
  region        text,
  lat, lng      double precision,       -- PostGIS point for "nearby"
  elevation     int,
  blurb         text,
  is_leaf       boolean,                -- true = a crag that holds routes
  route_count   int,                    -- DENORMALIZED aggregate (maintained by trigger)
  source        text,                   -- e.g. "openbeta:<id>"
  bbox          geometry                -- optional, for map bounds
)
```

### Climbs — `routes`  (was `ROUTES`)
```
routes(
  id            uuid pk,
  slug          text,
  area_id       uuid fk areas(id),      -- MUST be a leaf area (enforced, see §3)
  name          text,
  discipline    text,                   -- sport/trad/boulder/ice/alpine/…
  grade         text,
  grade_system  text,                   -- yds/v/wi/m/aid/class
  grade_num     numeric,                -- normalized for range filtering & sorting
  pitches       int,
  length_m      int,
  sort_order    int,                    -- left-to-right cliff order (MP "by area")
  stars         numeric,                -- cached avg from trip reports
  fa            text,
  lat, lng      double precision,
  aspect        text,
  season        text,
  description   text,
  gear          jsonb,                  -- cams/rack/etc.
  hazards       text[],
  verif         jsonb,                  -- {status, source, updated, confirms}
  source        text                    -- "openbeta:<id>"
)
```

### People & social (was `CLIMBERS`/`ME`, crews, logs, etc.)
```
users(id, username, name, avatar_url, location, lat, lng, level,
      disciplines text[], sport_grade, trad_grade, boulder_grade, bio,
      trust_score, verified, hiking_speed, risk_tolerance, …)

objectives(user_id, route_id)                       -- the wishlist
ticks(id, user_id, route_id, date, tick_type, stars, partner_ids uuid[], photo_urls text[])
trip_reports(id, route_id, user_id, date, stars, condition_tags text[],
             text, hazard_tags text[])              -- feeds the consensus engine
connections(user_a, user_b, status)                 -- friends (+ requests)
crews(id, route_id, status, dates date[], day_acks jsonb, meet_place, meet_time, float_plan jsonb, cap int)
crew_members(crew_id, user_id, status)
messages(id, thread_type, thread_id, sender_id, body, image_url, created_at)   -- realtime
clubs(...) / club_members(...) / club_posts(...) / events(...)
vouches(from_id, target_id, route, ratings jsonb, text)   -- trust inputs
belay_catches(user_id, partner_id, date, high_factor bool) -- trust ledger
guides(...)
```

Reference tables: `condition_tags`, `hazard_tags` (today's `HAZARD_TAGS`, `COND_KW`).

---

## 3. Enforcing the MP hierarchy rules in the DB

Today these live in the new client-side `auditAreaData()` validator. At scale, enforce
them in Postgres so bad data can't be written:

1. **Routes only on leaf areas** — trigger on `routes` insert/update: reject if the
   `area_id` has any child in `areas`. (Equivalently: `area.is_leaf = true`.)
2. **An area is leaf XOR parent** — trigger on `areas`: an area can't gain a child if it
   already has routes, and vice-versa.
3. **`route_count` aggregation** — trigger maintains each ancestor's `route_count` using
   the `ltree` path whenever a route is added/moved/removed. (Replaces the recursive
   `areaClimbCount` computed on the client.)

This is the same rule set we already verified the seed data obeys — just moved to where
it's authoritative.

---

## 4. The API (the fetch-on-demand core)

The whole point: **load one area at a time, never the country.**

| Endpoint | Replaces today's | Notes |
|---|---|---|
| `GET /areas/:id` | drilling `MOUNTAINS` | area + immediate children (each with `route_count`) + breadcrumb (`areaPathNames`) |
| `GET /areas/:id/routes` | `ROUTES.filter(inArea…)` | **paginated + sortable** (area/grade/popularity/rating); only the leaf's routes |
| `GET /routes/:id` | route detail | full route + server-computed **consensus** (trust-weighted, cached) |
| `GET /search?q=` | `fuzzyMatch` | Postgres full-text + `pg_trgm` trigram = your fuzzy search |
| `GET /route-finder?state=&type=&grade=&stars=&near=` | the Climbs filters | cross-tree filter; backed by indexes |
| `GET /areas/:id/pack` | — | bundle (routes+topos+gpx+gear) for **offline download** (§6) |
| Social | crews/partners/messages/ticks/objectives/reports | partner matching = `compat()` as a SQL-scored query; messages over Realtime |

**Consensus** (`buildConsensus`): move server-side — compute on read with a short cache,
or a materialized view refreshed when reports change. Trust-weighting + recency logic is
unchanged; it just runs where the report data lives.

---

## 5. Front-end changes

The biggest refactor: the app reads from module-level constants (`MOUNTAINS`, `ROUTES`,
`CLIMBERS`, `ME`) **everywhere**. Replace those with a data layer:

- Add **React Query** (or SWR) + the Supabase client. Introduce hooks: `useArea(id)`,
  `useAreaRoutes(id, {sort,page})`, `useRoute(id)`, `useSearch(q)`, `useRouteFinder(filters)`.
- Swap direct array access for these hooks, view by view. Helpers like `inArea`,
  `areaPathNames`, `areaClimbCount`, `buildConsensus`, `passesFilters` become server queries
  (their logic moves to SQL / endpoints).
- **Auth:** replace `DEMO_AUTOLOGIN` + the `ME` global with a real session; `ME` becomes the
  fetched current user. (The login screen UI already exists.)
- **Realtime:** messages/crew chat over Supabase Realtime channels (kills the simulated
  `aiTyping`/`setTimeout`).
- **Storage:** avatars, route photos, GPX in Supabase Storage (buckets + signed URLs).

Do this behind a flag, one flow at a time (start with area-browse → route-detail), so the
demo keeps working while you migrate.

---

## 6. Data sourcing — don't hand-enter a country

"A ton of routes" is a data problem, not just an architecture one. MP's data is
proprietary (onX) — can't scrape it. Use **OpenBeta** (openbeta.io): an open-licensed
climbing dataset + GraphQL API with a compatible area→route tree. Import it into `areas`/
`routes` (it maps cleanly onto this schema), then layer your social/trust/crew features —
which are your actual differentiator — on top. Keep your existing "Add a route" +
verification flow for community contributions beyond OpenBeta's coverage.

---

## 7. Offline (the "download a state" feature)

A caching layer **on top of** the API — build it last:
- **PWA + Service Worker + IndexedDB** (web) or SQLite (if you wrap as a native app).
- "Download this area" → `GET /areas/:id/pack` → store routes/topos/GPX/gear in IndexedDB.
- App reads from cache when offline; your existing per-route "offline pack" UI + "Offline
  library" already model this.
- **Granularity:** download by **area/crag** (your tree already supports it), not whole
  states — lighter and more precise than MP.

---

## 8. Suggested phasing

- **Phase 0 — prove it.** Stand up Supabase + schema + the 3 DB triggers. Port the current
  demo data into the tables. Migrate ONE flow (area-browse → route-detail) to fetch from
  the DB behind a flag. Validates the whole architecture with low risk.
- **Phase 1 — go DB-backed.** Migrate all reads to the API; real auth; users/social tables;
  Realtime messaging; Storage for photos. App fully off the bundle (still small data).
- **Phase 2 — go national.** Import OpenBeta. Add indexes/pagination; make search +
  route-finder fast at scale.
- **Phase 3 — offline.** Area packs via PWA/IndexedDB.
- **Phase 4 — AI.** The trust-weighted conditions digest (now that report data is real).

The one decision that's yours: **Supabase (recommended, fastest path) vs. a custom backend.**
Everything else above is the same regardless.
