# Route identity — why one peak's data keeps landing on another

Moved verbatim from `CLAUDE.md`, which keeps a one-paragraph summary of the rule and points here.
Read this before doing the kind of work it describes. Where the text says "this file" it means the
project documentation as a whole — `CLAUDE.md`, `docs/codebase/` and `docs/guards/`.

Only ~9% of WA route ids are peak-scoped (`wa_mount_baker_north_ridge`, i.e. the id
starts with its `area_id`). The other ~91% are derived from the **route name** plus a
counter: `wa_north_ridge`, `wa_north_ridge_2`, `wa_north_face_3`, `wa_south_face`. So
"the North Ridge route" does not identify a peak — `wa_north_ridge*` spans Steeple Rock,
Whatcom, Cutthroat, Primus and Main Peak, and `wa_south_face` spans ten unrelated
formations.

That is the shared root cause of migrations 0044–0046 writing to nothing, of a Mount
Adams permit block appearing on Mount Baker and Forbidden, and of Guye Peak carrying two
copies of one route. **Peak names live on `areas.name`; route names are just the line.**

- Resolve route ids by joining through `areas`, and assert the target row's `area_id`
  is the peak you meant **before** writing. Never trust a name-shaped id.
- `npm run audit:identity -- --state wa` reports id-collision families, cross-region
  duplicate field values (the contamination fingerprint), and duplicate route rows.
  Run it after any enrichment or import batch.
- `npm run audit:distances -- --state wa` audits `routes.dist_km`. Read-only. It exists
  because **that column holds two conventions at once**: the app renders round trip as
  `distKm * 2`, so values are meant to be one-way, but 61 WA rows store *half a round
  trip* instead (the tell: only the doubled figure lands on a whole number of miles).
  Both populations display correctly, so **never normalize this column in bulk** — a
  blanket transform breaks as many rows as it fixes. The script also flags non-alpine
  routes filed under a peak's `area_id`; all 6 WA hits have `source: null`. A wide
  per-peak min/max spread is printed as context only: Rainier's 25x is legitimate, since
  Camp Muir and the Carbon River are different trailheads on one mountain.
- `route_duplicate_names` should return zero rows. As of `0065` it is a **materialized
  view**, so it is stale until refreshed — call `refresh_route_duplicate_names()` with the
  service key first, then read, or you will get a clean answer about yesterday's data.
  It was a plain view (`0062`, reworked in `0064`) until the live aggregate over 201k
  routes was measured at ~6s, which exceeds the 3s `statement_timeout` on the anon role:
  every read from the app returned `57014` while the same query looked healthy in the SQL
  editor, where the `postgres` role has no timeout. A guard that always errors is a guard
  you do not have.
- `id like 'wa_%'` is the reflex filter and it misses legacy ids. **Re-measured 2026-08-19: FOUR,
  not six, and `stuart_west_ridge` is no longer one of them** — it was renamed to a peak-scoped id,
  so the example this entry used to give sends you hunting for a row that does not exist. The live
  four are `adams_avalanche_glacier`, `adams_northwest_ridge`, `rainier_central_mowich_face` and
  `rainier_north_mowich_headwall`. Filter by the area subtree when a coverage percentage matters.
  - **Match the state as a PATH SEGMENT, never a substring.** `path.includes("washington")` also
    matches `ca_i_washington_column` (Washington Column, Yosemite) and `mo_washington_state_park`
    (Missouri): it reported **64** missed routes where the truth is 4, i.e. 94% noise. An ltree path
    is dot-separated — `split(".").includes("washington")`.
  - **A per-row audit degrades gracefully under a narrow scope; a COMPARATIVE one fails in the
    false-pass direction.** Dropping a row does not merely lose that row's finding, it removes the
    evidence its neighbours are judged against. `audit:trailhead-road-agreement` lost a fifth Mowich
    route that way — `rainier_central_mowich_face` holds the bridge-closure record, the prefix filter
    dropped it, and `wa_liberty_cap_ptarmigan_ridge_finish` was left with nothing to contradict. It
    now scans the whole catalog by default.
  - **The remaining prefix-scoped audits were checked and are FINE, so do not sweep them.**
    `audit:aspect-vs-name` and `audit:trailhead-agreement` are per-row — each compares a route
    against *itself*. All four blind-spot routes were audited by hand: three agree to **0 m** and the
    fourth carries no coordinate to compare. Rescoping them would gain nothing measurable.

**The origin was one line in `scripts/pipeline/etl-state.mjs`**, which minted route ids as
`PREFIX + "_" + slug(route name)` while the crag id (`mid`) sat unused in the same
expression. `uniq()` then appended `_2`, `_3` in walk order, so the counter records nothing
but the order OpenBeta happened to be crawled. It now emits `mid + "_" + slug(name)`, and
`uniq` only fires for a genuine same-name-same-crag clash. `load-state.mjs` was never at
fault — it passes `r.id` straight through from `catalog/`.

> **Re-importing a legacy state would duplicate it, not update it.** `load-state.mjs`
> upserts with `Prefer: resolution=merge-duplicates`, which resolves on the PRIMARY KEY.
> Every route in an already-loaded state is stored under an old state-scoped id, so a
> re-run after the ETL fix hands PostgREST a *new* peak-scoped id and it INSERTs a second
> copy — 8,000+ rows for WA, ~200,000 catalog-wide.
>
> `load-state.mjs` now runs a preflight that fails closed: it looks up existing routes by
> `(area_id, name)` — the identity that actually means "the same climb" — and refuses to
> load if any incoming route matches one under a different id, printing both ids.
> `--allow-duplicate-names` overrides it, and should only be used once you have confirmed
> the rows really are distinct climbs. Before re-importing any state loaded under the old
> scheme, migrate its ids first.
