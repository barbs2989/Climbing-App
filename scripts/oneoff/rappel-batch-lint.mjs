// Checks a research batch for the single-rope pass against audit:rappel-one-rope's own rules,
// applied to the row as it WILL be after the batch is written.
import fs from "node:fs";
import { findings, TWO_ROPE_TEXT } from "../audit-rappel-one-rope.mjs";
const census = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const byId = new Map(census.rows.map(r => [r.id, r]));
let bad = 0;
for (const f of process.argv.slice(3)) {
  const b = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [id, s] of Object.entries(b)) {
    const before = byId.get(id) || {};
    const after = { ...before, ...(s.set || {}) };
    if (s.clear_rappels) after.rappel_detail = null;
    if (s.rappel_detail) after.rappel_detail = s.rappel_detail;
    const fs_ = findings(after);
    const dt = s.set && s.set.descent_text && String(s.set.descent_text).match(TWO_ROPE_TEXT);
    if (dt) fs_.push({ kind: "wording", detail: `descent_text: "${dt[0]}"` });
    if (s.area !== before.area_id) fs_.push({ kind: "area", detail: `${s.area} vs ${before.area_id}` });
    if (fs_.length) { bad++; console.log(`${f.split("/").pop()} ${id}: ${fs_.map(x => x.kind + " " + x.detail).join("; ")}`); }
  }
}
console.log(bad ? `${bad} entries still describe more than one rope` : "batch lint: ok");
