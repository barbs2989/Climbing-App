# WA route tabs: owner-requested fixes (2026-09-26)

Follow-up to `audits/wa-contradictions-pass2/notes.md` (PR #1987). The owner asked for the listed items to be fixed.
Same pipeline: agents research and propose; `apply.mjs` compare-and-sets against the live row, refuses any
cited source in new text, and re-reads after writing; old values are in `applied-*.json`.

## Applied (80 patches on 23 routes)
- **Rainier climbing fee** (F3): 12 rows said the fee was annual. The park's 2026 FAQ and a second site agree
  it is **$82 per person per climb**, so `access.fees`, `permit`, `access.passRequired` and `access.notes` now say so.
  The rest of the catalog already said per climb. Also fixed: the wilderness camping fee on Liberty Ridge and
  North Mowich ($12/person/night).
- **Source wording on screen** (F3w, 17 rewordings, each reviewed by hand: same fact, no source named): Willis
  Wall, Tahoma, Liberty Ridge, Kautz Headwall, Ptarmigan Ridge, Curtis Ridge, Sefrit SE Ridge, Southern Man.
- **The Fin** (F4): `season` is now "Jul-Sep"; the explanation already lives in `best_season`.
- **The Monk, 5 rows** (F4): drive from Winthrop 28 → ~23 mi, matching the corrected Cathedral SE Buttress row
  (two independent sources; the old 28 came from misreading "6 miles … then 22").
- **Clean Break** (F1): trailhead pin and card moved to the Silver Star Creek pullout (SR-20 milepost 171), a
  coordinate WTA states and the Forest Service and OSM agree with; USGS ground 3,427 ft vs 3,450 claimed.
- **Hitchhiker** (F1): partner card now agrees with every other field (Blue Lake approach).
- **Ptarmigan Traverse** (F2): Yang-Yang Lakes, White Rock Lakes and Spire Point pins moved onto their features
  (OSM and USGS points agree; each passed `verify-pins.mjs`'s ground check).

Every moved pin passed `scripts/oneoff/wa-owner-fixes/verify-pins.mjs`: inside Washington, USGS ground within
200 ft of the pin's own elevation, and not on top of another pin.

## Follow-up, 2026-09-30 (5 more patches on 4 routes: `patches-G1/G5/G6.json`)
- **Ives Peak**: `aspect` NE → NW (the line is the northwest ridge, then the upper south face; 2 sources), and the
  beta no longer names a website.
- **Cutthroat West Ridge**: pin 8 (the area's reference coordinate, ~22 m from the summit pin, no elevation or note)
  deleted. The drawn line is a recorded track and never used it.
- **Ptarmigan Traverse**: Spider-Formidable Col now comes before Yang-Yang Lakes, the order a party meets them. Both
  mileages had followed the wrong order and no source states them, so they are null rather than recomputed.
- **Clean Break**: `approach` now starts at the Silver Star Creek pullout and gives Burgundy Col as the way down
  (every fact was already in the row).
- Re-checked, already right: Larrabee's three camp cards no longer claim a permit. Killen Creek has no parking fee
  (the Forest Service trailhead page says "No fees are required for this site"); the route fields already say so,
  and only the five camp cards still claim a Northwest Forest Pass.
- Researched, still open: no source publishes a coordinate for the Washington Pass hairpin or pond pullouts, Red
  Ledges, the Spider-Formidable col or this Cub Lake (the mapped Cub Lake is a different lake near the Entiat).
  No source gives Clean Break a car-to-car gain (only the 1,500 ft wall).
- **Applied by the owner** with `owner-items-1-3.sql` (the guard's columns), re-read live afterwards:
  Ives → "Northwest Ridge / South Face"; Clast from the Past → sport (listed Sport; bolted per its own fields);
  Washington Pass camp card "roughly half a mile" → "about a mile" (42 routes; Dolphin Chimney already said "just
  under a mile"); Killen Creek camp card → no parking fee (4 routes; North Ridge already said so); Clean Break `gpx`
  now starts at the corrected trailhead pin. Inner Constance matched nothing: another session had already renamed it
  "Standard Route (Northeast summit via South Gully and East Ridge)", which agrees with its fields, so it was kept.

## Second research round, 2026-09-30 (16 patches on 9 routes: `patches-G7a..e.json`)
Every moved pin passed the ground check (USGS within 200 ft of its height, not within 30 m of another pin);
a mileage whose starting pin moved, and that no source states, is now null rather than recomputed.
- **Clean Break** `gain_ft` 4,200 → **4,500**: two GPS-logged ascents from the Silver Star Creek pullout give
  4,481 and 4,541 ft trailhead to summit. The car-to-car totals disagree (4,781 vs 5,541), so none is stated.
- **Ptarmigan Traverse**: Spider-Formidable Col moved 1.7 km onto the col (two trip maps, 28 m apart), height
  7,500 → 7,303 (the ground). Pin 9 is the Itswoot Ridge camp its note and 6,400 ft describe: moved 1.9 km onto it
  (two trip maps, 16 m apart) and renamed "Itswoot Ridge camp (above Cub Lake)"; Cub Lake itself is ~5,340 ft.
- **Big Kangaroo (Beckey-Tate, West Face, Kearney-Thomas) and Cutthroat West Ridge**: the summits were right. The
  in-between pins had been snapped onto points along unrelated mapped trails (the Kangaroo Pass path; the
  Cutthroat approach path) and given summit-area names and heights: the ground under them is 400–2,850 ft below
  what each claims. All 13 removed, plus Kearney-Thomas's "South Face base" (no height, 96 m from the summit, a
  duplicate). Beckey-Tate's "Kangaroo Pass" pin went too: the route's text never goes there.
- **Blue's Buttress**: trailhead pin and record moved onto the SR-20 hairpin (4 sources start there; the pin sat
  on the Blue Lake lot with the pass's height). Poster Peak is **7,565 ft** (4 sources, the area blurb and House
  Buttress agree; ground 7,440 at the pin); 7,840 was another peak's height (summit pin + `high_point_ft`).
- **Minuteman East Face**: the "pond pullout" pin sat on the Blue Lake lot ~1 km WEST of the pass; the pond is a
  few hundred yards EAST (4 sources), not at the hairpin, and nobody publishes its coordinate: pin and the
  trailhead record's coordinate removed. The text was already right.
- **SEWS East Buttress**: approached from the hairpin up Spire Gully (3 sources, and the row's own text). Its
  "hairpin" pin sat on the Blue Lake trail 2.3 km west: moved onto the hairpin and made the lead trailhead; the
  two "Spire Gully" pins sat in the west-side gully and were removed; the trailhead record now names the hairpin.
  The notch, buttress base and summit are fixed places and stay; Blue Lake stays as the alternate start/way out.

- **Red Ledges** (Ptarmigan, `patches-G8.json`, on the owner's "do what research says"): moved 1.5 km onto the
  first trip map's point, west of Art's Knoll; the second map marks the same long ramp 318 m along it. Height
  6,900 → 6,339 (the ground; the route passes the ledge at ~6,200–6,400 ft).

## For the owner to run: `owner-gpx-clear.sql`
Five drawn lines follow the wrong approach, and no published track exists for the right ones, so clearing them
(the map then shows the corrected pins only) is the fix. `gpx` is outside the apply guard. `check:sql` passed and
a read-only copy of the five WHERE clauses matched exactly 5 rows; old lines in `gpx-cleared-backup-2026-09-30.json`.
- Blue's Buttress and Minuteman: a 2-point line from 48.5233,-120.655 (neither trailhead).
- SEWS East Buttress: the recorded west-side Blue Lake track, not the Spire Gully approach.
- Beckey-Tate and Big Kangaroo West Face: the same recorded track to Kangaroo Pass, which neither route uses.

## Left as the research says (as of 2026-09-30)
- **Minuteman's summit**: two sources put it ~350 m apart (one looks misplaced onto the Early Winters Spires);
  only one gives the alternative, so it stays. **Cutthroat's trailhead** has only one coordinate source.
- **Clean Break milepost** 171 vs one source's 170: one source, not changed.
