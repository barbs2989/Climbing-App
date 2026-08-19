# Class A misdirection — all 10 rows triaged, 2 fixed

The [defect index](DATA-DEFECTS-INDEX-2026-08-19.md) listed 12 Class A rows: routes whose own text
sends a party somewhere it should not. Two were fixed earlier (`wa_liberty_bell_independence_route`,
`wa_colchuck_peak_east_ridge`). This is the remaining ten, read against the **live rows**.

## The headline is about the index, not the rows

**The index's column attributions were wrong on 4 of the 10**, and in three cases the obvious repair
would have run **backwards** — destroying the correct half:

| row | index said | the row says |
|---|---|---|
| `wa_three_queens_standard` | the `beta`'s north face is wrong | the **beta is right**; `waypoints[6]` carries **Middle Peak's** text |
| `wa_east_ridge_7` (Red Mountain) | approach misdirects | approach is **correct**; the whole row is **Lundin Peak's** route |
| `wa_huckleberry_mountain_west_route` | `rappels` is a defect | `rappels` is **correct** — the West Face really does rappel down the east side |
| `wa_sherpa_balanced_rock_standard` | wrong-side text in `waypoints` | the pins were fixed by another session; the wrong-side text is in `itinerary`, `timing` and `access` and is **still live** |

Those entries are descriptions written while reading, not citations. **Locate the offending phrase in
the live row before concluding anything.**

---

## FIXED (2)

### `wa_mount_adams_wilson_glacier_headwall` — the pin was on the wrong flank

`approach`, `descent_text` and `approach_logistics.trailhead` **all** say Cold Springs / South Climb
(5,600 ft, end of FR-8040 north of Trout Lake). The single trailhead **waypoint** said **Killen Creek**
at 46.2885, −121.5525 — the north-side trailhead reached from Randle, roughly **25 road miles and two
hours away**. A party navigating by the pin drives to the opposite side of the mountain.

The waypoint's own note admitted the guess: *"medium confidence — no source names this trailhead for
Wilson specifically"*. Three columns against one hedged pin.

Fixed by **re-homing** the Cold Springs coordinate from `wa_mount_adams_south_climb`, which already
stores it — nothing invented. The note also carried a source citation, which is gone.

### `wa_mount_hinman_hinman_glacier` — "north from La Bohn Gap"

Settled by the row's **own waypoints**, the way Colchuck was: from its La Bohn Gap pin to its own summit
pin the bearing is **71.5°**, with an east component of **1.94 km** against a north component of
**0.65 km**. The summit is never north of the gap.

"North" was not deleted, because it is not invented — the basin really is NNE of the gap, and that
describes the first move only. The text now reads **north-northeast into the basin, then
east-northeast** along the ridge.

**The variant moved with it.** The `approach_variant` written hours earlier quoted the "NORTH" sentence
as one side of a two-source disagreement. Fixing the approach alone would have left that warning
describing text that no longer exists — which invites someone to restore the error to make the warning
true. Both spans move together or neither does; the script refuses if either is missing.

---

## NEEDS YOU (8)

### Two are UNRESOLVED as posed — both halves are genuinely published

- **`wa_lincoln_peak_standard` / `_north_ridge`** — the premise is wrong. **Both** approaches are real:
  the 1956 FA went from **Heliotrope**, and modern ascents use **FR-38/Rankin Creek**. So the
  `approach`'s claim that Heliotrope *"serves Lincoln's separate NW Face line"* is false, and the
  `descent_text`'s Heliotrope exit is also wrong for the party it cites (which exited at FR-38). The
  honest repair softens the exclusivity rather than picking a side — and **both rows' variants overstate
  the split** and must move too.
  - Separately: `_north_ridge`'s *"first climbed in May 1958 (Cooper and O'Conner)"* is a
    **misattribution to Colfax Peak** — the paper is titled *East Peak, Black Butte*, and Lincoln is the
    **West** Butte. This corroborates the Class B duplicate call.
- **`wa_buckner_mountain_north_face`** — the two authorities invert each other on Boston Basin vs
  Cascade Pass. **Do not pick a side.** But three waypoints are geographically impossible regardless:
  the "Boston Glacier crossing" pin sits **1.2 km from the Cascade Pass trailhead**, at valley level on
  the wrong side of the crest, and the "bergschrund" pin is **5.5 km WSW of the summit**. No published
  coordinate exists for either, so the honest repair is **deleting waypoints 3–5**, not guessing.

### Three where the fix is a span replacement but the wording is a judgement call

- **`wa_sherpa_balanced_rock_standard`** — **the index lists this FIXED and it is not.** A parallel
  session deleted the wrong-side pins; the Icicle-side text is still live in `itinerary`, `timing`,
  `access.permit` and `access.parking_pass` (*"Leave Stuart Lake trailhead"*, *"Falls within the
  Enchantment Permit Area's Stuart Zone"*). The permit claim is independently wrong: the zone boundary
  **excludes** the climber bivouac sites below Sherpa. The itinerary's own 14 mi / 5,000 ft already
  matches the Teanaway side, so only the trailhead *name* is foreign.
  - Also: `fa` is **Sherpa Peak's West Ridge** FA, not the block's — which the row's own `overview`
    already contradicts.
- **`wa_three_queens_standard`** — `waypoints[6]` (*"South-face ledge below the summit gable"*) is
  Middle Peak's description, and **`wa_three_queens_middle_peak` already owns it verbatim** (confirmed
  in-catalog, no source needed). The `beta` is separately self-contradictory: *"traverses south/east
  onto a broad ledge system on the **north face**"*. Left alone because choosing between them changes
  what a party is told about the summit block — and its variant carries a paragraph headed *"A CONFLICT
  IN THE RECORD"* that must move with any fix.
  - Bonus, explaining the Class D entry: `gain_ft` **6,300** is lifted from a two-day 17-mile trip, not
    the 7.7-mile day. The number has a source; it is the wrong trip's.
- **`wa_south_face_12` (Argonaut)** — the row's identity is the **5.6 South Face** and its shared
  approach and descent are correct, not contamination. Only `pitch_detail[2]` is foreign: the 50-ft
  chockstone gully is the neighbouring **South Route** scramble's crux, presented as pitch 3 of the
  face. Argonaut's South Route has **no row at all** — that is a creation, not a repair.

### Three that are not misdirection at all

- **`wa_east_ridge_7` (Red Mountain)** is **Lundin Peak's East Ridge**, line for line, and the catalog
  already holds the correctly-homed twin `wa_lundin_peak_east_ridge` — same 30 m, same slab section,
  same three bolts, same rappel, same rack. Its `high_point_ft` of 5,890 is **Red Mountain's**
  elevation against Lundin's 6,057, which the twin stores. Red Mountain has its own, different East
  Ridge. **Both ids return rows**, so the Triple Couloirs precedent is satisfied — but the merge
  direction matters: this row carries the new `approach_variants` and a `rappels` string the twin
  lacks, while the twin carries `dist_km`, `high_point_ft` and `pitch_detail`.
  - Its variant contains a warning headed *"A NAMING WARNING THAT COULD SEND YOU TO ANOTHER MOUNTAIN"*
    which is **itself factually wrong** and dies with the row.
- **`wa_mount_skokomish_standard`** — **NOT a simple re-home. Attempted, then deliberately stopped.**
  The navigational half is real and confirmed by the row's own text: its `approach` says the saddle is
  at the **north-eastern** end of Skokomish, while the pin *labelled* that saddle sits **1.09 km south**
  of the summit, and the Mildred basin pin is **3.6 km south**. The trailhead pin is also stranded at
  index **5** of 7, so the list does not even start at the road.
  - **But the row is describing two trips, and the second one is deliberate.** It already carries two
    `approach_variants`, and the second is explicitly the Mildred Lakes approach, *recorded* as a
    documented alternative with an honest limit about the unmaintained ground between the lakes and
    Skokomish's south peak. `timing` and `itinerary` are then a **coherent two-day Mildred plan**
    (basecamp in the Mildred basin, climb light on day 2).
  - So replacing the waypoints alone would leave the pins saying Putvin while the itinerary and timing
    still plan a Mildred basecamp — trading one internal contradiction for a **new** one. The fix is
    either a full rewrite of `timing`/`itinerary` onto Putvin, or an explicit decision that the pins
    belong to variant 2. That is a judgement about what the row *is*, so it is left alone.
  - Two further defects found while reading: `overview` states the Mildred/Flapjack access is *"currently
    closed"* by an order tied to a **2025 fire** — a dated closure stored as permanent prose — and no
    coordinate exists anywhere for the 5,800 ft saddle the approach describes, so that pin cannot be
    created without inventing one.
  - The indexed Class C *"Lake of the Angels 1.2 km apart"* is **not settled in-catalog**: the two Stone
    rows disagree (47.5966, −123.2736 vs 47.6024, −123.2611) and **both** are "westerly" of the summit
    and both fit the stated 3.5 trail miles, so the row's own prose cannot choose between them.
- **`wa_huckleberry_mountain_west_route`** — one route, not two. The `approach`, `descent_text`, `road`
  and `overview` are the **East Ridge's**, and the row's own overview denies the Middle Fork Snoqualmie
  access that `road.driveNote` asserts. Its `rappels` field, which the index called a defect, is
  **correct**. Needs a human because the **name** (West Route → West Face) and the **grade** (Class 4 →
  **5.6**) change what a party is told to expect, and the grade is the safety-relevant one.

---

## The pattern worth carrying forward

Four of these ten rows are **one route's material sitting on another row** — Lundin on Red Mountain,
Middle Peak on Three Queens, the South Route on Argonaut, the East Ridge on Huckleberry. That is the
same root cause CLAUDE.md already records for route identity: **only ~9% of WA route ids are
peak-scoped**, so a name-shaped id like `wa_east_ridge_7` or `wa_south_face_12` says nothing about which
peak it belongs to. Every one of these collisions is between routes that share a *line name*.
