// Every TECHNICAL STATS tile carries a LABEL that implies a KIND — "Crux grade" is a grade,
// "Crash pads" is a count, "Max slope" is an angle. #1193 shipped one instance of the tile
// receiving the wrong kind (CRUX GRADE showed the commitment grade "III"). This asks the live
// catalog whether that is a class or an instance: for each column feeding a tile, what shapes
// do the real values take?
//
// Report-only. Reads `routes` and writes nothing.
import { selectAll } from "../lib/supabase-env.mjs";

const COLS = ["grade","max_angle","prot_rating","start_type","landing","pads","rock","crux"];
const rows = await selectAll("routes", "id," + COLS.join(","), "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("read returned nothing — refusing to report a clean catalog"); process.exit(1); }
console.log(`${rows.length} wa_* routes (shape probe — the 4 legacy rainier_*/adams_* ids are out of scope and cannot change a distribution)\n`);

const shape = v => (v == null || v === "" ? null : String(v).trim());

for (const c of COLS) {
  const vals = rows.map(r => shape(r[c])).filter(Boolean);
  if (!vals.length) { console.log(`${c}: 0 populated`); continue; }
  const lens = vals.map(v => v.length).sort((a, b) => a - b);
  const p = q => lens[Math.min(lens.length - 1, Math.floor(lens.length * q))];
  const distinct = [...new Set(vals)];
  console.log(`${c}: ${vals.length} populated, ${distinct.length} distinct, len p50=${p(.5)} p95=${p(.95)} max=${lens[lens.length - 1]}`);
  for (const l of distinct.slice().sort((a, b) => b.length - a.length).slice(0, 3)) {
    console.log(`    long: ${JSON.stringify(l.slice(0, 160))}`);
  }
  if (distinct.length <= 14) console.log(`    all: ${distinct.map(d => JSON.stringify(d)).join(", ")}`);
}
