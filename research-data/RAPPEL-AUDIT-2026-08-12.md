# Rappel data audit — Washington alpine routes

**Read-only. No DB changes were made.**

Date: 2026-08-12
Scripts (read-only, left in the worktree):
`scripts/oneoff/rappel-audit-fetch.mjs`, `scripts/oneoff/rappel-audit-analyze.mjs`, `scripts/oneoff/rappel-audit-counts.mjs`

## Scope examined

| population | count |
|---|---|
| WA routes carrying any of `rappels` / `rappel_detail` / `rappel_count_note` / `descent_text` | 1,024 |
| …of which carry actual **rappel** data (not descent prose alone) | 740 |
| …in scope for this audit (`alpine` / `mountaineering` / `ice` / `mixed`) | **450** |
| …of those carrying a station-by-station `rappel_detail` array | **142** |

Every row returned by the query was WA — the four rappel columns are populated nowhere else in the catalog.
`rappel_detail` is an array on all 151 rows that have it (no string/object shape drift; the
[two-JS-shapes](routes-columns-holding-two-js-shapes) trap does not apply to this column).

## Findings by category

Counts are *flags raised* → *judged real defects after review*.

| # | Category | Flagged | Real | False-positive cause |
|---|---|---|---|---|
| 1 | Count mismatch | 63 routes | **2** | prose describes multi-segment or alternative descents that legitimately sum differently |
| 2 | Length implausibility | 6 routes (20 stations) | **4** | two-rope descents flagged against a single-rope mention elsewhere in the row |
| 3 | Anchor contradiction | 6 | **1** | 5 were regex artifacts — negated phrases ("there is **no** bolted rappel line") and `\bbolt\b` failing to match "bolts" |
| 4 | Descent-line mismatch | 15 | **0** | `rappel_detail` names sub-features (gully, notch, side) the summary prose doesn't repeat |
| 5 | Prose about another peak | 75 | **0 undisclosed** | neighbouring peaks are legitimately named in traverse and walk-out prose; 2 rows disclose borrowed beta in their own text |

---

## Category 2 — Length implausibility (most severe)

### 🔴 1. `wa_ellation` — Ellation, Mamie Peak — **VERIFIED WRONG against published sources**

`rappel_detail` stores **`lengthM: 70` on all 8 stations**. The route's own prose contradicts this twice:

- `rappels`: *"~6-8 raps down the route with a single 70m rope … several raps approach **the rope's full 35m reach** so tie stopper knots"*
- `rappel_count_note`: *"approximated at the stated **single 70m rope capacity**"* — this is the bug's own confession. A single 70 m rope **doubled** gives **35 m** of rappel, not 70 m. The enricher wrote the rope length into the rappel-length field.

Independent arithmetic agrees: 8 × 70 m = **560 m of rappel down a 244 m (8-pitch, ~700 ft) route** — 2.3×.

**Verified externally.** Mountain Project / Steph Abegg's route page for Ellation states the route "is easily and quickly rapped with a single 70 m rope" and warns "several rappels are near the **full 35 m**, tie backup knots!" — the 35 m figure the route's own `rappels` field already carries.

**Judgement: real defect, and the most dangerous one in the set.** A climber reading a 70 m rappel length while carrying the single 70 m rope the same row recommends would rappel off the end of the rope. Every `lengthM` here is exactly 2× reality; the correct value is ~35 m (or `null`, since the source does not break out per-station distances — which `rappel_count_note` admits).

### 🔴 2. `wa_overcoat_peak_southeast_route` — Southeast Route, Overcoat Peak — **same 2× error, internally contradicted**

`rappel_detail` stores `lengthM: 60` on both stations. Contradicted inside the same row:

- `rappels`: *"2 rappels **on a 60m rope**"*
- `descent_text`: *"build two rappels (roughly full **30m**/60m-rope-length pitches) down the dihedral"* — the prose gets it right: a 60 m rope doubled is a 30 m rappel.
- the detail's own note says *"a single 60m rope handles both"*, which is only true at 30 m.

**Judgement: real defect.** Both `lengthM` values should be **30**, not 60. Same failure mode as Ellation — rope length written as rappel length. Not verified against an external source (SummitPost returned 403), but the contradiction is closed inside the row: `descent_text` states the correct number.

### 🟠 3. `wa_west_face_2` — West Face, North Gunsight Peak — **the defect is in `descent_text`, not the table**

- `rappels`: *"4 double-rope rappels (~50m, 50m, 50m, 20m)"*
- `rappel_detail`: 50 / 50 / 50 / 20 m — matches
- `descent_text`: *"four consecutive double-rope rappels of **approximately 30 meters each**"* — 4 × 30 = 120 m, which does not reach the base of a 183 m (600 ft) route.

**Verified externally.** Steph Abegg's North Gunsight West Face trip report gives the descent as four double-rope rappels of **~50 m, ~50 m, ~50 m, ~20 m**, on **tat, flakes and horns** with parties building their own anchors.

So `rappel_detail` and `rappels` are **correct** and `descent_text` is wrong on two points:
1. "approximately 30 meters each" — should be ~50/50/50/20.
2. *"using natural anchor features and existing **bolt**/gear anchors established on the granite"* — the source and every `rappel_detail` entry say tat/flake/horn, with **no bolts**. (This is also the one real hit in category 3.)

**Judgement: real defect, in `descent_text`.** Worth noting because the reflex is to trust the narrative over the table; here the table is right. A systematic sweep for this exact pattern (prose stating a per-rappel length that matches no entry in the table) across all 142 detailed routes returned **this row and no other**.

### 🟡 4. `wa_tooth_and_claw` — Tooth and Claw, Lexington Tower — fabricated precision, not impossible

Six stations all at `lengthM: 70`. With the two 70 m ropes the prose recommends, a 70 m rappel is physically fine — but 6 × 70 = **420 m down a 244 m (8-pitch) route**, 1.7×. `rappel_count_note` again admits the numbers were invented: *"exact length not documented, **approximated at full double-rope capacity**"*.

Confirmed externally that the top bolted anchor ~20–30 ft above the old P6 slung-block anchor is real and that 70 m ropes are what reach it — the anchors are right, the **lengths** are placeholders.

**Judgement: real but lower severity.** Not a rope-off-the-end hazard the way Ellation is; it overstates the descent. Same root cause as #1 and #2 — rope *capacity* substituted for rappel *length* whenever the source didn't break out distances.

### ⚪ Not defects (checked and cleared)

- `wa_mount_rainier_kautz_glacier` — 45 m V-thread rappels flagged against a "single 60 m rope" mention. The row explicitly says *"fewer with two ropes"*; 45 m is fine on two ropes. Mild wording tension only, since `rappel_count_note` frames 4 as representative "for a party on a single 60 m rope" while listing two 45 m stations.
- `wa_chair_peak_northeast_buttress` — 60 m station flagged; `descent_text` explicitly says *"a full 60m (two ropes, or a single 60m…)"*. Correct as stored.
- `wa_sharkfin_tower_southeast_ridge` — 145 m of rappel against a 61 m route length. The descent continues down the couloir to the Quien Sabe Glacier, well below the route base, so route height is the wrong denominator. Correct as stored, and unusually well sourced.
- `wa_gunrunner`, `wa_the_devils_club` — 55 m stations against `rope_length_m: 60`; both describe double-rope descents. Legitimate.
- `wa_pernod_spire_standard` — one 65 m station; plausible on two 70 m ropes. Low confidence either way, not worth acting on.

---

## Category 1 — Count mismatch

63 of the 142 detailed routes state a number somewhere in prose that differs from `rappel_detail.length`. **Almost all are legitimate** and the prose usually explains itself in the same sentence — the corpus is unusually careful about this, with `rappel_count_note` frequently naming the source and the reason for the spread (`wa_j_tnar`, `wa_johannesburg_mountain_northeast_buttress`, `wa_sherpa_peak_west_ridge`, `wa_american_border_peak_southeast_face` are all correct as stored). Per the standing rule, none of these should be forced to agree.

Two are real:

### 🟠 5. `wa_cutthroat_south_buttress` — the summary field describes the *other* descent

- `rappels` (the short, prominent field): *"Single 60m rope; roughly **10-12 rappels** down the buttress, generally following the line of ascent"*
- `rappel_count_note`, `descent_text` and `rappel_detail` all describe the **West Ridge** descent — **4** bolted chain rappels (ASCA rebolted 2010) — as the standard, and relegate the 12+ rappel South Buttress reversal to "an alternative … takes considerably longer".

**Verified externally.** Published beta confirms both descents exist ("either down the west ridge via several rappels and a lot of downclimbing, or via **more than a dozen rappels** back down the South Buttress"). Neither number is wrong.

**Judgement: real defect, but of labelling, not fact.** `rappels` was left describing the non-standard descent when the rest of the row was corrected to the standard one, so the compact field a climber reads first says 10–12 while the station table beside it shows 4. Fix is to rewrite `rappels` to lead with the standard 4-rappel West Ridge line and mention the buttress reversal as the alternative — not to change any number.

### 🟡 6. `wa_news_nw_corner` — NW Corner, North Early Winters Spire — 4 vs 6 bolted stations, same line

- `rappels` and `rappel_count_note` both say the bolted West Face line has **"four bolted stations plus a tree rappel"**, citing Mountain Project verbatim: *"There is four fairly new bolted rap stations and a tree rappel for the last section."*
- `descent_text`, describing the **same** line, says *"**Six** bolted (2-bolt) rappel stations in a nearly direct line."*

Separately, `rappels` says *"~5 **single-rope** rappels by either line"* while `rappel_detail` #4 is described as a *"largely free-hanging **double-rope** rappel"*.

**Judgement: real internal contradiction.** This is not rope-configuration variation — it is one field saying four and another saying six about one named descent line. `rappel_detail` itself encodes the *classic* line (3 raps to the notch + chockstone + tree), while `descent_text` leads with the *bolted* line; the row never settles which one the table represents. Internal-consistency flag only, not externally verified.

---

## Category 3 — Anchor contradictions

Six flagged, **five were my own regex artifacts** and are recorded here so they are not re-raised:

- `wa_crooked_thumb_peak_south_route`, `wa_northwest_arete`, `wa_the_devils_club` — all three say *"there is **no** bolted rappel line"*; the detector matched the phrase inside its own negation. All three are correct and consistent as stored.
- `wa_liberty_bell_beckey_route` — `\bbolt(?:ed)?\b` failed on the plural "two **bolts** on solid rock". Consistent as stored.
- `wa_early_winter_couloir` — flagged as "detail says bolted, prose says no fixed anchors". The prose says *"no fixed anchors **in the couloir itself**"*; the bolted stations are on the West Face descent line. Correct, and one of the better-curated rows in the catalog (it records the May 2025 fatal accident caused by improvising anchors in the couloir).

The one real hit is the `descent_text` bolt claim on **`wa_west_face_2`**, folded into finding #3 above.

---

## Category 4 — Descent-line mismatch

15 flagged, **0 real defects.** In every case `rappel_detail` names a finer-grained feature than the summary prose repeats — "east gully" inside a route whose descent prose says "East Ridge", "north side" inside "north face", "south couloir/southwest couloir" on Mount Goode where the descent genuinely crosses both. `wa_mount_torment_torment_forbidden_traverse` flags because the detail describes Forbidden's West Ridge, which its `descent_text` opens by explaining: *"The traverse finishes by descending Forbidden Peak, not Torment."* Correct and self-documenting.

No route was found whose `rappel_detail` describes a descent the prose does not name, and no walk-off route was found carrying rappel stations.

---

## Category 5 — Prose about another peak

75 rows mention another WA peak by full name inside their rappel or descent prose. **None is an undisclosed contamination.** Alpine descents routinely walk out over neighbours (`wa_austera_peak` crossing Klawatti's north ridge, `wa_ghost_peak_south_route` beside Phantom Peak, the whole Pickets and Wine Spires sets), and the Washington Pass traverses name every tower they cross by design.

Two are worth reading rather than fixing:

- **`wa_south_ridge` (South Peak, Big Kangaroo area)** — `rappel_count_note` states plainly that its count of 3 is *inferred from the route's 3-pitch length* and *"corroborated by beta for the **similarly-named South Peak formation at Big Kangaroo**"*, with per-rappel lengths "estimated". So a structured `rappel_detail` (30/30/25 m) is carrying invented numbers partly justified by a **different formation's** beta — exactly the name-collision fingerprint, but disclosed in the row rather than hidden. It also contradicts `descent`, which says *"Doubled **50m** ropes recommended"* → 25 m maximum, against two 30 m entries. Low severity because the disclosure is honest; worth downgrading to `null` lengths rather than correcting them.
- **`wa_chimney_rock_west_face`** — the prose already records that a previous value *"appears misattributed from an unrelated, same-named Chimney Rock crag in North Idaho"* and has been dropped. Already repaired.

Similarly `wa_argonaut_peak_east_ridge` documents that its old `rappels` metadata (`'4 raps to 30m'`) had been conflated with the Northeast Couloir descent and has been corrected to 2. Already repaired — no action.

---

## Ranked summary

| rank | route | category | severity | verified? |
|---|---|---|---|---|
| 1 | `wa_ellation` | length 2× | 🔴 rope-off-the-end hazard: 70 m stored where the route's own text says 35 m | **yes** — published route beta |
| 2 | `wa_overcoat_peak_southeast_route` | length 2× | 🔴 same failure; 60 m stored where its own `descent_text` says 30 m | internal only (source 403'd) |
| 3 | `wa_west_face_2` | length + anchor | 🟠 `descent_text` wrong on both rappel length and anchor type; the table is right | **yes** — published trip report |
| 4 | `wa_tooth_and_claw` | length | 🟡 6 × 70 m down a 244 m route; lengths are declared placeholders | partially |
| 5 | `wa_cutthroat_south_buttress` | count | 🟠 `rappels` describes the non-standard descent; 10–12 beside a table of 4 | **yes** — both descents confirmed |
| 6 | `wa_news_nw_corner` | count / anchor | 🟡 4 vs 6 bolted stations on one named line, in the same row | internal only |
| 7 | `wa_south_ridge` | fabricated + borrowed | 🟡 estimated lengths partly justified by another formation's beta; contradicts its own rope note | internal only |

**The dominant failure mode is one thing, and it recurs:** where the source did not publish per-station distances, the enricher wrote **rope capacity into `lengthM`** rather than leaving it null — and for a single rope that is exactly 2× the true rappel. Three of the top four findings are that error. `rappel_count_note` says so out loud on `wa_ellation`, `wa_tooth_and_claw` and `wa_south_ridge` ("approximated at the stated single 70m rope capacity", "approximated at full double-rope capacity", "estimated as roughly one pitch each"), so the rows are findable: any `rappel_detail` whose count note contains *approximated* or *estimated* is carrying invented lengths, and a `null` would be safer than a number a climber can rappel off the end of.

Everything else the audit touched is in good shape. Count variation across 63 routes is nearly all real rope-and-season variation, correctly refused a forced reconciliation; descent lines and anchor descriptions agree with their prose; and no route was found wearing another peak's descent.
