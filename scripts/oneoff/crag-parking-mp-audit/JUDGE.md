# Crag parking pin judge

You are auditing PARKING PINS on climbing areas (crags / walls / regions). Each pin was placed by an
automatic pass that matched an OpenStreetMap lot by NAME, often only because the lot shared a word with a
PARENT area ("Calico I" lot pinned on a Calico Basin crag that is actually reached from the other side of the
hill). The owner reports many pins are wrong. The reference for where climbers park is Mountain Project's
text for the area, its parents, and areas it says to "approach as for".

Input: a JSON array of groups. Each group:
- `pin.name` — the current pin's name.
- `areas` — the area(s) using this pin, each with `pin_km` (straight-line km from the area to the pin) and
  `pin_dir` (compass direction from the area TO the pin). `n_areas` is how many share the group.
- `our_note` — our own parking note (may be null).
- `mp` — Mountain Project sentences: `[own Getting There]` is the area's own approach text, `[own]` its own
  description, `[parent X]` a parent area's text, `[see X]` the text of an area it refers to.
- `cands` — other lots near the FIRST area: index `c`, name, kind, km and dir FROM the area. Some are (kind `parking`/`trailhead`/`picnic`)
  OSM lots, some (kind `pin`) are pins other areas already use.

Decide ONE verdict per group:
- `keep` — the MP text is consistent with the pin: it names the pin's lot (allow spelling variants,
  e.g. "Red Springs" = "Red Spring Picnic Area"), or describes parking at a road/pullout/trailhead the pin
  plausibly is, or the text is too vague to contradict it. Also `keep` if MP only gives driving directions
  that end in the pin's general place.
- `move` — the MP text clearly says to park somewhere ELSE than the pin AND one of `cands` is that place
  (its name matches what MP names, or it is unambiguously the described lot). Give `c`.
- `wrong` — the MP text clearly says to park somewhere else than the pin (a different named lot, a
  different road, the opposite side of a ridge/canyon, a different trailhead), and no candidate is
  clearly that place. Give `park_at`: the place MP names, as short as possible (e.g. "Red Spring picnic
  area lot", "pullouts on Assisi Canyon Dr at Sandstone Dr"), and `near`: the road/town context to find it.
- `unsure` — you cannot tell.

Be strict about `move`/`wrong`: only when the text gives a real contradiction, not just a missing name.
Distance alone is not a contradiction, but a pin 2+ km away in a direction opposite to where the text says
the approach comes from IS. A pin named after a different named feature than the one MP says to park at
(e.g. pin "Calico I", MP says "park at Red Spring") is a contradiction. If several areas in a group differ,
judge for the group as a whole (they share the text).

`note_conflict: true` if `our_note` names a different parking place than MP does.

Output: write ONLY a JSON array to the output file you are given, one object per group:
`{"gid":"g12","v":"keep|move|wrong|unsure","c":3|null,"park_at":null|"...","near":null|"...","note_conflict":false,"why":"<=20 words"}`
Every gid in the input must appear exactly once. Do not research online; judge only from the input.
