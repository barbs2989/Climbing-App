# Class B corrected — most of these "duplicate pairs" are not duplicates

`CLASS-B-MEASURED-2026-08-19.md` measured every pair against the live database and answered the
question it set: *do both ids return a row, and what would a delete cost?* Both answers stand.

It could not answer the question that actually decides a delete — **are these two rows the same
climb?** — because it was built from **column presence**, which is a fact about the table. This is
that second pass. It reads each row's `approach_variants`, its prose, its waypoints and the facts
that would differ between two genuinely different lines.

**The result is a substantial correction. Of twelve pairs, exactly one is a confirmed duplicate.**

---

## The test: do the two rows agree on the facts that identify a climb?

Two different routes on one peak share the peak and little else. So `high_point_ft`, `gain_ft`,
`dist_km`, `grade`, `pitches`, `aspect`, `face` and `fa` are the discriminator — and only where
both rows have a value, since a null says nothing.

| pair | facts compared | agreeing | verdict |
|---|---|---|---|
| `wa_little_tahoma_east_shoulder` / `wa_frying_pan_whitman_glaciers` | 8 | **8** | **DUPLICATE — confirmed** |
| `wa_stanley_burgner` / `wa_prusik_peak_south_face_burgner_stanley` | 8 | 5 | likely same climb |
| `wa_the_direct_north_ridge_w_gendarme` / `wa_mount_stuart_north_ridge` | 7 | 3 | **different lines** |
| `wa_lincoln_peak_wilkes_booth` / `wa_lincoln_peak_north_ridge` | 6 | 2 | **different lines** |
| `wa_ottohorn_west_ridge` / `wa_ottohorn_southeast_route` | 6 | 1 | **different lines** |
| `wa_poltergeist_pinnacle` / `wa_poltergeist_pinnacle_north_route` | 8 | 2 | **different lines** |
| `wa_east_ridge_7` / `wa_lundin_peak_east_ridge` | 3 | 1 | blocked — see below |
| `wa_sherpa_balanced_rock_north_ridge` / `wa_sherpa_peak_north_ridge` | 5 | 3 | unresolved |
| `wa_ruth_icy_traverse` / `wa_icy_peak_ruth_icy_traverse` | 4 | 1 | unresolved |
| `wa_mount_stone_lake_of_angels` / `wa_mount_stone_putvin` | — | — | unresolved |
| `wa_liberty_cap_liberty_ridge_finish` / `wa_mount_rainier_liberty_ridge` | 7 | 3 | summit-vs-peak, see below |
| `wa_liberty_cap_ptarmigan_ridge_finish` / `wa_mount_rainier_ptarmigan_ridge` | 6 | 2 | summit-vs-peak, see below |

---

## The one confirmed duplicate

### `wa_little_tahoma_east_shoulder` = `wa_frying_pan_whitman_glaciers`

Same area. **All eight identity facts identical** — high point 11,138 ft, gain 7,600 ft, distance
11.3 km, grade "Grade II+, Class 3-4", pitches, aspect E, face "East Shoulder", and the same FA
string down to the date: *J.B. Flett and Henry H. Garrison, August 29, 1894*.

And the row says so itself, which nothing in the first pass looked at:

> modern route guides describe "Fryingpan/Whitman Glaciers" and "East Shoulder" as **the same
> standard route** — same Summerland approach, same Whitman Notch crossing, same Class 3-4 summit
> block … See the East Shoulder route entry on this peak for the closely related (likely identical)
> line.

**A plain delete still loses data either way**, which is why the first pass flagged it:

| | `_east_shoulder` | `_frying_pan_whitman_glaciers` |
|---|---|---|
| waypoints | **8** (creek crossing, Summerland, glacier toe, Whitman Notch, bergschrund, shoulder saddle, trailhead, summit) | 2 |
| `approach_variants` | 0 | **1** (1,546-char baseFinding) |
| trailhead coordinate | **yes** | no |

The variant is unambiguously this route — its Whitman Notch at 9,100 ft matches the sibling's own
waypoint elevation exactly. **Merge, then delete.** `_east_shoulder` is the richer survivor.

**One open question that is a naming choice, not a data one:** the surviving row would be called
*East Shoulder* while its own prose says the route is named for the glaciers it crosses "rather
than for the east-shoulder terrain feature". Renaming it to carry both names is worth considering.

---

## Why most of the rest are not duplicates

**The original suspicion was often not a duplicate signal at all.** Two of the reasons given:

- *"same peak, contradictory aspects"* — **two routes on one spire have different aspects. That is
  normal.** `wa_ottohorn_west_ridge` is a **2017** first ascent, four pitches, on the west ridge.
  `wa_ottohorn_southeast_route` is a **1961** ascent by Ed Cooper, Glen Denny and the Fireys, Grade
  III-IV 5.7, on the southeast side. Different lines, different eras, different parties. Deleting
  either destroys a real route.
- *"identical FA party AND date"* — a first-ascent party on a remote peak commonly climbs more than
  one line on the same trip, and the peak's first recorded ascent date is often copied onto several
  routes. It is weak evidence on its own.

`wa_lincoln_peak_wilkes_booth` ("Wilkes-Booth (Northwest Face)") against
`wa_lincoln_peak_north_ridge` ("North Ridge / Standard") is the same shape — different high point,
gain and pitch count, and the names describe different features.

---

## Blocked, and the reason is inside the row

### `wa_east_ridge_7` / `wa_lundin_peak_east_ridge`

The first document says *"the whole row is Lundin's East Ridge"*. **The row argues the opposite.**
Its `approach_variants[0].baseFinding` carries a naming warning from an earlier pass that
investigated exactly this:

> the published location text for this route refers to a saddle between Lundin and East Lundin
> peaks, while the approach it gives goes to Red Pass and then west, **which is Red Mountain's
> ground rather than Lundin's**

and traces the ridge onward to a notch at about **5,840 ft** — consistent with Red Mountain's 5,890
rather than Lundin's 6,057. It also records that **two different published descriptions of an "East
Ridge" exist on Red Mountain**, so the name alone identifies nothing.

Its `hazards` cannot be assigned either: *"loose, fractured red rock … more pronounced than on the
south face"*, and **both** peaks carry a South Face route.

**Nothing merged, nothing deleted.** Settling it needs a third record.

---

## The Liberty Cap pairs are a different question entirely

`wa_liberty_cap_*` against `wa_mount_rainier_*` is not "which row is the duplicate" — it is
**whether Liberty Cap is a summit of Rainier or an area of its own**. Both rows are legitimate
descriptions of the same ridge with different finishes, and both hold unique content, so a delete
in either direction loses something.

That is a tree-shape decision (`audit:area-parents` territory), not a dedup. It should be settled
before either row is touched.

---

## What this file changes about the earlier one

`CLASS-B-MEASURED-2026-08-19.md` is **not** withdrawn — its measurements are correct and its
"what would be lost" tables still hold. What changes is the framing: it presented twelve pairs as
duplicates awaiting a delete direction, and **eleven of the twelve are not ready to be deleted**,
four because they appear to be different climbs.

**The transferable lesson:** *column presence tells you what a delete would cost; it cannot tell you
whether the two rows are the same climb.* The evidence for that lives in the prose and, twice here,
specifically inside an `approach_variant` — a column the first pass never opened.

---

# The five suspected phantoms, checked the same way

A phantom is a row for something that may not be a route at all. These were listed alongside the
pairs and had not been checked with the same care. Applying the same standard — judge the row, not
the claim — **three of the five are not phantoms, and one of those three would have been a
destructive delete.**

| row | original claim | verdict |
|---|---|---|
| `wa_mount_stuart_north_face` | "its own beta says no such route is described anywhere" | **CONFIRMED phantom** |
| `wa_american_border_peak_northeast_face` | "a placeholder … nothing else" | **holds** — genuinely empty |
| `wa_south_ridge_4` | "only guide marketing carries the name" | **not a phantom** |
| `wa_bears_breast_mountain_se_mega_slab` | "a formation, not a route" | **not a phantom** |
| `wa_chimney_rock_west_face` | "an IDAHO route filed on a WA peak" | **STALE — do not delete** |

## Confirmed: `wa_mount_stuart_north_face`

The row denies itself, in two fields:

> **beta:** No separately named "North Face" route matching this grade (IV, 5.8, AI2) is known on
> the mountain. The north side is instead divided among the named North Ridge, Ice Cliff Glacier,
> Stuart Glacier Couloir, and Girth Pillar routes…
>
> **overview:** …the setting for the mountain's hardest technical lines … **rather than a single
> independent 'North Face' route**.

Every named route it points at exists as a sibling on `wa_mount_stuart` — North Ridge (Complete),
Ice Cliff Glacier, Stuart Glacier Couloir, Girth Pillar — checked, not assumed. What the row holds
is a description of the north **side**, which is real content but is not a route.

**No delete SQL is written for it**, and the reason is structural rather than caution: `check:sql`'s
only-copy rule protects a delete by naming a **twin**, and a phantom has no twin by construction —
that is what makes it a phantom. It is the same shape as the dissolve case, which needed its own
exemption. Deciding what to do with the north-side prose is a judgement about where that content
should live, not a dedup.

## Holds: `wa_american_border_peak_northeast_face`

12 populated fields and **no route data at all** — no grade, no pitches, no length, no approach, no
descent, no waypoints. Only `beta`, `overview`, `hazards`, `gear`, `season` beside the name, aspect
and high point. Its one sibling, `wa_american_border_peak_southeast_face`, is a real route (Grade
III, 5.4, 3 pitches).

## Not phantoms

**`wa_south_ridge_4`** carries **23 populated fields** — grade 5.6, 4 pitches, 305 m, `pitch_detail`,
4 waypoints, descent text, rappels. That is not marketing; it is a described climb. There **is** a
real defect on this row, and it is a different one: its area is `wa_main_peak` (named *"Main Peak"*)
while every sibling is `wa_eldorado_peak_*`. That is an **area-naming** problem for
`audit:area-parents`, not a reason to delete a route.

**`wa_bears_breast_mountain_se_mega_slab`** is a route with a start, a line and a summit: ~3,000 ft
of low-angle sandstone slab from Shovel Creek to the ~6,700 ft south shoulder, then ~600 ft of
exposed scrambling and a final loose pitch, reached by a multi-day approach up the Waptus River. Its
`pitch_detail` records climbing times. "A formation, not a route" describes the *name*, not the row.

## Stale, and this one matters most

**`wa_chimney_rock_west_face` is not an Idaho route.** Measured against the live row: no mention of
Idaho, the Selkirks, Priest Lake or Sandpoint anywhere in its prose or waypoints; it names Alpine
Lakes landmarks throughout; its logistics give the **Pete Lake Trailhead (Trail #1323, FR-4616)**
near Cooper Lake; its `aspect` is W, agreeing with its name *"West Face / South Summit
(Standard)"*; and it holds **25 populated fields and 8 waypoints**.

The claim rested partly on an `audit:aspect-name` finding of a 180° name-vs-aspect disagreement.
**That disagreement is gone** — the row has been repaired since. Acting on the stale claim would
have destroyed one of the better-populated routes in the catalog.

---

# Class B, all seventeen items

**Actionable: 2.** The Little Tahoma dedup (merged; delete SQL written and checked) and the Mount
Stuart North Face phantom (evidence confirmed; no SQL, for the reason above).

**A decision, not a defect: 1.** American Border Peak's Northeast Face is a genuinely empty row.

**Do not touch: 14.** Eleven pairs that are not duplicates, and three "phantoms" that are real
routes — one of them repaired since the claim was written.

**The pattern across all of it:** every one of these entries was a *hypothesis recorded as a
finding*. Four separate claims checked today turned out to describe repairs that had already
happened or suspicions that the row's own data contradicts. A defect list is evidence about the
moment it was written; re-derive before acting, and especially before deleting.
