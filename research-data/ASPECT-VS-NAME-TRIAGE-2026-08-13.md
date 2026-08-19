# Name vs aspect: 12 disagreements, and the `face` column decides most of them

> **RESOLUTION LOG (updated 2026-08-13, after published-source research).**
> **4 settled, 8 still open** (was 3/9 — the Ruth Mountain rename SQL sat written-but-unapplied for a day
> and was applied on 2026-08-14; see the row below). The bar for acting is a *published* statement, not internal
> agreement — the catalog is what is in doubt, so `face` agreeing with `aspect` raises suspicion
> about the name but cannot supply the right one.
>
> | route | verdict | action |
> |---|---|---|
> | `wa_forbidden_peak_east_face_catscratch` | **PHANTOM — not a route at all** | **DELETED.** See below. |
> | `wa_ruth_mountain_south_slopes` | **NAME WRONG** | **RENAME APPLIED 2026-08-14** -> `North Face / Ruth Glacier`, verified by re-read; audit 10 -> 9 |
> | `wa_chimney_rock_west_face` | **Idaho route, corroborated** | removal recommended, not applied — needs a human |
> | `wa_spire_point_southwest_face` | **UNRESOLVED** | route naming needs Beckey; no source settles it |
> | `wa_pinnacle_peak_tatoosh_r1`, `wa_plummer_peak_r1` | **name suspect, UNRESOLVED for rename** | data self-consistent; no published route name found |
> | the remaining 6 | not yet researched | — |
>
> **`wa_forbidden_peak_east_face_catscratch` was the big one, and the answer was not a rename.**
> It is a row for a feature that is not a summit route, and the row diagnosed itself — its own
> `overview` already read *"No documented 5.9/Grade IV 'East Face' summit route was found. The only
> well-sourced feature matching 'Catscratch' is the Cat Scratch Gullies."* An earlier pass reached
> that conclusion and left the row standing. Confirmed against published sources: the Cat Scratch
> Gullies rise from Boston Basin on the **south** side to the 8,265 ft West Ridge notch, and
> Forbidden's six real routes each already had their own row. Removed; the peak now lists exactly
> six, and `route_count` is in step.
>
> **Nothing was lost, because the beta was already on the right row.**
> `wa_forbidden_peak_west_ridge` carries a Cat Scratch approach variant whose `baseFinding` is
> precisely the confusion that motivated this whole project: *"Cat Scratch is not the snow couloir,
> and that mix-up is the usual reason parties lose time here."* The DELETE was guarded on that
> variant being present, so it could not fire in a state where the information would be lost.
>
> **`wa_ruth_mountain_south_slopes` is the second Little Annapurna: the name states a TRAVEL
> DIRECTION, not an aspect.** Hannegan Pass is north of Ruth, so the approach walks *south* along
> Ruth Arm to reach a mountain then climbed on its north-side glacier. Five signals agree and none
> is the name.


First real run of `audit:aspect-name` against 8,367 WA routes, 490 comparable. **12 disagreements.**

Getting there took two rounds of fixing the audit rather than the data — it reported **20**, then 14,
then 12, and all 8 removed were the parser's fault. That is recorded in CLAUDE.md; the short version
is that a possessive apostrophe made `\bs\b` match *Ford's Theatre*, list-order scanning read
*"South Ridge (North Peak)"* as NORTH, `glacier` made a ridge route look like a face, and
*"Southeast Peak"* names a summit rather than an aspect. **Judge a detector's precision on a real
run.** 40% of the first one was noise.

## How to read these

`face` is the tiebreaker. It is prose describing the same plane, written by a different enrichment
pass than the name — so **where `face` agrees with `aspect`, the NAME is the odd one out**, which is
exactly the shape `wa_little_annapurna_south_slopes` turned out to have. Peers on the same peak
settle several more.

**Nothing here is auto-corrected.** A rename is an identity change (it feeds search, dedup and the
duplicate-name view) and `aspect` drives the sun/shade readout, so getting the direction of the
repair backwards is worse than leaving the disagreement. Little Annapurna's first report said "fix
the aspect" and would have turned a correctly-shady north slog sunny.

## The 12

### `face` and `aspect` agree — so the NAME is the outlier (7)

| route | name says | aspect | its own `face` |
|---|---|---|---|
| `wa_ruth_mountain_south_slopes` | South | **N** | "North Glacier" — and the peer row calls it a "North (Ruth Glacier ascent)" |
| `wa_spire_point_southwest_face` | SW | **E** | "East Face" |
| `wa_pinnacle_peak_tatoosh_r1` | North Gully | **S** | "South face via gullies" |
| `wa_luahna_peak_east_slopes` | East | **N** | "Pilz Glacier / Butterfly Glacier (north side)" |
| `wa_mount_christie_west` | West | **N** | "North Couloir / Christie Glacier … approaching via its north side" |
| `wa_tye_peak_e_route` | East | **S** | "South ridge, gained … from the Skyline Lake basin (west side)" |
| `wa_mount_cameron_standard` | SE Slopes | **N** | "North ridge / false-summit traverse from Cameron Pass" |
| `wa_plummer_peak_r1` | SE Slopes | **N** | "North side/ridge directly above the Pinnacle-Plummer Saddle" |

Ruth Mountain is the strongest and the closest to the Little Annapurna precedent: **three
independent fields** (aspect, `face`, and a sibling row's aspect prose) all say north, against a name
of "South Slopes / Ruth Glacier".

### The name describes the APPROACH, not the climb (2)

Not data errors — but the name leads with a direction that is not the route's aspect, which is its
own defect when a climber is choosing a line.

- **`wa_mount_formidable_north_ptarmigan`** — "North Route via Ptarmigan Traverse", aspect `S`,
  `face` "South Face / South Slopes, via the Spider-Formidable col", and the peer row is
  "South Face / Southeast Ledges" (`S`). The Ptarmigan Traverse arrives from the north; the climbing
  is the south side.
- **`wa_himmelhorn_southeast_route`** — "Southeast Route", aspect `NW`, `face` "Northwest Aspect",
  peer "Wild Hair Crack" (`NW`).

### Corroborates a defect found by a different method (1)

- **`wa_chimney_rock_west_face`** — "West Face / South Summit (Standard)", aspect **`E`**, and
  **both** peers on this peak are "East Face" (`E`) and "East Face Direct" (`E`).
  The approach-variant research independently concluded this row is an **Idaho** route (Selkirk
  Crest, 48.619°N/-116.697°W) filed on Washington's Chimney Rock (47.508°N/-121.29°W), whose real
  catalog is exactly those two East Face lines. Two methods, one conclusion.
  **Recommended for removal, not auto-applied** — a `DELETE` needs a human, and this repo has already
  lost a route (Triple Couloirs) to a delete whose id was assumed.

### The route this whole sweep began with (1)

- **`wa_forbidden_peak_east_face_catscratch`** — named **"East Face / Catscratch"**, aspect `S`, and
  its own `face` reads **"Cat Scratch Gullies (south-side gullies to the West Ridge Notch)"**.
  Forbidden's peers cover the other aspects distinctly: East Ledges (`NE`), East Ridge Direct (`E`),
  North Ridge (`N`), Northeast Face (`NE`), Northwest Face (`NW`), West Ridge (`W`).

  This is the Cat Scratch Gully entrance — the feature a party could not find, which is why this
  work started. The row's own `face` and `aspect` both place it on the **south** side leading to the
  West Ridge notch, while the name says East Face. A climber trusting the name looks on the wrong
  side of the mountain for the start of the climbing.

  It is the best argument in the set for fixing names rather than filing this as cosmetic.

## Not defects, and why (removed during the run)

- `wa_colonial_peak_west_ridge` — "West Ridge / Colonial Glacier", aspect `N`. A **ridge separates
  two faces**, and the row explains itself: "final class 3 section on the north-facing upper slopes".
  Correct data; the audit was wrong.
- `wa_warrior_peak_standard` — "**Southeast Peak** Standard", aspect `NW`. The direction names which
  of two summits, per the row: "the higher of Warrior Peak's two summits, versus the lower northwest
  summit at roughly 7,285 ft".
- `wa_hozomeen_mountain_north_peak_south_ridge`, `wa_hozomeen_mountain_west_face`,
  `wa_luahna_peak_southwest_slope_southeast_ridge` — names carrying two directions, read backwards.
- `wa_colfax_peak_fords_theatre`, `wa_marvin_s_ear`, `wa_lane_peak_r3` — no direction in the name at
  all; the possessive apostrophe was matching as "south".

---

## `wa_mount_formidable_north_ptarmigan` — researched 2026-08-14: NOT a rename. Probably a DUPLICATE.

Flagged as name SE/N vs `aspect: S`. The name is indeed the travel direction again — the third
instance after Little Annapurna and Ruth Mountain — but **the repair is not a rename, and
attempting one would have made things worse.**

Published sources agree the standard line is on the SOUTH side, reached over the Spider-Formidable
col: The Mountaineers title their page *"Mount Formidable/**South Route**"*, SummitPost carries a
*"**South Face**"* route page, and the route description crosses the col then "scramble[s] down
into the basin beneath Mount Formidable's **south slopes**". So `aspect: S` and `face: "South Face
/ South Slopes, via the Spider-Formidable col"` are correct and the name is the odd one out —
the expected shape.

**But Formidable already has a `South Face` row.** Its three routes are:

| id | name | aspect | grade |
|---|---|---|---|
| `wa_mount_formidable_north_ptarmigan` | North Route via Ptarmigan Traverse | S | Alpine I-II, Class 3-4 |
| `wa_mount_formidable_south_face` | South Face / Southeast Ledges | S | Grade III, Class 4 / low 5th |
| `wa_northeast_face_direct` | Northeast Face Direct | NE | 5.6 |

Renaming the first to "South Face" would collide with the second on one peak. And the two
`overview` fields describe the same climb from different angles: the first says *"The standard,
easiest way up Formidable: approach north from Cascade Pass over the Ptarmigan Traverse to the
Spider-Formidable col, then cross to the peak's south slopes for a long, loose class 3-4
scramble"*; the second is the **1938 Ptarmigan Climbing Club first-ascent line**, which *is* that
standard route.

**Left alone deliberately, and this needs a human.** A duplicate flag is a hypothesis — the
Dragontail Peak incident destroyed Triple Couloirs on exactly this reasoning, and the two rows here
carry *different grades* (Class 3-4 vs Class 4 / low 5th), which is consistent either with two
sources grading one scramble differently or with two genuinely distinct south-side lines. Nothing
in the catalog settles which. Note also that **no existing guard can see this**: the names differ,
so `route_duplicate_names` is silent; it is a *semantic* duplicate, not a textual one.

**RESOLVED 2026-08-14 — the user decided: merge the pair, keep the South Face row.** Applied via
`audits/sql/2026-08-14-formidable-merge-duplicate.sql`. Formidable now lists two routes
(`South Face / Southeast Ledges`, `Northeast Face Direct`); `audit:aspect-name` went 9 -> 8,
routes 205,544 -> 205,543, `check:counts` clean across 47,638 areas.

**Nothing was destroyed.** The retired row is snapshotted whole in
`research-data/retired-wa_mount_formidable_north_ptarmigan-2026-08-14.json` (15,943 chars).
Dependent rows were counted first across every `public` table carrying a `route_id` —
climb_logs, contributions, crews, crew_listings, gps_submissions, hazard_votes, objectives,
topo_lines — **all zero**, so the delete orphaned nothing.

Only `bivy` was carried onto the survivor (2,081 chars of Ptarmigan Traverse camps, which the
survivor lacked entirely), copied FROM THE ROW rather than from a literal so no value could be
fabricated. **Fourteen columns that are LONGER on the retired row were deliberately not
promoted** — access, road, climate, best_season, obj_haz, bail, detailed_rack, what_to_bring,
pro_needs, commitment, face, season, rock_grade, discipline. Longer is not more correct, the
survivor carries its own value for each, and overwriting a populated field is the one direction
of this merge that can destroy good data. They are in the snapshot to be judged one at a time.

**`check:sql` refused this delete and was right to**: its twin test matches on NAME, and this
pair's whole problem was a twin named differently. Overridden deliberately, with the twin
confirmed present and the delete itself guarded on `exists(... south_face)`.
