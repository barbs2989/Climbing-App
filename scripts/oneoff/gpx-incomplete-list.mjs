// The owner's list: which peak routes (alpine, mountaineering, scrambling) lack a COMPLETE track
// from the trailhead to the summit and back? Read-only. Writes a CSV and prints counts by state.
// Usage: node scripts/oneoff/gpx-incomplete-list.mjs <completeness.json> <out.csv>
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";

const [compFile, outCsv] = process.argv.slice(2);
const comp = new Map(JSON.parse(fs.readFileSync(compFile, "utf8")).routes.map(r => [r.id, r]));
const rows = (await selectAll("routes", "id,name,discipline", "discipline=in.(alpine,mountaineering,scrambling)", { pageSize: 150 })).map(r => ({ ...r, state: r.id.split("_")[0].toUpperCase() }));
const status = r => {
  const c = comp.get(r.id);
  if (!c) return ["no track", ""];
  if (c.complete) return ["complete", ""];
  const p = c.problems.join("; ");
  if (/misses the summit/.test(p)) return ["stops short of the summit", p];
  if (/no trailhead pin|no summit pin/.test(p) && !/ends/.test(p)) return ["cannot be checked (pin missing)", p];
  if (/one-way/.test(p) && !/starts/.test(p)) return ["one-way (trailhead to summit only)", p];
  return ["partial (starts away from the trailhead)", p];
};
const esc = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
const lines = ["state,id,name,discipline,status,detail"];
const byState = {};
for (const r of rows.sort((a, b) => (a.state || "").localeCompare(b.state || "") || a.id.localeCompare(b.id))) {
  const [s, d] = status(r);
  (byState[r.state || "?"] ||= {})[s] = (byState[r.state || "?"][s] || 0) + 1;
  if (s !== "complete") lines.push([r.state, r.id, r.name, r.discipline, s, d].map(esc).join(","));
}
fs.writeFileSync(outCsv, lines.join("\n") + "\n");
console.log("peak routes", rows.length, "listed (not complete)", lines.length - 1);
console.log(JSON.stringify(byState, null, 1));
