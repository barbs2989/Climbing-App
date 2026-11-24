// Round 7 of the glacier-travel research (2026-11-24): one pool of researchers across every state.
// Splits research-data/glacier-travel-2026-11-23/round7/out-*.json into each state's next research-out-N.json
// (Washington: wa-research/), so the existing folds take them unchanged:
//   node scripts/oneoff/glacier-travel-round7-split.mjs
//   node scripts/oneoff/glacier-travel-decide.mjs --state <s> --final    # each non-WA state it names
//   node scripts/oneoff/glacier-travel-wa-research.mjs --fold
// HOLD (below) writes a thin "no" as "unsure" before the split, the hand review's rule (RESEARCH-PROMPT step 5).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = path.join(ROOT, "research-data", "glacier-travel-2026-11-23"), R7 = path.join(D, "round7");
const VALS = new Set(["yes", "no", "unsure"]);
const HOLD = JSON.parse(fs.existsSync(path.join(R7, "hold.json")) ? fs.readFileSync(path.join(R7, "hold.json"), "utf8") : "{}");

const inn = new Map();
for (const f of fs.readdirSync(R7).filter((f) => /^in-\d+\.json$/.test(f))) JSON.parse(fs.readFileSync(path.join(R7, f), "utf8")).forEach((r) => inn.set(r.id, r));
const byState = new Map(), problems = [], seen = new Set();
for (const f of fs.readdirSync(R7).filter((f) => /^out-\d+\.json$/.test(f))) for (const r of JSON.parse(fs.readFileSync(path.join(R7, f), "utf8"))) {
  const i = inn.get(r.id);
  if (!i) { problems.push(f + ": unknown id " + r.id); continue; }
  if (seen.has(r.id)) { problems.push(f + ": " + r.id + " answered twice"); continue; }
  if (!VALS.has(r.glacier) || !VALS.has(r.snowInSeason)) { problems.push(f + ": " + r.id + " bad value"); continue; }
  if (r.glacier === "yes" && r.snowInSeason !== "yes") r.snowInSeason = "yes";
  seen.add(r.id);
  const o = { id: r.id, glacier: r.glacier, snowInSeason: r.snowInSeason, basis: r.basis, why: r.why, url: r.url ?? null };
  if (HOLD[r.id]) { if (HOLD[r.id].glacier) o.glacier = "unsure"; if (HOLD[r.id].snow) o.snowInSeason = "unsure"; o.why = "Held at unsure on review: " + HOLD[r.id].why + " (researcher: " + r.why + ")"; }
  if (!byState.has(i.state)) byState.set(i.state, []);
  byState.get(i.state).push(o);
}
const missing = [...inn.keys()].filter((id) => !seen.has(id));
if (missing.length) problems.push(missing.length + " inputs unanswered: " + missing.slice(0, 8).join(", "));
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
for (const [st, rows] of byState) {
  const dir = st === "wa" ? path.join(D, "wa-research") : path.join(D, st);
  const n = Math.max(0, ...fs.readdirSync(dir).map((f) => (f.match(/^research-out-(\d+)\.json$/) || [])[1]).filter(Boolean).map(Number));
  // Re-runnable: reuse the round-7 file if this script already wrote one.
  const mine = fs.readdirSync(dir).find((f) => /^research-out-\d+\.json$/.test(f) && fs.readFileSync(path.join(dir, f), "utf8").includes('"round": 7'));
  const file = mine || `research-out-${n + 1}.json`;
  fs.writeFileSync(path.join(dir, file), JSON.stringify(rows.map((r) => ({ ...r, round: 7 })), null, 1));
  const t = rows.reduce((m, r) => { m[r.glacier] = (m[r.glacier] || 0) + 1; return m; }, {});
  console.log(`${st}: ${rows.length} answers -> ${path.relative(D, path.join(dir, file))}  glacier ${JSON.stringify(t)}`);
}
