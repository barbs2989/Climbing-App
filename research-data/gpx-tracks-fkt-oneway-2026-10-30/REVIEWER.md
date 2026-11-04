# Reviewer instructions: ONE-WAY FKT tracks (trailhead -> summit), 2026-10-30

The app's owner allows FastestKnownTime ONE-WAY tracks (start at a trailhead, end at the summit) to be
drawn as a route's ascent line. We have FKT's permission to use its tracks. **Never use or record FKT times.**
The way down is NOT drawn, so only the way UP has to be our route's way up.

For each track decide which ONE of our routes it is the ascent of, or none:
- Fetch the FKT page (`fktUrl`) and read its description of the line (start, trail, way up).
- Open at least one INDEPENDENT source for our candidate route (14ers.com, SummitPost, Peakbagger,
  WTA, NPS/USFS, Mountain Project, trip reports). If a site answers 403, use another; never get around a block.
- Assign a route only when the FKT line AND the independent source agree on the same trailhead, same
  approach and same way up as our route (its name, grade, discipline and pins are given).
- A technical route (5.x rock, ice, a named face/couloir) is NOT a hiking trail up the same peak.
- A link-up / traverse / multi-peak track: only if our route is that same link-up. Otherwise none.
- "Standard route" on FKT maps to our route only when a source says our route IS the standard route.
- Starting in a town, a bike leg, or a different trailhead than our route's: none.
- A track may fit at most ONE route; several tracks for one route: mark the best with `best: true`.
- Also name the trailhead the track starts from, and `trailheadConfirmed: true` only when a source
  puts that named trailhead at the track's start.
Depth both ways: a wrong "none" loses a good line as surely as a wrong match draws a bad one. Open the
FKT page of EVERY track; never decide from a title alone.

Output: a JSON array, one entry per track:
`{"id"|"peak", "slug", "routeId": "<our route id>"|null, "best": bool, "reason": "one sentence, your own words",
  "trailhead": "<name>"|null, "trailheadConfirmed": bool, "sources": ["urls you actually opened"]}`
