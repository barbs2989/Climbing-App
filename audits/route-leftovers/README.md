# WA route-tab leftovers (2026-09-30)

Follows the route-tab contradiction audit (#1909, #1965, #1987) and its 30 owner decisions (#1962). Three
leftovers, all applied live with compare-and-set, full-row backups (`audits/route-tab-contradictions/decisions/structural-*`,
`audits/route-leftovers/pins-*`) and a re-read after every write. Routes held by the "wa routes data validation"
session (its 9 pin routes, the Rainier fee rows, Sefrit, Southern Man, The Fin, the Monk rows, Blue's Buttress)
were excluded.

## 1. Map pins (`pins/in` -> `pins/out`, `scripts/oneoff/route-leftovers/apply-pins.mjs`)
50 routes researched (both halves). A move needs two sources agreeing within ~300 m; its height comes from the USGS
elevation service. A line vertex sitting on the old pin is carried with it; a line drawn along the WRONG approach
is cleared (`clear_line`) so the map shows pins only.
- ~75 pin moves/removals on ~40 routes, e.g. Poltergeist's Hannegan trailhead (was at Ross Dam, 44 km off), Liberty
  Ridge's Mowich camp -> St. Elmo Pass, Skokomish's Mildred Lakes pins -> Putvin / Lake of the Angels, Ice Box
  trailheads -> the SR-20 hairpin, Buckner N Face -> Boston Basin, Cinderella -> the FR-38 trailhead.
- Lines cleared: Liberty Ridge, Boulder-Park Cleaver (sketches up the wrong side). Cockscomb's line start snapped
  onto its moved trailhead. Trailhead records (`approach_logistics`) aligned on Buckner, Grotto, Rimrock, Primus
  (Primus later restored, below), Trapper, Poltergeist.

## 2. The other half's owner decisions (`owner/in` -> `owner/out`, via `apply-structural.mjs`)
55 items from `wa-contradictions-rest/handoffs.md` and `wa-contradictions-pass2/notes.md`: camp cards, discipline
(Clast from the Past, Sidewinder, Lefty, Friction Therapy, On the Prowl -> sport; Iceman -> trad), mixed rows kept
as their best-documented line (Skookum -> 5.4 North Ridge via Jaws' Tooth, Fairchild, Lost Peak, Ballard, Claywood,
Gilbert Meade, Pernod, Little Sister, Hardy, East Twin Needle, Mount Seattle -> Quinault), renames (Old Snowy,
Inner Constance, Ives, Whistler, Himmelhorn), area elevations (East Fury 8,322; Duckabush 6,254), closures (Hopper),
source mentions removed (Duckabush, Mount Stone, Pernod, Ives).

## 3. Retry of this half's 327 unresolved contradictions (`research/in/u001-u033`, `research/out/u*.json`)
314 still on live rows (13 were on rows merged away). 33 fixed with two sources + 6 row-plus-one = **77 patches**;
37 already consistent after later work; **263 still unresolved** (sources disagree, only one reachable — several
key sites now block automated fetching — or only a computed figure would settle it).

## 4. Deep research on the held items (`deep/out/d*.json`, rules in `scripts/oneoff/route-leftovers/deep-instructions.md`)
The owner delegated five decision rules (remove an unplaceable off-route pin; a two-approach row follows its most
documented line; an undocumented climb is rewritten or recommended for deletion; `dist_km` only from a stated
one-way figure; split grades become a range). Applied live:
- **Mount Mathias** -> "West Face" from the Hoh (Glacier Meadows, Blue Glacier); 6 traverse pins removed, Glacier
  Meadows added, the Sol Duc traverse line cleared, `gain_ft`/`dist_km` nulled (they were the traverse's).
- **Mount Dana** -> the Elwha / Happy Hollow ridge line; Snow Finger / Dodwell-Rixon pins removed.
- **Primus South Ridge** -> Eldorado approach: only the ice cap reaches the south side; Thunder Creek reaches the
  EAST ridge (kept as a variant). Trailhead moved to Eldorado Creek, Thunder Creek line cleared, its
  `dist_km`/`gain_ft` nulled. This settles the earlier move-then-restore.
- **Challenger Glacier** grade -> 5.5-5.7 in every field (two sources for each end).
- **Pins:** Old Guard Red Ledge, Navaho upper camp, Cinderella split / Green Creek crossing / west ridge, Chiwawa
  ford / basin / col (high-camp bench removed), Argonaut S Face gully, Baker Cockscomb / North Ridge / Coleman
  Headwall camp and base pins, Doorway Flake + Skeena26 trailhead (duplicate saddle removed, sketch line cleared).
  Bald Eagle pins 2-3 removed (rule 1: >1 km off the route; the offered placement was computed from the crest).
- **`dist_km`:** Mount Seattle 30.58 (19 mi stated; the Skyline-Ridge pins and line removed so the row is one
  approach), Sherpa Glacier 13.04 (8.1 mi stated); Bear Mountain N Buttress x2, Three Fingers r1, Mutchler, Stuart
  West Ridge nulled (no stated one-way figure; the offered 21 mi / 7.5 mi were assembled, so not written).
- `apply-pins.mjs` fix: a coordinate-less summit pin (crag rows) was the 60 km anchor and read as 0,0.

## 5. Deep retry of the 263 still-unresolved contradictions, and the held items (2026-09-30)
Third attempt at every contradiction the retry left open (`research/in/v001-v028`, built by
`scripts/oneoff/route-tab-contradictions/mkdeep.mjs`; rules in `deep-retry-instructions.md`): archived copies of
blocked sites, journals, GPS tracks, USFS/NPS pages, and the owner's delegated rules (one-way slot, split grade ->
range, most-documented line wins, null a provably wrong value). 271 results: **50 fixed, 23 already consistent, 198
still unresolved** (one source, or sources disagree). **96 patches live** (`applied.log`, `research/patches-v*.json`),
e.g. The Temple 5.3-5.6, Mastiff -> the southeast-ridge line, Philadelphia season April-May, Price/Union no parking
pass, Spire -> the Galena pullout, Spindrift Couloir WI5, ~15 round-trip `dist_km`/gain figures nulled.

Structural items (`deep/in-structural.json` -> `deep/out/s1-s3.json`, applied via `s*-apply.json`):
- Renamed / rebuilt to the documented line: Abernathy (Wolf Creek / Gardner Meadows), Argonaut (SE Ridge breakdown),
  Bryant (Denny Creek), Clark -> Walrus Glacier, Enchantment SW -> South Gully, La Bohn -> East Ridge, Overcoat ->
  East Face, Hurry-up Class 2-3, Sherpa East Ridge Class 3-4 low 5th, Witches Tower South Face Class 3, Mesahchie
  (Easy Pass high traverse), Morning Star (valley line), Storm King (washout start), Hozomeen (water-taxi pins only).
- Pins: Spraying Mantis and Mile High Club trailheads moved; Marvin's Ear / Morning Star trailhead coordinates fixed;
  Spire's wrong trailhead coordinate nulled.
- Held items settled (`deep/out/h1-apply.json`, `h2-apply.json`): **Half Moon -> North Ridge 5.7** (second source
  found; commitment unconfirmed so null), Mathias Glacier Pass pin, Seattle `gain_ft` nulled, Three Fingers FR 41
  closure stated on all three rows and r2/lookout `dist_km` nulled, Glacier Peak Sitkum rewritten to the North Fork
  Sauk / Red Pass approach.

## 6. Owner: "do what you recommend for all" (`deep/out/s4.json`, applied)
- East Twin Needle -> Grade II, 5.7: the row is the Eye Col line, and 5.10a is the East Arête's grade.
- King Kong: `fa` corrected (Johnson on the first ascent, Gleason on the free ascent), commitment IV — the first
  ascensionist's accounts are the only record and nothing supported the old values; its `corrections` no longer
  names a source.
- Vanishing Point pins 1-2 removed (claimed 5,200/5,708 ft on ~3,330 ft ground); Cashmere's off-line camp pin
  removed; La Bohn Gap pin moved 1.17 km to the mapped saddle; Abernathy `loss_ft` nulled (the North Creek line's).
- Recommended and NOT applied (the permission classifier refused, so these are the owner's to run):
  - `lib/outing.js` `itinTotalMi`: return null when fewer than half the days state miles. Measured by
    `scripts/oneoff/route-leftovers/measure-partial-itinerary.mjs` — 3 of 526 WA itineraries leave a day blank and
    the rule moves only Mount Seattle (3.2 km shown vs 30.58 km stated); Jack Mountain keeps its reading.
  - Patches: King Kong crux 5.11d-5.12a (`research/held-v019.json`), Prusik West Ridge II-III (the Prusik entries
    of `held-v021.json`), Eagle Rock "no pass at the FR6517 pull-off" (re-extract with `extract.mjs v007`, keep
    only `wa_eagle_rock_scramble`). Apply with `node scripts/oneoff/route-tab-contradictions/apply.mjs <file>`.
- Recommended to LEAVE: the five crag "no pass" claims resting only on fee law (a wrong "no pass" costs a
  climber a ticket; a wrong "pass required" costs nothing), Spire `access.fees` (open product decision), Rock
  Mountain aspect, Berdeen `loss_ft`, Cashmere base-pin move, Stuart North Ridge pins, Bald Eagle pins, Rimrock,
  Witches Tower E/SE Face, and Clark waypoint 5 (USGS reads ~8,025 ft there, so the coordinate — not the 7,000 ft
  rope-up height — is what is off; rewriting the height would make it claim the wrong thing).
- Owner then ran the refused items by hand: King Kong + Prusik patches (11 on 2 rows), Eagle Rock (1), and the
  `itinTotalMi` rule (PR #2045).

## 7. Owner: "do what you recommend based on online research" (`deep/out/r1-r3.json`, applied)
- Rock Mountain: the two "southeast-facing" notes now say south-facing, matching its own `aspect` (r3).
- Denny Mountain `access.permit`: a free self-issue Alpine Lakes Wilderness permit, day use included (r1). Its
  `access.fees` still says the route stays outside the wilderness — left, as `access.fees` is an open decision.
- Pins moved to coordinates two published records agree on (r2): Hozomeen South Peak summit (139 m), Enchantment
  Peak summit on both the South Gully and East Ridge rows (~325 m), Mount Stuart summit (125 m) and Longs Pass
  (590 m). Stuart keeps one adrift vertex, captioned as a sketch.
- Still unresolved after a further search: the five Half Moon Crag pass claims (no source speaks to that
  pull-off), Three Fingers day 1 (7.3 mi is wrong; sources give 4.5-5 mi but no two state one figure — and nulling
  it would make the planner halve day 2 alone), Switchback day 1 (same), Cashmere west col (one published coordinate:
  47.55891,-120.85206, in r2 `proposed_pin_ops`), Clark waypoint 5 (on the route; the label/height is what is off),
  Bald Eagle pins 2-4 (imprecise, not off-route), Rimrock approach (no published account), Witches Tower E/SE
  (`wa_e_se_face`: two lines, one source each — split into East Face 4th and Southeast Face 5.6).

## Held for the owner (not applied)
- **Deletes this session may not run** (the permission classifier blocks route DELETEs):
  - Lexington Tower "South Face" = Concord Tower's South Face (`wa_south_face_3` has it). Merge:
    `node scripts/oneoff/route-tab-contradictions/apply-structural.mjs ../../route-leftovers/owner/out/o06-merge.json`
  - `wa_ottohorn_west_ridge`: the 2017 ridge has one account; the row holds the col route its sibling
    `wa_ottohorn_southeast_route` already has. Do NOT apply `owner/out/o06.json`'s rewrite — the FA thread says the
    sub-summit names were swapped (westernmost = Honk) and Honk had an earlier ascent.
  - `wa_liberty_bell_east_face`: no such route in two independent route lists; its beta is Lexington Tower's East
    Face, which has its own row.
- **Single source / one author:** East Twin Needle South Route 5.7 (grade still 5.10a); King Kong commitment IV,
  its `fa` (Wertkin & Johnson, FFA with Gleason) and crux 5.11d-5.12a — every source is the first ascensionist
  (`deep/out/h1.json`, `research/held-v019.json`); Prusik West Ridge II-III (both Grade II sources may be one guide,
  `held-v021.json`).
- **Parking-pass claims resting on fee law, not a statement about the spot:** Eagle Rock, Half Fast, Astral
  Projection, Astroglide, Asymptotic, Artic Rose (`held-v010/v011.json`); Spire `access.fees` (open product decision,
  `held-v024.json`).
- **Weak evidence:** Rock Mountain "south-facing" (second source is a slope sample, `held-v021.json`); Berdeen
  `loss_ft` null (`loss_ft` holds two conventions); Cashmere west-col pin (col only located to 0.7 km); La Bohn Gap
  pin (sources 335 m apart); Mount Stuart North Ridge — the built ops removed on-route pins (Stuart Glacier crossing,
  ridge base) and the Longs/Goat Pass pins are the standard south approach, so NOT applied (`deep/out/s3.json`).
- **No source found:** Vanishing Point pins (one track; owner: remove pins 1-2 or accept it), Bald Eagle pins,
  Rimrock Ridge approach, Witches Tower E/SE Face (two lines, one source each — a split candidate).
- **Found, not fixed:** `lib/outing.js` `effDistKm` prefers a day plan's miles over `dist_km`, so Mount Seattle
  (miles only on the summit day) shows ~2 mi (app behaviour — owner's call). Three Fingers lookout day 1 says 7.3 mi
  to Goat Flats, USFS says 4.8. Abernathy `loss_ft` 4,660 now stands beside a nulled gain. Hozomeen summit pin
  7,614 ft ground vs 8,003 stored; Clark waypoint 5 7,000 vs ~8,025 ground; Enchantment summit pin ~330 m off the NE
  summit. Switchback Mountain day 1 6.2 mi vs two guides' ~8 mi one way. Denny Mountain permit wording (pins outside
  the wilderness, summit on its edge).

Second deep pass (`d7b`, `d8b`), applied: Esmeralda -> De Roux line (trailhead moved, 5 basin pins removed, last
switchback added); Iron Cap -> West Fork Foss (trailhead moved, 6 Middle Fork pins removed, Big Heart Lake and
Chetwoot camp added); Buck pins 3-4 and Sitkum's Boulder Basin camp pin removed (rule 1), Sitkum's line cleared
(never reaches Boulder Basin); Drilling Me Softly trailhead -> the FS 9070 road end; Alta turnoff + Rampart junction
onto the mapped fork; Blood Sport's crag pin (Guye summit) removed.
