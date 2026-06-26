# Catalog data (scraped, factual)

Staging area for the factual climbing catalog that feeds the app's backend.
**Not part of the app build** — these JSON files live here, separate from `src`/`ClimbMatch.jsx`,
so they don't get bundled into the web app.

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
Once all regions pass, they get merged into one Utah catalog (the shared `utah` root is de-duplicated by id).
