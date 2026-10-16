// Fold a route row THIS audit inserted into the catalog row it duplicates, then remove the insert.
//   node scripts/oneoff/merge-own-inserts.mjs <inserted_id>:<existing_id> ... [--apply]
// Only blank columns on the existing row are filled (never overwrites). The inserted rows are saved in full to
// scripts/rollback-merge-own-inserts-<ts>.json before anything is written. Refuses a pair whose inserted row
// carries a contribution or a climb log.
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const APPLY = process.argv.includes("--apply");
const pairs = process.argv.slice(2).filter((a) => a.includes(":")).map((a) => a.split(":"));
const SKIP = new Set(["id", "name", "area_id", "grade", "grade_num", "discipline", "search_name", "path"]);
const blank = (v) => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && v && !Object.keys(v).length);
const get = async (id) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=*`, { headers: headers(key) }); const j = await r.json(); return Array.isArray(j) ? j[0] : null; };
const rollback = [];
for (const [ins, ex] of pairs) {
  const a = await get(ins), b = await get(ex);
  if (!a || !b) { console.log("MISSING", ins, ex); continue; }
  let refd = false;
  for (const t of ["contributions", "climb_logs"]) { const q = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=id&route_id=eq.${encodeURIComponent(ins)}&limit=1`, { headers: headers(key) }); const j = await q.json(); if (Array.isArray(j) && j.length) refd = true; }
  if (refd) { console.log("REFUSED (referenced)", ins); continue; }
  const fill = {};
  for (const [k, v] of Object.entries(a)) if (!SKIP.has(k) && !blank(v) && k in b && (blank(b[k]) || (k === "pitches" && b[k] === 0 && v > 0))) fill[k] = v;
  // a fuller first-ascent line (adds the date) replaces a bare name
  if (a.fa && b.fa && a.fa.length > b.fa.length && a.fa.toLowerCase().includes(String(b.fa).toLowerCase().split(/[ ,&]/)[0])) fill.fa = a.fa;
  console.log(ins, "->", ex, JSON.stringify(fill));
  rollback.push({ inserted: a, existing_before: b, fill });
  if (!APPLY) continue;
  if (Object.keys(fill).length) await patchRow("routes", ex, fill);
  const d = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(ins)}`, { method: "DELETE", headers: headers(key, { Prefer: "return=representation" }) });
  const dj = await d.json();
  const still = await get(ins);
  console.log("  deleted", Array.isArray(dj) ? dj.length : dj, "| re-read gone:", !still);
}
if (APPLY && rollback.length) { const f = `scripts/rollback-merge-own-inserts-${Date.now()}.json`; fs.writeFileSync(f, JSON.stringify(rollback, null, 1)); console.log("rollback", f); }
