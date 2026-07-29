# Crevasse-gap worklist — disposition of all 16 routes

The audit (`scripts/audit-hazard-coverage.mjs`) flagged 16 WA glacier routes whose
`routes.hazards` prose never mentioned crevasses or snow bridges. This is what happened to
each. Six are filled in `crevasse-gap-fills.sql`; the rest are deliberately not, for
reasons that differ per route.

## Filled — 6 routes, each researched individually

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

## Reclassified — 2 routes were audit false positives

**`wa_southeast_ridge_se_corner`** (Mount Shuksan — Southeast Ridge) already warns:
*"Route crosses glaciers three times; conditions worsen late in the season."* That is a real
glacier warning; the check only scored it absent because it doesn't use the word
"crevasse". **Fixed in the audit** — the crevasse concept now also credits explicit
glacier-travel language, which drops the North Cascades count from 10 to 9.

**`wa_buckner_mountain_southwest_face`** — the southwest slopes are a scree-and-snow route.
Buckner's glacier is the Boston, on the north side. Demanding a crevasse warning on the SW
face is the zone assuming something about a line it can't see. Left alone.

## Blocked on dedup — 3 duplicate Mount Adams rows

The live database has three rows for what is one route, the standard South Climb:

| id | name | dist_km | gain_ft |
|---|---|---|---|
| `wa_mount_adams_south_climb` | South Climb (South Spur) | 19.3 | 6700 |
| `wa_mount_adams_south_spur` | South Spur Route | 9.2 | 6676 |
| `wa_mount_adams_south_side` | Mount Adams - South Side | null | null |

Two of these were in the flagged 16. Writing hazards onto duplicates would multiply the
problem, so nothing was written. This needs a dedup decision first: 19.3 km matches the
standard ~12 mi round trip, so `south_climb` looks like the keeper, `south_spur`'s 9.2 km
looks like a one-way or bad figure, and `south_side` is an empty stub. Related known
duplicates on the same peak: `adams_avalanche_glacier` / `wa_mount_adams_avalanche_glacier`
and `adams_northwest_ridge` / `wa_mount_adams_northwest_ridge`.

## Still needs research — 5 routes

Genuine gaps, but I didn't find route-specific sourcing good enough to write a warning I'd
defend. Each needs someone to answer a concrete question rather than infer from the peak:

- `wa_forbidden_peak_northwest_face` — **highest priority.** Its whole hazard list is
  "mixed snow/ice/rock", "route-finding on a big face", "shaded, cold aspect": three
  statements of terrain type, no warning of any kind, on a serious glaciated face. It is
  also one of only two routes in WA whose hazard entries warn about nothing at all.
- `wa_forbidden_peak_east_ridge` — approached across the Boston Glacier; the entry covers
  gendarmes, exposure and anchors but nothing about getting there.
- `wa_forbidden_peak_east_face_catscratch` — a single hazard entry in total.
- `wa_mount_shuksan_northwest_arete` — mentions staying on the crest to limit icefall
  exposure from the glaciers either side, but not the glacier travel to gain the arête.
- `wa_boston_peak_southeast_face` — reached from Boston Basin over the Quien Sabe; four
  entries, all about rock quality.
- `wa_mount_adams_northwest_ridge` — borders the Adams Glacier, but how much glacier the
  ridge proper crosses is exactly the question, and it's also entangled with the duplicate
  rows above.

## Ground rules used here

- Wrote to `routes.hazards` only — the field `dbRouteToCamel` actually reads.
- Every id read back from the live database, never constructed. Guessed ids no-op silently,
  which is how earlier rounds reported success while changing nothing.
- Appends are idempotent and order-preserving: append only if that exact text is absent, and
  no re-sorting, since the first entry reads as the headline hazard on the route page.
- One warning per route, naming the specific glacier and its seasonal behaviour. No
  zone-template text, because a zone can't know what a given line crosses — the assumption
  that put glacier hazards on Arizona boulder problems.
