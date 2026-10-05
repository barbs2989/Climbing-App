# Brief: research and write waypoint "Getting here" directions

You are filling the `directions` field on climbing-route waypoints in the ClimbMatch app. Each waypoint
renders as a card on the route page; when `directions` is non-empty the card shows
**"Getting here — <your text>"** inside that waypoint's own card.

## What the field means — POSITIONAL, read this twice

- `waypoints[i].directions` answers **"how do I get to waypoint i FROM waypoint i-1"**.
- **Index 0** has no predecessor. When it is a Trailhead, its directions are **the drive**: from the
  nearest highway/town (name the highway, exit, turn-offs, forest-road numbers, final road-end / lot, and
  permit/pass needed to park if known). Example of the house voice:
  *"From I-90 Exit 62, follow Kachess Lake Road to FS Road 4930 and drive to the road end at about
  2,800 ft. A Northwest Forest Pass and a self-issued wilderness permit are required."*
- If index 0 is NOT a trailhead (a camp, a hut, a summit), write the shortest honest description of how one
  reaches that first point (e.g. the trailhead and trail used to reach it), or leave it "" if that is unclear.
- Index i ≥ 1: the leg from the previous point — trail names/numbers, junctions and which way to turn,
  stream crossings, where the trail ends and cross-country/snow begins, gullies, cols, glaciers, the
  line to a summit. 1–3 sentences, concrete, written for a climber standing at waypoint i-1.

## Where to get it

1. The route's own on-file prose in your context file (`approach`, `approach_logistics`,
   `approach_variants`, `itinerary`, `route_breakdown`, `climbing_route`, `descent_text`, waypoint `note`s).
2. **Online research** (WebSearch / WebFetch) to fill what the prose does not cover — prefer land-manager
   pages (USFS, NPS, state parks/DNR), WTA trail pages, Summitpost, Peakbagger, Mountain Project route
   pages, trip reports. Drives especially: confirm road numbers and the turn sequence.
3. Use the coordinates/elevations/distMi of the pins themselves to sanity-check direction of travel
   (which side of a ridge, N vs S). A direction that contradicts the pins is wrong.

## Hard rules

- **NEVER name or cite a source in the text.** No "per WTA", "according to Summitpost", "Beckey says",
  "MP reports", no URLs, no "guidebook". The app has a standing rule: no sources anywhere on screen.
- **Write for a climber, not about our data.** No "the prose says", "the waypoint is stored at",
  "our record", "this entry", "pipeline", "coordinates show". No meta-commentary.
- **Leave "" when you are not confident.** An invented turn at a junction is worse than no text.
  Only write what the route's own prose OR a credible online source actually supports.
- **Do not contradict the route's own records.** If the on-file prose and the pins (or two on-file
  fields) disagree about which way to go or which trailhead, do NOT pick one in the field: write only
  what everyone agrees on, or "", and report the conflict.
- **If the row's approach / approach_logistics name a DIFFERENT trailhead than waypoint 0**, or two
  trailheads are spliced into the list, write NO drive — report it.
- **Match the waypoint's trailhead.** The drive must lead to the trailhead *this* waypoint names and sits
  at (check lat/lng) — not a different trailhead mentioned elsewhere in the row.
- **Never write a leg that works around a broken array.** If the waypoints are not in the order a
  party actually travels (a lake listed before the turnoff that leads to it, a summit before a camp,
  two different approaches spliced together), do NOT write "side trip", "walk back to", "return to the
  junction", or a leg worded to "read correctly regardless of slot". Leave EVERY leg (index ≥ 1) of that
  route "" — you may still write index 0 if it is the trailhead — and report the ordering fault.
- **If the row's own prose calls the line the pins follow "the error" / "the wrong way" / "a common
  mistake"**, the row is split: leave those legs "" and report it. Do not decide which half is right.
- **A pin on the wrong feature blocks its legs.** If a waypoint's pin is clearly not at the place its name
  says (>~1 km off, on the wrong side of the peak, on a different summit, or a camp pin 1,000+ ft below the
  camp it names), leave the legs INTO and OUT OF that waypoint "" and report it.
- **A leg must arrive at the point its card names.** If waypoint i is "Mount Stuart summit" but the
  route stops at the top of the wall, do not write a leg that ends somewhere else — leave it "" and report.
- **Verified facts other agents established** (rows' prose often gets these wrong — do not copy the error):
  the Colchuck Lake Trail forks LEFT off the Stuart Lake Trail at the ~2.5 mi junction; the trail around
  Colchuck Lake follows the WEST shore toward Aasgard Pass; the Longs Pass trail is #1229 (not 1391).
- **Never overwrite** an entry that already has text: return "" for those positions.
- If `mode` is `drive-only`, ONLY index 0 may be non-empty; everything else must be "".
- Avoid dated status claims ("closed this year", "washed out in 2023") unless the closure is long-standing
  and still in force per a current land-manager page; prefer durable directions. Mentioning that a road is
  gated/rough/high-clearance is fine when it is a stable fact.
- Units: feet and miles, as the rest of the app does. Plain sentences, no markdown, no bullet lists.
- Keep each string under ~450 characters.

## Output

For your assigned route ids, write ONE JSON file at the path you are given:

```json
{ "<route_id>": ["drive text or \"\"", "leg 1 text or \"\"", ...], ... }
```

The array length MUST equal that route's waypoint count. Omit a route entirely if you write nothing for it.
Validate with `node -e 'JSON.parse(require("fs").readFileSync("<path>","utf8"))'`.

Also write a short report at the same path with `.report.md` instead of `.json`: per route, how many
entries written, which were left blank and why, and **any defect you noticed** in the row (pins on the wrong
side, two trailheads spliced, prose that contradicts pins, wrong elevation, a note telling a climber the
wrong thing). Defects are valuable — report them, do not fix them.

Do NOT write to the database, do not edit the repo. Your only outputs are those two files. Return a
3–5 line summary (counts + the most important defects).
