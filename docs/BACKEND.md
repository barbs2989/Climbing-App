# ClimbMatch — Backend & Data Architecture

## Status

The plan below was written when the app was purely a front-end prototype with all data
hardcoded in `ClimbMatch.jsx`. That's no longer true — a real Supabase backend now exists
alongside the original in-memory bundle:

- **Schema is live**: 14 migrations in `supabase/migrations/` (`areas`/`routes` with the
  hierarchy triggers, contributions, auth profiles, multi-discipline support, alpine-specific
  fields like `gain_ft`/`road`/`seasonal_hazards`/`data_quality`, route lists, and more —
  well beyond the original Phase-0 sketch in §2 below).
- **Washington's alpine + rock catalog is loaded into `routes`/`areas`** (thousands of routes,
  not the original 14-route seed) — see `import-alpine.mjs` / `load-wa-rock-safe.mjs` for how
  it got there. This is a different pipeline than the `catalog/<state>/*.json` +
  `build-pack.mjs` flow described in `catalog/utah/README.md`, which is Utah-only for now.
- **`USE_DB` flag wired end-to-end**: `lib/supabase.js` (client + flag), `lib/db.js`
  (`useAreaRoutes`, `submitContribution`, `dbRouteToCamel`), `lib/DbAreaBrowser.jsx` (area
  browsing from the DB), `lib/auth.js` + `lib/AuthModal.jsx` (real Supabase auth). All are
  imported and used in `ClimbMatch.jsx` today — this isn't just a proposal anymore.
- **Auth**: profiles + real login work (migration `0009_auth_profiles.sql`). The two-logins
  unification decision (demo `ME` vs. real Supabase session) and further account features are
  still open.
- **Enrichment data** (peak metadata, seasonal hazards, permits, etc.) now lives directly as
  JSONB columns on `routes` for DB-backed routes, mapped to the same camelCase shape the UI
  panels expect via `dbRouteToCamel()` in `lib/db.js`. See `ENRICHMENT_INTEGRATION_GUIDE.md`
  for how the legacy hardcoded `enrichment-db.js` path fits alongside this.

What's still genuinely pending: national scale (only WA is loaded), offline packs (§7),
topos (§9), and finishing the auth unification. The rest of this document is the original
architecture plan/reference — schema sketches below are the **starting design**, not the
current schema; treat `supabase/migrations/` as authoritative for what's actually in the DB.

---

How to turn the front-end-only prototype into a national-scale app. The single-bundle
approach can't hold national data (Mountain Project has 250k+ routes), so the core change is
**fetch-by-area on demand** instead of loading everything up front.

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

## 2. Database schema (original Phase-0 sketch — see `supabase/migrations/` for the real, evolved schema)

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

Since this sketch, `routes` has grown substantially (see migrations 0006-0014): composite
grades, multi-discipline support, `gain_ft`/`loss_ft`/`dist_km`/`max_angle`/`commitment`,
`road`/`access`/`permit`/`descent`/`waypoints`/`gpx`, `seasonal_hazards`/`data_quality`, route
lists, and per-partner/conditions panels.

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

Auth/profile tables landed via `0009_auth_profiles.sql`; the social tables above (crews,
messages, connections, vouches, etc.) are still simulated client-side and not yet migrated.

---

## 3. Enforcing the MP hierarchy rules in the DB

These are enforced in Postgres so bad data can't be written:

1. **Routes only on leaf areas** — trigger on `routes` insert/update: reject if the
   `area_id` has any child in `areas`. (Equivalently: `area.is_leaf = true`.)
2. **An area is leaf XOR parent** — trigger on `areas`: an area can't gain a child if it
   already has routes, and vice-versa.
3. **`route_count` aggregation** — trigger maintains each ancestor's `route_count` using
   the `ltree` path whenever a route is added/moved/removed. (Replaces the recursive
   `areaClimbCount` computed on the client.)

This is the same rule set the client-side seed data was originally verified against — now
enforced where it's authoritative. Still true and live in `0001_areas_routes.sql`.

---

## 4. The API (the fetch-on-demand core)

The whole point: **load one area at a time, never the country.**

`lib/db.js`'s `useAreaRoutes`/`submitContribution` and `lib/DbAreaBrowser.jsx` implement the
area-browse → route-list part of this today. The rest of this table is still the target
shape for endpoints not yet built:

| Endpoint | Replaces today's | Notes |
|---|---|---|
| `GET /areas/:id` | drilling `MOUNTAINS` | area + immediate children (each with `route_count`) + breadcrumb (`areaPathNames`) |
| `GET /areas/:id/routes` | `ROUTES.filter(inArea…)` | **paginated + sortable** (area/grade/popularity/rating); only the leaf's routes — **live** via `useAreaRoutes` |
| `GET /routes/:id` | route detail | full route + server-computed **consensus** (trust-weighted, cached) |
| `GET /search?q=` | `fuzzyMatch` | Postgres full-text + `pg_trgm` trigram = your fuzzy search |
| `GET /route-finder?state=&type=&grade=&stars=&near=` | the Climbs filters | cross-tree filter; backed by indexes |
| `GET /areas/:id/pack` | — | bundle (routes+topos+gpx+gear) for **offline download** (§6) — not started |
| Social | crews/partners/messages/ticks/objectives/reports | still client-simulated; not migrated |

**Consensus** (`buildConsensus`): still computed client-side today; moving it server-side
(materialized view or cached read) remains a future step.

---

## 5. Front-end changes

The app still reads from module-level constants (`MOUNTAINS`, `ROUTES`, `CLIMBERS`, `ME`) for
everything the DB path doesn't cover yet, gated by the `USE_DB` flag (`lib/supabase.js`):

- **Done**: `lib/supabase.js` (client + flag), `lib/db.js` (`useAreaRoutes`,
  `submitContribution`, `dbRouteToCamel`), `lib/DbAreaBrowser.jsx` (area browsing wired into
  the Climbs tab), `lib/auth.js` + `lib/AuthModal.jsx` (real session, real login UI).
- **Still simulated / not migrated**: crews, messages, connections, vouches, belay-catch
  ledger, clubs — these still live in React state only.
- **Realtime**: messages/crew chat over Supabase Realtime channels would replace the
  simulated `aiTyping`/`setTimeout` chat — not started.
- **Storage**: avatars, route photos, GPX in Supabase Storage (buckets + signed URLs) — not
  started.

---

## 6. Data sourcing — don't hand-enter a country

"A ton of routes" is a data problem, not just an architecture one. MP's data is
proprietary (onX) — can't scrape it. **OpenBeta** (openbeta.io, CC0) is the actual source
used for the catalog work so far — see the memory note on the catalog data pipeline and
`catalog/utah/README.md` for the Utah ETL flow. Washington's catalog was imported directly
into Supabase via `import-alpine.mjs`/`load-wa-rock-safe.mjs` rather than through the
`catalog/*.json` staging flow — both are legitimate, just different pipelines for different
states so far. Keep the existing "Add a route" + verification flow for community
contributions beyond OpenBeta's coverage (this is live via `submitContribution`).

---

## 7. Offline (the "download a state" feature) — not started

A caching layer **on top of** the API — build it last:
- **PWA + Service Worker + IndexedDB** (web) or SQLite (if you wrap as a native app).
- "Download this area" → `GET /areas/:id/pack` → store routes/topos/GPX/gear in IndexedDB.
- App reads from cache when offline; the existing per-route "offline pack" UI + "Offline
  library" already model this on the front end, just not backed by real caching yet.
- **Granularity:** download by **area/crag** (the tree already supports it), not whole
  states — lighter and more precise than MP.

---

## 8. Suggested phasing

- **Phase 0 — prove it. ✅ done.** Supabase + schema + the 3 DB triggers are live. WA data
  is in the tables (well beyond the original demo-data port). The area-browse → route-detail
  flow reads from the DB behind the `USE_DB` flag.
- **Phase 1 — go DB-backed. 🟡 partial.** Reads for area-browse/route-detail/contributions
  are migrated; auth is real (profiles + login). Social tables (crews, messages, connections,
  vouches) are **not yet migrated** — still client-state only. Realtime + Storage not started.
- **Phase 2 — go national. 🔲 not started.** Only WA is loaded. OpenBeta import for other
  states, indexing/pagination, and fast search/route-finder at scale remain.
- **Phase 3 — offline. 🔲 not started.** Area packs via PWA/IndexedDB.
- **Phase 4 — AI. 🔲 not started.** The trust-weighted conditions digest, now that some real
  report/enrichment data exists to work from.

## 9. Topos (route-overlay photos) — not started

A topo is **two separate things**, and conflating them is the usual mistake:
1. a real **photo** of the wall, and
2. a **vector overlay** drawn on it — the route line, belays, pitch numbers, anchors.

Key modelling point: a topo is **per-wall, not per-route**. One photo of a buttress carries
many route lines (this is how MP/theCrag do it). So: one photo → N lines, each line → a route.
Normalized line coordinates make the overlay resolution-independent.

### Sourcing is a legal problem, not a technical one
You **cannot** scrape MP (onX-owned) or guidebook topos — the photos are copyrighted, and
OpenBeta provides route *data* but not a topo *image* library (industry-wide gap). The only
scalable, legal source is **user-contributed** topos — the same way MP/theCrag bootstrapped.
That's also a moat: a verified community topo library can't be copied.

### Schema (extends the Phase-0 tables)
```
topos(
  id          uuid pk,
  area_id     text references areas(id),   -- the wall/crag this photo shows
  photo_url   text,                         -- in Supabase Storage
  photographer text,
  license     text,                         -- contributor-affirmed (own work / CC / …)
  verif       jsonb,                         -- {status, confirms}
  votes       int,
  created_by  uuid references users(id)
)
topo_lines(
  id        uuid pk,
  topo_id   uuid references topos(id),
  route_id  text references routes(id),
  points    jsonb,    -- [[x,y], …] NORMALIZED 0–1 to the image (scales to any size)
  belays    jsonb,    -- [{x,y,label}] anchors / pitch breaks
  label     text
)
```

### Storage
Photos live in a **Supabase Storage bucket** (public or signed URLs in `photo_url`). This is
why topos are a post-backend feature — they need Storage + the route DB first.

### The draw-the-line editor (the piece that produces *accuracy*)
A focused canvas/SVG editor — this is the real product work:
1. Contributor uploads a wall photo (→ Storage).
2. Taps points along the route to draw the line; the editor stores them **normalized 0–1**
   to the image dimensions.
3. Marks belays / pitch breaks / anchors.
4. Saves `topo_lines` rows linked to the route(s).

The drawing UX *is* the accuracy — there's no bulk source to import.

### Rendering
Reuse the existing SVG-over-image overlay (the app already draws a synthetic line today —
the rendering layer is the reusable part). Feed it real `points`: normalized → SVG `viewBox`
`0 0 100 100` with `preserveAspectRatio`, plus belay dots and pitch labels. Multiple routes
on one wall = multiple `<polyline>`s on one photo.

### Quality
Allow multiple topos per wall; let the community vote/verify; surface the best-rated/verified
one; version them. Same trust-weighted pattern as route data and conditions consensus. On
upload, the contributor affirms they own/are licensed for the photo (your Terms' community-
content clause already covers this).

### Where it sits
**Phase 2–3.** Depends on backend + route DB (done) → **Storage** (not started) → then the
`topos`/`topo_lines` tables + the editor. Do **not** treat topos as static images to license
in bulk — grow them crag-by-crag from users, with verification on top.
