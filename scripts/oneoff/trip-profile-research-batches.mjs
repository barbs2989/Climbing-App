// READ-ONLY, NO DATABASE. Builds the research worklist for the TRIP PROFILE pass (owner note, 2026-11-26:
// "do a full research pass to try and fill that section out for all pertinent routes"). A route's profile is
// its waypoints with a published distance from the trailhead (distMi) and a height, so the work is: for each
// mountain route that HAS waypoints but no profile, find the published distance of each waypoint.
// Reads the nightly static snapshot the app's offline mode downloads (<pages>/states/), not Supabase.
//   node scripts/oneoff/trip-profile-research-batches.mjs <census.json> <outdir> [--size 8]
// census.json is measure-trip-profile-coverage.mjs --out (its perRoute list).
import fs from "fs";
import path from "path";
import zlib from "zlib";

const PAGES = "https://barbs2989.github.io/Climbing-App/states/";
const [census, outdir] = process.argv.slice(2);
const si = process.argv.indexOf("--size");
const SIZE = si > 0 ? Number(process.argv[si + 1]) : 8;
const C = JSON.parse(fs.readFileSync(census, "utf8"));
const MTN = new Set(["alpine", "mountaineering", "scrambling", "hiking", "walk-up"]);
const want = new Map(C.perRoute.filter((x) => (MTN.has(x.disc) || x.th) && !/^DRAWN/.test(x.reason) && x.wps > 0 && !/car to car|not an out and back/.test(x.reason)).map((x) => [x.id, x]));
console.log(`${want.size} mountain routes have waypoints but no profile`);
const index = await (await fetch(PAGES + "index.json")).json();
const routes = [], areas = {};
for (const st of Object.values(index.states)) {
  for (const p of st.parts) {
    const buf = Buffer.from(await (await fetch(PAGES + p.file)).arrayBuffer());
    let txt; try { txt = zlib.gunzipSync(buf).toString("utf8"); } catch { txt = buf.toString("utf8"); }
    const j = JSON.parse(txt);
    for (const a of j.areas || []) areas[a.id] = a;
    for (const r of j.routes || []) if (want.has(r.id)) routes.push(r);
  }
}
const whereOf = (id) => { const a = areas[id]; if (!a) return id; const p = a.parent_id && areas[a.parent_id]; return (p ? p.name + " > " : "") + a.name; };
const items = routes.map((r) => ({
  id: r.id, name: r.name, where: whereOf(r.area_id), discipline: r.discipline, grade: r.grade,
  why: want.get(r.id).reason, distKmStored: r.dist_km, outingShape: r.outing_shape, gainFt: r.gain_ft,
  waypoints: (r.waypoints || []).map((w, i) => ({ i, type: w.type, name: w.name, elev: w.elev ?? null, distMi: w.distMi ?? null })),
})).sort((a, b) => a.id.localeCompare(b.id));
fs.mkdirSync(outdir, { recursive: true });
let n = 0;
for (let i = 0; i < items.length; i += SIZE) fs.writeFileSync(path.join(outdir, `batch-${String(++n).padStart(3, "0")}.json`), JSON.stringify(items.slice(i, i + SIZE), null, 1));
console.log(`${items.length} of ${want.size} found in the snapshot -> ${n} batches of ${SIZE} in ${outdir}`);
