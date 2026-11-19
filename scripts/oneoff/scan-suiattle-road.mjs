// One-off, read-only: every route whose text sends a party up the Suiattle River Road (FS 26),
// and every string it holds about that road. The order in force since 2026-11-05 (06-05-26-25)
// closes FS 26 to vehicles from milepost 12 to the Suiattle River Trailhead; the earlier order
// closed it from ~milepost 4.
// Usage: node scripts/oneoff/scan-suiattle-road.mjs --out file.json
import fs from "node:fs";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const COLS = "id,name,area_id,timing,itinerary,approach,descent,descent_text,access,road,approach_logistics,approach_variants,access_checked_at";
const rows = await selectAll("routes", COLS, "or=(id.like.wa_*,id.like.rainier_*)", { key: requireServiceKey(), pageSize: 1000 });
const HIT = /Suiattle|Downey Creek/i;
const ROADY = /Suiattle River Road|Suiattle Road|FR 26|FSR 26|FS 26|Road 26|milepost|MP \d|washout|washed out|closed miles|road walk|Downey Creek Trailhead/i;
const strings = (v, path, out) => {
  if (typeof v === "string") { if (ROADY.test(v)) out.push({ path, text: v }); }
  else if (v && typeof v === "object") for (const k of Object.keys(v)) strings(v[k], path + (Array.isArray(v) ? `[${k}]` : `.${k}`), out);
};
const out = [];
for (const r of rows) {
  if (!HIT.test(JSON.stringify(r))) continue;
  const hits = [];
  for (const c of COLS.split(",")) if (!["id", "name", "area_id", "access_checked_at"].includes(c)) strings(r[c], c, hits);
  if (!hits.length) continue;
  const days = r.itinerary && r.itinerary.days ? r.itinerary.days.map((d) => `${d.hours}h/${d.miles}mi`).join(" ") : "";
  out.push({ id: r.id, name: r.name, timing: r.timing, days, access_checked_at: r.access_checked_at, hits, row: r });
}
console.log(`routes scanned: ${rows.length}; with road strings: ${out.length}`);
for (const o of out) {
  const t = o.timing;
  console.log(`\n## ${o.id} T=${t && t.totalHrs} A=${t && t.approachTimeHrs} D=${t && t.descentTimeHrs} days: ${o.days}`);
  for (const h of o.hits) console.log(`   ${h.path}: ${h.text.replace(/\s+/g, " ").slice(0, 400)}`);
}
const i = process.argv.indexOf("--out");
if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(out, null, 1));
