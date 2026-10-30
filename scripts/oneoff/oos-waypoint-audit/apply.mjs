// Apply the researched pin decisions of the 2026-10-30 out-of-state waypoint audit (a copy of the
// WA audit's apply.mjs, #3083; only the paths differ).
//   node scripts/oneoff/oos-waypoint-audit/apply.mjs decisions-A.json [decisions-B.json ...] [--dry]
//
// Ops: move (published coordinate only), clear, setElev, nullElev, setDist, nullDist, areaMove, none.
// Every entry names its pin by index AND name AND old coordinate; any mismatch with the LIVE row
// refuses the whole route. Gates, all per route, all fail closed:
//   - a moved pin's 3DEP ground must sit within max(300 ft, 15%) of the height it will carry;
//   - the route's impossible-distance pairs (chord longer than stored trail + slack) must not
//     grow, and no new pair may appear;
//   - an areaMove must land on a 3DEP local maximum within 250 ft of the area's elevation.
// One PATCH per route, paced 1500 ms, rollback written first, every row re-read and compared.
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
import { elevationAt, summitProbe } from "../../lib/terrain.mjs";
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const files = argv.filter(a => !a.startsWith("--"));
const key = requireServiceKey();
const decisions = files.flatMap(f => JSON.parse(fs.readFileSync(f, "utf8")));
const get = async (table, id, sel) => (await (await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}&select=${sel}`, { headers: headers(key) })).json())[0];
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(j => [j, x[j]])) : x);
const sleep = ms => new Promise(s => setTimeout(s, ms));
const near = (a, b) => Math.abs(+a[0] - +b[0]) < 1e-5 && Math.abs(+a[1] - +b[1]) < 1e-5;
const placed = w => w && w.lat != null && w.lng != null && Number.isFinite(+w.lat) && Number.isFinite(+w.lng);
function mi(a, b) {
  const R = 3958.7613, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
// The set of impossible pairs: trail distance between two measured pins shorter than their chord.
function impossible(w) {
  const out = new Set();
  const m = w.map((x, i) => ({ i, x, d: x && x.distMi != null && x.distMi !== "" ? Number(x.distMi) : null })).filter(o => placed(o.x) && Number.isFinite(o.d));
  for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) {
    const trail = m[b].d - m[a].d; if (trail < 0) continue;
    const chord = mi({ lat: +m[a].x.lat, lng: +m[a].x.lng }, { lat: +m[b].x.lat, lng: +m[b].x.lng });
    if (chord > trail + Math.max(0.25, 0.1 * trail)) out.add(`${m[a].x.name} -> ${m[b].x.name}`);
  }
  return out;
}
const STAMP = Date.now();
const rollbackPath = `scripts/rollback-oos-waypoint-audit-${STAMP}.json`;
const rollback = [];
const report = [];
const byRoute = {};
for (const d of decisions) if (d.op !== "none") (byRoute[d.op === "areaMove" ? `area:${d.area_id}` : d.id] ||= []).push(d);
let problems = 0;
for (const [k, ds] of Object.entries(byRoute)) {
  if (k.startsWith("area:")) {
    const id = k.slice(5);
    for (const d of ds) {
      const row = await get("areas", id, "id,name,lat,lng,elevation_ft");
      if (!row) { console.log("REFUSE area missing", id); problems++; continue; }
      if (d.from && row.lat != null && !near([row.lat, row.lng], d.from)) { console.log("REFUSE area moved since research", id); problems++; continue; }
      const p = await summitProbe(d.to[0], d.to[1], 8);
      const elev = d.elev ?? row.elevation_ft;
      if (!p.isMax || Math.abs(p.centre - elev) > 250) { console.log("REFUSE areaMove gate", id, JSON.stringify(p), "elev", elev); problems++; continue; }
      console.log("areaMove", id, row.name, [row.lat, row.lng], "->", d.to, "ground", Math.round(p.centre), "elev", elev);
      report.push({ table: "areas", id, op: "areaMove", from: [row.lat, row.lng], to: d.to, ground: Math.round(p.centre) });
      if (DRY) continue;
      rollback.push({ table: "areas", id, lat: row.lat, lng: row.lng, elevation_ft: row.elevation_ft });
      fs.writeFileSync(rollbackPath, JSON.stringify(rollback, null, 1));
      const body = { lat: d.to[0], lng: d.to[1] }; if (d.elev != null) body.elevation_ft = d.elev;
      await patchRow("areas", id, body, { key });
      const back = await get("areas", id, "lat,lng");
      if (!near([back.lat, back.lng], d.to)) { console.log("RECONCILE FAIL", id); problems++; }
      await sleep(1500);
    }
    continue;
  }
  const row = await get("routes", k, "id,waypoints");
  if (!row || !Array.isArray(row.waypoints)) { console.log("REFUSE route missing", k); problems++; continue; }
  const w = row.waypoints.map(x => ({ ...x }));
  let refuse = null;
  for (const d of ds) {
    const p = w[d.i];
    if (!p || p.name !== d.name) { refuse = `pin #${d.i} name differs (${p && p.name})`; break; }
    const o = row.waypoints[d.i]; if (d.from && d.from.length === 2 && d.from[0] != null && placed(o) && !near([o.lat, o.lng], d.from)) { refuse = `pin #${d.i} coordinate moved since research`; break; }
    if (d.op === "move") {
      if (!d.source || !Array.isArray(d.to)) { refuse = `move without source/to on #${d.i}`; break; }
      p.lat = d.to[0]; p.lng = d.to[1];
    } else if (d.op === "clear") {
      if (/^(trailhead|summit)$/i.test(p.type || "")) { refuse = `clear of a ${p.type}`; break; }
      p.lat = null; p.lng = null;
    } else if (d.op === "setElev") { if (!d.source) { refuse = "setElev without source"; break; } p.elev = d.elev; }
    else if (d.op === "nullElev") p.elev = null;
    else if (d.op === "setDist") { if (!d.source) { refuse = "setDist without source"; break; } p.distMi = d.distMi; }
    else if (d.op === "nullDist") p.distMi = null;
    else { refuse = `unknown op ${d.op}`; break; }
  }
  if (!refuse) {
    for (const d of ds.filter(d => d.op === "move")) {
      const p = w[d.i], g = await elevationAt(p.lat, p.lng, 8);
      if (g == null) { refuse = `no ground reading at #${d.i}`; break; }
      if (p.elev != null && Math.abs(g - p.elev) > Math.max(300, 0.15 * p.elev)) { refuse = `ground ${Math.round(g)} vs elev ${p.elev} at moved #${d.i}`; break; }
    }
  }
  if (!refuse) {
    const before = impossible(row.waypoints), after = impossible(w);
    const fresh = [...after].filter(x => !before.has(x));
    if (after.size > before.size || fresh.length) refuse = `distance gate: ${before.size} -> ${after.size} impossible pairs; new: ${fresh.join("; ")}`;
    else console.log(k, `impossible pairs ${before.size} -> ${after.size}`);
  }
  if (refuse) { console.log("REFUSE", k, refuse); problems++; report.push({ id: k, refused: refuse }); continue; }
  for (const d of ds) console.log("  ", k, "#" + d.i, d.op, d.name, d.to || d.elev || d.distMi || "");
  report.push({ id: k, ops: ds.map(d => ({ i: d.i, op: d.op, name: d.name })) });
  if (DRY) continue;
  rollback.push({ table: "routes", id: k, waypoints: row.waypoints });
  fs.writeFileSync(rollbackPath, JSON.stringify(rollback, null, 1));
  await patchRow("routes", k, { waypoints: w }, { key });
  const back = await get("routes", k, "waypoints");
  if (canon(back.waypoints) !== canon(w)) { console.log("RECONCILE FAIL", k); problems++; }
  await sleep(1500);
}
console.log(DRY ? "DRY RUN" : `written ${rollback.length} row(s), rollback ${rollbackPath}`, "| refused/problems:", problems);
