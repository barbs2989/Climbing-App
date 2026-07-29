# Crevasse-gap worklist — disposition of all 16 routes

The audit (`scripts/audit-hazard-coverage.mjs`) flagged 16 WA glacier routes whose
`routes.hazards` prose never mentioned crevasses or snow bridges. This is what happened to
each. Six are filled in `crevasse-gap-fills.sql`; the rest are deliberately not, for
reasons that differ per route.

## Filled — 8 routes, each researched individually (6 first pass + 2 in batch 2 below)

`crevasse-gap-fills.sql` appends one glacier-travel warning per route. Each is written from
route-specific research, not from a zone template, and each names the actual glacier and
the actual seasonal behaviour.

| route | what the warning says |
|---|---|
| `wa_mount_shuksan_price_glacier` | the mountain's most heavily crevassed glacier; bridged early season, open and climbed into/out of late season |
| `wa_mount_rainier_mowich_face` | drops onto the Mowich, ascends the North Mowich to camp; the bergschrund below the face is often not passable direct and has to be turned |
| `wa_mount_rainier_ptarmigan_ridge` | Carbon Glacier approach; Rainier's glaciers flow fast, so the workable line changes year to year and old beta isn't a route description |
| `wa_mount_rainier_willis_wall` | crevassed travel on the Carbon below and the summit icecap above — glacier rescue needed at both ends |
| `wa_forbidden_peak_west_ridge` | glacier crossing out of Boston Basin; lower bergschrund stepped across, upper turned on the left; late-season moat where snow pulls off the rock |
| `wa_eldorado_peak_west_arete` | Eldorado and Inspiration glacier traverse to the base, opening through summer — harder than the rock grade implies |

### Batch 2 — researched after the first six

| route | what the warning says |
|---|---|
| `wa_forbidden_peak_northwest_face` | Quien Sabe to ~7,500 ft, then a 150 ft rappel off Sharkfin Col onto the Boston Glacier and an ascending traverse; large crevasse near 7,600 ft; the rappel is the commitment, retreat means re-climbing to the col; cornice near 8,375 ft |
| `wa_boston_peak_southeast_face` | big crevasses low on the Quien Sabe; the direct line through them hits ~45° and is very exposed, so most take the left side in beneath Sharkfin Tower; short exposed col traverse to the summit block |

That brings the filled total to **8**.

## Reclassified — 2 routes were audit false positives

**`wa_southeast_ridge_se_corner`** (Mount Shuksan — Southeast Ridge) already warns:
*"Route crosses glaciers three times; conditions worsen late in the season."* That is a real
glacier warning; the check only scored it absent because it doesn't use the word
"crevasse". **Fixed in the audit** — the crevasse concept now also credits explicit
glacier-travel language, which drops the North Cascades count from 10 to 9.

**`wa_buckner_mountain_southwest_face`** — the southwest slopes are a scree-and-snow route.
Buckner's glacier is the Boston, on the north side. Demanding a crevasse warning on the SW
face is the zone assuming something about a line it can't see. Left alone.

## Resolved by dedup — Mount Adams, and both were false positives

**Deduped 2026-07-29** (`research/phase3/adams-dedup.sql`, applied and verified):
`wa_mount_adams_south_side` was a bare stub and `wa_mount_adams_south_spur`
collapsed into `wa_mount_adams_south_climb`, which kept south_spur's accurate
figures (9.2 km one-way, 6,676 ft = 12,276 − 5,600 from Cold Springs). Mount
Adams went 12 routes → 10.

**No hazard was written, because the survivor does not need one.** South Climb's
`face` is "South Spur / Suksdorf Ridge", its overview and approach contain zero
glacier mentions, and it is Adams' non-technical snow route — not crevassed
glacier terrain. Its one genuine crevasse-adjacent risk is already recorded, in
`obj_haz`: *"Glissade runouts onto rock or open crevasses/moats late season."*
Same category as Buckner SW Face.

The audit had scored it a gap only because it read `routes.hazards` and never
`obj_haz`. Fixed in `scripts/audit-hazard-coverage.mjs` — see below.

**Not a duplicate after all:** the Northwest Ridge pair was left intact.
`adams_northwest_ridge` (FA Givler/LeBlond/McGowan 1967, NW Ridge right of the
Adams Glacier, II, AI2-3, 3 pitches) and `wa_mount_adams_northwest_ridge`
(FA Molenaar/Johnson/Ostro/Startzell 1960, West Face of the North Ridge, III,
AI1-2, 5 pitches) are different climbs. The earlier claim of an Avalanche
Glacier duplicate pair was also wrong — only `adams_avalanche_glacier` exists.

## Audit blind spot — obj_haz was never read

`audit-hazard-coverage.mjs` scored coverage from `routes.hazards` alone. A hazard
recorded in `obj_haz` is still documented, so the audit reported gaps that were
not gaps. Across WA alpine/mountaineering/ice/mixed, 28 routes carry crevasse
language in `obj_haz` but not in `hazards`.

After including `obj_haz`, total core gaps fell 146 → 124 and crevasse-concept
gaps 15 → 2. Attribution of the 13 crevasse removals:

- **8** were real fills from the applied crevasse SQL (now in `hazards`)
- **4** were false positives this fix corrects: Buckner SW Face, Forbidden East
  Ridge, Adams South Climb, Shuksan Northwest Arete
- **1** was `wa_mount_adams_south_spur`, deleted by the dedup

## Still needs research — 4 routes

Genuine gaps where I couldn't source a warning I'd defend. Each needs someone to answer a
concrete question rather than infer from the peak:

- `wa_forbidden_peak_east_ridge` — approached across the Boston Glacier; the entry covers
  gendarmes, exposure and anchors but nothing about getting there.
- `wa_forbidden_peak_east_face_catscratch` — a single hazard entry in total.
- `wa_mount_shuksan_northwest_arete` — mentions staying on the crest to limit icefall
  exposure from the glaciers either side, but not the glacier travel to gain the arête.
  Searching mostly returns Price Glacier and Nooksack Cirque material rather than anything
  specific to this arête, so it needs a guidebook rather than the web.
- `wa_mount_adams_northwest_ridge` — borders the Adams Glacier, but how much glacier the
  ridge proper crosses is exactly the question, and it's entangled with the duplicate rows
  above.

## Ground rules used here

- Wrote to `routes.hazards` only — the field `dbRouteToCamel` actually reads.
- Every id read back from the live database, never constructed. Guessed ids no-op silently,
  which is how earlier rounds reported success while changing nothing.
- Appends are idempotent and order-preserving: append only if that exact text is absent, and
  no re-sorting, since the first entry reads as the headline hazard on the route page.
- One warning per route, naming the specific glacier and its seasonal behaviour. No
  zone-template text, because a zone can't know what a given line crosses — the assumption
  that put glacier hazards on Arizona boulder problems.
