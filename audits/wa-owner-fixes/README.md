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
