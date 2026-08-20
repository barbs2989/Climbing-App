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
| `solve-gazetteer.mjs` | GNIS name lookup for whatever is left (see the negative result below) |
| `triage-gazetteer.mjs` | splits gazetteer hits by feature GEOMETRY — point vs linear vs areal |
| `measure-remaining.mjs` | how much is left — compares against the ORIGINAL coordinates |
| `measure-confirmed-pin-elevations.mjs` | does the ground agree with the repaired pins? |
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

## The gazetteer cannot finish this, and the reason is geometric

`solve-gazetteer.mjs` asked GNIS for every remaining named pin. **15 name hits, 0 applicable.** That
is a real negative result and it is recorded here so nobody spends another pass on it.

An earlier probe had already concluded "not in GNIS", and **that verdict was reached by a crash**: it
read `f.geometry.y` on every layer, but **layer 5 (Landforms) returns `{points:[[x,y]]}` while layer 7
returns `{x,y}`**. So every landform hit came back `undefined` and the probe died on the first one
(*Spider Meadow*) after printing three "(not in GNIS)" lines. Layer 5 is exactly where passes, basins,
ridges, notches and summits live — most of what is left. Same family as the group layer and the
unescaped POST body: the endpoint answered, the reader could not hear it. **Handle both shapes.**

Asked properly, the class still does not resolve, for a better reason — **a label point cannot locate
an edge**:

- **8 of 15 hits are LINEAR or AREAL features.** GNIS publishes one coordinate per feature. For a
  Summit, Gap, Lake or Falls that coordinate *is* the place; for a Stream, Ridge, Basin or Flat it is
  a cartographic label, and the pin is somewhere along the length or around the rim. Layer 6 is named
  **"Streams (Mouth)"** outright — it returns where a creek *ends*, which is the one point on it a
  route never crosses. Every pin flagged by the **decimal** test (i.e. genuinely arithmetic) landed in
  this bucket.
- **6 of 15 were flagged by the run test only and sit 0–110 m from the real feature.** An
  interpolation does not land 20 m from a named summit by chance. These were **anchors**, and the
  right verdict is *confirmed*, not *repaired* — the same finding `measure-run-endpoints.mjs` reports,
  arrived at independently through a different authority. 5 were new, taking the provably-correct set
  from 50 to 55.
- 1 held: a point feature that relocates 2.5 km *and* whose stored elevation the ground contradicts.

So triage gazetteer hits **by feature class before distance**. Sorting them by how far they move puts
the useless ones at the top.

## The repaired pins agree with the ground

`measure-confirmed-pin-elevations.mjs` reads the DEM under all 427 repaired coordinates — a record
none of the solvers consulted. **411 (96.3%) agree within 400 ft; 12 are off by 400–1000; 1 by more.**
Coordinates drawn from four independent authorities landing on ground that matches an elevation
written by a different pass is corroboration of the pass as a whole.

It also sizes the thing every solver deliberately left behind. The applier prints *"that is now the
ONLY defect on them, and it is a separate repair against a separate column"* — that is **13 pins**,
not a class, and `audit:waypoint-elevations` runs at `TOL = 2000` precisely because a tighter bound
over pins with *fabricated* coordinates measures the wrong place.
