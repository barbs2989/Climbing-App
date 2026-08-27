// What does `difficulty` hold, and is it a picker or a number box?
//
// DiffRadar reads {physical, technical, exposure, commitment, routefinding} and plots each on a
// 1-5 scale. It also takes an `onRate` prop and renders five 1-5 buttons per axis — so a climber
// can already rate this. That rating is `useState({})` in App, `lib/db.js` has ZERO references to
// it, and no migration creates a table for it: it is lost on reload and invisible to everyone
// else. The control marks the chosen button with aria-pressed, so it looks like it saved.
//
// This measures the column itself, to decide the input. If the axes are integers 1-5 they are a
// picker, which clusters exactly; if they carry decimals, a numeric box with the tolerance the
// consensus comparison already applies to numbers.

import { selectAll } from "../lib/supabase-env.mjs";

const AXES = ["physical", "technical", "exposure", "commitment", "routefinding"];
const rows = await selectAll("routes", "id,difficulty", "difficulty=not.is.null", { pageSize: 1000 });
const withD = rows.filter((r) => r.difficulty && typeof r.difficulty === "object");
if (!withD.length) { console.error("empty read — nothing to measure."); process.exit(1); }
console.log(`${withD.length} routes carry difficulty\n`);

const extra = {};
for (const r of withD) for (const k of Object.keys(r.difficulty)) if (!AXES.includes(k)) extra[k] = (extra[k] || 0) + 1;

for (const a of AXES) {
  const vals = withD.map((r) => r.difficulty[a]).filter((v) => v != null);
  if (!vals.length) { console.log(`${a.padEnd(14)} 0 values`); continue; }
  const counts = {}, types = {};
  let ints = 0;
  for (const v of vals) {
    counts[String(v)] = (counts[String(v)] || 0) + 1;
    types[typeof v] = (types[typeof v] || 0) + 1;
    if (typeof v === "number" && Number.isInteger(v)) ints++;
  }
  const distinct = Object.keys(counts).length;
  const top = Object.entries(counts).sort((a2, b2) => b2[1] - a2[1]).slice(0, 7)
    .map(([v, n]) => `${v}:${n}`).join("  ");
  console.log(`${a.padEnd(14)} ${String(vals.length).padStart(5)} values, ${distinct} distinct, ${ints} integer  ${JSON.stringify(types)}`);
  console.log(`               ${top}`);
}
console.log("\nkeys outside the five axes DiffRadar plots:", Object.keys(extra).length ? extra : "none");
