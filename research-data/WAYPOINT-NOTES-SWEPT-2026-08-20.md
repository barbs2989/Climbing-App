# Waypoint notes: 173 notes swept, and it took four passes to find them all

Waypoint notes render on the route page, so both standing rules reach them — no sources, and no
database bookkeeping addressed to a maintainer. **All 1,012 WA routes with waypoints are now clean
on a deliberately wide scan.**

## Four passes, each finding what the last could not

| pass | rule | notes found |
|---|---|---|
| 1 | deny-list of site names | 75 |
| 2 | the object rule — a **document** is a source, **people** are not | 83 (*more* than pass 1) |
| 3 | wide scan, precision recovered by reading | 15 |
| final | same wide scan, re-run | **0** |

Pass 2 finding *more* than pass 1 is the point. **A narrower scan returns a shorter list, which
reads as less work rather than as a miss.** That has now happened six times across this project's
prose sweeps, and the only thing that catches it is re-scanning with a pattern written differently
from the one that built the worklist.

Two of my own false positives were caught by sampling one note per cue before delegating:

- **`\bthread\b` matched "V-thread rappels"** — an ice anchor, not a forum.
- *"No published coordinate found"* is an honest statement of a data gap, not a citation.

## What was deliberately kept

- **Map labels.** *"Marked as Horse Heaven Camp on the USGS topo"* tells a climber what their own
  map will show. That is navigation, not a citation of where our text came from.
- **Land managers.** NPS, USFS, the Okanogan-Wenatchee National Forest manage the ground; they are
  not sources for our prose.
- **Pointers to our own pages.** *"per route beta"* points at this app, not outside it. Four notes
  were left byte-identical for this reason alone.
- **Every climber's name and date**, and every admission that a pin is *estimated rather than
  surveyed* — that is real information about pin quality and must outlive the sourcing that
  happened to sit beside it.

### A third first-ascent credit was deleted before this rule was written down

*"first climbed in 1921 by members of The Mountaineers"* came back as *"first climbed in 1921"*.
Fred Beckey wrote the guidebook **and** made the first ascents; Steph Abegg authors a climbing site
**and** is a prolific first ascensionist; The Mountaineers publish books **and** are a club whose
parties made first ascents. Each time, a name in a site list forced a rewrite to delete real ascent
history in order to pass. Restored as *"by a Mountaineers party"*.

**It is the context that decides, every time: a name in an ascent clause is history.**

## The last fifteen were done by hand

Almost every one was *"This REPLACES a pin naming X"* or *"Corrected 2026-07-18: prior entry pointed
at Y"*. The framing is bookkeeping and had to go — but each carried **real geography as its
argument**: which trailhead, how far away the wrong one is, and which of the route's own waypoints
prove it. Deleting the sentence would have deleted the reasoning that keeps the pin right.

So `wa_switchback_mountain_scramble` keeps *"Eagle Lakes Trail #431 runs to Martin and Cooney Lakes
and never passes Foggy Dew Falls, which is the next waypoint here"* — and loses only the sentence
saying a previous pin was wrong.

---

# A detector I built, measured, and rejected

Two pins turned up whose **name contradicts their own coordinate**:

- **`wa_glacier_peak_disappointment_peak_cleaver`** — pin named *"North Fork Sauk River Trailhead"*;
  its coordinate and note are the **Trinity** trailhead, 20.2 mi away on a different approach.
- **`wa_mount_ballard_south`** — pin named *"Canyon Creek Trailhead"*; its note says park at Harts
  Pass, and that the real Canyon Creek Trailhead ~10 mi away does not access this peak.

A climber reads the pin **name** and drives there. The note is the only thing stopping them, and the
note is the half nobody reads first.

**The automated proxy for this does not work.** A scan for *a trailhead pin whose note names a
different trailhead and never its own* returns **8 hits of which 1 is real** — and it misses
`wa_mount_ballard_south` entirely, because that note names no second trailhead, it just says "park
at Harts Pass".

The seven false positives are all the same honest shape: a note naming a **nearby alternate or
overflow** trailhead. `wa_ives_peak_r1` mentions *"an overflow lot at nearby Berry Patch
Trailhead"*; `wa_massie_peak_west_route` names Phelps Creek as *"the alternate/nearby start"*;
`wa_mount_fury_east_mongo_ridge` describes walking around Ross Lake to Big Beaver Trailhead on the
way in. All correct.

**1-in-8 precision on a detector that also misses half the known cases is not shippable** — a guard
that flags correct work teaches people to ignore it. The two real cases are recorded here, found by
reading rather than by a scan, and the measurement is written down so the same proxy is not
rebuilt.
