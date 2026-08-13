# Name vs aspect: 12 disagreements, and the `face` column decides most of them

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
