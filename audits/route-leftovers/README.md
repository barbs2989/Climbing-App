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

## Held for the owner (not applied)
- **Deletes this session may not run** (the permission classifier blocks route DELETEs):
  - Lexington Tower "South Face" = Concord Tower's South Face (`wa_south_face_3` has it). Merge:
    `node scripts/oneoff/route-tab-contradictions/apply-structural.mjs ../../route-leftovers/owner/out/o06-merge.json`
  - `wa_ottohorn_west_ridge`: the 2017 ridge has one account; the row holds the col route its sibling
    `wa_ottohorn_southeast_route` already has. Do NOT apply `owner/out/o06.json`'s rewrite — the FA thread says the
    sub-summit names were swapped (westernmost = Honk) and Honk had an earlier ascent.
  - `wa_liberty_bell_east_face`: no such route in two independent route lists; its beta is Lexington Tower's East
    Face, which has its own row.
- **Half Moon** rewrite as the North Ridge is ready (`deep/out/d2.json`) but the number "III, 5.7+" has one source
  and `dist_km`/gain still describe the old Kangaroo Pass line — held.
- **Single source:** East Twin Needle South Route 5.7 (grade still 5.10a); King Kong commitment III -> IV (only the
  first ascensionist; also its `fa` differs from Mountain Project's); Bald Eagle pins 4-5; Mathias Glacier Pass pin;
  Seattle `gain_ft` 5,750.
- **Found, not fixed:** `lib/outing.js` `effDistKm` prefers a day plan's miles over `dist_km`, so Mount Seattle
  (miles only on the summit day) shows ~2 mi. Three Fingers r2 / south-peak-lookout `dist_km` also look like round
  trips; Tupso Pass Road (FR 41) may be closed short of the Three Fingers trailhead.
- **Vanishing Point** base/top-out pins sit ~1,900 ft below their stated heights; one GPS track places the tower
  NNW of Baring's summit. One source only, and not provably >500 m off route — held (`deep/out/d8b.json`).
- Sibling `wa_spraying_mantis` pin 0 carries the same wrong trailhead coordinate Drilling Me Softly had. Glacier
  Peak Sitkum `approach` still describes the washed-out White Chuck approach in full.

Second deep pass (`d7b`, `d8b`), applied: Esmeralda -> De Roux line (trailhead moved, 5 basin pins removed, last
switchback added); Iron Cap -> West Fork Foss (trailhead moved, 6 Middle Fork pins removed, Big Heart Lake and
Chetwoot camp added); Buck pins 3-4 and Sitkum's Boulder Basin camp pin removed (rule 1), Sitkum's line cleared
(never reaches Boulder Basin); Drilling Me Softly trailhead -> the FS 9070 road end; Alta turnoff + Rampart junction
onto the mapped fork; Blood Sport's crag pin (Guye summit) removed.
