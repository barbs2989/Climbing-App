# Owner questions: research results and the write plan (WA, 2026-11-04)

The research covers all 40 questions, with one JSON file per question in `owner-qs/`. Each file holds the answer, the recommendation, a confidence level, the evidence URLs and every search tried.

The writes are prepared but **not applied**. The session's permission check blocked production writes, so the owner runs them:

```
node scripts/oneoff/apply-owner-qs.mjs research-data/gpx-any-source-wa-2026-11-04/owner-qs-ops-N.json          # dry run
node scripts/oneoff/apply-owner-qs.mjs research-data/gpx-any-source-wa-2026-11-04/owner-qs-ops-N.json --write  # apply
```

**How the script protects the data:**
- Every row is backed up whole first, to `scripts/rollback-owner-qs-*.json`.
- The name and area must match what the research read, or the step is refused.
- A delete is refused if anything references the row.
- A merge only fills columns that are empty on the kept row.
- Every write is re-read to confirm it landed.
- Writes are paced, and a failure waits a minute before one retry.

## Batch 1 (`owner-qs-ops-1.json`): dry run passed, 10 ok, 0 refused
- **Luna:** merge Southeast Slopes into the Southwest Ridge row (one climb, same first ascent). Set it to scrambling, Class 3, SW, Jul-Sep. Confidence high.
- **Delete these duplicate or empty rows:**
  - Summit Chief Southeast Face, a duplicate of the South Route (high).
  - "Mount Temple Ridge" on The Temple (medium).
  - Bald Eagle South Spur and Southwest Route (medium).
  - Bryant North Route and West Face (medium).
  - Old Snowy North Route and West Route (medium).
- **Shuksan White Salmon Glacier:** set the season to Mar-Sep (the ski season starts in March) and explain both seasons in best_season (medium).

## Batch 2 (`owner-qs-ops-2.json`)
- **Price:** merge the Northeast Route into the Hester Lake Route (medium).
- **Hibox:**
  - Merge the East Route and the South Route into the Standard Scramble.
  - Merge Southeast Shoulder into the Southeast Ridge, and fill that row as scrambling, Class 3.
  - Delete the Northwest Ridge.
  - Change the South Face from trad to alpine (medium).
- **Iron Cap:**
  - Merge the copied South Route into the Chetwoot row.
  - Fill the Northeast Shoulder and rename it "North Ridge via Northeast Shoulder" (scrambling, Class 2-3) (medium).

## Batch 3 (`owner-qs-ops-3.json`)
- **Castle Peak (Pasayten):** merge "North Face (Left Buttress)" into "Fight or Flight". They are one climb. Set the grade to 5.10d (high).
- **Jack East Ridge:** change from mountaineering to alpine, 5.0 (three short low-fifth steps), with a new overview and hazard (medium).
- **Mutchler:** change to alpine, because the glacier crossing is roped. Add crevasse and cornice hazards and glacier gear (medium).
- **Mowich Face:** change to alpine (it is AI3, so not a walk-up). Set the season to May-Jul (medium).
- **South Tahoma Headwall:** change to alpine, AI3, and fill only the empty fields. **Tahoma Cleaver:** fill the overview only (medium).

## Batch 4 (`owner-qs-ops-4.json`)
- **Tinkham:**
  - Fill the Southeast Spur.
  - Merge the East Route into it and rename it "Southeast Spur (East Peak)".
  - Merge the North Route into the Northwest Ridge.
  - Delete the West Route.
  - Set the surviving rows to scrambling (medium).
- **Dragontail Pandora's Box:** change from alpine to mountaineering. It is a non-technical snow couloir (high).
- **Granite Beargrass Rib and Winter South Rib:** change from trad to alpine. A roped 5.0 on a peak is alpine.

## Still to do (each needs the full row read, a new row, or an owner call)
- **Fairfax Bridge (high, affects access):**
  - The SR 165 bridge has been permanently closed since 22 Apr 2025, to vehicles, bikes and people on foot.
  - Mowich Lake, and probably Carbon River, can now be reached only by a 20-30 mile walk in.
  - Every route that starts at Mowich (Observation Rock, Mowich Face, North Mowich, Ptarmigan Ridge...) needs a road note. The text is drafted in `owner-qs/observation-rock-road.json`.
- **Rainier duplicates (high):** Liberty Ridge and Ptarmigan Ridge are each filed twice, once on Rainier and once on Liberty Cap. Keep the Rainier rows and carry over the Liberty Cap rows' fuller text.
- **Cameron:** move the Summit pin to the lidar-confirmed West Peak (47.825825,-123.334090) and fix the tip that calls the East summit the true one (medium).
- **Fury West Ridge / Northwest Route:**
  - The row is really the 1958 west-side line.
  - Its text is copied from the traverse row.
  - Set face and aspect to W, clear the 5.4 grade, and rewrite or clear the beta, descent and approach (medium).
- **Ellinor:** add a Lower Trailhead pin at 47.50709873,-123.2317182 (USFS page) for winter and spring. Describe which months each lot is the start (high).
- **Chianti:** move the East Face summit pin to 48.553355,-120.590487 and set the high point to about 8,459 ft (high).
- **Granite Mountain:** the area pin is on the Tusk. Move it to the lookout summit at 47.4177,-121.4814 (high).
- **Forbidden "Northeast Face":**
  - The row is really the Northwest Face of the North Ridge (snow/ice). Rename it and set the season to Jul-Aug.
  - Remove the East Ledges sentence that claims a Northeast Face ice route (high).
- **Little Annapurna North Slopes:** change "south-facing" to "north-facing" and set it to scrambling, Class 3 (high).
- **Eagle Rock:**
  - The descent has a lower cliff band that is rappelled, so it is not "no rappels".
  - Add a rope to the gear.
  - Owner call: does a route where a rope is advised stay mountaineering?
- **Sloan:** lead the approach with Bedal Creek (17 of 19 recent ascents) (high).
- **Reynolds:** add Williams Creek as an approach variant (medium).
- **Cutthroat:** the pullout is at 48.5134,-120.6882, but no official or mapped page confirms it, so the pin is held.
- **The Monk:** the five Monk climbs belong under a new sibling peak, "The Monk", beside Cathedral (high). This means a new area, after `catalog_find_area`.
- **New routes, each after `catalog_find_route`:**
  - Gilbert Southeast Ridge (Warm Lake), track 2259534.
  - Chikamin Glacier Lake, track 2967152.
  - Hagan North Slopes via Blum Lakes.
  - Cannon Northwest Ridge, track 3346626.
  - Ballard East Face, track 1703157 (its pin is held because the coordinate comes only from tracks).
  - Whistler (Okanogan) North Ridge, alpine 5.4, track 1975044.
  - Price Northwest Route (Price Lake), track 2780554.
- **Tracks onto existing rows:** Remmel SE Slope gets 3252658. Greenwood West Ridge gets 2581382.
- **Held, unsettled:**
  - Price Lower Ramp (5.8) and Prominent Dihedral (5.10): no source found, but the guidebook was not readable.
  - Price South Ridge, to reuse or delete.
  - Shuksan Hanging Glacier's two season fields contradict each other.
  - Inner Constance NW Buttress 5.0 grade: unsupported; keep both rows.
  - Sefrit: no new row.
  - Golden Horn: attach none of the 7 tracks that top out on Tower.

## Applied 2026-11-05 (edits only; every row backed up, re-read)
- **`owner-qs-ops-patches.json`, 11 of 12 applied:**
  - White Salmon season.
  - Hibox South Face changed to alpine.
  - Iron Cap North Ridge via Northeast Shoulder.
  - Jack East Ridge changed to alpine 5.0.
  - Mutchler changed to alpine.
  - Mowich Face changed to alpine, May-Jul.
  - South Tahoma Headwall changed to alpine AI3.
  - Tahoma Cleaver overview.
  - Tinkham Southeast Spur fill.
  - Granite's two ribs changed to alpine.
  - **Not applied:** Dragontail r3 stays alpine. Trigger 0366 reverts it, because its `rock_grade` holds 5.6 for the true-summit pinnacle, and that is correct.
- **`owner-qs-ops-5.json`:**
  - Cameron Summit pin moved to the West Peak (the stored track passes within 10 m), the East-summit tip removed, and the face text fixed.
  - Fury west line: face and aspect set to W, grade cleared, beta rewritten, the traverse descent cleared.
  - Little Annapurna North Slopes set to scrambling Class 3 (no "south-facing" text was found in the row).
  - Observation Rock: road note added for the closed Fairfax Bridge, and a sentence prefixed to the approach. Every other route starting at Mowich already carried the closure.
- **`owner-qs-ops-6.json`:**
  - Chianti East Face summit pin moved to the lidar point, and all three rows' high point set to 8,459 ft.
  - Sloan approach now leads with Bedal Creek.
  - Eagle Rock: descent, rappel, tip and gear now describe the lower cliff-band rappel.
- **`owner-qs-ops-7.json`:** Ellinor Lower Trailhead pin (USFS coordinates) added to both rows, and the winter approach text written onto the Southeast Chute. The write landed; the script reported it as refused only because a trigger reordered the waypoint keys.
- **Granite Mountain area pin** moved from the Tusk to the lookout summit at 47.4177,-121.4814.
- **Held:**
  - **Forbidden "Northeast Face":** our own East Ledges data cites a 1961 AAJ "Northeast Face" report, which contradicts the research's finding that no such route exists.
  - **Reynolds:** the Williams Creek approach variant already exists. Making it primary would also need the approach paragraph rewritten.
- **Still blocked by the permission check:** every merge and delete in batches 1-4.
