// Turns a research output (out/bNN.json: { id: { boxes: { label: {notes, lengthM?, anchor?} }, review } })
// into an enrich:apply batch (apply/bNN.json) that replaces each route's pitch_detail with the STORED
// table plus the researched fields. The stored table is re-read live (service key) so a climber's edit
// since the context files were written is kept. Labels, grades, order and every other key stay as they
// are; a researched label that is not exactly one stored label is refused.
// Usage: node audits/box-detail-2026-10-29/merge.mjs out/b01.json
import fs from "fs";
import path from "path";
import { selectAll, requireServiceKey } from "../../scripts/lib/supabase-env.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, process.argv[2]);
const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const ids = Object.keys(raw).filter(k => k !== "skip_reasons" && raw[k] && raw[k].boxes && Object.keys(raw[k].boxes).length);
const key = requireServiceKey();
const rows = ids.length ? await selectAll("routes", "id,area_id,pitch_detail", `id=in.(${ids.map(encodeURIComponent).join(",")})`, { key, pageSize: 200 }) : [];
const out = {};
for (const id of ids) {
  const row = rows.find(r => r.id === id);
  if (!row) { console.error(`REFUSING ${id} — no such row`); continue; }
  const conf = raw[id].review && raw[id].review.confidence;
  if (conf === "low") { console.log(`hold ${id} — low confidence`); continue; }
  const table = (row.pitch_detail || []).map(p => ({ ...p }));
  let n = 0, bad = false;
  for (const [label, add] of Object.entries(raw[id].boxes)) {
    const hits = table.filter(p => String(p.pitch) === label);
    if (hits.length !== 1) { console.error(`REFUSING ${id} — label ${JSON.stringify(label)} matches ${hits.length} stored entries`); bad = true; break; }
    const p = hits[0];
    if (add.notes && String(add.notes).trim()) p.notes = String(add.notes).trim();
    if (typeof add.lengthM === "number" && p.lengthM == null) p.lengthM = Math.round(add.lengthM);
    if (add.anchor && !p.anchor) p.anchor = String(add.anchor).trim();
    n++;
  }
  if (bad || !n) continue;
  out[id] = { area: row.area_id, pitch_detail: table, replace_pitch_detail: true, review: raw[id].review };
  console.log(`ok ${id} — ${n} boxes`);
}
const dest = path.join(here, "apply", path.basename(file));
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
console.log(`wrote ${Object.keys(out).length} routes to ${dest}`);
