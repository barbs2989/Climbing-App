# Brief: are these two Oregon route rows ONE climb? (2026-11-05)

ClimbMatch's catalog sometimes holds one climb twice on the same area, under two names (an import that
added a letter suffix like "[E]", a "Left Jam" written as its own row, a peak's trail filed beside its
ridge route). The owner asked for research on every candidate pair, and the parent session acts on your
recommendation. **You write nothing to any database, run no script that touches Supabase, and edit no
file except your own output file.** Paths are relative to `C:\Users\nate_\dev\wt-gpx-any-source-or`.

## Input
`research-data/gpx-any-source-or-2026-11-05/dupes/pairs.json`: an array; each entry has `key`, `area`
(id, name, path, lat/lng), `why` (the census signals: they are only a reason to look, never proof), and
the two full stored rows `a` and `b` (name, discipline, grade, pitches, length, fa, description,
overview, beta, location, waypoints, alt_names, variations...). Your keys are listed in your prompt.
Read them with node, e.g.
`node -e "const P=require('./research-data/gpx-any-source-or-2026-11-05/dupes/pairs.json');const k=['p001'];for(const p of P.filter(x=>k.includes(x.key)))console.log(JSON.stringify(p,null,1))"`

## How to decide
1. Read BOTH rows in full first. Same first ascent + same grade + same description of the line = strong.
   A different FA, a different grade beyond a letter, a different start/finish, or text describing a
   different crack/face = distinct. "Left Jam" beside "Second Column" may be a separate line on that column.
2. Research online: Mountain Project (route and area pages; its area page lists every route on the wall in
   order, with left-to-right position, which settles most crag pairs), the crag's guidebook-derived pages,
   SummitPost, Peakbagger, Oregon Hikers, USFS. WebFetch may 403 on some sites; record what you tried.
   A letter suffix like "[E]" or "[L]" is often a guidebook's map letter, not a different climb.
3. Verdict per pair:
   - `same`: one climb. Say which row to KEEP: the one whose name is the climb's real name (no suffix,
     no copied wall prefix) and/or whose row holds more content. List the DROPPED row's columns that hold
     content the kept row lacks (`move`), and any alt name worth keeping (`alt_names`, e.g. the dropped name
     if climbers use it).
   - `distinct`: two climbs. Say how they differ, in one sentence.
   - `unsure`: say what would settle it.
   - If a row's NAME or other field is plainly wrong (e.g. a wall prefix pasted into the name), you may
     propose a `patch` with the corrected value, in our own words.
4. Mountaineering = non-technical walk-up; scrambling never roped; any roped rock or 5.x on a peak = alpine.

## Output
Write `research-data/gpx-any-source-or-2026-11-05/dupes/verdicts/<your group number>.json`:
```json
[ { "key": "p001", "verdict": "same|distinct|unsure", "confidence": "high|medium|low",
    "keep": "<row id>", "drop": "<row id>", "move": ["description", "fa"], "alt_names": ["..."],
    "patch": { "id": "<row id>", "set": { "name": "..." } },
    "why": "the evidence, plainly", "evidence": ["URL — what it showed"] } ]
```
Omit keep/drop/move for `distinct`/`unsure`. Never write a run of 6+ words copied from a web page into
any proposed value. No source, site, book or person is named in a proposed value.
Helper scripts: give them a unique name containing your group number and delete them when done.
Return a 3-line summary: pairs read, same/distinct/unsure counts, anything the parent should know.
