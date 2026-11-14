# Reviewer instructions: assign FKT tracks to routes, PER PEAK

The app's owner wants each route's map to show the **full route line, trailhead → summit → trailhead**,
accurate to THAT route. We have FastestKnownTime's permission to use its route tracks. A drawn
(planner) line is fine if it is accurate. **Never use or record FKT times.**

Each item in your batch file is ONE PEAK:
- `routes`: every route we list on that peak (id, name, discipline, grade, our description/approach/descent).
- `tracks`: every FKT track that reaches this peak's summit (within `summitM` metres) and returns to its
  own start (a round trip). `fktUrl` is the FKT route page; `start` is where the track begins.

For EACH track decide:
1. **Which ONE of our routes it follows, or none.** Read the FKT page's description of its line
   (fetch `fktUrl`). Then open at least one INDEPENDENT source that describes our candidate route
   (WTA, SummitPost, Peakbagger, 14ers.com, NPS/USFS, The Mountaineers, Mountain Project, trip
   reports, guidebook excerpts). If a site answers 403, use another; never get around a block.
   - Assign a route only when the FKT page's line AND the opened independent source agree it is that
     route's line: same trailhead, same approach, same way up.
   - A link-up of several peaks or a traverse: assign it only if OUR route is exactly that same
     link-up or traverse. Otherwise none.
   - A loop UP our route and DOWN its usual descent IS our full route (owner: trailhead -> summit ->
     trailhead). Many climbs descend another way (e.g. up Blitzen Ridge, down Donner Ridge). Check
     our route's descent text, or a source's stated descent for our route; if the track's way down
     is that descent, assign it. A loop up ANOTHER route (not ours) is none.
   - FKT's "standard route" maps to our route only when an opened source says our route IS that
     peak's standard route.
   - If no opened independent source confirms it, the track gets no route (`routeId: null`).
2. **The trailhead at `start`.** Name the trailhead the track starts from, and say whether a source
   (USFS/NPS, WTA, 14ers.com, a trailhead page, the FKT page itself naming it) puts that trailhead at
   this start point. `trailheadConfirmed: true` only when confirmed; otherwise false.

**Depth is required both ways.** A wrong "none" throws away a good track as surely as a wrong match
draws a bad one. So:
- Open the FKT page of EVERY track in your batch. Never decide from the title alone.
- For every track whose FKT line plausibly matches one of our routes (same peak, a route name or
  trailhead that appears in our route's name or text), open at least one independent source before
  deciding. "No independent source opened" is not a reason for null unless you tried and every
  source you tried was blocked or silent; say which you tried.
- Null without research is allowed only for tracks that are plainly not any of our routes (e.g. a
  multi-peak link-up when none of our routes is a link-up). Say why.

A track may fit at most ONE route. Several tracks may fit the same route; then say which is the best
(the one that follows our described line most closely) with `best: true`.

Write a JSON array to the output path you are given, one entry per TRACK:
`{"peak","slug","routeId": "<our route id>"|null,"best": true|false,"reason":"one sentence, your own words","trailhead":"<name>"|null,"trailheadConfirmed": true|false,"sources":["urls you actually opened"]}`
Then reply with just the counts (tracks assigned / none, trailheads confirmed).
