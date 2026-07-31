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

Related: `research/gunsight-bleed-notes.md` for the same class of cross-peak contamination,
and the CLAUDE.md section on route identity for why name-shaped ids cause it.
