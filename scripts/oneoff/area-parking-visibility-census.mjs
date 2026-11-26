// Owner note 2026-11-25: "Is this common where we actually do have a parking spot but it's just not showing up?"
// Read-only census of crag and wall areas: how many carry their own parking pin, how close it sits to the area's
// own coordinate (the case where the Getting there map's mis-framed C covered the P), and how many have no parking
// of their own while a CRAG above them does (the case the area page did not show until useCragParkingAbove).
// Usage: node scripts/oneoff/area-parking-visibility-census.mjs
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const rows = await selectAll("areas", "id,name,area_type,path,lat,lng,parking_lat,parking_lng,parking_note", "", { key, pageSize: 1000 });
const byId = new Map(rows.map((r) => [r.id, r]));
const placed = (a, b) => a != null && b != null && isFinite(Number(a)) && isFinite(Number(b));
const km = (a, b) => { const r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLn = (b.lng - a.lng) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLn / 2) ** 2; return 12742 * Math.asin(Math.min(1, Math.sqrt(h))); };
const pages = rows.filter((r) => r.area_type === "crag" || r.area_type === "wall");
let own = 0, ownWithCoord = 0, near = [0, 0, 0, 0], inheritPin = 0, inheritNote = 0, none = 0;
const bins = [0.05, 0.2, 0.5, 1];
const examples = [];
for (const a of pages) {
  const pin = placed(a.parking_lat, a.parking_lng), note = a.parking_note && String(a.parking_note).trim();
  if (pin) {
    own++;
    if (placed(a.lat, a.lng)) { ownWithCoord++; const d = km({ lat: +a.lat, lng: +a.lng }, { lat: +a.parking_lat, lng: +a.parking_lng }); bins.forEach((b, i) => { if (d <= b) near[i]++; }); }
    continue;
  }
  if (note) continue;
  const anc = String(a.path || "").split(".").filter(Boolean).slice(0, -1).reverse();
  let found = null;
  for (const id of anc.slice(0, 4)) { const p = byId.get(id); if (!p || p.area_type !== "crag") break; if (placed(p.parking_lat, p.parking_lng) || (p.parking_note && String(p.parking_note).trim())) { found = p; break; } }
  if (found) { if (placed(found.parking_lat, found.parking_lng)) inheritPin++; else inheritNote++; if (examples.length < 8) examples.push(a.name + " (" + a.id + ") <- " + found.name); }
  else none++;
}
console.log(JSON.stringify({ areas: rows.length, cragOrWallPages: pages.length, ownPin: own, ownPinWithCoord: ownWithCoord, ownPinWithin_km: Object.fromEntries(bins.map((b, i) => [b, near[i]])), noOwnParking_cragAboveHasPin: inheritPin, noOwnParking_cragAboveHasNoteOnly: inheritNote, noParkingAnywhere: none, examples }, null, 1));
