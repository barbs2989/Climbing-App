# Out-of-state waypoint audit, 2026-10-30: summit batch brief

Read `research-data/wa-waypoint-audit-2026-10-30/BRIEF.md` first. Its rules, ops and output format
all apply. **Do not touch the database.**

Your input is `research-data/oos-waypoint-audit-2026-10-30/summits-<N>.json`. Each entry is one
SUMMIT pin flagged by the census:
`{id, i, name, at:[lat,lng], elev, ground_ft, gnis:{id,name,lat,lng}, gnis_m, peak:{id,name,lat,lng,elev}, peak_m, isMax, state, route}`.

An entry is flagged when one of these holds:
- it is more than 300 m from the GNIS Summit of the same name;
- it is not a 3DEP local maximum;
- its ground is more than 300 ft from its `elev`.

For EACH entry, decide whether the pin is on the true summit.
1. Find the summit's published coordinate. Use GNIS (the gaz_id given), Peakbagger, ListsOfJohn,
   SummitPost, 14ers.com, and Wikipedia's coordinate.
   - GNIS is OFTEN wrong on peaks with several tops. In WA it was the wrong one 6 times.
     Check the candidate with 3DEP: probe the centre and about 70 m around it in 8 directions,
     using `curl -s "https://epqs.nationalmap.gov/v1/json?x=<lng>&y=<lat>&units=Feet&wkid=4326"`.
     The true summit is the local maximum whose height matches the published elevation, within
     ~100 ft.
2. Choose the op:
   - Pin already within ~150 m of the true summit: `none`, with the evidence.
   - Pin clearly off the summit, and a published coordinate is on the true high point: `move`,
     with `source` and `quote` (or the gaz_id). Give `ground_ft_at_to`.
   - Pin on the summit but `elev` wrong: `setElev`, using the guidebook or most recent published
     elevation, with a source.
   - The pin means a different top on purpose (a sub-summit the route ends on, a traverse, a
     false summit named as such): `none`, with the reason.
   - The peak's own `areas` coordinate (`peak`) off its summit: `areaMove` (see BRIEF.md). Give
     its `area_id` and `from` = the peak's stored [lat, lng].
3. Spend at most about 3 searches per summit. Many entries share one peak, so reuse what you find.

Output `research-data/oos-waypoint-audit-2026-10-30/decisions-S<N>.json`. Give one entry per pin
changed or verified, copying `name` and `from` exactly.

Reply in at most 15 lines:
- counts: verified / moved / setElev / areaMove / none-other;
- a table of the changes only.
