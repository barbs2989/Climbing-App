// Applies researched corrections to a route's `timing` (approach / summit / descent / total legs and
// their section breakdown) from the 2026-10-08 descent-time check.
//
//   node scripts/oneoff/apply-timing-fixes.mjs fixes.json          # dry run
//   node scripts/oneoff/apply-timing-fixes.mjs fixes.json --apply  # write, with a rollback file
//
// fixes.json: [{ id, from, to, why }] where `from` and `to` are WHOLE timing objects. Compare-and-set:
// a row whose live timing is no longer `from` is REFUSED, never overwritten, so a fix researched
// against one version of a row cannot land on another. Each `to` must keep the leg convention
// (approach + summit + descent == total, or a multi-day ELAPSED total that is longer) and carry a
// section breakdown whose hours agree with its legs -- both checked before anything is written.
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const [file, flag] = process.argv.slice(2);
const APPLY = flag === "--apply";
const key = requireServiceKey();
const fixes = JSON.parse(fs.readFileSync(file, "utf8"));
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const near = (a, b) => Math.abs(a - b) < 0.05;

function invalid(t) {
  const a = t.approachTimeHrs, s = t.summitTimeHrs, d = t.descentTimeHrs, tot = t.totalHrs;
  for (const [k, v] of Object.entries({ a, s, d, tot })) if (v != null && !(typeof v === "number" && v >= 0 && v < 200)) return `leg ${k} is ${v}`;
  if (a != null && s != null && d != null && tot != null && tot + 0.05 < a + s + d) return `total ${tot} is shorter than its legs ${a + s + d}`;
  const sec = t.sectionBreakdown || [];
  if (sec.some((x) => typeof x.hrs !== "number")) return "a section has no hrs";
  const want = [a, s, d].filter((v) => v != null).reduce((x, y) => x + y, 0);
  if (sec.length && !near(sec.reduce((x, y) => x + y.hrs, 0), want)) return `sections sum to ${sec.reduce((x, y) => x + y.hrs, 0)}, legs to ${want}`;
  return null;
}

const rollback = [];
let ok = 0, refused = 0;
for (const f of fixes) {
  const bad = invalid(f.to);
  if (bad) { console.log(`REFUSED ${f.id}: the new timing is inconsistent (${bad})`); refused++; continue; }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(f.id)}&select=id,timing`, { headers: headers(key) });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length !== 1) { console.log(`REFUSED ${f.id}: not exactly one row`); refused++; continue; }
  const live = rows[0].timing;
  if (same(live, f.to)) { console.log(`ALREADY ${f.id}`); continue; }
  if (!same(live, f.from)) { console.log(`REFUSED ${f.id}: live timing is not the researched 'from'`); refused++; continue; }
  console.log(`${APPLY ? "WRITE" : "would write"} ${f.id}: ${JSON.stringify([f.from.approachTimeHrs, f.from.summitTimeHrs, f.from.descentTimeHrs, f.from.totalHrs])} -> ${JSON.stringify([f.to.approachTimeHrs, f.to.summitTimeHrs, f.to.descentTimeHrs, f.to.totalHrs])}  (${f.why})`);
  if (APPLY) { await patchRow("routes", f.id, { timing: f.to }); rollback.push({ id: f.id, field: "timing", before: live, after: f.to }); }
  ok++;
}
if (APPLY && rollback.length) {
  const rb = `scripts/rollback-timing-fixes-${Date.now()}.json`;
  fs.writeFileSync(rb, JSON.stringify(rollback, null, 1));
  console.log("rollback:", rb);
}
console.log(`${APPLY ? "applied" : "dry run"}: ${ok} ok, ${refused} refused`);
