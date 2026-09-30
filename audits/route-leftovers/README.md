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

## Held for the owner (not applied)
- **Lexington Tower "South Face" = Concord Tower's South Face** (`wa_south_face_3` already has it). Merge = delete,
  which this session may not run:
  `node scripts/oneoff/route-tab-contradictions/apply-structural.mjs ../../route-leftovers/owner/out/o06-merge.json`
- **One source only:** Mount Mathias Hoh rewrite (`owner/out/o03.json`; would also orphan 5 traverse pins),
  Ottohorn West Ridge rewrite (`owner/out/o06.json`), Old Guard "Red Ledge" pin (`pins/out/p06-held-old-guard.json`),
  Bald Eagle pins 2-5 and Navaho camp and Cinderella pins 2/5 (computed placements; `pins/out/*-held-*.json`),
  Challenger summit-pitch grade (5.5 vs 5.6 vs 5.7).
- **No documented climb matches:** Half Moon "Southwest Slopes" (easiest line is 5th class), Liberty Bell "East Face",
  Mount Dana (no approach documented). Hide or delete?
- **Primus South Ridge:** the trailhead was moved to Eldorado Creek and then RESTORED to Thunder Creek (a retry
  found Thunder Creek is the most-used approach). Which approach should the row describe?
- **Grade vs text:** East Twin Needle South Route now describes the Eye Col line (~5.7) but `grade` still says
  5.10a — one source for the lower grade.
- **Distance in the one-way slot is a round trip:** Mount Seattle (98 km), Bear Mountain rows, Three Fingers N Peak,
  Mutchler, Sherpa Glacier, Stuart West Ridge. No source states the one-way figure; halving is not allowed.
- **Pins nobody publishes:** Chiwawa 3-6, Argonaut S Face 5, Buck 3-4, Cockscomb 2-3 (also North Ridge / Coleman
  Headwall share those coordinates), Glacier Peak Boulder Basin camp, Doorway Flake / Skeena26 trailhead,
  Drilling Me Softly trailhead, Esmeralda (text now De Roux, pins still Esmeralda Basin), Iron Cap waypoints
  (Middle Fork vs West Fork Foss), Alta Mountain turnoff pin, Vanishing Point / Blood Sport crag pins.
