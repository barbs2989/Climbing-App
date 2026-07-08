# Catalog data (scraped, factual) — Utah pipeline

Staging area for the factual climbing catalog that feeds the app's backend.
**Not part of the app build** — these JSON files live here, separate from `src`/`ClimbMatch.jsx`,
so they don't get bundled into the web app.

**Note:** this staging → validate → build-pack flow is only used for Utah so far.
Washington's catalog (the app's largest, most enriched dataset) was imported directly into
Supabase via `import-alpine.mjs`/`load-wa-rock-safe.mjs` at the repo root instead — there's
no `catalog/wa/` folder. Both are legitimate pipelines; pick whichever fits when adding a new
state (this staged JSON approach if you want a reviewable/offline-packable intermediate file,
direct-to-Supabase if you're importing once and don't need the intermediate artifact).

## Layout — one folder per state, two files per region

```
catalog/
  utah/
    little_cottonwood_areas.json
    little_cottonwood_routes.json
    big_cottonwood_areas.json
    big_cottonwood_routes.json
    ...
```

- Each region produces **two files**: `<region>_areas.json` (the hierarchy) and `<region>_routes.json` (the climbs).
- Each region's `*_areas.json` is **self-contained** — it includes the Utah root node at the top, so it validates on its own.
- Adding another state later? Make a sibling folder (e.g. `catalog/colorado/`).

## Before importing — validate

From the repo root:

```
node validate-catalog.mjs catalog/utah/little_cottonwood_areas.json catalog/utah/little_cottonwood_routes.json
```

It must print **PASS** (no blocking errors) before the data is safe to import.

## When all regions pass — build the download pack

```
node build-pack.mjs utah
```

This merges every `catalog/utah/*_areas.json` + `*_routes.json` into a single **`catalog/utah.json`**
(`{ state, areas, routes }`), de-duplicating the shared `utah` root by id and refusing to write if two
files disagree on the same id. That one file is the **per-state download pack** the app fetches when a
user downloads "Utah" — so the app ships small and pulls in only the state(s) each user wants.
