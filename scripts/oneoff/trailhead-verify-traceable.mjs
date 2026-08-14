// Prove every trailhead about to be written is already stated by the route's OWN approach
// prose. Same standard as check:enrichment-traceable: prose may be rewritten freely,
// specifics may not be invented.
//
// Three tests per entry:
//   1. every `must` token appears in that route's own approach text
//   2. every NUMBER in the direction line appears in that route's own approach text
//   3. a borrowed coordinate comes from a row that names the SAME trailhead
//      (name-token overlap), so it is a lat/lng lookup and not an identity guess
import { selectAll } from "../lib/supabase-env.mjs";
import { WRITE, LEAVE } from "./trailhead-nocard-plan.mjs";

const routes = await selectAll("routes","id,name,area_id,approach,approach_logistics,waypoints",{}, {pageSize:1000});
const byId = new Map(routes.map(r => [r.id, r]));
const al = r => (r && r.approach_logistics) || {};
const thWp = r => (Array.isArray(r && r.waypoints) ? r.waypoints : []).find(w => /trailhead/i.test(String(w && w.type || "")));

const norm = s => String(s || "").toLowerCase().replace(/[‐-―]/g, "-").replace(/[^a-z0-9,.\- ]+/g, " ").replace(/\s+/g, " ");
const nums = s => (String(s || "").match(/\d[\d,\.]*/g) || []).map(x => x.replace(/[.,]$/, ""));

let bad = 0;
const fail = (id, msg) => { console.log("  FAIL  " + id + " — " + msg); bad++; };

console.log("=== traceability: " + WRITE.length + " entries ===\n");
for (const e of WRITE) {
  const r = byId.get(e.id);
  if (!r) { fail(e.id, "route not in DB"); continue; }
  const src = norm(r.approach);
  if (!src) { fail(e.id, "route has NO approach prose — nothing to trace to"); continue; }

  // 1. required tokens
  const missing = e.must.filter(t => !src.includes(norm(t)));
  if (missing.length) fail(e.id, "tokens not in its own approach: " + JSON.stringify(missing));

  // 2. every number in the direction line must be in the source
  const srcNums = new Set(nums(r.approach).map(n => n.replace(/,/g, "")));
  const badNums = nums(e.direction).map(n => n.replace(/,/g, "")).filter(n => !srcNums.has(n));
  if (badNums.length) fail(e.id, "numbers not in its own approach: " + JSON.stringify(badNums));

  // 3. a borrowed coordinate must come from a row naming the same trailhead
  if (e.coord) {
    const donor = byId.get(e.coordFrom);
    if (!donor) { fail(e.id, "coordFrom row missing: " + e.coordFrom); continue; }
    const dw = thWp(donor);
    const dName = al(donor).trailhead || (dw && dw.name) || "";
    const dLat = al(donor).trailheadLat != null ? al(donor).trailheadLat : (dw && dw.lat);
    const dLng = al(donor).trailheadLng != null ? al(donor).trailheadLng : (dw && dw.lng);
    if (Math.abs(Number(dLat) - e.coord[0]) > 1e-6 || Math.abs(Number(dLng) - e.coord[1]) > 1e-6)
      fail(e.id, "coord does not match donor " + e.coordFrom + " (" + dLat + "," + dLng + ")");
    // name overlap: a distinctive word from the donor's trailhead must be in OUR trailhead name
    const dTok = norm(dName).split(" ").filter(w => w.length > 3 && !["trail","trailhead","road","creek","pass","near","east","west","north","south"].includes(w));
    const ours = norm(e.trailhead);
    if (dTok.length && !dTok.some(w => ours.includes(w)))
      fail(e.id, "donor names a DIFFERENT trailhead (" + dName + ") than we write (" + e.trailhead + ")");
  } else if (e.coordFrom) fail(e.id, "coordFrom set with no coord");

  // 4. must not already have what we are adding, and must not have a pin we would shadow
  if (al(r).trailhead) fail(e.id, "already has approach_logistics.trailhead — not a gap");
  if (thWp(r)) fail(e.id, "already has a Trailhead waypoint — writing logistics would create an agreement claim");
}

console.log("\n=== the 5 left as gaps still qualify as gaps ===");
for (const e of LEAVE) {
  const r = byId.get(e.id);
  if (!r) { fail(e.id, "route not in DB"); continue; }
  if (al(r).trailhead || thWp(r)) fail(e.id, "no longer a gap — something now has a trailhead; re-adjudicate");
  else console.log("  ok    " + e.id);
}

console.log(bad ? "\n" + bad + " PROBLEM(S) — do not apply" : "\nall " + WRITE.length + " entries trace to their own route's prose; " + LEAVE.length + " gaps confirmed");
process.exit(bad ? 1 : 0);
