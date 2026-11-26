// fill-pitches-from-mp.mjs — give a route with NO pitch count the count its Mountain Project page states
// (owner note 2026-11-25: "What do we do when there's no information on number of pitches?"). Nothing is
// fetched: MP_DIR holds the route-finder exports already on disk (*.csv: URL, Pitches, Length) and the
// import's exact MP-id maps (_map/<state>.json: { mpRouteId: ourRouteId }), as fill-length-from-mp.mjs reads them.
//
//   MP_DIR=~/dev/mp-data/_mp node scripts/pipeline/fill-pitches-from-mp.mjs                 plan only
//   MP_DIR=~/dev/mp-data/_mp node scripts/pipeline/fill-pitches-from-mp.mjs --apply [--offset K] [--limit N]   (writes from the saved plan)
//
// MP's export prints a count on EVERY route (287,059 of 309,743 read 1, none blank: 1 is MP's default for a
// route whose submitter gave none, as it is OpenStreetMap's), so only a count ABOVE 1 is information.
//
//   FILL      ours null or 0, every MP id mapped to it agrees on one count > 1 -> pitches.
//   CONFLICT  two MP ids/exports disagree -> listed, not written.
//   DIFFERS   ours already >= 1 and MP says another count -> listed only (a fingerprint does not authorise a
//             bulk fix; the stored count may be a researched one).
//   MP SAYS 1 / NO MP -> left blank: the app reads a blank count as one pitch unless the length says otherwise
//             (lib/pitchCount.js multiPitchByLength).
// Boulders, scrambles and walk-ups are skipped (never roped). Writes are paced (owner's bulk-write rule), go
// through fillBlanks (area_id asserted, re-read reconciled), and stop if the live app's reads slow down.
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";
import { selectAll, requireServiceKey, SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";
import { fillBlanks } from "../enrich-fill-blanks.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const li = args.indexOf("--limit");
const LIMIT = li >= 0 ? +args[li + 1] : Infinity;
const MP_DIR = process.env.MP_DIR || "catalog/_mp";
const PACE_MS = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SKIP = new Set(["bouldering", "scrambling", "hiking", "scramble", "hike"]);

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

const mpP = new Map(); // mp id -> Set<pitch count>
for (const f of fs.readdirSync(MP_DIR).filter((n) => n.endsWith(".csv"))) {
  const rows = parseCSV(fs.readFileSync(path.join(MP_DIR, f), "utf8"));
  const h = rows[0] || [];
  const iUrl = h.indexOf("URL"), iP = h.indexOf("Pitches");
  if (iUrl < 0 || iP < 0) continue;
  for (const r of rows.slice(1)) {
    const m = /\/route\/(\d+)/.exec(r[iUrl] || "");
    if (!m) continue;
    const P = Number(r[iP]);
    if (!(P > 0)) continue;
    if (!mpP.has(m[1])) mpP.set(m[1], new Set());
    mpP.get(m[1]).add(Math.round(P));
  }
}

const outDir = path.join(MP_DIR, "_pitches");
const planFile = path.join(outDir, "plan.json");
// --apply writes from the saved plan: re-reading ~280k rows before every batch is a bulk read the database
// does not need. fillBlanks re-reads each row (area asserted, value still blank) before it writes.
if (APPLY && !fs.existsSync(planFile)) throw new Error(`no ${planFile} — run without --apply first`);
const PLAN = APPLY ? JSON.parse(fs.readFileSync(planFile, "utf8")).plan : null;
const ids = APPLY ? [] : [...oursToMp.keys()];
console.log(`MP ids with a count ${mpP.size}; our routes mapped ${ids.length}`);
// Read only the mapped rows, by id, in chunks: a keyset scan of the whole table times out under load.
const live = [];
const CH = 150;
for (let i = 0; i < ids.length; i += CH) {
  const part = ids.slice(i, i + CH).map((x) => `"${x.replace(/"/g, '\\"')}"`).join(",");
  const rows = await selectAll("routes", "id,name,area_id,discipline,pitches,length_m,pitch_detail", `id=in.(${part})`, { pageSize: 1000, key: requireServiceKey() });
  live.push(...rows);
  if (i % (CH * 40) === 0) console.log(`read ${i + CH} / ${ids.length}`);
  await sleep(150);
}
const plan = APPLY ? PLAN : [], conflict = [], differs = [];
let mpOne = 0, noMp = 0, skipped = 0;
for (const r of APPLY ? [] : live) {
  if (SKIP.has(r.discipline)) { skipped++; continue; }
  const counts = new Set();
  for (const id of oursToMp.get(r.id) || []) (mpP.get(id) || []).forEach((v) => counts.add(v));
  if (!counts.size) { noMp++; continue; }
  if (counts.size > 1) { conflict.push({ id: r.id, name: r.name, ours: r.pitches, mp: [...counts] }); continue; }
  const mp = [...counts][0];
  if (r.pitches > 0) { if (r.pitches !== mp) differs.push({ id: r.id, name: r.name, discipline: r.discipline, ours: r.pitches, mp, length_m: r.length_m, described: Array.isArray(r.pitch_detail) ? r.pitch_detail.length : 0 }); continue; }
  if (mp === 1) { mpOne++; continue; }
  plan.push({ id: r.id, area_id: r.area_id, name: r.name, discipline: r.discipline, mp, before: { pitches: r.pitches } });
}
const byDisc = {};
for (const p of plan) byDisc[p.discipline] = (byDisc[p.discipline] || 0) + 1;
console.log(`rows read ${live.length} | skipped (boulder/scramble) ${skipped}`);
console.log(`FILL ${plan.length} ${JSON.stringify(byDisc)} | CONFLICT ${conflict.length} | DIFFERS ${differs.length} | MP says 1 ${mpOne} | no MP count ${noMp}`);
fs.mkdirSync(outDir, { recursive: true });
if (!APPLY) fs.writeFileSync(planFile, JSON.stringify({ plan, conflict, differs }, null, 1));
if (!APPLY) { console.log(`plan written to ${outDir}/plan.json — re-run with --apply to write`); process.exit(0); }

async function healthy() {
  const t = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&id=eq.${encodeURIComponent(plan[0].id)}`, { headers: headers(anonKey()) });
    return res.ok && Date.now() - t < 3000;
  } catch { return false; }
}

// The shared session gate (~/dev/db-throttle): exit 1 means the live app's reads are slow.
function gateOk() {
  const gate = path.join(os.homedir(), "dev/db-throttle/dbslot.mjs");
  if (!fs.existsSync(gate)) return true;
  try { execFileSync("node", [gate, "check"], { stdio: "ignore" }); return true; } catch { return false; }
}
const oi = args.indexOf("--offset");
const OFFSET = oi >= 0 ? +args[oi + 1] : 0;
const batch = plan.slice(OFFSET, OFFSET + LIMIT);
const rbFile = path.join(outDir, `rollback-${Date.now()}.json`);
fs.writeFileSync(rbFile, JSON.stringify(batch.map((p) => ({ id: p.id, area_id: p.area_id, before: p.before })), null, 1));
console.log(`rollback ${rbFile}`);
let written = 0, errors = 0;
const log = [];
for (const [i, p] of batch.entries()) {
  if (i % 200 === 0 && i > 0 && !gateOk()) { console.error(`db gate says slow at ${OFFSET + i} — stopping; resume with --offset ${OFFSET + i}`); break; }
  if (i % 50 === 0 && !(await healthy())) {
    console.error("database slow or failing — backing off 90 s");
    await sleep(90000);
    if (!(await healthy())) { console.error("still slow — stopping; re-run to resume (filled rows are skipped)"); break; }
  }
  try {
    // A stored 0 is the importer's "none given", not a count: overwrite it, naming why.
    const res = p.before.pitches === 0
      ? await fillBlanks({ id: p.id, areaId: p.area_id, fields: {}, overwrite: { pitches: p.mp }, why: "stored 0 is the importer's blank; MP states " + p.mp })
      : await fillBlanks({ id: p.id, areaId: p.area_id, fields: { pitches: p.mp } });
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
  if (i % 100 === 0) console.log(`${i + 1} / ${batch.length}, written ${written}`);
  await sleep(PACE_MS);
}
fs.writeFileSync(path.join(outDir, `apply-${Date.now()}.json`), JSON.stringify(log, null, 1));
console.log(`written ${written} of ${batch.length}`);
