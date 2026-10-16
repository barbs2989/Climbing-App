// GATE 6 -- RE-FETCH THE CITED RECORD FROM ITS OWN AUTHORITY -- then apply.
//
// Most of the banked refusals say one thing: the coordinate is fixed by a NAMED public record and
// only the claimed ELEVATION is in dispute. Gate 3 cannot separate those halves, so it refuses --
// correctly, because deciding on the researcher's narrative is the trust these gates exist to remove.
//
// A citation is not a narrative, though. "OSM node 6196962224, name='Hardscrabble Horse Camp'" is a
// claim about a public record with an id, and the record can be asked directly. If the authority
// returns that id, carrying that name, at that coordinate, the pin's IDENTITY rests on something
// that owes nothing to the agent. Same move rescue-by-sibling makes with a witness pin on another
// route, except the witness is the authority the sibling was ultimately copying from.
//
// THE COORDINATE ONLY. The claimed elevation stays and is reported: it is a different edit against a
// different column and needs its own evidence. Rewriting it here would hide it.
//
// TWO THINGS THE FIRST DRAFT GOT WRONG, both of which read as a disproof and were not:
//
//  1. A TRAIL JUNCTION NODE IS UNTAGGED. OSM models a junction as a bare node shared by two ways;
//     it has no name because the identity lives in the WAYS that meet there. Testing the node for a
//     name reported the White Chuck / Kennedy Ridge junction as "named undefined, which is not this
//     pin" while the node sat at exactly the proposed point. Junctions are checked on their PARENT
//     WAYS instead.
//  2. LAYER 0 OF THE GNIS SERVICE CANNOT BE QUERIED. It is a Group Layer ("Places (expand for
//     more)"), so every query against it returns `Invalid or missing input parameters` -- which the
//     first draft reported as "no feature with that id", i.e. as evidence the record was absent. The
//     lake layer is 7, and its columns are `gaz_id`/`gaz_name`, not `feature_id`/`feature_name`.
//     A CONTROL QUERY is what settled it: asking for every 'Willow Lake' in WA returns four (Lincoln,
//     Spokane, Grant, Whatcom), which both proves the endpoint answers and shows the name alone would
//     have been ambiguous. Same lesson as the Switzerland-only Overpass mirror: an endpoint that
//     cannot answer looks exactly like an empty answer.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ro = headers(anonKey());
const dir = process.env.WP_DATA_DIR || "./waypoint-repair-data/research";
const NEAR_M = 60;      // the record must BE the proposal, not merely near it
const DUP_M = 30;       // same as the main gate: a pin must not land on another pin of this route
const R = 6371000, rad = Math.PI / 180;
const m = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const norm = s => String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set(["the", "a", "of", "and", "trail", "junction", "camp", "ft", "mi", "river", "creek", "lake"]);
const toks = s => new Set(norm(s).split(" ").filter(t => t.length > 2 && !STOP.has(t)));
function nameAgrees(recordName, pinName) {
  if (!recordName) return false;
  if (norm(recordName) === norm(pinName)) return true;
  const A = toks(recordName), B = toks(pinName);
  if (!A.size) return false;
  let hit = 0; for (const t of A) if (B.has(t)) hit++;
  return hit === A.size;   // every distinctive token of the RECORD appears in the pin's name
}

const UA = { "User-Agent": "climbmatch-waypoint-audit/1.0" };
async function osmNode(id) {
  const r = await fetch(`https://api.openstreetmap.org/api/0.6/node/${id}.json`, { headers: UA });
  if (!r.ok) return { err: `HTTP ${r.status}` };
  const n = ((await r.json()).elements || []).find(e => e.type === "node");
  return n ? { name: (n.tags || {}).name, tags: n.tags || {}, lat: n.lat, lng: n.lon } : { err: "node absent" };
}
async function osmWayCentroid(id) {
  const r = await fetch(`https://api.openstreetmap.org/api/0.6/way/${id}/full.json`, { headers: UA });
  if (!r.ok) return { err: `HTTP ${r.status}` };
  const els = (await r.json()).elements || [];
  const w = els.find(e => e.type === "way" && String(e.id) === String(id));
  if (!w) return { err: "way absent" };
  const pts = (w.nodes || []).map(nid => els.find(e => e.type === "node" && e.id === nid)).filter(Boolean);
  if (!pts.length) return { err: "way has no resolvable nodes" };
  return { name: (w.tags || {}).name, tags: w.tags || {},
           lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
           lng: pts.reduce((s, p) => s + p.lon, 0) / pts.length };
}
// A junction's identity is the set of ways that meet at it, so ask for the node's parent ways and
// require every name the pin claims to be among them.
async function osmJunction(id, wantNames) {
  const n = await osmNode(id);
  if (n.err) return n;
  const r = await fetch(`https://api.openstreetmap.org/api/0.6/node/${id}/ways.json`, { headers: UA });
  if (!r.ok) return { err: `parent ways HTTP ${r.status}` };
  const ways = ((await r.json()).elements || []).filter(e => e.type === "way");
  const names = ways.map(w => (w.tags || {}).name).filter(Boolean);
  const missing = wantNames.filter(want => !names.some(have => norm(have).includes(norm(want)) || norm(want).includes(norm(have))));
  return { ...n, junctionWays: names, missing,
           name: missing.length ? null : wantNames.join(" / "),
           _junction: true };
}
async function gnis(layer, id) {
  const u = `https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/${layer}/query`
    + `?where=${encodeURIComponent("gaz_id=" + id)}&outFields=gaz_id,gaz_name,gaz_featureclass,state_alpha,county_name`
    + `&returnGeometry=true&outSR=4326&f=json`;
  const r = await fetch(u);
  if (!r.ok) return { err: `HTTP ${r.status}` };
  const j = await r.json();
  if (j.error) return { err: `service error ${j.error.code}: ${j.error.message}` };
  const f = (j.features || [])[0];
  if (!f) return { err: "no feature with that gaz_id on this layer" };
  const a = f.attributes || {};
  return { name: a.gaz_name, tags: { class: a.gaz_featureclass, county: a.county_name, state: a.state_alpha },
           lat: f.geometry.y, lng: f.geometry.x };
}

// Citations transcribed from each refusal's own `basis`. Only the authority and the id are taken from
// the prose; every other claim in it is ignored, and the checks below can disprove any of these.
const CITED = {
  "wa_glacier_peak_kennedy_glacier#1": { how: "junction", id: 12556594400, ways: ["Upper White Chuck Trail", "Kennedy Ridge Trail"] },
  "wa_hozomeen_mountain_southeast_face#1": { how: "gnis", layer: 7, id: 1528189 },
  "wa_indian_mountain_baker_scramble#5": { how: "node", id: 3467075820 },
  "wa_iron_cap_mountain_south_route#1": { how: "node", id: 6196962224 },
  "wa_storm_king_southwest_scramble#1": { how: "way", id: 1548723648 },
};

const refused = JSON.parse(fs.readFileSync(`${dir}/refused.json`, "utf8"));
const confirmed = [], notConfirmed = [];
for (const x of refused) {
  const c = CITED[`${x.route}#${x.i}`];
  if (!c) continue;
  const rec = c.how === "gnis" ? await gnis(c.layer, c.id)
    : c.how === "way" ? await osmWayCentroid(c.id)
      : c.how === "junction" ? await osmJunction(c.id, c.ways)
        : await osmNode(c.id);
  if (rec.err) { notConfirmed.push({ x, why: `could not re-fetch ${c.how} ${c.id}: ${rec.err}` }); continue; }
  const d = m({ lat: +x.lat, lng: +x.lng }, { lat: rec.lat, lng: rec.lng });
  console.log(`${x.route}[${x.i}] ${x.pinName}`);
  console.log(`   ${c.how} ${c.id} -> ${rec._junction ? `ways [${rec.junctionWays.join(", ")}]` : `name="${rec.name}" ${JSON.stringify(rec.tags).slice(0, 100)}`}`);
  console.log(`   record at ${rec.lat.toFixed(6)},${rec.lng.toFixed(6)} = ${d.toFixed(0)} m from the proposal`);
  if (rec._junction && rec.missing.length) { notConfirmed.push({ x, why: `the junction node is not on [${rec.missing.join(", ")}]` }); continue; }
  if (!rec._junction && !nameAgrees(rec.name, x.pinName)) { notConfirmed.push({ x, why: `the record is named "${rec.name}", which is not this pin` }); continue; }
  if (d > NEAR_M) { notConfirmed.push({ x, why: `the cited record is ${d.toFixed(0)} m away` }); continue; }
  // Write the AUTHORITY's coordinate, not the agent's transcription of it.
  confirmed.push({ ...x, lat: rec.lat, lng: rec.lng, record: { how: c.how, id: c.id, name: rec.name, m: Math.round(d) } });
}

// GATE 4, which these never reached: the main pass runs the duplicate check only over pins that
// already cleared the elevation gate, so every one of these skipped it.
const ids = [...new Set(confirmed.map(x => x.route))];
const live = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) live[x.id] = x;
}
if (ids.length && !Object.keys(live).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

const finalPass = [];
for (const e of confirmed) {
  const w = (live[e.route] || {}).waypoints || [];
  let clash = null;
  for (let j = 0; j < w.length; j++) {
    if (j === e.i || w[j].lat == null) continue;
    if (m({ lat: +w[j].lat, lng: +w[j].lng }, { lat: e.lat, lng: e.lng }) < DUP_M) { clash = w[j].name; break; }
  }
  if (clash) notConfirmed.push({ x: e, why: `lands on an existing pin: ${clash}` });
  else finalPass.push(e);
}

console.log(`\nIDENTITY CONFIRMED BY THE AUTHORITY, duplicate-checked : ${finalPass.length}`);
for (const p of finalPass)
  console.log(`  ${p.route}[${p.i}] ${p.pinName}\n      ${p.record.how} ${p.record.id} at ${p.lat.toFixed(6)},${p.lng.toFixed(6)}\n      STILL WRONG: ${p.gate}`);
console.log(`\nNOT CONFIRMED : ${notConfirmed.length}`);
for (const f of notConfirmed) console.log(`  ${f.x.route}[${f.x.i}] ${f.x.pinName} — ${f.why}`);

fs.writeFileSync(`${dir}/citation-confirmed.json`, JSON.stringify(finalPass, null, 1));
if (!APPLY || !finalPass.length) { console.log(`\n-> citation-confirmed.json (${finalPass.length}). Dry run — nothing written.`); process.exit(0); }

const key = requireServiceKey();
const byRoute = {};
for (const x of finalPass) (byRoute[x.route] = byRoute[x.route] || []).push(x);
let wrote = 0, ok = 0;
for (const [id, edits] of Object.entries(byRoute)) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.${encodeURIComponent(id)}`, { headers: ro });
  const [row] = await r.json();
  if (!row) { console.log(`${id}: row vanished`); continue; }
  const wps = (row.waypoints || []).slice();
  let touched = 0;
  for (const e of edits) {
    if (!wps[e.i] || String(wps[e.i].name || "") !== String(e.pinName)) { console.log(`${id}[${e.i}]: waypoint changed underneath — refusing`); continue; }
    wps[e.i] = { ...wps[e.i], lat: +Number(e.lat).toFixed(6), lng: +Number(e.lng).toFixed(6) };
    touched++; wrote++;
  }
  if (!touched) continue;
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { ...headers(key), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ waypoints: wps })
  });
  const back = await pr.json();
  if (pr.ok && Array.isArray(back) && back.length === 1) ok++; else console.log(`FAILED ${id}: ${pr.status}`);
}
console.log(`\nPATCHed ${ok} route(s), ${wrote} pin(s). Re-reading through the ANON role…`);
let good = 0;
for (const x of finalPass) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=waypoints&id=eq.${encodeURIComponent(x.route)}`, { headers: ro });
  const [row] = await r.json();
  const w = (row.waypoints || [])[x.i] || {};
  if (Math.abs(+w.lat - +Number(x.lat).toFixed(6)) < 1e-6 && Math.abs(+w.lng - +Number(x.lng).toFixed(6)) < 1e-6) good++;
  else console.log(`MISMATCH ${x.route}[${x.i}]`);
}
console.log(`${good}/${finalPass.length} verified via anon`);
console.log(`\nNOTE: every one of these keeps an elevation the ground contradicts. That is now the ONLY`);
console.log(`defect on them, and it is a separate repair against a separate column.`);
