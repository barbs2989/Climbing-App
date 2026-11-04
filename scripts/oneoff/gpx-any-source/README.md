# Recorded tracks, seasons, pins and trip-report facts from Peakbagger (then SummitPost)

Started 2026-11-04 on Washington. Written so a new session can run the same pass on another state.
The owner holds a licence for Peakbagger and SummitPost and has allowed GPX tracks from ANY source
(memory: `gpx-sources-terms-forbid-track-import`). Every rule below is the owner's.

## The owner's rules (all states, all sessions)

1. **Same route on the same peak**, researched per track. On formations with many technical routes
   the shared approach/summit proves nothing; the logged route or the report must name ours.
2. **The person summited**: Peakbagger "Ascent Type: Successful Summit Attained" only.
3. **Season**: research when each route is typically climbed (logged ascent months + web + guidebooks,
   guidebooks win), then use only ascents IN season or within ~1 month, for tracks AND facts.
4. **Pins**: a good track failing only on our pin means fix the pin. Summit: Peakbagger's surveyed
   coordinate + the tracks' highest points agree. Trailhead: confirmed BY RESEARCH from an official or
   mapped source (USFS/NPS/WTA/OSM Nominatim), never from the recordings alone.
5. **Trip-report facts** into the matching fields, in our OWN UNIQUE wording, month named for anything
   seasonal, no source named. Never a party's time as an estimate.
6. A stored complete or trailhead->summit track is never replaced. No <time> is ever written.
7. **No duplicates, anywhere** (owner, 2026-11-04). Every stage refuses one (`dedupe.mjs`, selftest
   `--selftest`): an ascent harvested twice counts once; one recording goes to ONE route, never to a
   route whose sibling already stores it; a pin may not land within 50 m of a same-type pin (200 m if
   same name); a fact already on the row, reworded or not, is refused (75% of its content words in one
   stored item or sentence); a shell sharing a name with a route on its peak is refused. Before ADDING a
   route, `catalog_find_route(name, area_id)` + `catalog_find_area` on the whole state, every spelling.
   After every write wave run `node scripts/oneoff/gpx-any-source/dup-audit-wa.mjs` (read-only; every
   route the session's rollbacks touched + every route on those peaks).

## Steps (replace `wa` / `WA` with the state)

```bash
# 0. worktree with credentials (CLAUDE.md: copy .env, .env.local, supabase/.temp; junction node_modules)
D=research-data/gpx-any-source-<st>-<date>; mkdir -p $D/harvest
node scripts/oneoff/gpx-any-source/worklist.mjs <st> $D/worklist.json        # live: routes needing a track
node scripts/oneoff/gpx-any-source/peaks.mjs $D/worklist.json $D/peaks.json   # distinct peaks + coords
node -e "const p=require('./$D/peaks.json');console.log(JSON.stringify(p.filter(x=>x.lat!=null).map(x=>[x.area_id,x.name,+(+x.lat).toFixed(5),+(+x.lng).toFixed(5)])))" > $D/peaks-compact.json
```

1. **Harvest (owner's Chrome).** Select the WINDOWS browser (`list_connected_browsers`, osPlatform
   Windows; the old Mac may still be connected and default). Open www.peakbagger.com in a tab, wait ~5 s
   for Cloudflare, paste `harvester.js` with `ST` set, `STATE_RE` set to the state's Peakbagger location
   string (`USA-OR`, `USA-CA`, ...), and `PEAKS` = peaks-compact.json. Two workers, ~2 peaks/min each.
   Files land in Downloads; move them into `$D/harvest/` (a background `mv` loop works). At the end run
   `__saveAll()` for the all-ascents file (season research needs it).
2. **Score:** `node candidates.mjs $D/worklist.json $D/candidates.json $D/harvest/pb-*.json` (mechanical
   300 m pin checks, summit flag, pin evidence).
3. **Packets:** `node packets.mjs $D/candidates.json $D/harvest/pb-<st>-allascents.json $D/packets $D/harvest/pb-<st>-*.json`
4. **Research:** copy `research-data/gpx-any-source-wa-2026-11-04/BRIEF.md` into `$D` (fix its paths),
   then Sonnet agents, 8 at a time, ~4 peaks each, each writing `$D/verdicts/<area_id>.json`.
   Agents skipped web research and assumed "standard line" identity until the brief made both explicit
   — keep those sections. One agent ran another's `$TEMP/w.js` and rewrote foreign verdicts: the brief
   now forbids shared script names; validate every verdict against its packet before applying.
5. **Review** verdicts (spot-check identity against the raw logged route + report), then apply IN ORDER:
   ```bash
   node apply-verdicts.mjs pins   $D/verdicts            # dry; then --write
   node apply-verdicts.mjs tracks $D/verdicts $D/gpx $D/harvest/pb-*.json
   FKT_GPX_DIR=$D/gpx node scripts/oneoff/gpx-tracks-fkt/apply.mjs $D/gpx/decisions.json   # dry; then --write
   node apply-verdicts.mjs facts  $D/verdicts $D/harvest/pb-*.json   # dry; then --write
   ```
   Each write saves a rollback under `scripts/`, writes through `patchRow` (paced, exactly one row) and
   re-reads. The facts stage refuses any 6-word run shared with a trip report, shouted text, or a named
   source.
6. `npm run lint`, `npm run type-check`, PR; update the GPX memory with counts.

## Then SummitPost

Same rules. Its peak/route pages have "Download GPX" plus When To Climb / Getting There / Route Summary
/ Camping. Its ADS HIJACK a rendered tab (Expedia, ad trackers). WORKS (2026-11-04): navigate ONE real page
(a search URL) so Cloudflare's check clears (~8 s), then navigate the tab to
`https://www.summitpost.org/robots.txt` and fetch() everything from there. robots.txt alone does NOT
clear the check (fetches return 403 "Just a moment..."). Routes of a peak: `/<slug>/routes/p-<id>`.
Search: `/object_list.php?object_type=1&object_name_1=<name>&state_province_1=<State>`.

## Peakbagger traps already paid for

- The ascent list shows only the MOST RECENT YEAR unless `&y=9999` (Liberty Bell: 42 -> 781).
- Header cells use NBSP (`Ascent&nbsp;Date`); match after replacing ` `.
- A one-cell "Summary" row can wrap the whole page: a section label over 40 chars is not one.
- `javascript_tool` blocks output containing query strings: return counts/text, never hrefs.
- The area name can be a catalog label ("Comb, The Routes", "Main Peak"): `names()` tries variants and
  every match must be within 2 km of our coordinate.
