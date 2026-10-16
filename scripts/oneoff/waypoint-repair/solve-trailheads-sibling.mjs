// The 29 trailheads with NO second copy on their own route -- located from the REST OF THE CATALOG.
//
// A trailhead is shared. "Upper Dungeness Trailhead" starts three of these routes; "Phelps Creek",
// "White River" and "FR-1570" likewise. Most WA routes were never flagged as fabricated at all, so
// the catalog holds many clean, independently-written recordings of the same trailhead. That is a
// third record in exactly the sense audit:trailhead-agreement means it: written by a different pass,
// about the same physical place, owing nothing to the row being repaired.
//
// THE POOL IS THE WHOLE CATALOG, not the fabricated set. Searching only among flagged routes would
// look in precisely the place where the answer is least likely to be clean. PostgREST can filter on
// the jsonb text (approach_logistics->>trailhead=ilike.*token*), so one targeted query per distinct
// trailhead name reaches all ~205k routes without pulling them down.
//
// THE NAMESAKE TRAP GOVERNS EVERYTHING HERE. There are two "White River Trailhead"s in Washington
// 130 km apart, and that exact collision once put Little Tahoma's trailhead on the Lake Wenatchee
// White River; two "Lake Ann"s sit 79 km apart. A name is not an identity. So a donor coordinate is
// accepted only if it is also PLAUSIBLE FOR THIS ROUTE: it must lie within reach of this route's own
// summit, which is a fact about this row and cannot be supplied by the donor.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const ro = headers(anonKey());
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const DUP_M = 30, MAX_APPROACH_KM = 35;   // the longest genuine WA approaches run ~31 km (Pasayten, Pickets)
const dec = v => { const s = String(v), j = s.indexOf("."); return j < 0 ? 0 : s.length - j - 1; };
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const GENERIC = new Set(["trailhead", "trail", "head", "parking", "pullout", "lot", "north", "south",
  "east", "west", "upper", "lower", "the", "and", "access", "road", "put", "boat", "dock", "milepost",
  "mile", "exit", "campground", "junction", "roadside", "washout", "end", "via", "for"]);
const norm = s => String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const key = s => new Set(norm(s).split(" ").filter(t => t.length > 2 && !GENERIC.has(t)));
function sameTrailhead(a, b) {
  const A = key(a), B = key(b);
  if (!A.size || !B.size) return false;
  let hit = 0; for (const t of A) if (B.has(t)) hit++;
  return hit === Math.min(A.size, B.size);
}

const B = JSON.parse(fs.readFileSync(`${T}/remaining-classes.json`, "utf8"));
const all = [].concat(B.ford, B.twoNamedWays, B.campNamed, B.gnisNamed, B.descriptive);
const TH = /\b(trailhead|parking|pullout|put-?in|road end|trail ?head)\b/i;
const done = new Set(JSON.parse(fs.readFileSync(`${T}/trailhead-inrow.json`, "utf8")).map(x => `${x.route}#${x.i}`));
const cands = all.filter(x => TH.test(x.name) && !done.has(`${x.route}#${x.i}`));

const ids = [...new Set(cands.map(c => c.route))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

// This route's own summit, for the plausibility gate. Prefer the route's Summit pin; the point is
// that it is a fact about THIS row.
function summitOf(row) {
  const w = row.waypoints || [];
  const s = w.find(p => String(p.type || "") === "Summit" && p.lat != null);
  if (s) return { lat: +s.lat, lng: +s.lng };
  const any = w.filter(p => p.lat != null && Math.max(dec(p.lat), dec(p.lng)) <= 8);
  return any.length ? { lat: +any[any.length - 1].lat, lng: +any[any.length - 1].lng } : null;
}

async function donors(token) {
  const u = `${SUPABASE_URL}/rest/v1/routes?select=id,approach_logistics,waypoints`
    + `&approach_logistics->>trailhead=ilike.*${encodeURIComponent(token)}*&limit=400`;
  for (let a = 0; a < 3; a++) {
    const r = await fetch(u, { headers: ro });
    if (r.ok) return { rows: await r.json() };
    await new Promise(s => setTimeout(s, 600 * (a + 1)));
  }
  return { err: "query failed 3x" };
}

const write = [], noDonor = [], farAway = [], blocked = [];
for (const c of cands) {
  const row = rows[c.route];
  const w = (row || {}).waypoints || [];
  const pin = w[c.i];
  if (!pin || String(pin.name || "") !== String(c.name)) { blocked.push({ c, why: "waypoint changed underneath" }); continue; }
  const summit = summitOf(row);
  if (!summit) { blocked.push({ c, why: "no non-fabricated anchor on this route to judge plausibility" }); continue; }

  // Longest distinctive token drives the query: most selective, and least likely to be a stop word.
  const toks = [...key(c.name)].sort((a, b) => b.length - a.length);
  if (!toks.length) { noDonor.push({ c, why: "the name carries no distinctive token to search on" }); continue; }
  const got = await donors(toks[0]);
  if (got.err) { blocked.push({ c, why: got.err }); continue; }

  const opts = [];
  for (const d of got.rows) {
    if (d.id === c.route) continue;
    const al = d.approach_logistics || {};
    const lat = al.trailheadLat ?? al.trailhead_lat, lng = al.trailheadLng ?? al.trailhead_lng;
    if (lat == null || lng == null) continue;
    if (Math.max(dec(lat), dec(lng)) > 8) continue;            // donor is fabricated too
    if (!sameTrailhead(c.name, al.trailhead)) continue;         // must be the SAME trailhead by name
    opts.push({ from: d.id, name: al.trailhead, lat: +lat, lng: +lng });
  }
  if (!opts.length) { noDonor.push({ c, why: `no other route names this trailhead with a clean coordinate (searched "${toks[0]}", ${got.rows.length} rows)` }); continue; }

  // THE NAMESAKE GATE: the donor must be a plausible start for THIS peak.
  const near = opts.filter(o => km(o, summit) <= MAX_APPROACH_KM);
  if (!near.length) {
    farAway.push({ c, why: `every donor is >${MAX_APPROACH_KM} km from this route's own summit — a namesake, not this trailhead`,
      detail: opts.map(o => `${o.from} "${o.name}" ${km(o, summit).toFixed(1)} km from the summit`) });
    continue;
  }
  // Donors must agree with each other, or there is nothing to choose between them.
  const spread = Math.max(...near.map(a => Math.max(...near.map(b => km(a, b)))));
  if (spread > 1) {
    blocked.push({ c, why: `donors disagree by ${spread.toFixed(1)} km`, });
    continue;
  }
  const pickd = near[0];
  let clash = null;
  for (let j = 0; j < w.length; j++) {
    if (j === c.i || w[j].lat == null) continue;
    if (km({ lat: +w[j].lat, lng: +w[j].lng }, pickd) * 1000 < DUP_M) { clash = w[j].name; break; }
  }
  if (clash) { blocked.push({ c, why: `lands on an existing pin: ${clash}` }); continue; }
  write.push({ ...c, lat: pickd.lat, lng: pickd.lng, from: pickd.from, donorName: pickd.name,
    movesKm: +km({ lat: +pin.lat, lng: +pin.lng }, pickd).toFixed(2), fromSummitKm: +km(pickd, summit).toFixed(1),
    donors: near.length });
}

console.log(`trailheads with no in-row copy : ${cands.length}\n`);
console.log(`  LOCATED from another route  : ${write.length}`);
console.log(`  no clean donor in the catalog: ${noDonor.length}`);
console.log(`  donor is a NAMESAKE, refused : ${farAway.length}`);
console.log(`  blocked                      : ${blocked.length}\n`);
for (const x of write) {
  const g = await elevationAt(x.lat, x.lng);
  console.log(`  WRITE ${x.route}[${x.i}] "${x.name}"\n        -> ${x.lat},${x.lng}  (moves ${x.movesKm} km; ${x.fromSummitKm} km from this route's summit)`
    + `\n        from ${x.from} "${x.donorName}"  ${x.donors} agreeing donor(s)  ground ${g == null ? "?" : Math.round(g)} ft / claims ${x.elev} ft`);
}
for (const x of farAway) { console.log(`  NAMESAKE ${x.c.route}[${x.c.i}] ${x.c.name} — ${x.why}`); x.detail.forEach(d => console.log(`        ${d}`)); }
for (const x of noDonor) console.log(`  NONE  ${x.c.route}[${x.c.i}] ${x.c.name} — ${x.why}`);
for (const x of blocked) console.log(`  BLOCK ${x.c.route}[${x.c.i}] ${x.c.name} — ${x.why}`);

fs.writeFileSync(`${T}/trailhead-sibling.json`, JSON.stringify(write, null, 1));
if (!APPLY || !write.length) { console.log(`\n-> trailhead-sibling.json (${write.length}). Dry run — nothing written.`); process.exit(0); }
const svc = requireServiceKey();
const grp = {};
for (const c of write) (grp[c.route] = grp[c.route] || []).push(c);
let wrote = 0, ok = 0;
for (const [id, edits] of Object.entries(grp)) {
  const wps = (rows[id].waypoints || []).slice();
  for (const e of edits) { wps[e.i] = { ...wps[e.i], lat: +e.lat.toFixed(6), lng: +e.lng.toFixed(6) }; wrote++; }
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { ...headers(svc), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ waypoints: wps })
  });
  const back = await pr.json();
  if (pr.ok && Array.isArray(back) && back.length === 1) ok++; else console.log(`FAILED ${id}: ${pr.status}`);
}
console.log(`\nPATCHed ${ok} route(s), ${wrote} pin(s). Re-reading through the ANON role…`);
let good = 0;
for (const c of write) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=waypoints&id=eq.${encodeURIComponent(c.route)}`, { headers: ro });
  const [row] = await r.json();
  const w = (row.waypoints || [])[c.i] || {};
  if (Math.abs(+w.lat - +c.lat.toFixed(6)) < 1e-6) good++; else console.log(`MISMATCH ${c.route}[${c.i}]`);
}
console.log(`${good}/${write.length} verified via anon`);
