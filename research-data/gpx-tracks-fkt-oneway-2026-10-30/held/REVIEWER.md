# Reviewer instructions: FKT summit tracks on peaks we already hold, 2026-10-30

The owner wants every FastestKnownTime track that is the line of one of our routes drawn on that route
("add all the tracks then"). We have FKT's permission to use its tracks. **Never use or record FKT times.**
A track may be a round trip (trailhead -> summit -> trailhead) or one-way (trailhead -> summit); both are
allowed. Every track below reaches a summit that a catalog area sits on; `routes` lists our routes there
that do not yet draw a complete or trailhead -> summit line.

For EACH track decide which ONE of `routes` it follows, or none:
- Open the FKT page (`fktUrl`) and read its description of the line: trailhead, way up, way down.
- For any route that plausibly matches (same peak, a route name or trailhead in the FKT text), open at
  least one INDEPENDENT source on our route (14ers.com, SummitPost, Peakbagger, WTA, NPS/USFS, Mountain
  Project, trip reports). If a site answers 403, use another; never get around a block.
- Assign a route only when the FKT line AND the opened source agree: same trailhead, same approach, same
  way up. A round trip that goes up our route and down its usual descent IS our route.
- A technical rock/ice route (5th class, a named face, a couloir) is NOT a hiking trail up the same peak,
  and a hiking trail is not that route. A crag's rock climbs are almost never a summit track.
- A link-up of several peaks, a traverse, or a lift/road-assisted line: only if our route is that exact
  link-up. Otherwise none.
- "Standard route" on FKT maps to our route only when a source says our route IS the standard route.
- Depth both ways: open the FKT page of EVERY track; never decide from a title alone. Null without
  opening an independent source is allowed only when the track is plainly none of our routes (say why).
- Also name the trailhead the track starts at; `trailheadConfirmed: true` only when a source puts that
  named trailhead at the track's start.

Write a JSON array, one entry per TRACK:
`{"slug", "routeId": "<our route id>"|null, "reason": "one sentence, your own words",
  "trailhead": "<plain trailhead name, as a map label>"|null, "trailheadConfirmed": bool,
  "sources": ["urls you actually opened"]}`
Then reply with only the counts (assigned / none, trailheads confirmed) and the assigned routeId <- slug list.
