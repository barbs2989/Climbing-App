// Build one reviewed apply file from the agents' batch files: only the routes the reviewer kept,
// with the edits the review called for (see APPLY-NOTES.md for each decision).
// Usage: node audits/pitch-rappel-detail/combine.mjs plan.json out.json
// plan.json: { "<batch letter>": { "<route_id>": { "drop": ["rappel_detail"|"lengthM"|...] } } }
import fs from "fs";
const dir = new URL("./", import.meta.url).pathname;
const [planFile, outFile] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
const out = {};
for (const [letter, routes] of Object.entries(plan)) {
  const batch = JSON.parse(fs.readFileSync(`${dir}2026-10-23-batch-${letter}.json`, "utf8"));
  for (const [id, opts] of Object.entries(routes)) {
    const spec = structuredClone(batch[id]);
    if (!spec) throw new Error(`${id} not in batch ${letter}`);
    for (const d of opts.drop || []) {
      if (d === "rappel_detail" || d === "pitch_detail") delete spec[d];
      else if (d.startsWith("pitch.")) for (const p of spec.pitch_detail || []) delete p[d.slice(6)];
      else if (d.startsWith("rappel.")) for (const r of spec.rappel_detail || []) delete r[d.slice(7)];
    }
    spec.review = { ...spec.review, batch: letter, reviewer_dropped: opts.drop || [] };
    out[id] = spec;
  }
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + "\n");
console.log(Object.keys(out).length, "routes ->", outFile);
