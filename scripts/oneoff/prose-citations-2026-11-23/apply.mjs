// Rewrites the WA route prose that named a third party as its source (audit:prose-citations, 2026-11-23,
// after Climber Kyle and "per Mazamas" joined NAMED). Each edit swaps one exact sentence for our own words
// carrying the same facts; nothing new is added. Kept on purpose, as the owner's rule allows: first-ascent
// credits, a club as the OPERATOR of trips or the owner of a grading scale, a guidebook or map to carry,
// and the avalanche-forecast caveat.
//
//   node scripts/oneoff/prose-citations-2026-11-23/apply.mjs            # dry run: every edit must match once
//   node scripts/oneoff/prose-citations-2026-11-23/apply.mjs --apply    # write, then re-read and reconcile
//
// before.json (written on --apply) holds every touched column as it was, for a rollback.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../../lib/supabase-env.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const edits = JSON.parse(fs.readFileSync(path.join(HERE, "edits.json"), "utf8"));
const key = requireServiceKey();

const groups = new Map();
for (const [id, col, from, to] of edits) { const k = id + "\0" + col; if (!groups.has(k)) groups.set(k, { id, col, list: [] }); groups.get(k).list.push([from, to]); }

// Every string leaf of a value, rewritten by fn; returns the new value.
function mapStrings(v, fn) {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map(x => mapStrings(x, fn));
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = mapStrings(v[k], fn); return o; }
  return v;
}
function count(v, s) { let n = 0; mapStrings(v, t => { n += t.split(s).length - 1; return t; }); return n; }

async function read(id, col) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,${col}`, { headers: headers(key) });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`${id}: read ${JSON.stringify(rows).slice(0, 120)}`);
  return rows[0][col];
}

const before = {}, planned = [];
let bad = 0;
for (const { id, col, list } of groups.values()) {
  const cur = await read(id, col);
  let next = cur;
  for (const [from, to] of list) {
    const n = count(next, from);
    if (n !== 1) { console.error(`MISS ${id}.${col}: matched ${n}x — ${from.slice(0, 70)}`); bad++; continue; }
    next = mapStrings(next, t => t.split(from).join(to));
  }
  (before[id] = before[id] || {})[col] = cur;
  planned.push({ id, col, next, list });
  await new Promise(s => setTimeout(s, 250));
}
console.log(`${edits.length} edit(s) on ${groups.size} column(s) of ${new Set(edits.map(e => e[0])).size} route(s); ${bad} miss(es).`);
if (bad) process.exit(1);
if (!APPLY) { console.log("dry run — pass --apply to write."); process.exit(0); }

fs.writeFileSync(path.join(HERE, "before.json"), JSON.stringify(before, null, 1));
for (const p of planned) { await patchRow("routes", p.id, { [p.col]: p.next }); console.log(`wrote ${p.id}.${p.col}`); }
// Reconcile: a 200 is not evidence the row changed.
let off = 0;
for (const p of planned) {
  const now = await read(p.id, p.col);
  for (const [from, to] of p.list) if (count(now, from) !== 0 || count(now, to) < 1) { console.error(`NOT LANDED ${p.id}.${p.col}: ${to.slice(0, 60)}`); off++; }
  await new Promise(s => setTimeout(s, 250));
}
console.log(off ? `FAIL — ${off} edit(s) did not land.` : `ok — all ${edits.length} edits re-read from the database.`);
process.exit(off ? 1 : 0);
