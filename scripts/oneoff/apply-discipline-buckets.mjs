// Applies an ops file written by plan-discipline-buckets.mjs. PRODUCTION WRITES, throttled:
//   - at least 1000 ms between writes;
//   - every write carries its precondition in the URL (parent_id / path / no children), so a row
//     that moved since the plan is skipped and reported, never overwritten;
//   - a health read every 25 writes; a failed or slow (>4 s) read, or any write error, STOPS the run
//     (no fast retries). Re-run with --resume <n> to continue from op n after a backoff;
//   - the rollback file (prior parent_id and path of every row touched) is written BEFORE any write.
//
//   node scripts/oneoff/apply-discipline-buckets.mjs <ops.json> --rollback <file> [--resume <n>] [--dry]
import fs from "fs";
import { loadEnv } from "../lib/supabase-env.mjs";

const env = loadEnv();
const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("service key missing: symlink .env");
const args = process.argv.slice(2);
const opsFile = args[0];
const flag = n => { const i = args.indexOf(n); return i > 0 ? args[i + 1] : null; };
const rollbackFile = flag("--rollback");
const resume = Number(flag("--resume") || 0);
const dry = args.includes("--dry");
const { ops } = JSON.parse(fs.readFileSync(opsFile, "utf8"));
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const enc = s => encodeURIComponent(s);

async function health() {
  const t = Date.now();
  const r = await fetch(`${url}/rest/v1/areas?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const ms = Date.now() - t;
  if (!r.ok || ms > 4000) throw new Error(`health read ${r.status} in ${ms} ms — stopping`);
  return ms;
}

async function childCount(id) {
  const r = await fetch(`${url}/rest/v1/areas?select=id&parent_id=eq.${enc(id)}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const rows = await r.json();
  if (!Array.isArray(rows)) throw new Error("child read failed: " + JSON.stringify(rows).slice(0, 200));
  return rows.length;
}

// Every table whose area_id is ON DELETE CASCADE (SUPABASE_SCHEMA.sql): a bucket with ANY row in
// these is HELD, never deleted, because the delete would take that row with it. crews, routes
// have no cascade and would refuse the delete themselves.
const CASCADE_TABLES = ["contributions", "topos", "saved_areas", "partner_areas"];
async function cascadeRefs(id) {
  const found = {};
  for (const t of CASCADE_TABLES) {
    const r = await fetch(`${url}/rest/v1/${t}?select=area_id&area_id=eq.${enc(id)}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error(`${t} read failed: ` + JSON.stringify(rows).slice(0, 200));
    if (rows.length) found[t] = "rows";
  }
  return found;
}

// Rollback first: every row this run can touch, with the value it holds now. Written ONCE, from
// the first run; a re-run must not overwrite the prior values with values already moved.
if (rollbackFile && !dry && !fs.existsSync(rollbackFile)) {
  const rows = ops.map((o, i) => ({ i, type: o.type, id: o.id, name: o.name, prev: o.prev }));
  fs.writeFileSync(rollbackFile, JSON.stringify({ note: "prior parent_id/path per op; undo in reverse order", ops: rows }, null, 1));
}

const log = [];
const held = [];
let done = 0, skipped = [];
for (let i = resume; i < ops.length; i++) {
  const o = ops[i];
  if (i % 25 === 0) {
    const ms = await health();
    console.log(`[${i}/${ops.length}] health ${ms} ms`);
  }
  if (dry) { log.push({ i, type: o.type, id: o.id }); continue; }
  let r, body;
  if (o.type === "reparent") {
    r = await fetch(`${url}/rest/v1/areas?id=eq.${enc(o.id)}&parent_id=eq.${enc(o.prev.parent_id)}`, { method: "PATCH", headers: H, body: JSON.stringify({ parent_id: o.to }) });
  } else if (o.type === "path") {
    r = await fetch(`${url}/rest/v1/areas?id=eq.${enc(o.id)}&path=eq.${enc(o.prev.path)}`, { method: "PATCH", headers: H, body: JSON.stringify({ path: o.path }) });
  } else if (o.type === "delete") {
    const kids = await childCount(o.id);
    if (kids) { held.push({ i, id: o.id, name: o.name, why: `${kids} child(ren) still held` }); console.log(`HELD delete op ${i} ${o.name}: ${kids} child(ren) still under it`); continue; }
    const refs = await cascadeRefs(o.id);
    if (Object.keys(refs).length) { held.push({ i, id: o.id, name: o.name, refs }); console.log(`HELD delete op ${i} ${o.name}: rows in ${Object.keys(refs).join(", ")}`); continue; }
    r = await fetch(`${url}/rest/v1/areas?id=eq.${enc(o.id)}&parent_id=eq.${enc(o.prev.parent_id)}`, { method: "DELETE", headers: H });
  } else throw new Error("unknown op " + o.type);
  body = await r.text();
  if (!r.ok && o.type === "reparent" && body.includes('"P0001"') && body.includes("already exists")) {
    // The 0216 trigger refused a same-named place already in the catalog. A person folds that pair;
    // this script never does. The bucket stays, holding this crag.
    held.push({ i, id: o.id, name: o.name, why: "duplicate place refused by the database: " + body.slice(0, 200) });
    console.log(`HELD reparent op ${i} ${o.name}: duplicate place refused`);
    await sleep(1000);
    continue;
  }
  if (!r.ok) throw new Error(`op ${i} ${o.type} ${o.name}: HTTP ${r.status} ${body.slice(0, 300)} — stopping at op ${i}; resume with --resume ${i}`);
  const rows = JSON.parse(body || "[]");
  if (!rows.length) { skipped.push({ i, type: o.type, name: o.name }); console.log(`skip op ${i} (${o.type} ${o.name}): precondition no longer holds`); }
  else done++;
  log.push({ i, type: o.type, id: o.id, ok: rows.length > 0 });
  await sleep(1000);
}
if (!dry) {
  const tail = await health();
  console.log(JSON.stringify({ applied: done, skipped: skipped.length, held: held.length, total: ops.length, healthMs: tail }));
  if (skipped.length) console.log("SKIPPED", JSON.stringify(skipped));
  if (held.length) console.log("HELD", JSON.stringify(held));
}
