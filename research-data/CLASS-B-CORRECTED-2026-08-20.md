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
