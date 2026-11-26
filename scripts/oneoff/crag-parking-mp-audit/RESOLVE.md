# Crag parking: place the lot Mountain Project describes

Each group's current parking pin was judged WRONG: Mountain Project's text says climbers park somewhere else.
Your job: pick, from `cands` (OpenStreetMap parking lots / trailheads / picnic areas within 4 km of the
area, and pins other areas already use), the ONE that is the place MP describes — or say none fits.

Input groups have: `gid`, `pin` (the wrong pin's name), `park_at` and `near` (what the first judge read MP
as saying), `mp` (the MP sentences), `areas` (with km/dir to the old pin), and `cands` (index `c`, name,
kind, road, km and dir FROM the first area).

Rules:
- Pick a candidate only if it is clearly MP's place: its name matches the lot/trailhead/picnic area MP
  names (spelling variants fine: "Red Springs" = "Red Spring Picnic Area"), or MP describes an unnamed lot
  and exactly one unnamed candidate fits BOTH the described road (its `road` or name) and a plausible
  distance/direction (e.g. MP: "park at the end of X Road, walk 10 min north" -> a lot S of the area,
  under ~1 km). Never pick a candidate only because it is closest.
- Never pick a candidate equal to the old wrong pin.
- `name`: the label climbers will see, in plain words, <= 60 chars, no source names, no "per MP". Use the
  candidate's name if it has a good one, else a short description of the spot ("Assisi Canyon Dr roadside
  pullouts").
- Special case: if the old pin is within ~0.3 km of the area (`pin_km`) and MP says climbers park right
  by the climbs (roadside, "seconds from the car", a pullout below the wall), the SPOT is likely right and
  only its NAME is wrong: answer `c: -1` with a corrected `name` (keeps the old coordinates).
- If none fits: `c: null`. The old pin will be removed so the page stops naming the wrong lot.

Also, for EVERY group where `has_note` is false, write `note`: one or two short sentences, IN YOUR OWN
WORDS (never copy MP's phrasing; no run of 6+ words in common with it), telling a climber where to leave
the car, e.g. "Park in the roadside pullouts where Assisi Canyon Dr meets Sandstone Dr, or at the Red
Spring picnic area lot." Facts only from MP's text; no source names, no walking directions beyond one
clause, 20-300 characters, no ALL CAPS. If `has_note` is true, `note: null`.

Output ONLY a JSON array to the file you are given, one object per input group:
`{"gid":"g12","c":4|null,"name":"..."|null,"note":"..."|null,"why":"<=20 words"}`. Every gid exactly once. No web access.
