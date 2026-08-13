# Mount Shuksan is wearing Nooksack Tower's route — and there are two copies of it

**RESOLVED by research. The SQL is written, checked against the live DB, and waiting for you to
run: `audits/sql/2026-08-12-nooksack-beckey-merge.sql`.** It is a merge-then-delete in one
transaction, and the delete is guarded so it becomes a no-op if the surviving twin is not there.

## What the sources settled

The AAC's own first-ascent report is unambiguous. On 5 July 1946 Beckey and Schmidtke left a
3,000 ft camp on the North Fork Nooksack, reached the bergschrund at 6,500 ft, climbed roughly
800 ft of ~50° ice couloir on the **north face**, traversed west into a hidden rock trough, and
finished up about 1,200 ft of fourth-class on the north arête to the summit of **Nooksack
Tower** — a peak that had turned back attempts since 1939. They rappelled off pitons placed in
the rock flanking the couloir.

Nooksack Tower is 8,285 ft with 325 ft of prominence, three quarters of a mile northeast of
Shuksan's summit. Every published source files it as a named, route-bearing sub-area *whose
parent is Mount Shuksan* — which is exactly what this database already models. Mountain Project's
breadcrumb is `Mt Shuksan > Nooksack Tower`, and MP holds **zero** routes directly at the Shuksan
level.

**The two rows are one climb, and the Shuksan row's own fields say so**: `face` reads "NE Face,
Nooksack Tower", its final waypoint is "Nooksack Tower summit", and its lat/lng of 48.836,
-121.587 is the Tower's summit — 0.8 mi from Shuksan's, matching the published offset. Its grade
string, pitch count, length and star rating are a field-for-field ingest of Mountain Project's
Beckey-Schmidtke page, attributed to the parent breadcrumb instead of the sub-area. **Mount
Shuksan has no route called Beckey-Schmidtke in any source checked**, and Beckey's own
Shuksan-proper first ascents carry different names.

## Why merge-and-delete rather than just moving the row

Moving it was the option that *looked* safer, and it is not. It would put two rows describing the
identical 1946 line on one small peak that currently shows two routes — making the duplication
maximally visible and seeding exactly the "which of these is real?" ambiguity that destroyed
Triple Couloirs. The evidence here is not circumstantial: same party, same date, same face, same
couloir, same arête, same rappel count, same source page.

**The recommendation was explicitly conditional on the carry-over actually being done** — a delete
that loses the 70° step and the AI1-2 grade would be worse than a visible duplicate. So the SQL
does the carry-over and the delete in one transaction, and copies every value **by subquery rather
than by retyping it**, which is how a transcription error becomes a "verified" write.

## One place I departed from the research

It recommended carrying the Shuksan row's `emergency` block across. I did not, on geography: that
block names the Marblemount ranger station and the **Skagit** County Sheriff, but Nooksack Cirque
is approached from Ruth Creek off the Mount Baker Highway and lies in **Whatcom** County. The
Nooksack row already names the Glacier Public Service Center and the Whatcom County Sheriff, which
are the right ones for that trailhead.

Also left behind: the `access` block, contaminated in the opposite direction (it describes the Lake
Ann Trail, Fisher Chimneys and the Sulphide Glacier — Shuksan's own approaches); the `grade`
string, which is prose in a field the UI renders as a pill, with its AI1-2 detail preserved in
`ice_grade` instead; and `timing`, where the Nooksack row's 20 hours matches the ~21-hour trip
report and the Shuksan row's 11 does not.

**Unresolved, and left alone rather than guessed**: `length_m` is 305 on one row and 610 on the
other. The climb is ~800 ft of couloir plus ~1,200 ft of arête, so 610 m may be the whole line
while 305 m is only the technical rock.

**One caveat the research stated plainly**: SummitPost and the CascadeClimbers trip reports
returned 403s and are cited from search excerpts rather than full text. Nothing above rests on
them — the AAJ account and the Mountain Project hierarchy each settle it independently. Beckey's
Cascade Alpine Guide Vol. 3 was not readable in this pass, and it is the one source that could in
principle name a Shuksan variant.

---

*Original writeup, kept because the reasoning about why this was not a simple delete still stands:*

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
