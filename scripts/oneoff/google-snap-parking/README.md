# Parking where Google's directions end, confirmed (2026-11-26)

Owner note: "when I click the Google maps to find the directions it often takes you to the right parking spot, but we
do not have it on file listed ... cross-reference the parking spot that Google recommends with online to see if that
matches up and if it does list that as the parking spot ... and if it is right add the parking pin on the map."

What the button does: a crag with no parking pin sends *Directions in Google Maps* to the crag's own coordinate
(`CragLocationCard`, `AreaGettingThere`), and a maps app given a bare coordinate routes to the nearest point of the
drivable road network. That road end is what the owner saw. Google's router cannot be queried in bulk (no key; its
terms forbid scraping), so the open OSRM car router answers the same question (`snap.mjs`): nearest road a car may use.

Measured first (`validate.mjs`, on crags that already carry a pin audited against MP in #3955): where a mapped lot
sits at the road end, it is the audited parking only ~64% of the time (Utah sample). So the road end is a strong
CANDIDATE, never a pin by itself: every candidate is read by a judge against an independent record before it is
written (a mechanical fingerprint does not authorise a bulk fix).

Pipeline (scratch paths are arguments; MP text and OSM extracts are never committed):
0. `mpidx.mjs` — MP area -> our routes, from the cached MP area pages' route tables, so an area finds its MP text.
1. `from-snapshot.mjs` (no DB slot) or `fetch.mjs` — every area + every route's area_id.
2. `targets.mjs` — crags/walls with climbs whose climbs have NO pin to drive to (none of their own, none on a crag
   above within the 4-deep chain `lib/areaInherit.js` reads). Where a crag above holds a parking NOTE but no pin, the
   target is that crag (a pin on the wall would replace the note on its climbs; a note and its pin stay together).
3. `snap.mjs` — the road end for each target (OSRM table service, 100 coordinates a request, paced).
4. Mapped lots: US from Geofabrik state extracts (`pbf-download.mjs`, `pbf-run.mjs` -> `pbf-lots.mjs`, a hand-written
   PBF reader: amenity=parking + highway=trailhead, way centres from their first corners); Canada from Overpass
   (`lots.mjs --targets=...`). Overpass ran ~1 request a minute that day (~28 h for the US).
5. `build.mjs` — groups (parent + road-end cell) with: the road end, mapped lots within 200 m of it, other lots
   within 1.5 km of the crag, our parking note, and MP Getting There text (own, walls below, or neighbours). Left
   out, never judged: road end > 1.5 km from the crag (`far`); no lot at the road end and either > 600 m or no own text.
6. Judges (Sonnet, `JUDGE.md`): `lot` (pin a mapped lot, confirmed by the text or plainly the crag's own), `roadside`
   (pin the road end, only when the crag's own text describes parking on that road there, ≤ 600 m), `no`, `unsure`.
7. `assemble.mjs` — verdicts -> decisions (label checks: no source, ≤ 60 chars, not shouted; ≤ 2 km from the crag).
8. `apply.mjs` — FILL-ONLY writes guarded on `parking_lat IS NULL`, paced ≥ 1 s, rollback JSON first, `dbslot check`
   every 50, re-read to reconcile.

Records: `../data/google-snap-parking/applied-*.json` (every pin written, with the judge's reason).
