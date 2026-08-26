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
| `solve-saddles.mjs` | named cols/passes/notches from OSM `natural=saddle` (also a negative result) |
| `triage-gazetteer.mjs` | splits gazetteer hits by feature GEOMETRY — point vs linear vs areal |
| `measure-remaining.mjs` | how much is left — compares against the ORIGINAL coordinates |
| `measure-confirmed-pin-elevations.mjs` | does the ground agree with the repaired pins? |
| `confirm-elev-coords.mjs` | re-asks the authority: is this coordinate fixed by a NAME, or computed? |
| `apply-elevations.mjs` | writes the ground elevation onto confirmed coordinates (`--apply`) |
| `verify-elev-writes.mjs` | reads every waypoint of every touched route back through anon |
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

## OSM cannot finish the cols either — and a NAME MATCH IS NOT AN IDENTITY MATCH

GNIS misses these for a good reason: *"Eye Col"*, *"Y Notch"*, *"Skyline Notch"*,
*"Ottohorn-Himmelhorn Col"* are **climbers' names**. They live in guidebooks and in OSM, which
climbers edit, not in a federal gazetteer. (Spot-checked, so this is the data and not the sweep: of
ten such names only *Red Pass* and *Williams Lake* are in GNIS at all, and those were a namesake 70 km
away and an offset.) OSM genuinely does hold this kind of name — the control corridor returns
**Cache Col**, `natural=saddle`, with no GNIS id.

`solve-saddles.mjs` swept it: **46 candidates, 4 name matches, 0 applicable.** All four denote
something *at* or *near* the pass rather than the pass:

| pin | matched | apart |
| --- | --- | --- |
| `Red Pass contour (~4,200 ft)` | Red Pass | the pass is at **5,389 ft** |
| `Boundary Trail bend toward Apex Pass` | Apex Pass | 1.94 km |
| `Boulder Creek crossing / Boulder Pass Trail junction` | Boulder Pass | **5.24 km, 2,697 ft** |
| `Glacier Gap crevasse crossing` | Glacier Gap | 2.52 km |

Chasing prepositions would have caught **one** of the four. **Test the object instead:** if the pin
name carries a structure noun the matched feature's name does not — *crossing*, *junction*, *contour*,
*bend*, *trail* — the pin is a different kind of thing standing near that feature.

Scope it to **borrowing** a named feature's coordinate. It must not be applied to a solver that
**computes** an intersection: `solve-junctions.mjs` legitimately locates *"X Trail / Y Trail junction"*
by intersecting the two trails, which *is* the junction. Checked against everything already applied —
**0 would be refused**, so the rule is new without being retroactive.

The DEM alternative was measured and not built: a col between two named summits is genuinely
computable (highest point on the lowest connecting path), but only ~5 distinct cols are of that
shape, and the crude version is already a recorded failure — sampling the straight line between two
summits landed 473 m off a point that is not a saddle, because a ridge is not a straight line.

## The repaired pins agree with the ground

`measure-confirmed-pin-elevations.mjs` reads the DEM under all 427 repaired coordinates — a record
none of the solvers consulted. **411 (96.3%) agree within 400 ft; 12 are off by 400–1000; 1 by more.**
Coordinates drawn from four independent authorities landing on ground that matches an elevation
written by a different pass is corroboration of the pass as a whole.

It also sizes the thing every solver deliberately left behind. The applier prints *"that is now the
ONLY defect on them, and it is a separate repair against a separate column"* — that is **13 pins**,
not a class, and `audit:waypoint-elevations` runs at `TOL = 2000` precisely because a tighter bound
over pins with *fabricated* coordinates measures the wrong place.

## …and 7 of those 13 are now repaired

The question is never "is the gap big?" — it is **is the COORDINATE fixed by a name, or was it
computed?**

- **Fixed by a name** (a camp, a lake, a trailhead matched to a named record) — the position is
  settled independently of any elevation, so a ground contradiction indicts the **elevation**.
- **Computed** (a ford, a trail junction found by intersecting two geometries) — the coordinate and
  the elevation come out of the same act, so a contradiction indicts the **coordinate**. Leave both
  alone: writing an elevation there would make a possibly-wrong pin internally *consistent*, which is
  worse than leaving it visibly odd.

`confirm-elev-coords.mjs` decides that by **re-asking the authority at the coordinate the row holds
today** rather than by reading the pin's name — gate 6 again. **7 of 13 came back confirmed, every one
at 0 m**; the 6 that did not are the two trail junctions, the ford, and three others, all untouched.

**Run ONE rule over the whole set.** A first pass split them — 4 decided from solver provenance, 9
from the re-query — and the two procedures **disagreed on `Upper Dungeness Trailhead`**: provenance
said write, the authority found no named feature within 200 m. Provenance says which script wrote a
pin, not whether the coordinate is confirmable now. Two decision procedures for one question is how a
wrong answer gets in through the weaker one.

### One PATCH per route, and the verify step is what caught it

`patchRow` rewrites the **entire** `waypoints` array. Two pins on the same route patched separately
each send an array built from the *same stale read*, so **the second write silently reverts the
first**. `wa_mount_duckabush_standard` has pins 2 and 3 in this batch: pin 3 was written, then pin 2's
patch put pin 3's original 3600 back. Both PATCHes returned 200.

Nothing about the run looked wrong. It was caught only because a write is never counted until it has
been **read back through the anon role**, and `verify-elev-writes.mjs` checks *every* waypoint on
every touched route rather than only the edited ones — the risk a per-pin check cannot see is a
**neighbour** that moved. Final state: 7 written and verified, **0 collateral changes**.

`elev` is in **FEET**. `elevM` is a legacy metric spelling the read side converts; the write side must
never touch it, and a pin carrying one is refused rather than guessed at.

---

## Self-contradicting pins: attributed, then exhausted

`audit:waypoint-geometry` category 2 finds two pins sharing one coordinate while stating elevations
more than 100 ft apart. **One point cannot be at two heights**, so it needs no external reference to
prove a contradiction — but it is silent on which half caused it, and repairing it still needs a
real coordinate.

`--ground` answers the first question by sampling the USGS 3DEP elevation at the shared coordinate:
whichever stated elevation the terrain actually has is the pin that belongs there. **#1211 widened
the category from 13 findings to 20 and nobody re-ran that adjudication**, so seven pairs had never
been asked. Re-run: **9 attributed, 10 the relief cannot separate, 1 where neither pin is placed.**

Seven of the nine attributions run the same way — a **topout or a summit given the coordinate of a
point lower down**, the crag getting one coordinate that every pin then inherits. The exception is
`wa_bowling_alley_aka_regular_route` / `wa_cobbles_101`, where the *trailhead* inherited the
**summit's** coordinate, so the Directions button drives to the top of the rock.

### The nine are not repairable, and that is the result

`solve-selfcontradicting.mjs` puts every attributed pin through the same gates as
`solve-gazetteer.mjs`. **0 of 9 solvable.** Eight carry a **climbers' name no federal gazetteer
holds** — Summerland, Jötunheim, Whine Spire, Ice Box, Slippery Slab — and the ninth is an
**offset**, `Pinto Rock base (end of NF-77)`, which is not Pinto Rock.

**Eight refusals sharing one reason is the tell that hid the layer-5 geometry bug**, so they were
re-asked the weakest possible question — `UPPER(gaz_name) LIKE '%token%'` across **all 15 GNIS
layers** rather than the exact name on four (`probe-gnis-refusals-are-real.mjs`). Still nothing;
only *Pinto Rock* exists federally, and that is the pin already correctly placed. The refusals are
about the data.

Two traps that probe encodes:
- **A group layer cannot be queried.** Layers 0/4/9/11 are `expand for more` containers and answer
  `Invalid or missing input parameters`; layer 8 is Antarctica and has no `state_alpha`. Those are
  the service saying *wrong question*, never *nothing found* — mistaking them for a failed sweep
  would wrongly discredit the refusals. Their children (1/2/3, 5/6/7, 12/13/14) hold the features.
- **`UPPER()` on BOTH sides.** ArcGIS `LIKE` is case-sensitive, and normalising one side is what
  once reported 25 present names as missing.

So the class is **mechanically exhausted** like the fabricated-pin classes before it. A repair here
needs a coordinate that exists in no reachable source, and inventing one is the defect this whole
audit family was built to catch.
