// Reconcile "pins written" against "pins measurably changed". The running total is a count of
// successful PATCHes; the measurement compares the live coordinate against the one fab-pins.json
// recorded. If they disagree, one of them is wrong and the claim has to be corrected before it is
// repeated again.
import fs from "fs";
import { SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
const K = anonKey(), H = { apikey: K, Authorization: "Bearer " + K };
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";

const fab = JSON.parse(fs.readFileSync(`${T}/fab-pins.json`, "utf8"));
const orig = new Map();
for (const r of fab) for (const p of r.pins) orig.set(`${r.id}#${p.i}`, { lat: +p.lat, lng: +p.lng });

const claims = new Map();   // key -> pass name
const add = (k, pass) => { if (!claims.has(k)) claims.set(k, pass); };
try { for (const x of JSON.parse(fs.readFileSync(`${T}/resolved-pins.json`, "utf8")).resolved) add(`${x.route}#${x.i}`, "gazetteer"); } catch (e) { console.log("no resolved-pins.json"); }
try { for (const x of JSON.parse(fs.readFileSync(`${T}/inrow-proposals.json`, "utf8"))) add(`${x.route}#${x.i}`, "in-row"); } catch (e) { console.log("no inrow-proposals.json"); }
for (const f of fs.readdirSync(`${T}/research`).filter(f => /^out-/.test(f))) {
  for (const x of JSON.parse(fs.readFileSync(`${T}/research/${f}`, "utf8"))) if (x.resolved) add(`${x.route}#${x.i}`, "research");
}

const ids = [...new Set([...claims.keys()].map(k => k.split("#")[0]))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: H });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

const tally = {};
const notInFab = [];
for (const [k, pass] of claims) {
  const [id, i] = [k.split("#")[0], +k.split("#")[1]];
  const w = ((rows[id] || {}).waypoints || [])[i];
  const o = orig.get(k);
  tally[pass] ||= { proposed: 0, changed: 0, unchanged: 0, missing: 0, offRadar: 0 };
  tally[pass].proposed++;
  if (!w || w.lat == null) { tally[pass].missing++; continue; }
  if (!o) { tally[pass].offRadar++; notInFab.push(k); continue; }   // proposed but never flagged
  if (Math.abs(+w.lat - o.lat) > 1e-9 || Math.abs(+w.lng - o.lng) > 1e-9) tally[pass].changed++;
  else tally[pass].unchanged++;
}
for (const [pass, t] of Object.entries(tally))
  console.log(`${pass.padEnd(11)} proposed ${String(t.proposed).padStart(4)}  changed ${String(t.changed).padStart(4)}  unchanged ${String(t.unchanged).padStart(3)}  not-in-fab-list ${String(t.offRadar).padStart(3)}  missing ${t.missing}`);
const tot = Object.values(tally).reduce((s, t) => s + t.changed + t.offRadar, 0);
console.log(`\ntotal pins whose coordinate this effort replaced: ${tot}`);
if (notInFab.length) console.log(`(${notInFab.length} were repaired but are not in fab-pins.json, so the earlier measurement could not see them)`);
