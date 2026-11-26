# Judge: is the place Google's directions end the crag's parking?

The app's "Directions in Google Maps" button, for a crag with no parking pin, sends the climber to the crag's own
coordinate. A maps app then routes to the nearest point of the drivable road network: the `road_point` below. The
owner noticed this point is often exactly where climbers park and wants it pinned as the PARKING SPOT, but only
where it is CONFIRMED by an independent record: a mapped parking lot or trailhead there, and/or the crag's written
approach text naming that place.

Input: a JSON array of groups. Each group:
- `areas` — the crag(s)/wall(s) sharing this road point (`under` is the path above them).
- `road_point` — the road the directions end on, how far it is from the crag (`m_from_crag`) and which way.
- `cands` — mapped lots/trailheads, index `c`: `m_from_road_point`, `km_from_crag`, `dir_from_crag`, name, kind,
  access, fee. `lots_at_road_point` of them (the first ones) are within 200 m of the road point; the rest are other
  lots within 1.5 km of the crag.
- `our_note` — the app's existing parking note for the area (our words; may be empty).
- `text` — Mountain Project Getting There text of the area, walls beneath it, or (when it has none) neighbouring
  walls. This is how climbers describe parking.

Decide ONE verdict per group:
- `lot` — pin mapped lot `c`. Give it when the lot is at or very near the road point (normally one of the first
  `lots_at_road_point`) AND either (a) the text/note names or plainly describes that lot, its road, pullout or
  trailhead, or (b) there is no text about parking, nothing contradicts it, and the lot is plainly the crag's own
  (named after the crag/its trail/park, a trailhead, or the only lot there and ≤ 800 m from the crag). You MAY choose
  a lot from the alternatives instead when the text clearly names it (that is MP correcting Google); say so in `why`.
- `roadside` — pin the road point itself. Only when no mapped lot fits, the text clearly describes parking on that
  road's shoulder / a pullout / road end right where the walk starts (the road name or an unmistakable description
  matches `road_point.road`), and `m_from_crag` ≤ 600. The text must put the parking AT the point nearest the crag:
  "park below the crag", "visible from the road", "roadside", "a minute/two/five from the car", "park at the end of
  X road" when the road point is that road's end. If the text parks you at a junction, a gate, an entrance, a
  bridge, a mile marker or a "corner" that the road point is not shown to be, it is `unsure`, not `roadside`.
- `no` — the text or note says to park somewhere else (another road, the far side of a ridge/river, a different
  trailhead, a lot it names that is not here), or the road point is plainly not a parking place (a highway with no
  pullout described, a private road/driveway, a gate the text says is closed, a residential street the text says
  not to use), or the text says there is no parking / access is closed.
- `unsure` — anything else. Do not guess; unsure is a fine answer.

Rules:
- Parking lots that are private, customers-only or for a business (a store, restaurant, church, school) are `no`
  unless the text says climbers park there.
- A residential street is `no` unless the text says to park on it.
- If different areas in a group would get different answers, judge the group by its FIRST area and list in `drop`
  the ids of any area the answer does not fit.
- `name`: for `lot`/`roadside`, a short label for the pin in plain words, ≤ 60 chars, e.g. "Echo Lake trailhead lot",
  "Pullout on Norris Peak Rd", "Upper parking lot". Use the lot's mapped name when it has one (drop words like
  "Parking Lot" duplication). NEVER name a website, guidebook or person in it.
- `why`: ≤ 25 words: what confirms it (e.g. "Text: park at Echo Lake TH; mapped TH 40 m from road point").

Output: write ONLY a JSON array to the output file you are given, one object per group:
`{"gid":"g12","v":"lot|roadside|no|unsure","c":0|null,"name":null|"...","drop":[],"why":"..."}`
Every gid in the input must appear exactly once. Do not research online; judge only from the input.
Write the file with the Write tool, then run `ls -la <file>` to confirm it exists.
