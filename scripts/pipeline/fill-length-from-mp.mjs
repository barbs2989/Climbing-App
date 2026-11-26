// fill-length-from-mp.mjs — fill the TECHNICAL STATS "Climb length" (and a missing pitch count) on alpine and
// mountaineering routes (or, with --disc, any disciplines) from the Mountain Project route-finder exports
// already on disk. Nothing is fetched.
//
//   node scripts/pipeline/fill-length-from-mp.mjs                      plan only: counts, outliers, no writes
//   node scripts/pipeline/fill-length-from-mp.mjs --apply [--limit N]  write, paced (owner's bulk-write rule)
//   ... --disc sport                    other disciplines (comma list). Sport, measured 2026-11-26 on the 27,188
//                                       rows already holding a length with one MP match: 26,893 identical (98.9%).
//   ... --apply --bulk                  length-only rows go out as ONE PATCH per length value (<=100 ids,
//                                       filtered length_m=is.null so only blanks change), then every id is
//                                       re-read and reconciled. Ids come from the importer's exact MP-id map and
//                                       the live read, never from a name. Rows that also take pitches stay per-row.
//
// MP_DIR (default catalog/_mp) holds the exports (*.csv: Route, URL, Pitches, Length in feet, ...) and the
// import's exact MP-id maps (_map/<state>.json: { mpRouteId: ourRouteId }). The convention is the importer's
// own (import-route-grades.mjs: length_m = round(Length / 3.28084)), so a filled row reads exactly like an
// imported one. Measured 2026-10-28 on the 218 alpine/mountaineering rows that already held a length and
// had one MP match: 186 identical, 194 within 10%.
//
// The plan, per route (discipline alpine or mountaineering, length_m blank):
//   FILL      exactly one MP length > 0 across every MP id mapped to it -> length_m; pitches too when ours is
//             blank (null) and MP gives a count > 0. A stored 0 pitches is left alone.
//   CONFLICT  two MP ids, or two exports, give different lengths -> listed, not written.
//   NO MP     no map entry, or MP prints no length -> left blank. No figure is estimated.
// Writes go through fillBlanks (coalesce only, area_id asserted, re-read reconciled). The rollback file
// (every id and its prior values) is written under MP_DIR/_length/ before the first write.
import fs from "fs";
import path from "path";
import { selectAll, requireServiceKey, SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";
import { fillBlanks } from "../enrich-fill-blanks.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const li = args.indexOf("--limit");
const LIMIT = li >= 0 ? +args[li + 1] : Infinity;
const MP_DIR = process.env.MP_DIR || "catalog/_mp";
const di = args.indexOf("--disc");
const DISCS = di >= 0 ? args[di + 1].split(",").filter(Boolean) : ["alpine", "mountaineering"];
if (!DISCS.length || DISCS.some((d) => !/^[a-z_]+$/.test(d))) throw new Error("--disc takes a comma list of disciplines");
const BULK = args.includes("--bulk");
// --max-ft N: an MP length above N ft goes to OUTLIER, not FILL (sport, 2026-11-26: 1,209,575 ft and 6,000-8,000 ft
// one-pitch "sport" climbs are typos in the export, not routes).
const mi = args.indexOf("--max-ft");
const MAX_FT = mi >= 0 ? Number(args[mi + 1]) : Infinity;
const PACE_MS = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Quote-aware CSV: commas and newlines inside "...", "" for a literal quote.
function parseCSV(text) {
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(f); rows.push(row); row = []; f = "";
    } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const mapDir = path.join(MP_DIR, "_map");
if (!fs.existsSync(mapDir)) throw new Error(`no ${mapDir} — set MP_DIR to the folder holding _map and the *.csv exports`);
const oursToMp = new Map();
for (const f of fs.readdirSync(mapDir).filter((n) => n.endsWith(".json"))) {
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(mapDir, f), "utf8")); } catch { continue; }
  if (!d || typeof d !== "object" || Array.isArray(d)) continue;
  for (const [mp, ours] of Object.entries(d)) {
    if (typeof ours !== "string") continue;
    if (!oursToMp.has(ours)) oursToMp.set(ours, new Set());
    oursToMp.get(ours).add(mp);
  }
}

const mpLen = new Map(); // mp id -> { lens:Set<ft>, pitches:Set<n> }
for (const f of fs.readdirSync(MP_DIR).filter((n) => n.endsWith(".csv"))) {
  const rows = parseCSV(fs.readFileSync(path.join(MP_DIR, f), "utf8"));
  const h = rows[0] || [];
  const iUrl = h.indexOf("URL"), iLen = h.indexOf("Length"), iP = h.indexOf("Pitches");
  if (iUrl < 0 || iLen < 0) continue;
  for (const r of rows.slice(1)) {
    const m = /\/route\/(\d+)/.exec(r[iUrl] || "");
    if (!m) continue;
    if (!mpLen.has(m[1])) mpLen.set(m[1], { lens: new Set(), pitches: new Set() });
    const e = mpLen.get(m[1]);
    const L = Number(r[iLen]), P = Number(r[iP]);
    if (L > 0) e.lens.add(L);
    if (P > 0) e.pitches.add(Math.round(P));
  }
}

const live = await selectAll("routes", "id,name,area_id,discipline,length_m,pitches",
  `discipline=in.(${DISCS.join(",")})`, { pageSize: 1000, key: requireServiceKey() });
const plan = [], conflict = [], noMp = [], outlier = [];
for (const r of live) {
  if (r.length_m != null) continue;
  const mps = [...(oursToMp.get(r.id) || [])].filter((id) => mpLen.has(id));
  const lens = new Set(), pitches = new Set();
  for (const id of mps) { mpLen.get(id).lens.forEach((v) => lens.add(v)); mpLen.get(id).pitches.forEach((v) => pitches.add(v)); }
  if (!lens.size) { noMp.push(r.id); continue; }
  if (lens.size > 1) { conflict.push({ id: r.id, lens: [...lens] }); continue; }
  const ft = [...lens][0];
  if (ft > MAX_FT) { outlier.push({ id: r.id, ft }); continue; }
  const fields = { length_m: Math.round(ft / 3.28084) };
  if (r.pitches == null && pitches.size === 1) fields.pitches = [...pitches][0];
  plan.push({ id: r.id, area_id: r.area_id, name: r.name, mp: mps, ft, fields, before: { length_m: r.length_m, pitches: r.pitches } });
}

console.log(`${DISCS.join("+")} rows ${live.length}; blank length ${live.filter((r) => r.length_m == null).length}`);
console.log(`FILL ${plan.length} (with pitches ${plan.filter((p) => p.fields.pitches).length}) | CONFLICT ${conflict.length} | NO MP ${noMp.length} | OUTLIER ${outlier.length}`);
console.log("longest:", plan.slice().sort((a, b) => b.ft - a.ft).slice(0, 5).map((p) => `${p.id} ${p.ft} ft`).join(", "));
const outDir = path.join(MP_DIR, "_length");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `plan-${DISCS.join("-")}.json`), JSON.stringify({ plan, conflict, noMp, outlier }, null, 1));
if (!APPLY) { console.log(`plan written to ${outDir}/plan-${DISCS.join("-")}.json — re-run with --apply to write`); process.exit(0); }

// A point read the app itself makes; if it slows or fails the database is struggling, and a bulk job stops.
async function healthy() {
  const t = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&id=eq.${encodeURIComponent(plan[0].id)}`, { headers: headers(anonKey()) });
    return res.ok && Date.now() - t < 3000;
  } catch { return false; }
}

const batch = plan.slice(0, LIMIT);
const rbFile = path.join(outDir, `rollback-${Date.now()}.json`);
fs.writeFileSync(rbFile, JSON.stringify(batch.map((p) => ({ id: p.id, area_id: p.area_id, before: p.before })), null, 1));
console.log(`rollback ${rbFile}`);
let written = 0, errors = 0;
const log = [];
const KEY = requireServiceKey(), WH = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", Prefer: "return=representation" };
let perRow = batch;
if (BULK) {
  const groups = new Map();
  for (const p of batch) if (Object.keys(p.fields).length === 1) {
    const v = p.fields.length_m;
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v).push(p.id);
  }
  perRow = batch.filter((p) => Object.keys(p.fields).length > 1);
  const chunks = [];
  for (const [v, ids] of groups) for (let i = 0; i < ids.length; i += 100) chunks.push([v, ids.slice(i, i + 100)]);
  console.log(`bulk: ${chunks.length} PATCHes for ${batch.length - perRow.length} rows; ${perRow.length} rows per-row`);
  let mismatched = 0;
  for (const [i, [v, ids]] of chunks.entries()) {
    if (i % 25 === 0 && !(await healthy())) {
      console.error("database slow or failing — backing off 90 s");
      await sleep(90000);
      if (!(await healthy())) { console.error("still slow — stopping; re-run to resume (filled rows are skipped)"); perRow = []; break; }
    }
    const inList = ids.map((x) => `"${x}"`).join(",");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${encodeURIComponent(inList)})&length_m=is.null&select=id,length_m`,
      { method: "PATCH", headers: WH, body: JSON.stringify({ length_m: v }) });
    if (!res.ok) {
      errors++;
      const t = (await res.text()).slice(0, 200);
      console.error(`ERROR length ${v} (${ids.length} ids): ${res.status} ${t}`);
      log.push({ length_m: v, ids, error: `${res.status} ${t}` });
      if (errors >= 2) { console.error("two errors in a row — stopping"); perRow = []; break; }
      await sleep(60000);
      continue;
    }
    errors = 0;
    const got = await res.json();
    // Reconcile: re-read every id; each must now hold v (it was blank, or someone filled it meanwhile).
    const back = await selectAll("routes", "id,length_m", `id=in.(${encodeURIComponent(inList)})`, { pageSize: 1000, key: KEY });
    const bad = back.filter((r) => r.length_m == null);
    mismatched += bad.length + (ids.length - back.length);
    written += got.length;
    log.push({ length_m: v, ids, written: got.map((r) => r.id), stillBlank: bad.map((r) => r.id) });
    if (i % 100 === 0) console.log(`  ${i + 1}/${chunks.length} patches, ${written} rows written, ${mismatched} unreconciled`);
    await sleep(PACE_MS);
  }
  console.log(`bulk done: ${written} rows written, ${mismatched} unreconciled`);
}
for (const [i, p] of perRow.entries()) {
  if (i % 50 === 0 && !(await healthy())) {
    console.error("database slow or failing — backing off 90 s");
    await sleep(90000);
    if (!(await healthy())) { console.error("still slow — stopping; re-run to resume (filled rows are skipped)"); break; }
  }
  try {
    const res = await fillBlanks({ id: p.id, areaId: p.area_id, fields: p.fields });
    if (res.written.length) written++;
    log.push({ id: p.id, written: res.written, kept: res.kept });
    errors = 0;
  } catch (e) {
    errors++;
    log.push({ id: p.id, error: String(e.message || e).slice(0, 300) });
    console.error(`ERROR ${p.id}: ${String(e.message || e).slice(0, 200)}`);
    if (errors >= 2) { console.error("two errors in a row — stopping rather than retrying into the database"); break; }
    await sleep(60000);
    continue;
  }
  await sleep(PACE_MS);
}
fs.writeFileSync(path.join(outDir, `apply-${Date.now()}.json`), JSON.stringify(log, null, 1));
console.log(`written ${written} of ${batch.length}`);
