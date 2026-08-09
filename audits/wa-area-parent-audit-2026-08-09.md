# WA area-parent audit — 2026-08-09

Triggered by: *"liberty bell group needs an audit, south early winter spires and north
early winter spires aren't in the group. Look for all parent mistakes in wa."*

Both reported peaks were indeed outside the group, and so was a third. The same defect is
live on five more grouping areas. `0106` fixes the three at Washington Pass; the rest is
below, with the reasoning for why each was or was not actioned.

Reproduce with `npm run audit:area-parents`. Baseline as of this audit:
**2,532 WA areas — D1 41 stray peaks across 9 groups, D2 4 hollow stubs, D3 0 path breaks.**

---

## The mechanism

Two loads that were never joined:

- an **OpenBeta-derived crag tree** supplied the *grouping* rows (Liberty Bell Group,
  Kangaroo Ridge, Silver Star and Wine spires, Northern/Southern Pickets) plus hollow
  `crag` stubs for a handful of formations;
- a separate **alpine peak list** attached every real summit **flat** to the region above.

Nothing matched the two, so each group kept its stubs and none of its peaks. The
fingerprint is a 0-route stub sitting metres from a populated peak of the same name.

This is why no existing guard could see it. `check:counts` verifies `route_count` against
the subtree an area **has** — it is exactly correct about a wrong tree. The ltree paths
were self-consistent (D3 found 0 breaks across all 2,532 rows). Neither asks whether the
subtree itself is right.

---

## FIXED in `0106` (Washington Pass)

Sorted by latitude, the Liberty Bell Group is one ridge over ~350 m:

| formation | lat | lng | was |
|---|---|---|---|
| Liberty Bell Mountain | 48.51543 | -120.65837 | in group |
| Concord Tower | 48.51450 | -120.65827 | in group |
| **Lexington Tower** (4 rt) | 48.51425 | -120.65747 | **sibling** |
| *(group row)* | 48.51365 | -120.65653 | — |
| **North Early Winters Spire** (6 rt) | 48.51293 | -120.65547 | **sibling** |
| *North Early Winter Spire* (0 rt stub) | 48.51291 | -120.65557 | in group |
| Minuteman Spire | 48.51229 | -120.65397 | in group |
| **South Early Winters Spire** (13 rt) | 48.51228 | -120.65539 | **sibling** |

Lexington Tower sat *between* two towers already inside, 100 m from the group's centre.
The group advertised **27 routes against a true 50**.

1. **Liberty Bell Group** ← Lexington Tower, North Early Winters Spire, South Early
   Winters Spire. Empty 8 m duplicate `wa_north_early_winter_spire` deleted.
2. **Kangaroo Ridge** (was `route_count` 0, holding only two empty stubs) ← Big Kangaroo,
   Kangaroo Temple, Mushroom Tower, Half Moon, Wallaby Peak. Mushroom Tower on our own
   prior research — `0097` already records it as "Mushroom Tower (8,180 ft, Kangaroo
   Ridge)". Melted Tower and The Temple **kept**: real formations we hold no routes for.
3. **Silver Star and Wine spires** ← Burgundy, Chianti, Pernod (the other three Wine
   Spires; Chablis and Whine were already in), Silver Star Mountain (the namesake) and
   Vasiliki Ridge (Juno Tower and Vasiliki Tower are inside and stand on it).

All 13 movers are childless leaves and no destination holds direct routes, so
`trg_areas_leaf_xor` passes and no ltree cascade is needed. All moves stay inside
`wa_sub_wapass`, so only the three group rows need a recount.

---

## FIXED in `0107` (Picket Range)

### The same defect, twice, at larger scale

`wa_northern_pickets` (`route_count` 0) holds only two hollow rows; `wa_southern_pickets`
(`route_count` 1) holds two hollow rows plus one real buttress. Meanwhile **every** real
Picket summit is a flat child of `wa_picket_range`.

Hollow stubs duplicating a populated peak:

| stub | real | apart |
|---|---|---|
| `wa_crooked_thumb` (0 rt) | `wa_crooked_thumb_peak` (2 rt) | **21 m** |
| `wa_mt_fury` region + `wa_east_peak` stub | `wa_mount_fury_east` (3 rt) / `_west` (3 rt) | 0.37 / 0.46 km |
| `wa_rake_the` (0 rt) | `wa_the_rake` (1 rt) | 1.67 km |
| `wa_chopping_block_pinnacle_peak_the` (0 rt) | `wa_the_chopping_block` (3 rt) | 1.08 km |

**Coordinates are not the authority here** and were not used as one. Five Southern Picket
peaks share the identical placeholder coordinate `48.76800 / -121.28800` and Swiss Peak has
none at all, so membership is the standard guidebook division of the range. There *is* a
clean latitude gap at Picket Pass — northern crest 48.810–48.858 N, southern 48.755–48.777 N,
nothing between 48.7766 and 48.7976 — but it was used only as a sanity check that no peak in
the list sits on the wrong side of the pass. Swiss Peak is placed on our own prior research:
`0097` already records it as "Swiss Peak (7,988 ft, Northern Pickets)".

Membership applied:

- **Northern Pickets** — Whatcom Peak, Mount Challenger, Crooked Thumb Peak, Phantom Peak,
  Ghost Peak, Spectre Peak, Poltergeist Pinnacle, Mount Fury (East), Mount Fury (West),
  Swiss Peak, Luna Peak.
- **Southern Pickets** — Mount Terror, The Rake, Himmelhorn, Ottohorn, Frenzel Spitz, West
  Twin Needle, East Twin Needle, Inspiration Peak, McMillan Spire (West), East McMillan
  Spire, Mount Degenhardt, Little Mac Spire, The Pyramid, The Chopping Block.
- **Left directly on the range** (satellites, in neither sub-range) — Mount Triumph, Mount
  Despair, Davis Peak, Berdeen Peak, Elephant Butte, Mount Prophet, Indian Mountain,
  Mount Crowder.

**Mount Crowder is the one genuinely arguable call.** It falls *inside* the latitude gap at
48.7976, across McMillan Creek from both crests, and sources put it with the Northern
Pickets or in neither. It is left on the range: a wrong confident answer is worse than an
honest undivided one, and nothing renders differently for a direct child of the range.
Ed Wood Memorial Buttress is kept in Southern Pickets — it is a real buttress with a real
route ("Plan 9 from Outer Space"), not a stub.

---

## NOT actioned — needs a decision

### 1. Summit Chief — two overlapping groupings, no clean answer

`wa_summit_chief` (crag, 0 routes, no elevation) sits **15 m** from
`wa_summit_chief_mountain` (peak, 2 routes, 7,467 ft / 1,323 ft prominence). Same
mountain. But the stub is under **Western Alpine Lakes** and the real peak under
**Snoqualmie Pass**, and those two regions overlap on the ground: Western Alpine Lakes
holds Lemah Mountain while Snoqualmie Pass holds **Lemah Two** — the same massif split
across both.

Deleting the stub is easy; deciding which region owns these Alpine Lakes summits is a
product call, and doing the first without the second just hides the question.

### 2. Rejected candidates — recorded so they are not re-raised

- **`** Enchantments Bouldering` ← Dragontail, Colchuck Balanced Rock, Witches Tower…** —
  false positive. That group is scoped by *discipline*, not geography; alpine peaks do not
  belong inside a bouldering area. Same shape as the `**Bouldering at Exit 38` hits.
- **Cutthroat Lake Crags ← Cutthroat Peak / Lexington / NEWS / SEWS** — false positive
  from a radius inflated by Molar Tooth. Cutthroat Peak is a separate alpine peak; the
  other three belong to Liberty Bell Group 3.5 km away.
- **Monte Cristo Group ← Sheep Gap, Gothic, Bedal, Morning Star** (8.8–11.6 km) — separate
  Mountain Loop peaks. **Wilmans Peak** (1.6 km) is a plausible real hit, left for review.
- **Boston Basin ← Horseshoe Peak** (3.07 km) — `0097` already considered Horseshoe part
  of North Cascades Core and deliberately left it there.
- **Big Snagtooth → Silver Star and Wine spires** (1.78 km) — on Snagtooth Ridge, a
  separate ridge. Only proximity suggested it.
- **`Middle Peak` ← Mount Index** — the relationship is *inverted*: Middle Peak is one of
  Mount Index's summits, so if anything Middle Peak belongs under Mount Index.
- **"Temple, The" (Kangaroo Ridge) vs "The Temple" (Enchantments)** — 114 km apart, two
  genuinely different formations. Not a duplicate.

---

## What the detectors cannot do

Coordinates cannot decide parentage in crag terrain — at the Icicle Creek boulders every
formation is within 500 m of every other, so an early draft "found" that Barney's Rubble
belonged in nine different groups simultaneously. Name tokens are no better: `dome`,
`face`, `buttress` and `east` match across unrelated crags, and WA holds five unrelated
"South Face" crags up to 375 km apart.

This is why `audit:area-parents` is **report-only** and why its findings are labelled
candidates. It is a hypothesis generator; the group's own name is what settles a case.
