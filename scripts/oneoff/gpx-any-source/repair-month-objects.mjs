// Repair seasonal_guidance.monthBreakdown written by apply-verdicts' facts stage before 2026-11-04's fix.
// The panel reads each month as {status, reason}. The stage appended text with String(), so a month that
// was {status, reason} became "[object Object] <fact>" (status and reason lost: the tile read "—"),
// and a month it created was a bare string (rendered nowhere). From the EARLIEST rollback's original:
//   object month  -> {...original, reason: original.reason + " " + added fact}
//   new month     -> {reason: fact}            (no status is invented)
//   string month that pre-dated the pass -> left alone
// Usage: node repair-month-objects.mjs [--write]   (dry run without --write)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { patchRow, selectAll } from "../../lib/supabase-env.mjs";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const WRITE = process.argv.includes("--write");
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {}) : x);
const files = fs.readdirSync(path.join(REPO, "scripts")).filter(f => /^rollback-gpx-any-source-facts-\d+\.json$/.test(f)).sort();
const orig = new Map(); // earliest before
for (const f of files) for (const r of JSON.parse(fs.readFileSync(path.join(REPO, "scripts", f), "utf8")).rows)
  if ("seasonal_guidance" in r.before && !orig.has(r.id)) orig.set(r.id, r.before.seasonal_guidance);
const writes = []; let objFixed = 0, created = 0, leftStrings = 0;
for (const [id, before] of orig) {
  const row = (await selectAll("routes", "id,seasonal_guidance", `id=eq.${encodeURIComponent(id)}`, { pageSize: 5 }))[0];
  const sg = JSON.parse(JSON.stringify(row?.seasonal_guidance || {})); const mb = sg.monthBreakdown;
  if (!mb || typeof mb !== "object") continue;
  const ob = before?.monthBreakdown || {}; let changed = false;
  for (const [k, v] of Object.entries(mb)) {
    if (typeof v !== "string") continue;
    const o = ob[k];
    if (typeof o === "string") { leftStrings++; continue; }
    const added = v.replace(/^\[object Object\]\s*/, "").trim();
    if (o && typeof o === "object") { mb[k] = { ...o, reason: o.reason ? `${String(o.reason).trim().replace(/[.;,]?$/, ".")} ${added}` : added }; objFixed++; }
    else { mb[k] = { reason: added }; created++; }
    changed = true;
  }
  if (changed) writes.push({ id, before: row.seasonal_guidance, after: sg });
}
console.log(`rows ${writes.length}; object months restored ${objFixed}; new months given {reason} ${created}; older string months left ${leftStrings}`);
for (const w of writes.slice(0, 3)) console.log(w.id, JSON.stringify(w.after.monthBreakdown).slice(0, 300));
if (!WRITE) process.exit(0);
const rb = path.join(REPO, "scripts", `rollback-gpx-any-source-month-objects-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify({ at: new Date().toISOString(), note: "restore with patchRow(routes, id, before)", rows: writes.map(w => ({ id: w.id, before: { seasonal_guidance: w.before } })) }, null, 1));
console.log("rollback saved", rb);
for (const w of writes) { await patchRow("routes", w.id, { seasonal_guidance: w.after }); await new Promise(r => setTimeout(r, 1000)); }
let bad = 0;
for (const w of writes) { const now = (await selectAll("routes", "id,seasonal_guidance", `id=eq.${encodeURIComponent(w.id)}`, { pageSize: 5 }))[0]; if (canon(now.seasonal_guidance) !== canon(w.after)) { bad++; console.log("RECONCILE", w.id); } }
console.log(`repaired ${writes.length}, reconcile problems ${bad}`);
