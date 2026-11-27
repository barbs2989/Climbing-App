// Kautz note, other routes: a belayed ice step drawn as a WALK (no AI/WI grade, no anchor), or glacier travel
// graded "AI1" drawn as a roped pitch. Applies the researched changes in ice-research-*.json (high + medium
// confidence only) to routes.pitch_detail: `grade` (and `anchor`) on the named entry. Nothing else in the entry,
// and no `notes`, is touched.
// Refuses an entry whose label or grade is no longer what the research read. Paced 1500 ms per write; re-reads
// every row afterwards. Rollback: scripts/rollback-ice-steps-<ts>.json (pitch_detail as it was).
//   node scripts/oneoff/glacier-pitch-sweep/apply-ice-steps.mjs --dry
import fs from "node:fs";
import { patchRow, selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
import { pitchEntryKind } from "../../../lib/breakdownRows.js";
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const dir = new URL("../../../research-data/glacier-pitch-sweep/", import.meta.url);
const changes = fs.readdirSync(dir).filter((f) => /^ice-research-\d+\.json$/.test(f))
  .flatMap((f) => JSON.parse(fs.readFileSync(new URL(f, dir))).changes || [])
  .filter((c) => c.confidence === "high" || c.confidence === "medium");
const byId = {};
for (const c of changes) (byId[c.id] = byId[c.id] || []).push(c);
const rollback = {}; const done = []; const refused = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [id, cs] of Object.entries(byId)) {
  const [row] = await selectAll("routes", "id,discipline,pitch_detail", `id=eq.${encodeURIComponent(id)}`, { key });
  if (!row || !Array.isArray(row.pitch_detail)) { refused.push({ id, why: "no row / no pitch_detail" }); continue; }
  const pd = JSON.parse(JSON.stringify(row.pitch_detail));
  let n = 0;
  for (const c of cs) {
    const e = pd[c.i];
    const lbl = e && String(e.pitch ?? e.n ?? "");
    if (!e || lbl !== String(c.label) || String(e.grade || "") !== String(c.old_grade || "")) { refused.push({ id, i: c.i, why: "entry changed", now: e && [lbl, e.grade] }); continue; }
    e.grade = c.grade;
    if (c.change === "to_pitch") { if (c.anchor) e.anchor = c.anchor; }
    else delete e.anchor;
    const want = c.change === "to_pitch" ? "pitch" : "stage";
    if (pitchEntryKind(e, row) !== want) { refused.push({ id, i: c.i, why: "would still classify as " + pitchEntryKind(e, row), grade: c.grade }); pd[c.i] = row.pitch_detail[c.i]; continue; }
    n++; done.push({ id, i: c.i, label: lbl, from: c.old_grade, to: c.grade, anchor: e.anchor || null, change: c.change });
  }
  if (!n) continue;
  rollback[id] = row.pitch_detail;
  if (!DRY) { await patchRow("routes", id, { pitch_detail: pd }); await sleep(1500); }
}
if (!DRY && Object.keys(rollback).length) {
  fs.writeFileSync(`scripts/rollback-ice-steps-${Date.now()}.json`, JSON.stringify(rollback, null, 1));
  for (const d of done) {
    const [r] = await selectAll("routes", "id,discipline,pitch_detail", `id=eq.${encodeURIComponent(d.id)}`, { key });
    const e = r.pitch_detail[d.i];
    if (e.grade !== d.to) refused.push({ id: d.id, i: d.i, why: "re-read disagrees", got: e.grade });
  }
}
console.log(JSON.stringify({ dry: DRY, applied: done, refused }, null, 1));
