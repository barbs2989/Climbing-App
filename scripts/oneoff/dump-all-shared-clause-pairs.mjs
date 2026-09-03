#!/usr/bin/env node
// Every shared-clause row, grouped by column pair, with the clause and its offsets. This is the
// reading list behind measure-prose-shared-clauses.mjs' counts — quoting a bucket's SIZE without
// reading it is the mistake that measurement was written to correct.
import { selectAll } from "../lib/supabase-env.mjs";

const COLS = ["overview", "beta", "watch_out", "best_season", "approach", "descent_text", "hazards"];
const MIN = Number(process.env.MIN || 60);
const rows = await selectAll("routes", "id," + COLS.join(","), "overview=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("BROKEN PROBE: no rows read"); process.exit(1); }
const text = (v) => {
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim();
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(" ").replace(/\s+/g, " ").trim();
  return "";
};
function sharedRun(a, b) {
  if (a.length < MIN || b.length < MIN) return null;
  const seen = new Map();
  for (let i = 0; i + MIN <= a.length; i++) { const w = a.slice(i, i + MIN); if (!seen.has(w)) seen.set(w, i); }
  for (let j = 0; j + MIN <= b.length; j++) {
    const w = b.slice(j, j + MIN);
    if (!seen.has(w)) continue;
    const i = seen.get(w);
    let s = 0; while (i - s - 1 >= 0 && j - s - 1 >= 0 && a[i - s - 1] === b[j - s - 1]) s++;
    let e = MIN; while (i + e < a.length && j + e < b.length && a[i + e] === b[j + e]) e++;
    return { ai: i - s, bi: j - s, len: e + s, shared: a.slice(i - s, i + e) };
  }
  return null;
}
const SKIP = new Set((process.env.SKIP || "").split(",").filter(Boolean));
const groups = new Map();
for (const r of rows) {
  for (let i = 0; i < COLS.length; i++) for (let j = i + 1; j < COLS.length; j++) {
    const key = COLS[i] + "+" + COLS[j];
    if (SKIP.has(key)) continue;
    const a = text(r[COLS[i]]), b = text(r[COLS[j]]);
    if (!a || !b || a === b || a.includes(b) || b.includes(a)) continue;
    const run = sharedRun(a, b);
    if (!run) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push([r.id, run, a.length, b.length]);
  }
}
let total = 0;
for (const [key, list] of [...groups].sort((x, y) => y[1].length - x[1].length)) {
  console.log(`\n===== ${key}  (${list.length}) =====`);
  for (const [id, run, la, lb] of list) {
    total++;
    console.log(`  ${id}  ${run.len}ch  @${run.ai}/${la} @${run.bi}/${lb}`);
    console.log(`     ${JSON.stringify(run.shared.slice(0, 200))}`);
  }
}
console.log(`\n${total} pair(s) across ${groups.size} column pair(s)`);
