# Repairing fabricated waypoint coordinates, by machine

`audit:synthetic-waypoints` finds pins whose coordinates were **computed rather than surveyed** — a
decimal expansion like `-121.16888095238095` is arithmetic, and a run of pins holding one bearing to
0.2% is interpolation. Three passes had repaired 353 of 1,155 WA pins (gazetteer, in-row copy, and
eight batches of agent research) before these scripts existed.

**The rest was reported as "structurally unresolvable". It was not.** That verdict came from the
research worklist, and the worklist selected on a **deny-list** of motion verbs — so every
`"Grouse Creek crossing"` was thrown out as an instruction rather than a place. The verb says how you
get there; the noun still says where it is. ~171 mechanically solvable pins had never been offered to
any batch.

None of these scripts uses an agent. Each locates a pin from a public record and lets gates decide.

## The pipeline

| script | what it does |
| --- | --- |
| `classify-remaining.mjs` | buckets every still-fabricated pin by how it could be located |
| `solve-fords.mjs` | named watercourse × mapped way (NHD flowline × TNM trail/road) |
| `solve-junctions.mjs` | two named trails, or a trail × a named creek |
| `solve-camps.mjs` | named camp from an OSM corridor sweep |
| `solve-trailheads-inrow.mjs` | the route's own `approach_logistics` second copy |
| `solve-trailheads-sibling.mjs` | the same trailhead recorded by another route in the catalog |
| `solve-trailheads-osm.mjs` | named trailhead / parking in OSM |
| `apply-citation-confirmed.mjs` | gate 6 — re-fetch an agent's cited record from its own authority |
| `recompute-derived.mjs` | redo a proposal's own computation from the primary sources |
| `is-it-a-saddle.mjs` | DEM ring test: is a claimed col actually a col? |
| `apply-solved.mjs` | write a solver's output, re-gating against the live row |
| `measure-remaining.mjs` | how much is left — compares against the ORIGINAL coordinates |
| `reconcile-count.mjs` | PATCHes issued vs pins that actually moved |

Solvers are read-only and print a dry run; `--apply` writes. Every write is re-read through the
**anon** role before it is counted. Set `WP_DATA_DIR` to the directory holding `fab-pins.json`.

## Rules these encode, each of which was learned the hard way

**Run a CONTROL through the identical path first.** Every solver's expected output is "a
plausible-looking coordinate" — exactly what a broken one emits. `solve-fords` is pointed at a ford
already established by other means and must reproduce it to 0 m; `solve-camps` at three camps
confirmed by OSM id. The camp control is the only reason a client-side encoding bug was found instead
of the whole 91-pin class being written off as unmapped.

**Disambiguate on the DEM, never on proximity to the pin being replaced.** The fabricated pin is the
thing under repair; letting it choose among candidates lets the defect pick its own repair. The
route's *claimed elevation* is a different field and is fair evidence.

**Refusing to choose is a result.** Several candidates → AMBIGUOUS and reported.

**An empty answer is not a negative result.** These endpoints all produce false absences:
- GNIS **layer 0 cannot be queried** (Group Layer); lakes are layer 7, landforms 5, and the columns
  are `gaz_id`/`gaz_name`, not `feature_id`/`feature_name`.
- NHD flowlines are **layer 6**, not 2.
- Overpass gave three different false negatives (a Switzerland-only mirror answering `[]`/200; an
  unescaped POST body drawing 406; an outright block). Use `api.openstreetmap.org`, tiled.
- **HTTP 400** from that endpoint means *ask for less* — subdivide. **HTTP 509** is a rate limit, so
  the question was never asked; the first camp run lost 35 of 91 to it and they were only recoverable
  because they were filed as "could not ask" rather than "not mapped".

**The apply policy differs by class, and getting it backwards writes wrong data.** For a ford, an
elevation disagreement suggests the crossing found is the wrong one — hold it. For a camp or a
two-named-trail junction with an **exact** name match, the position is fixed and the disagreement
indicts the elevation. What separates them is how tight the name match is, not the size of the gap.

**A name is not an identity.** Two "White River Trailhead"s sit 130 km apart. A donor coordinate must
also be plausible for *this* route's own summit.

**Count what changed, not what was written.** A successful PATCH is not evidence a value moved; many
flagged pins were already correct and their "repair" is a no-op. `measure-remaining.mjs` compares
against the recorded originals.
