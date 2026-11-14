// Splits scope-ids.txt into batches of 5, listing each route's THIN boxes (no length, belay, anchor
// or bolts, and a note under 80 characters). Read-only: uses the context files.
import fs from "fs";
import path from "path";
const here = path.dirname(new URL(import.meta.url).pathname);
const ids = fs.readFileSync(path.join(here, "scope-ids.txt"), "utf8").split("\n").map(s => s.trim()).filter(Boolean);
const thin = p => !["lengthM", "belay", "anchor", "bolts"].some(k => p[k] != null && p[k] !== "") && String(p.notes || "").length < 80;
const out = [];
for (const id of ids) {
  const r = JSON.parse(fs.readFileSync(path.join(here, "context", id + ".json"), "utf8"));
  const labels = (r.pitch_detail || []).filter(thin).map(p => p.pitch);
  if (labels.length) out.push({ id, name: r.name, thin: labels });
}
fs.mkdirSync(path.join(here, "batches"), { recursive: true });
for (let i = 0; i < out.length; i += 5) fs.writeFileSync(path.join(here, "batches", `b${String(i / 5 + 1).padStart(2, "0")}.json`), JSON.stringify(out.slice(i, i + 5), null, 1));
console.log(out.length, "routes,", Math.ceil(out.length / 5), "batches");
