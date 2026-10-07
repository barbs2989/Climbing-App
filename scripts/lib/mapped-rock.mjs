// Mapped bedrock at a crag's coordinate, normalised to the rock words climbers use.
//
// WHY A RING: an area's coordinate is usually the parking, the trail or the base of the cliff,
// and geological maps draw valley floors as alluvium. Measured on Index's Lower Town Wall: the
// point itself and every point 300 m out read "alluvium"; four of eight points at 700 m read
// "Index Batholith, granodiorite". So a surficial unit at the point is not an answer — walk
// outward until bedrock is met, and take the nearest ring's majority.
//
// WHAT IT CANNOT KNOW: the map scale is coarse, and a crag can be a thin band the map does not
// draw (Red Rock's Aztec sandstone vs the Moenkopi limestone next to it). That is why the
// result is stored with rock_basis='mapped' and the route page says it is mapped, not stated.
// A rock type stated by a route or an area always outranks it.

const API = "https://macrostrat.org/api/v2/geologic_units/map";

// Unconsolidated or non-rock units: never the climbing surface.
const SURFICIAL = /alluvi|gravel|\bsand\b|\bsands\b|colluv|talus|landslide|glacia|\btill\b|moraine|\bice\b|water|surficial|basin[- ]fill|unconsolidated|dune|loess|artificial fill|\bfill\b|playa|lake deposit|terrace deposit|fan deposit|outwash|eolian|mud\b|\bsilt\b|\bclay\b|quaternary sediment|older deposits|young deposits/i;

// The rock vocabulary (specific rock -> family) and the earliest-named matching live in
// lib/rockType.js, shared with the app so the page and this script cannot disagree on a name.
import { FAMILY, rocksIn } from "../../lib/rockType.js";
export { ROCKS, FAMILY } from "../../lib/rockType.js";
// Cliffs form where the hard rock outcrops, so a unit listing shale beside a hard rock is climbed
// on the hard rock (the Gunks' unit is "shale, sandstone, conglomerate"). Soft rock only when alone.
const SOFT_FAMILY = "shale";

export function classify(unit) {
  const head = `${unit.name || ""} | ${unit.lith || ""}`;
  if (SURFICIAL.test(head) && !rocksIn(unit.name || "").length) return null;
  // The lith's MAJOR list first, then the unit name, then the description's opening (which lists
  // minor lithologies too, so it is the last resort).
  const lith = unit.lith || "";
  const major = (/major:\s*\{([^}]*)\}/i.exec(lith) || [, lith])[1];
  for (const text of [major, unit.name || "", (unit.descrip || "").slice(0, 160)]) {
    const r = rocksIn(text);
    if (!r.length) continue;
    return r.find((c) => FAMILY[c] !== SOFT_FAMILY) || r[0];
  }
  return null;
}

// The large-scale (most detailed) maps cover only part of the continent; where they return
// nothing, the medium-scale map answers. Measured: Cochise, Ten Sleep, Squamish and Shelf Road
// all return [] at large and the right rock at medium. Small scale is too coarse to use
// (it calls Shelf Road "granitic rocks").
async function unitAt(lat, lng) {
  const u = await unitAtScale(lat, lng, "large");
  return u || unitAtScale(lat, lng, "medium");
}

async function unitAtScale(lat, lng, scale, tries = 3) {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(`${API}?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&scale=${scale}`, { signal: AbortSignal.timeout(20000) });
      if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2000 * (t + 1))); continue; }
      const j = await res.json();
      const d = (j && j.success && j.success.data) || [];
      return d[0] || null;
    } catch { await new Promise((r) => setTimeout(r, 1500 * (t + 1))); }
  }
  throw new Error(`no answer for ${lat},${lng}`);
}

const RINGS_KM = [0, 0.3, 0.7, 1.2];

// -> { rock, ringKm, votes, of, unit } or { rock:null, reason }
export async function mappedRock(lat, lng) {
  const kmLng = 111.32 * Math.cos((lat * Math.PI) / 180);
  for (const r of RINGS_KM) {
    const pts = r === 0 ? [[lat, lng]] : Array.from({ length: 8 }, (_, k) => {
      const a = (k * Math.PI) / 4;
      return [lat + (r / 111.0) * Math.cos(a), lng + (r / kmLng) * Math.sin(a)];
    });
    const units = await Promise.all(pts.map(([a, b]) => unitAt(a, b)));
    // Vote by FAMILY (two neighbouring units saying granite and granodiorite agree), then name the
    // most common specific rock within the winning family.
    const fam = {}, spec = {}, unitFor = {};
    for (const u of units) {
      if (!u) continue;
      const c = classify(u);
      if (!c) continue;
      const f = FAMILY[c];
      fam[f] = (fam[f] || 0) + 1; spec[c] = (spec[c] || 0) + 1; unitFor[c] = unitFor[c] || u.name;
    }
    const ranked = Object.entries(fam).sort((a, b) => b[1] - a[1]);
    if (!ranked.length) continue;
    // A tie between two families on the nearest ring is a contact zone: refuse rather than guess.
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return { rock: null, reason: `tie ${ranked[0][0]}/${ranked[1][0]} at ${r} km` };
    const rock = Object.entries(spec).filter(([c]) => FAMILY[c] === ranked[0][0]).sort((a, b) => b[1] - a[1])[0][0];
    return { rock, family: ranked[0][0], ringKm: r, votes: ranked[0][1], of: pts.length, unit: unitFor[rock] };
  }
  return { rock: null, reason: "no bedrock within 1.2 km" };
}
