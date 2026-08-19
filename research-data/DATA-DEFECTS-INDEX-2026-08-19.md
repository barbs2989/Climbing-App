# 95 data defects, triaged — the index for six batches' worth of findings

The 2026-08-19 approach-variant sweep reported defects into a `_DEFECTS` block inside each batch
file. That is six separate blocks, and **a finding nobody can see is a finding that gets rediscovered
rather than fixed** — this repo already carries three waypoint audits and four copies of a grade
parser written by people who could not see the prior work. This is the index.

**95 entries. 1 fixed. 4 already queued for a human. The rest are classified below.**

Extracted from: `approach-variants-{baker,cascade-pass,olympics,pickets-wapass,snoqualmie,stuart}-2026-08-19.json`.

---

## FIXED

**`wa_liberty_bell_independence_route` — the approach described the wrong side of the mountain.**
The row is `aspect E` and is an East Face line (the 1966 FA took the overhanging northeast corner; it
joins Thin Red Line at M&M Ledge). Its approach read *"Same as the Beckey Route: Blue Lake Trailhead
… 4th-class ledges across the West Face"* — and the Beckey Route is the **southwest** face. It sent a
party to a trailhead on the opposite side of the peak, ~2.5 road miles away over Washington Pass.

Repaired by **re-homing** the East Face approach from `wa_liberty_bell_east_face` plus this route's
own researched start position; the Blue Lake distance and gain figures were **dropped, not
converted**, because they measure the other side. Verified on re-read.

---

## CLASS A — MISDIRECTION: the row sends you somewhere it should not (12)

The same shape as the fixed one. Each needs a read before writing, because the *correct* half varies.

| row | the contradiction |
|---|---|
| `wa_lincoln_peak_standard` / `_north_ridge` | approach uses FR-38/Rankin Creek and warns off Heliotrope; its own `descent_text` walks out to Heliotrope. The sibling mirrors the error the other way. |
| `wa_mount_skokomish_standard` | prose says the on-file Mildred Lakes trailhead is wrong — **its waypoints still walk it step by step** |
| `wa_buckner_mountain_north_face` | prose is explicit it starts at Boston Basin; waypoints describe the Cascade Pass trailhead |
| `wa_sherpa_balanced_rock_standard` | approach is the Teanaway side (Longs Pass/Esmeralda); waypoints are the Icicle side (Stuart Lake) — **opposite sides of the range** |
| `wa_three_queens_standard` | approach is a south-face Mineral Creek line; beta ascends from Park Lake to the Main-Middle notch |
| `wa_primus_peak_south_ridge` | approach is the Eldorado ice-cap traverse; beta is the Thunder Creek side |
| `wa_colchuck_peak_east_ridge` | "traverse northeast to the east ridge base" — the peak lies **south-west** of the lake |
| `wa_east_ridge_7` (Red Mountain) | text names the Lundin/East Lundin saddle; the approach given runs to Red Pass then west |
| `wa_mount_hinman_hinman_glacier` | text says north from La Bohn Gap; the Mountaineers say east from La Bohn Lakes |
| `wa_huckleberry_mountain_west_route` | West aspect + West Face FA + an **east**-ridge approach + east-face rappels |
| `wa_south_face_12` (Argonaut) | approach is the south-side scramble; beta is a 3-pitch 5.6 rock climb |
| `wa_south_gully_south_spur` (Guye) | summer rock scramble and winter snow/mixed climb stored as one row, with a trailhead disagreement |

## CLASS B — PHANTOM ROWS AND DUPLICATES: need a human (15)

Deletes and merges only. **The Triple Couloirs precedent**: a route was destroyed by a delete whose
"duplicate" twin did not exist.

**Suspected phantoms** — a row for something that is not a route: `wa_mount_stuart_north_face` (its
own beta says MP/SummitPost/Beckey have no such route), `wa_south_ridge_4` (Eldorado — only guide
marketing carries the name), `wa_bears_breast_mountain_se_mega_slab` (a formation),
`wa_american_border_peak_northeast_face` (a placeholder: name, aspect, season, high point, nothing
else), `wa_chimney_rock_west_face` (**an Idaho route**, removal SQL already written and awaiting you).

**Duplicate pairs** — `wa_sherpa_balanced_rock_north_ridge` ≡ `wa_sherpa_peak_north_ridge` (same FA
party, date, pitch count) · `wa_stanley_burgner` ≡ `wa_prusik_peak_south_face_burgner_stanley` ·
`wa_the_direct_north_ridge_w_gendarme` ≡ `wa_mount_stuart_north_ridge` · `wa_lincoln_peak_wilkes_booth`
≡ `wa_lincoln_peak_north_ridge` (identical FA party **and** date) · `wa_ruth_icy_traverse` ≡
`wa_icy_peak_ruth_icy_traverse` · `wa_north_twin_sister_west_ridge` ≡ `_scramble` ·
`wa_mount_stone_lake_of_angels` ≡ `wa_mount_stone_putvin` · the three Austera rows ·
`wa_ottohorn_west_ridge` ≡ `wa_ottohorn_southeast_route` · `wa_poltergeist_pinnacle` ≡
`wa_poltergeist_pinnacle_north_route`.

Already queued separately: **Formidable** and **Pinnacle Peak**.

## CLASS C — COORDINATES AND TRAILHEAD RECORDS (24)

- **Truncated `trailheadDirection`** — 8 rows in Baker, 2 in the Olympics, every one cut at `Mt.` or
  `elev.`. **A sentence splitter breaking on abbreviations.** The original text is not recoverable
  from the row, so this needs re-sourcing, not repair.
- **14 rows carry a trailhead NAME with no coordinate** — which is precisely why
  `audit:trailhead-agreement` cannot see any of them. A coverage hole in an existing audit.
- Wrong or shared coordinates: `wa_frenzel_spitz` area ~2 km east of the peak · `wa_swiss_peak` has
  **null lat/lng** · Burgundy and Chianti Spires ~20 m apart · both Sefrit Ruth Creek routes carry
  **Hannegan Pass's** coordinate · `wa_liberty_bell_thin_red_line` ~1.5 km from every sibling ·
  Lake of the Angels stored 1.2 km apart on two rows · Lake Constance 2.5 km apart on three ·
  Anderson's two rows disagree · `wa_south_ridge_3` stores **lat/lng as quoted strings** with escaped
  quotes in the name.
- Waypoints that are not places: `wa_dorado_needle_east_ridge`'s first waypoint is a *recommendation*
  about a coordinate; `wa_blood_sport`'s "Topout" uses the summit coordinate 1,768 ft above a route
  that explicitly does not top out.

## CLASS D — NUMBERS THAT CONTRADICT THEIR OWN ROW (11)

**Do not bulk-normalise `dist_km`** — CLAUDE.md records that it holds two conventions and a blanket
transform breaks as many rows as it fixes. These are individually contradicted by their own prose:

`wa_mount_barnes_scramble` 85.3 km against a 26-mile round trip · `wa_chikamin_peak_southeast_slopes`
38.6 km against 13.5 miles one way · `wa_alta_mountain_scramble` 6.9 km against 6+ miles to the saddle
alone · `wa_big_snow_mountain_north_slope_dingford_route` 9.7 km omitting a road walk ·
`wa_three_queens_standard` 6,300 ft of gain to a 6,693 ft summit from a 2,400 ft trailhead.

Summit heights disagreeing between sibling rows: Little Sister (6,536 vs 6,600), Goat Mountain
(6,721 vs its own prose's 6,892), Herman (6,240 vs 6,285), Eldorado (**three values in one area**),
Mount Washington (5 ft), plus two rows with no `high_point_ft` at all.

## CLASS E — NAMES AND ASPECTS (9)

Mostly already researched in `ASPECT-NAME-RESOLUTIONS-2026-08-14.md`. New here:
`wa_pernod_spire_standard` stores `aspect N` against a **west**-face approach and an east-side rappel
descent · `wa_mount_terror_southeast_face` is *named* "East Ridge" · `wa_cutthroat_peak_northeast_face`
is *named* "East Face" · `wa_ruth_mountain_south_slopes` keeps `south_slopes` in its **id** after the
name was corrected to "North Face / Ruth Glacier" — an id-based grep is still told the wrong
direction.

## CLASS F — ABSENT FROM THE CATALOG, recorded so nobody reads it as an omission (6)

**Church Mountain** (a real Mt Baker Highway peak with a lookout) has no row at all. Neither do
**Ripsaw Ridge** or **The Triplets** in the North Cascades — the only matches are a Colorado ridge and
a Spokane crag 300 km away. Nor the Olympic **Sawtooth Ridge** or **Lost Peak**. Canadian Border Peak
is correctly absent: it is in British Columbia.

---

## What to do with this

1. **Class A is the one that matters to a climber today** — twelve rows that will send a party the
   wrong way. Each needs the row read before anything is written, because which half is wrong varies.
2. **Class B needs you.** Deletes and merges, and the Triple Couloirs precedent says confirm both ids
   return rows before deleting either half.
3. **Class C's truncation bug is worth finding at source** — 10 rows cut at an abbreviation is a
   splitter, and it will do it again on the next import.
4. **Class D must not be swept** — `dist_km` holds two conventions catalog-wide.
