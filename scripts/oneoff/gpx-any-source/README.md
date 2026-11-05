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
   One GPS file is often logged as an ascent of EACH peak it summits (an Inspiration Traverse logged on
   Primus and on Klawatti, a Clark + Johnson day): the tracks stage refuses any recording whose file is
   also logged on another peak (14 such recordings had slipped into WA waves 1-3; cleared 2026-11-04).
   A traverse ROUTE whose line is exactly those peaks is the one exception, decided by the reviewer.
   Season is the RESEARCHED window ±1 month, not the stored one ("May should be fine for some peaks").
   After every write wave run `node scripts/oneoff/gpx-any-source/dup-audit-wa.mjs` (read-only; every
   route the session's rollbacks touched + every route on those peaks).

## Steps (replace `wa` / `WA` with the state)

```bash
# 0. worktree with credentials (CLAUDE.md: copy .env, .env.local, supabase/.temp; junction node_modules)
D=research-data/gpx-any-source-<st>-<date>; mkdir -p $D/harvest
node scripts/oneoff/gpx-any-source/worklist.mjs <st> $D/worklist.json        # live: routes needing a track (ids first, then 40 at a time: a gpx range scan timed out and slowed prod)
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
Search: `/object_list.php?object_type=1&object_name_1=<name>&state_province_1=<State>` — UNRELIABLE: a page
with no state field (Chair Peak) is missed and a generic list comes back instead. The NEARBY search behind
every page's Lat/Lon, `/object_list.php?object_type=1&distance_lat_1=<lat>&distance_lon_1=<lng>`, lists pages
by distance and finds them: `sp-harvester.js` tries it first, then the name search, and accepts a page only
when its slug carries the name's words AND its Lat/Lon is within 2 km. GPX files are RARE (2 of ~34 route
pages sampled): `download.php?f=<id>.gpx`, real recorded tracks; the harvester drops `<time>`. Paste it on
the robots.txt tab; re-pasting RESUMES (keeps found peaks). It saves ONE file at the end (`sp-<st>.json`).

SummitPost traps paid for on WA (2026-11-04):
- **Cloudflare re-challenges SEARCH urls every ~30 min** while plain pages still load. The first WA run
  logged 210 "not found" peaks that were only blocked. `get()` now waits (`__SP.blocked`) and retries; clear it
  by opening any `object_list.php` search in a SECOND tab of the same window (cookie shared, the harvest tab
  keeps its state), then close that tab. Poll `blocked` every ~20 min.
- **Chrome blocks the 2nd automatic download from a site** (no prompt in the page, nothing in Downloads, not even
  from a real click). The owner must click "Always allow" for summitpost.org (a site setting: ask). Before that,
  put the data in the site's IndexedDB so a reload cannot lose it.
- **Metadata:** paste `sp-gpx-meta.js` after the harvest (one file, `sp-<st>-meta.json`).
- **Dates:** the first `<time>` in a file is often `<metadata>` = the EXPORT date (ten WA files said
  2013-09-25..27). Take the first TRACK POINT's time (`sp-<st>-dates2.json`).
- **Recorded or nothing:** fetch each file again for `{n, nt, distinct, spanH, mono, creator}`
  (`sp-<st>-recorded.json`). GPSies files had model-smooth elevation and synthetic times (Mount Baker in 1.2 h,
  2010-01-01 stamps): drawn or resampled, refused by `sp-to-harvest.mjs`. MapSource files with GPS elevation
  noise are recordings, most without times, so undated: their season must come from research or they fail.
  WA result: 226 of 363 peaks found, 33 GPX files, 12 recordings, 4 dated.
- A sub-peak (Sherman Peak) lists its parent's route pages: the same file appears on both. It fails the
  100 m summit test on the sub-peak, and the tracks stage refuses one file on two peaks anyway.

## Peakbagger traps already paid for

- The ascent list shows only the MOST RECENT YEAR unless `&y=9999` (Liberty Bell: 42 -> 781).
- Header cells use NBSP (`Ascent&nbsp;Date`); match after replacing ` `.
- A one-cell "Summary" row can wrap the whole page: a section label over 40 chars is not one.
- `javascript_tool` blocks output containing query strings: return counts/text, never hrefs.
- The area name can be a catalog label ("Comb, The Routes", "Main Peak"): `names()` tries variants and
  every match must be within 2 km of our coordinate.
