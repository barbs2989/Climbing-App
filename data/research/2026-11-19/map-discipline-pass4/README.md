# Map-discipline research pass 4 — BLOCKED, no new findings

Worklist: 270 routes (verified.json `stuck` + weak `hold`, minus the 3 skipped ids), split by peak into
25 chunks in `in/q01..q25.json`.

## Result
- Ran: q01-q08 (88 routes). found: 3 (all in q02: Booker NW, Castle Peak CA via Castle Pass, Cathedral Peak
  S Ridge). Those 3 rest on placements carried from earlier passes and were NOT re-read this run, so
  verify before applying. stuck: 85. q09-q25 were NOT run: the first wave showed the network was
  blocked, so more waves would only have repeated it.
- Cause: this session's network policy allows none of the research hosts. WebFetch: ENOTFOUND for
  wta.org, summitpost.org, wikipedia.org, mountaineers.org, climber.org, adirondackhub.com and others.
  The egress proxy returned 403 for nominatim.openstreetmap.org, apps.fs.usda.gov, climb13ers.com,
  AllTrails, summitpost.org. WebSearch worked, but summaries are not evidence.
- Fix: allow those hosts (plus peakbagger.com) in the environment's network settings, then re-run
  the chunks in `in/` (the same prompt works).

## Most notable leads kept in the out files (prior-pass notes, not new evidence)
1. Chianti Spire (2) and Cliff Mountain: trailhead named by own text (SR 20 pullout near MP 166; Upper
   Works, Newcomb), no placement; needs a script-side OSM/USFS name match.
2. Donaldson Mountain (Corey's Road parking) and Diamond Peak SW Ridge (Pioneer Gulch): same.
3. Earl Peak: identity strong (Standup Creek Trail #1369), but prior WTA and OSM placements are ~2 km apart.
4. Enchantment Peak: own text names two starts (Stuart Lake, Snow Lakes); nothing ties it to one.
5. Chimney Rock (5) and Chair Peak (2), Charybdis: still peak-level inference only; leave stuck.
