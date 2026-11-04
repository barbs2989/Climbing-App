# Route-page contradiction audit — outside Washington (2026-10-30)

**Ask (owner's note):** every piece of information on a route must agree with every other piece; where two
disagree, settle it with at least two reliable outside sources and make the route consistent.
Washington was done 2026-09-24 → 10-02 (`audits/route-tab-contradictions/`, `wa-contradictions-*`,
`route-leftovers/`). This folder is everything else: other US states and Canada.

## Scope — every out-of-state route with two or more fields that can disagree
| Phase | Rows | Selected by | Readers |
|---|---|---|---|
| 1 (`./`) | **150** | any of `timing`, `itinerary`, `waypoints`, `approach_variants`, `climbing_route`, `seasonal_guidance`, `pitch_detail` | full route-page reader (`reader-instructions.md`) |
| 2 (`p2/`) | **3,208** | none of the above, but `approach` and/or `descent`/`descent_text` beside the overview and stats | `reader2-instructions.md` (prose vs grade, pitches, length, rope, rappels, season, aspect, area elevation) |

Every one of the 3,358 rows was read (coverage checked by id). Out-of-state rows with only an `overview`
(one prose field against the stats) were already checked catalog-wide for length and pitch count by
`audit:prose-length` (2026-10-24) and for lead grade by `audit:partner-grade`.

## Results
| | Phase 1 | Phase 2 |
|---|---|---|
| Contradictions found by readers | 45 | 94 |
| Fixed, 2+ agreeing sources | 17 | 20 |
| Fixed, row's own fields + 1 source | 5 | 19 |
| Not actually a contradiction | 18 | 28 |
| **Still open** (`unresolved.txt`) | 0 | 18 |
| Patches applied live | 26 on 17 routes | 44 on 37 routes |

**70 patches on 54 routes**, each compare-and-set against the live row, paced ≥1.2 s, re-read after
writing; rollback values in `applied/` and `p2/applied/`. `verify-live.mjs` re-read all 66 patched
columns at the end: all hold.

## What kept turning up
- **A header number nobody could have meant**: `pitches` 1 on Mount Waddington's Kiwi Route, Sir Donald's NW
  Ridge, Slipstream, Squashed Bones, Gannett's NE Ridge; `length_m` 1, 4, 5 or 12 m on 300-ft-plus lines;
  `length_m` 2,134 (= 7,000 ft, a peak elevation) on three Teton/Wind River routes. Where sources agree on the
  right figure it was written; where they prove the stored one false but disagree on the true one, the
  column was **blanked** — the page then omits the tile instead of stating a wrong number.
- **Text copied from a different route of the same name**: Cutthroat (Arkansas sport) and Cutthroat Trout
  (Arizona) carried a Washington alpine ridge's `beta` (Rainy Pass). Removed. A catalog-wide search for
  Washington place names in out-of-state beta/approach/descent found no other case.
- Prose pitch counts and per-pitch lengths that disagreed with the stats (Crescent Spire, Almost
  Overhanging, Edge of the World, Too Cold to Fire's metres-for-feet).
- Safety text: Owen-Spalding's gear said a 60 m rope cannot make the Upper Saddle rappel while its descent
  said it can; now both say it only just reaches, trending right, with the 70 m still recommended.

## Decisions made on the owner's behalf (pre-approved 2026-10-28)
- **Blank a provably false header value** rather than leave it or guess (Mountain Project and theCrag show no
  pitch count when unknown; a missing tile misleads nobody, "1 pitch" on a 1,000 m face does).
- **Keep the higher grade** protects a PUBLISHED grade. The Fourteen (Lowers, GA) is the exception that proves it: its
  `aid_grade` A1 appears in no source, while both listings and the row's own grade say A0. So it was set to A0
  under the owner's one-source rule for leftovers (2026-10-01).
- First-ascent contradictions are out of scope (owner, 2026-10-30).
- The Prow (Peyto Tower) stays 5.9: the 5.10b is one climber's pitch note, not a published grade.

## Still open (18, phase 2) — `p2/unresolved.txt`
Single-source routes where the route's only page contradicts itself (Station D North Buttress, Guillotine,
Spyin' n Flyin', 29 Fingers' per-pitch metres, La Ruée vers l'Or) or sources split (Athabasca North Face
var., Illusion Traverse au cheval end, Green Thunder's 3rd-class length). A guidebook settles them; do not
pick a side from the one page again.

## How it works (`scripts/oneoff/oos-contradictions/`)
`snapshot.mjs` / `snapshot2.mjs` (one SQL id pick, then paced reads; never `count=exact` on `routes`) →
`detect.mjs` → `dossiers.mjs` / `dossiers2.mjs` → reader agents → `mkresearch.mjs` / `mkresearch2.mjs` →
research agents (`research-instructions.md`, incl. its "Additional rules") → `go.sh rNNN` (`SUB=p2` for
phase 2; `extract.mjs` keeps only sourced fixes, `apply.mjs` compare-and-sets and re-reads) → `mkretry.mjs`
for a second pass over the unresolved → `verify-live.mjs`. Run from the repo root (the SQL step needs the
linked `supabase/.temp`).
