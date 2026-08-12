# Mount Shuksan is wearing Nooksack Tower's route — and there are two copies of it

Found while researching rappel descents. **Not fixed. It needs a decision only you can make, and
the last time a "duplicate" here was resolved by deleting one half, the only copy of Triple
Couloirs was destroyed.**

## What is wrong

| | `wa_mount_shuksan_beckey_schmidtke` | `wa_nooksack_tower_beckey_route` |
|---|---|---|
| name | Beckey–Schmidtke | North Face (Beckey-Schmidtke Route) |
| filed under | `wa_mount_shuksan` — **Mount Shuksan** | `wa_nooksack_tower` — Nooksack Tower |
| grade | 5.4 YDS, AI1-2 Steep Snow, Grade III–IV | Grade IV, 5.4 |
| pitches | 10 | 10 |
| gain_ft | 6100 | 5735 |
| rappels | `~10` | prose: historically ~10 or more, with a rappel table of 10 stations |

These are the same climb. The Beckey–Schmidtke is **Nooksack Tower's north face** — the 1946
Beckey/Schmidtke first ascent — and one copy of it is filed on Mount Shuksan.

Mount Shuksan holds 11 routes; Nooksack Tower holds 2. So the wrong-peak copy is hiding in a
crowded area page while the peak it belongs to looks nearly empty.

## Why this is not a simple delete

**Both rows carry real, different enrichment**, researched at different times from different
sources. Deleting either loses work:

- The **Shuksan copy** has an approach written from the Nooksack Cirque Trail #750 / Ruth Creek
  Road side, and a `beta` describing a high bivy at ~5,900 ft on the ridge between the Price and
  East Nooksack Glaciers, shared with Price Glacier parties.
- The **Nooksack copy** has an approach written from Bellingham and the Mount Baker Highway, a
  `beta` starting from a 3,000 ft camp on the North Fork Nooksack, and a **10-station rappel
  table** that the Shuksan copy does not have.

The two approaches are not contradictory — they are the same walk described from different
starting points, at different levels of detail.

## The three options, and what each costs

1. **Move, do not merge.** `UPDATE routes SET area_id = 'wa_nooksack_tower' WHERE id =
   'wa_mount_shuksan_beckey_schmidtke'`. Nothing is lost and the route lands on the right peak —
   but Nooksack Tower then visibly shows the same climb twice, and `route_duplicate_names` gains a
   row. Honest, reversible, and it makes the duplication impossible to ignore.
2. **Merge into the Nooksack copy, then delete the Shuksan one.** Best end state, most work: every
   field the Shuksan copy holds and the Nooksack copy does not has to be carried across by hand
   first. Only then is the delete safe.
3. **Leave it.** Shuksan keeps advertising a route that is not on it.

I did not pick one. Option 2 is right if someone will do the field-by-field carry-over; option 1
is right if not, because it fixes the wrong-peak claim today without risking research.

## Before running anything

- `npm run check:sql -- <file>.sql` — it reads the live DB and fails on ids that do not exist.
  Both ids above were confirmed to return rows on 2026-08-12.
- A `route_count` on both peaks is maintained by a trigger on the routes table, which does cover
  moves — but re-check with `npm run check:counts` afterwards, since that cache has drifted before.
- If you take option 2, **confirm both ids still return rows immediately before the DELETE.** That
  is the exact check whose absence destroyed Triple Couloirs: a route flagged as a duplicate whose
  twin was not actually there.

## The three that were flagged with it and are NOT defects

An earlier pass grouped four routes together as "carrying another peak's approach text". On
re-measurement only the one above holds up. The other three share a **trailhead**, which is not the
same thing as sharing a peak:

- `wa_klawatti_peak_sw_buttress` — Eldorado trailhead / Cascade River Road. That genuinely is how
  Klawatti is approached, over the Eldorado plateau.
- `wa_tepeh_towers` — same Eldorado approach, and the Tepeh Towers genuinely sit on that plateau.
- `wa_ridge_traverse_from_east_fury` — Big Beaver / Luna Cirque, which is the standard Mount Fury
  approach for either summit.

Worth recording because a shared approach is the same fingerprint as contamination, and re-running
that detector will surface these three again.
