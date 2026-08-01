# Crag-copy dedup — pre-merge archives and loss audit

Eight WA peaks existed twice: once as a `peak` area with a real elevation, once as a
`crag` copy with `elevation_ft = null` under a different parent, routes split across the
two. See `audits/duplicate-peak-areas-2026-07-30.md` for how they were found.

The merge could not be done in bulk. Each pair is **two independent enrichment passes**
over the same climb — both sides carry full, different prose (one row cites a 1939 FA
party while its twin says "unknown"; one describes the Middle Fork approach and the other
the Pete Lake approach to the same summit). Deleting either half deletes a research pass,
so every pair needed per-field content judgement.

## Why these archives exist

`*-pre-merge.json` holds the complete live rows — both area rows and every route under
each — captured **before** any merge, for five families: Chair Peak, Garfield, McMillan
Spire (West), The Castle (Tatoosh), and Baring/Dolomite Tower. Remmel's archive was taken
just before that pair was merged elsewhere.

Once a duplicate copy is deleted, these files are the only remaining record of it. That is
the point: the last time a duplicate was resolved on suspicion, without an archive, it cost
us Triple Couloirs (see the CLAUDE.md note on `wa_dragontail_peak_triple_couloirs`).

## Loss audit — 2026-07-31

Eight of the nine route pairs were merged and their copies deleted by a parallel session
while this archive was being assembled. Because the archives predate those deletes, the
merges could be audited after the fact: for every non-empty field on each deleted copy,
does the survivor still carry content?

| survivor | copy fields | blank on survivor |
| --- | --- | --- |
| `wa_chair_peak_east_face` | 46 | 0 |
| `wa_chair_peak_northwest_ridge` | 47 | 0 |
| `wa_garfield_mountain_infinite_bliss` | 10 | 0 |
| `wa_garfield_mountain_preiss_route` | 10 | 0 |
| `wa_castle_peak_tatoosh_la_villa` | 36 | 0 |
| `wa_castle_peak_tatoosh_southeast_face` | 57 | 0 |
| `wa_mcmillan_spire_west_southwest_ridge` | 55 | 1 (`fa`, value `"unknown"`) |
| `wa_mcmillan_spire_west_west_ridge` | 51 | 0 |

**Zero real fields lost** — the one flagged gap is the literal string `"unknown"`, not a
first-ascent record. Chair-Bryant Traverse — a real route that existed only on the husk
area `wa_summer_fall_rock_3` and would have been destroyed by a wholesale area delete —
was correctly reparented to `wa_chair_peak` and survives.

## Still unmerged at the time of writing

One pair: `wa_vanishing_point` ← `wa_baring_mountain_vanishing_point`. Note the **reversed
direction** — the short id is the survivor here, because Dolomite Tower is Vanishing Point's
correct home and the peak-scoped row is the misfile.

`merge-body-baring.json` is a reviewed, ready-to-apply field set for it, with
`merge-rationale-baring.md` recording the decision per field. It is **data, not a
migration** — nothing applies it automatically. `merge-body-mcmillan.json` is kept for the
same reason the archives are: it records what a second reviewer concluded about a pair that
someone else then merged, so the two can be compared.

Findings worth carrying forward, all of them same-name-different-peak bleed:

- Both McMillan copies' `road` objects describe the Ross Lake water taxi. That is Northern
  Pickets access; these routes are approached from Goodell Creek. They were not taken.
- `wa_mcmillan_spire_west_west_ridge` crosses the Terror Glacier, so its discipline should
  be `mountaineering` per the glacier convention, not `alpine`. Checked live: it already
  is. Its `grade` still reads `"Grade II, 4th class (3rd class below)"` where the column
  wants the compact form (`"4th"`), with the verbose text belonging in `alpine_grade` /
  `rock_grade` — left alone here because grade normalization is being swept separately.
- The Castle copy carried Castle Peak (Pasayten) contamination — an 8,343 ft elevation,
  Okanogan-Wenatchee land manager, and a Snow Lake approach — against a Tatoosh Range peak
  inside Mount Rainier National Park. Rejected.

## The duplicated parent areas

Three were flagged. Their status after the route-level work:

- **`wa_picket_range` / `wa_southern_pickets` — not a duplicate.** Southern Pickets is a
  legitimate sub-region, already correctly parented under the Picket Range.
- **`wa_mount_baring` / `wa_baring_mountain` — real duplicate, blocked.** Same mountain
  under a region id and a peak id. The obvious fix is rejected by the schema: `areas_leaf_xor`
  (migration 0001) forbids an area from holding both routes and children, and the peak row
  holds three routes genuinely on the mountain rather than the tower (North Face, South
  Route, Oatmeal Man). Unifying it needs a new sub-area for the mountain's own routes first
  — a content decision, deliberately not guessed at.
- **`wa_pasayten` / `wa_pasayten_wilderness` — real duplicate, fixed** by
  `research/fix-pasayten-duplicate.sql`.

### Why the Pasayten husk is deleted rather than reparented

Both areas are literally named "Pasayten Wilderness", so the browser lists the wilderness
twice under Okanogan and one entry is a dead end. The husk holds 17 areas and **zero routes
anywhere in the subtree** — scaffolding for real crags (Windy Peak, Bauerman Ridge, Toats
Coulee, Pick Peak/Sunny Pass) whose routes were never imported.

Reparenting was the first instinct and is the wrong call here. It would move four dead-end
branches *into* the real Pasayten, trading one empty duplicate for sixteen empty sub-areas —
worse for anyone browsing. It would also need a manual path cascade, because
`areas_set_path` recomputes the ltree `path` only for the row it fires on and **never its
descendants**, so the grandchildren would keep stale paths routing through a deleted parent
and silently break `path <@` subtree queries and the `route_count` rollups built on them.

Deleting is recoverable: the catalog pipeline recreates areas on import if these crags ever
get routes, and the full pre-delete rows are archived in `pasayten-husk-archive.json`.

### check:sql does not cover this file

`scripts/check-sql-targets.mjs` defaults to `--table routes` and skips statements against
any other table, so it reports "nothing to check" for an `areas`-only file. Passing
`--table areas` fails outright — its only-copy query assumes a routes-shaped table with an
`area_id` column. **So this file has no automated guard**, which is precisely the situation
CLAUDE.md warns about.

What was done instead, before writing a single statement: confirmed 0 routes attached
anywhere in the subtree, 0 `contributions` referencing any of the ids, and no child area
outside the captured set pointing into it; archived every row; ordered the deletes
deepest-first; and made each one self-guarding on the area being empty of both routes and
children, so a concurrent import cannot be silently discarded. Verify live afterwards —
`select id, name, route_count from areas where name ilike '%pasayten%'` should return
exactly one row, `wa_pasayten` with 41 routes.

Related: `research/gunsight-bleed-notes.md` for the same class of cross-peak contamination,
and the CLAUDE.md section on route identity for why name-shaped ids cause it.
