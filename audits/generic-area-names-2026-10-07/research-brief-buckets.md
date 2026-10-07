# Research brief: where does each area inside a discipline BUCKET really belong?

You are helping restructure a climbing app's area tree (USA/Canada, data originally from a large climbing
database export). Some states have an area named only by discipline — "CO Ice & Mixed", "NH Ice and Mixed",
"CT Bouldering", "Alpine Rock", "Quebec Ice, Mixed & Alpine", "Ice Climbing" — sitting directly under the
state. The owner wants areas to be PLACES, not disciplines: the bucket will be removed, and each of its
children must go to its real geographic home.

Input: a JSON packet file (path given in your task). Each packet has a `bucket`, the `state` (with its
`top_level_regions`), and `children`. Each child has its name, climb count, a `centroid` (WARNING: some
centroids are placeholders — if several children share near-identical nearest lists, or the nearest areas
make no sense for the name, ignore the centroid and research by name), its `sub_areas`, and
`nearest_real_areas` (id, breadcrumb, climbs, km, holds_climbs_directly).

For EACH child decide ONE action:

- `fold_into` + `target_id`: the child is THE SAME PLACE as an existing area (e.g. "Georgetown Ice" is the
  ice climbing at Georgetown → fold into the Georgetown area; "Boulder Canyon - Ice" → Boulder Canyon;
  "RMNP - Mixed/Ice" and "RMNP - Rock" are both Rocky Mountain National Park). Its sub-areas and climbs will
  be merged into the target. Use only when it really is the same place (same canyon/park/mountain/town).
- `move_under` + `target_id`: the child is a distinct place INSIDE a larger existing area (a canyon inside a
  region, a peak inside a range, a crag inside a park). It keeps its own name and becomes a sub-area there.
  The target must NOT have `holds_climbs_directly: true` (an area holds either climbs or sub-areas).
- `stay_at_state`: no existing area contains it; it stays as its own area directly under the state. Prefer
  this over a forced, doubtful placement.

Optional, only with evidence: `rename_to` — a cleaner real name for the CHILD when it stays/moves and its
name carries a discipline tag that becomes redundant ("Vail Ice" moved under Eagle/Vail → still fine to
keep; only rename if the place has a clearly better real name). And `target_rename_to` — when folding into a
target whose OWN name carries a discipline tag (e.g. "Ouray vicinity (rock)" receiving Ouray's ice → "Ouray").
Never rename to anything containing only discipline words.

`target_id` must be an id that appears in the packet (any child's `nearest_real_areas`, or another child of
the same bucket if two children are the same place — then fold one into the other). If the right home is an
area NOT listed, give `target_breadcrumb` (exact breadcrumb text as you'd expect it under the state) instead
of an id and I will resolve it.

Research: use WebSearch / WebFetch to confirm locations (climbing guide sites, land-manager pages, maps,
Wikipedia). Location facts only — do not copy prose. Be fast: one or two lookups per child is enough; many
are obvious from the name (a town, canyon, peak or park) plus the breadcrumbs offered.

Output: write a JSON array to the output path given in your task, one object per child:
`{"child_id": "...", "child_name": "...", "action": "fold_into|move_under|stay_at_state", "target_id": "...",
"target_breadcrumb": "...", "rename_to": null, "target_rename_to": null, "confidence": "high|medium|low",
"evidence": "one line: why, and the source URL if you looked one up"}`.
Every child must appear exactly once. Then reply with a 3-line summary (counts per action, anything odd).
