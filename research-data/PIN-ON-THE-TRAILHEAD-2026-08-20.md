# A mid-route pin drawn at the car

Found sideways. While de-attributing waypoint notes, two of them turned out to record this exact
repair — *"previous value duplicated the trailhead"* — on routes where it had already been fixed.
Nothing else recorded that the class existed, and those notes were about to be rewritten.

So it was measured across the catalog: **20 of 1,012 WA routes with waypoints have a non-trailhead
pin sitting on the trailhead's exact coordinate.** 31 pins in total.

This is **not** the question the three waypoint audits ask. All of them test a pin against the
route's own gpx track, so a route with no track is invisible to every one of them. This needs no
track at all — it compares two pins on the same row.

## Which of these are actually wrong

| pin type | count | verdict |
|---|---|---|
| Topout | 14 | **wrong** |
| Summit | 2 | **wrong** |
| Base | 5 | defensible on a roadside crag |
| Crag | 6 | defensible on a roadside crag |
| Campsite | 3 | one is wrong, see below |
| Junction | 1 | defensible (a "trailhead / border return" node) |

Most of these cluster on **roadside crags** — Summertime Crag, Pinto Rock, Shuksan Crag, Osprey
Wall — where the parking really is at the cliff. On those, a `Crag` or `Base` pin sharing the
trailhead coordinate is honest.

A **`Topout`** is not. The top of the cliff is above the parking, and giving it the parking
coordinate draws the descent at the car. Same for a **`Summit`**:
`wa_bowling_alley_aka_regular_route` and `wa_cobbles_101` both put *"Pinto Rock summit"* on the
pullout.

## The clearest single case, and it is not a crag

`wa_little_tahoma_east_shoulder` — a route merged earlier the same day, so this surfaced on data
that had just been read closely:

| pin | coordinate | elevation |
|---|---|---|
| Trailhead — Fryingpan Creek / Summerland | 46.8884, −121.611 | 3,816 ft |
| **Campsite — Summerland** | **46.8884, −121.611** | **5,950 ft** |

Summerland is roughly four miles up the trail. The camp carries the trailhead's coordinate and its
own elevation, so the row asserts a 5,950 ft camp at a 3,816 ft trailhead.

The route's own waypoint sequence disproves it without any external reference: the next pin,
*Fryingpan Creek crossing* at **4,300 ft**, sits at 46.8696, −121.6273 — further along the line of
travel and **lower** than the camp that is supposedly still at the car. A party reading the pins in
order would pass a 5,950 ft camp before reaching a 4,300 ft creek.

## Not repaired here

Fixing a pin means supplying a coordinate, and this file has none to supply — that is research, and
inventing one is the failure these audits exist to catch. What is recorded is the class, its size,
and which half of it is a genuine defect rather than a roadside crag being honest about itself.

The two notes that first revealed it (`wa_kangaroo_temple_north_face`, `wa_mount_barnes_scramble`,
plus `wa_ragged_edge` found in the same sweep) each described a repair that had **already** been
applied. Their prose is gone now; that history lives here.
