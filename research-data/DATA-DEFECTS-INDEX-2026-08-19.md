# 95 data defects, triaged — the index for six batches' worth of findings

The 2026-08-19 approach-variant sweep reported defects into a `_DEFECTS` block inside each batch
file. That is six separate blocks, and **a finding nobody can see is a finding that gets rediscovered
rather than fixed** — this repo already carries three waypoint audits and four copies of a grade
parser written by people who could not see the prior work. This is the index.

**95 entries. 4 fixed. 4 already queued for a human. The rest are classified below.**

> ## Read this first — two follow-ups correct this file
>
> **[CLASS-A-MISDIRECTION-TRIAGE-2026-08-19.md](CLASS-A-MISDIRECTION-TRIAGE-2026-08-19.md)** — all ten
> remaining Class A rows read against the live rows. **The column attributions below were wrong on 4 of
> the 10**, and in three cases the obvious repair would have run *backwards* and destroyed the correct
> half. Two more rows are fixed there (Adams' trailhead pin, Hinman's direction).
>
> **[CLASS-C-TRAILHEAD-MEASURED-2026-08-19.md](CLASS-C-TRAILHEAD-MEASURED-2026-08-19.md)** — Class C
> measured across all 8,365 WA routes rather than from what six batches happened to notice. The
> truncation is **28 rows, not 10**; the rows invisible to `audit:trailhead-agreement` are **176, not
> 14**; and the "sentence splitter" this file says to find at source **does not exist in the repo**.
>
> **The column names in the tables below are descriptions written while reading, not citations.**
> Locate the offending phrase in the live row before concluding anything.

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

**`wa_sherpa_balanced_rock_standard` — four waypoints on the wrong side of the range.**
The index recorded this as a 1-v-1 (approach says Teanaway, waypoints say Icicle), which is not
decidable from the disagreement alone. It is **2-v-1**: the row also carries a 324-point gpx
track, and that track is independent evidence — it is *not* the waypoint list joined up
(checked, because 201 of 580 WA routes store one that is, and on those the question is answered
yes by construction). The track spans 5.3 km, starts 5.3 km **south-west** of the peak in
agreement with the approach prose, and ends 70 m from the summit.

Measured off-track: Stuart Lake Trailhead **8.04 km**, Colchuck/Stuart fork 5.07, Mountaineer
Creek 4.16, Sherpa-Argonaut north basin bivy 1.58. The three near-peak pins are 0.28, 0.03 and
0.03 and were kept untouched. The bad pins lie **north-east** while the track runs south-west,
so this is not the *partial track* false positive `audit:waypoint-track` exists to separate out
(approach pins legitimately off a climb-only track, but in the same direction).

The four were **deleted, and no replacement trailhead was invented.** Re-homing one onto the
first gpx point is the obvious move and is wrong: the approach prose describes ~8 km of walking
against a 5.3 km track, so the track does not start at the trailhead. The route keeps its
trailhead named in prose and now carries no trailhead PIN — the safer state, since the crag
Overview's "Directions to crag" reads the pin first and was sending parties to the opposite side
of the Stuart Range.

`scripts/oneoff/fix-sherpa-balanced-rock-wrong-side-waypoints.mjs`, asserted against the measured
row and verified on re-read. Every remaining pin is now on the track.

---

## CLASS A — MISDIRECTION: the row sends you somewhere it should not (11 left of 12)

**All 11 measured 2026-08-19 against a third record — `scripts/oneoff/measure-class-a-misdirection-rows.mjs`.**
Each was recorded here as a 1-v-1 (prose says one place, waypoints say another), and a 1-v-1 is
*not decidable from the disagreement*. The Sherpa row above was settled because it carried an
independent gpx track. So the first question for each is whether a third record exists at all:

| row | third record | verdict |
|---|---|---|
| `wa_primus_peak_south_ridge` | gpx 198 pts, 12.2 km, independent | **0 of 2 pins off-track** — no pin defect |
| `wa_mount_hinman_hinman_glacier` | gpx 539 pts, 11.9 km, independent | **0 of 6 off-track** — no pin defect |
| `wa_buckner_mountain_north_face` | gpx 261 pts, 6.1 km, independent | 1 of 7 off, and it is the **Sahale-Boston col at 0.85 km** — a real feature just past the tolerance, not misdirection |
| `wa_three_queens_standard` | gpx 808 pts, 4.1 km, independent | 1 of 8 off (Mineral Creek log crossing, 0.50 km — on the threshold). No other pin defect. |
| `wa_south_face_12` (Argonaut) | gpx 221 pts, 9.1 km, independent | **0 of 7 off** — no pin defect |
| `wa_huckleberry_mountain_west_route` | gpx 370 pts, independent | measured in full below — **needs a survey, not a fix** |
| `wa_lincoln_peak_north_ridge` | gpx 8 pts | **COPY of its own waypoints** — unusable as evidence |
| `wa_colchuck_peak_east_ridge` | gpx 3 pts | **COPY of its own waypoints** — unusable as evidence |
| `wa_lincoln_peak_standard` | none | no third record — needs a human read |
| `wa_mount_skokomish_standard` | none | no third record — needs a human read |
| `wa_east_ridge_7` (Red Mountain) | none | no third record; also has **no trailhead in either store** |
| `wa_south_gully_south_spur` (Guye) | none | no third record — needs a human read |

Two things worth carrying from that table. **Five of the eleven turn out to have no pin defect
at all** once measured, so the CLASS A count overstates the pin work. And **two rows store a gpx
that is merely their own waypoints joined up** — on those, "is the pin on the track" is answered
yes by construction, so a future pass must not read their agreement as corroboration.


### CORRECTION — the "track never approaches its peak" claim above was WRONG

The first version of this table said `wa_three_queens_standard` and `wa_south_face_12` store a
track that never comes within 4 km and 9 km of its own peak, and filed that as a separate
`trackOffItsPeak` question. **That was measured from the track's FIRST and LAST point only.**

Both tracks start and end at nearly the same coordinate — 12 m and 71 m apart. They are
**out-and-backs**, so the endpoints are the trailhead twice and the summit sits in the MIDDLE.
Endpoint distance says nothing about whether a track reaches its peak. Measured properly, over
every point:

| route | first→peak | last→peak | **closest approach** |
|---|---|---|---|
| `wa_south_face_12` | 9.08 km | 9.02 km | **5 m** (55% along) |
| `wa_three_queens_standard` | 4.00 km | 4.01 km | **3 m** (51% along) |
| `wa_huckleberry_mountain_west_route` | 2.84 km | 0.40 km | **7 m** (70% along) |

All three reach their own summit. There is no `trackOffItsPeak` finding on any of them, and the
extent figures in the table above are max pairwise distance, which for an out-and-back is
roughly the one-way length — not a distance from the peak.

`audit:waypoints`' own `trackOffItsPeak` test already uses the minimum over all points, which is
why it never flagged these. The mistake was mine, in a one-off that sampled endpoints because
that was cheap. **A track's relationship to a summit is a minimum, never an endpoint** —
`scripts/oneoff/measure-track-closest-approach.mjs` measures it correctly and exists so this
particular shortcut is not taken again.
### `wa_huckleberry_mountain_west_route` — measured, and deliberately NOT repaired

This is the one that looked most like Sherpa (3 of 4 pins >500 m off its track) and is not the
same shape at all. Bearings from the summit:

```
gpx    0%   2.84 km SW      waypoints  Trailhead (PCT, Snoqualmie)  7.89 km SW
gpx   30%   0.86 km SW                 Joe Lake                     6.61 km SW
gpx   70%   0.01 km (summit)           "West Face Talus Basin"      5.17 km  S  (198 deg)
gpx  100%   0.40 km  E                 Summit                       0.05 km
```

The track approaches from the **south-west**, crosses the summit, and **ends 0.40 km east** of it.
The approach prose says you arrive "roughly due **east** of the summit"; `climbing_route` labels
the technical section "**East** Ridge/East Face"; the row's name is "**West** Route" and its
aspect is **W**; and the pin named "West Face Talus Basin" actually lies **south** (198 deg).

So this is not 2-v-1 — it is at least four records disagreeing, and the two trailhead-side pins
are off-track only because the track covers the last 2.8 km of a 9-10 mile approach, which is
the **PARTIAL** case `audit:waypoint-track` exists to separate out and is *not* a defect.

Nothing was written. The name-vs-aspect half is precisely why `audit:aspect-name` is permanently
report-only: the first repair of that shape (Little Annapurna) was backwards, and applying it
would have turned a shady north slog sunny. This row needs a survey against an external source,
not a decision from its own columns.


The same shape as the fixed one. Each needs a read before writing, because the *correct* half varies.

| row | the contradiction |
|---|---|
| `wa_lincoln_peak_standard` / `_north_ridge` | approach uses FR-38/Rankin Creek and warns off Heliotrope; its own `descent_text` walks out to Heliotrope. The sibling mirrors the error the other way. |
| `wa_mount_skokomish_standard` | prose says the on-file Mildred Lakes trailhead is wrong — **its waypoints still walk it step by step** |
| `wa_buckner_mountain_north_face` | prose is explicit it starts at Boston Basin; waypoints describe the Cascade Pass trailhead |
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

1. **Class A is done being triaged** — see the follow-up above. Four rows are now fixed; two are
   genuinely **unresolved** because both approaches are published (Lincoln, Buckner); the rest need a
   decision rather than more research. Four of the ten turned out to be one route's material sitting on
   another row, which is the route-identity problem CLAUDE.md already records.
2. **Class B needs you.** Deletes and merges, and the Triple Couloirs precedent says confirm both ids
   return rows before deleting either half.
3. **Class C's truncation has no source to find** — measured at 28 rows in two classes needing
   opposite treatment, and nothing in the repo writes the field. The 176-row blind spot in
   `audit:trailhead-agreement` is the more valuable half of that finding.
4. **Class D must not be swept** — `dist_km` holds two conventions catalog-wide.
