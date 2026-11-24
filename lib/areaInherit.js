// A WALL INHERITS ITS CRAG'S WALK-IN AND PARKING (2026-11-23, from the Review desk flag on Fred at
// Nomad Buttress: "It needs to be better lol"). A climb's page read the walk-in (areas.approach) and
// the parking (areas.parking_*) of its OWN area only, and most crags are filed as walls under the crag
// that holds them: Calendar Butte had both, Nomad Buttress neither, so every climb on Nomad Buttress
// showed no walk-in and no parking. Measured that day: 2,697 climbs on 344 walls lost a walk-in their
// crag holds, and 2,617 lost its parking note.
//
// The rule:
//   * The climb's own area wins whenever it has the fact; the crag's is used only when it has none.
//   * Only a CRAG above passes facts down, and the walk stops at the first area that is not a crag:
//     a region's walk-in describes a whole valley, not the way to one wall (58 of those climbs).
//   * Walk-in and parking are found separately (the nearest crag with each), but a parking note and
//     its pin always come from the SAME area, since the note describes that pin.
//   * Nothing is copied into the wall's own fields. `_dbArea.approach` stays the wall's own, because
//     the area editor pre-fills from it; the inherited facts travel as `upWalkIn` / `upParking`, each
//     naming the crag they came from so the page can say whose walk-in it is.
//
// `upCragFacts(parent)` reads the four-deep `parent:parent_id(…)` embed (ROUTE_AREA_EMBED in
// lib/offline.js and the two route reads in lib/db.js); `walkInOf` / `parkingOf` are what the page reads.

const blank = (v) => v == null || String(v).trim() === "";
const placed = (lat, lng) => lat != null && lng != null && lat !== "" && lng !== "" && isFinite(Number(lat)) && isFinite(Number(lng));

/**
 * @param {any} parent the `parent` embed of a route's area (snake_case, as PostgREST returns it)
 * @returns {{ upWalkIn: { id: string|null, name: string|null, approach: string, approachMin: number|null } | null,
 *             upParking: { id: string|null, name: string|null, note: string|null, lat: number|null, lng: number|null, pinName: string|null } | null }}
 */
export function upCragFacts(parent) {
  let walk = null, park = null;
  for (let d = 0, p = parent; p && d < 4; d++, p = p.parent) {
    if (p.area_type !== "crag") break;
    if (!walk && !blank(p.approach)) {
      walk = { id: p.id || null, name: p.name || null, approach: String(p.approach).trim(), approachMin: p.approach_min != null && Number(p.approach_min) >= 0 ? Number(p.approach_min) : null };
    }
    if (!park && (!blank(p.parking_note) || placed(p.parking_lat, p.parking_lng))) {
      const pin = placed(p.parking_lat, p.parking_lng);
      park = { id: p.id || null, name: p.name || null, note: blank(p.parking_note) ? null : String(p.parking_note).trim(),
        lat: pin ? Number(p.parking_lat) : null, lng: pin ? Number(p.parking_lng) : null, pinName: p.parking_name || null };
    }
    if (walk && park) break;
  }
  return { upWalkIn: walk, upParking: park };
}

/** Only a climb filed on a crag-type area inherits: a peak's route keeps its own trailhead story. */
const onCrag = (a) => !!a && (a.areaType === "crag" || a.area_type === "crag");

/**
 * The walk-in a climb's page shows: its own area's, else the nearest crag's above it.
 * @param {any} route
 * @returns {{ approach: string, approachMin: number|null, from: string|null } | null} `from` names the crag when inherited
 */
export function walkInOf(route) {
  const a = route && route._dbArea;
  if (!a) return null;
  if (!blank(a.approach)) return { approach: String(a.approach).trim(), approachMin: a.approachMin != null && Number(a.approachMin) >= 0 ? Number(a.approachMin) : null, from: null };
  const u = onCrag(a) ? a.upWalkIn : null;
  return u && !blank(u.approach) ? { approach: u.approach, approachMin: u.approachMin ?? null, from: u.name || "the crag" } : null;
}

/**
 * The parking a climb's page shows: its own area's note and pin, else the nearest crag's.
 * @param {any} route
 * @returns {{ note: string|null, lat: number|null, lng: number|null, pinName: string|null, from: string|null } | null}
 */
export function parkingOf(route) {
  const a = route && route._dbArea;
  if (!a) return null;
  const ownPin = placed(a.parkingLat, a.parkingLng);
  if (!blank(a.parkingNote) || ownPin) {
    return { note: blank(a.parkingNote) ? null : String(a.parkingNote).trim(), lat: ownPin ? Number(a.parkingLat) : null, lng: ownPin ? Number(a.parkingLng) : null, pinName: a.parkingName || null, from: null };
  }
  const u = onCrag(a) ? a.upParking : null;
  return u ? { note: u.note, lat: u.lat, lng: u.lng, pinName: u.pinName, from: u.name || "the crag" } : null;
}
