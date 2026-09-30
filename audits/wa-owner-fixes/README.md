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
- Researched, the owner's to apply (the guard's columns): Inner Constance → "South Gully / East Ridge via Lake
  Constance"; Ives → "Northwest Ridge / South Face"; Clast from the Past → sport (listed Sport; bolted per its own
  fields); Washington Pass camp card (43 routes) "roughly half a mile" → "about a mile"; Killen Creek camp card
  (5 routes) → no parking fee; Clean Break `gpx` start → the corrected trailhead pin.

## Not done, and why
- **Renames, `discipline` and camp cards (`bivy`)**: Inner Constance ("via Crystal Pass"), Ives ("NE"),
  Clast from the Past (trad → sport?), and the camp-card errors (Larrabee permit, Washington Pass "half a mile",
  Killen Creek parking pass). The apply guard forbids these columns, and loosening it was refused in this
  session, so they wait for the owner.
- **Pins with no published coordinate** (moving them would mean inventing one): the hairpin and pond pullouts
  east of Washington Pass (Blue's Buttress, Minuteman, SEWS East Buttress); the in-between pins on Beckey-Tate,
  Big Kangaroo West Face and Cutthroat West Ridge; Ptarmigan's Red Ledges, Spider-Formidable Col and Cub Lake.
- **Needs a delete or reorder, which the patch format lacks**: Cutthroat West Ridge pin 8 duplicates the
  summit; Ptarmigan lists Yang-Yang Lakes before Spider-Formidable Col (swap entries 5 and 6).
- **Clean Break `gain_ft` 4,200** is below the ~4,470 ft rise from the corrected trailhead; no source states a
  car-to-car gain (the recurring 1,500 ft is the route's own height), so it is left for a sourced figure. Its
  2-point drawn line still starts at the old trailhead (~400 m off); it is still captioned as a straight segment,
  not a track. Its `approach` still leads with the Burgundy Col trail.
