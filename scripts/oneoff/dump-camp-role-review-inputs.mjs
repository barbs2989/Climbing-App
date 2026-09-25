// Second-reader pass: dump the routes whose first researcher flagged doubt, with their LIVE sorted
// camps, so an independent reviewer can confirm or correct them.
//   node scripts/oneoff/dump-camp-role-review-inputs.mjs <doubts.json> [perBatch=18]
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const doubts = JSON.parse(fs.readFileSync(process.argv[2]));
const PER = Number(process.argv[3] || 18);
const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };
const rows = [];
for (const d of doubts) {
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(d.id)}&select=id,name,area_id,discipline,grade,approach,bivy,waypoints`, { headers: headers(key) })).json())[0];
  rows.push({ id: r.id, name: r.name, peak: r.area_id, discipline: r.discipline, grade: r.grade, approach: cut(r.approach, 600), firstResearcherNote: d.note,
    camps: (r.bivy || []).filter(b => b.role !== "hidden").map(b => ({ name: b.name, role: b.role || null, elev: b.elev ?? null, notes: cut(b.notes, 200) })),
    campsitePins: (r.waypoints || []).filter(w => /camp/i.test(w.type || "")).map(w => ({ name: w.name, elev: w.elev ?? null, hiddenFromList: (r.bivy || []).some(b => b.role === "hidden" && b.name === w.name) })) });
}
const dir = "enrichment-wip/camping-roles/review-input/"; fs.mkdirSync(dir, { recursive: true });
for (let i = 0; i < rows.length; i += PER) fs.writeFileSync(dir + "review-" + String(i / PER + 1).padStart(2, "0") + ".json", JSON.stringify(rows.slice(i, i + PER), null, 1));
console.log(rows.length, "routes in", Math.ceil(rows.length / PER), "review batches");
