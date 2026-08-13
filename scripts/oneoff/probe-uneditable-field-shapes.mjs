// What SHAPE is each rendered-but-uncorrectable column? A plain-text editor is only safe for
// a string; an object needs a sub-key builder, because the merge ASSIGNS and assignment
// replaces every sibling key (#809 measured that at 4 keys destroyed).
import { SUPABASE_URL, anonKey as anonKeyFn } from "../lib/supabase-env.mjs";

const url = SUPABASE_URL, key = anonKeyFn();
const COLS = ["approach_logistics", "emergency", "climate", "best_season", "seasonal_guidance",
  "seasonal_hazards", "crowds", "partner_requirements", "rappel_detail", "rappel_count_note",
  "approach_variants", "climbing_route", "bivy", "detailed_rack", "pro_tips", "pro_needs",
  "sling_rack", "descent"];

const shapeOf = (v) => Array.isArray(v) ? `array[${v.length}]`
  : v && typeof v === "object" ? `object{${Object.keys(v).slice(0, 4).join(",")}${Object.keys(v).length > 4 ? ",…" : ""}}`
  : typeof v === "string" ? `string(${v.length})` : typeof v;

console.log("\ncolumn                    populated  shape(s) seen");
console.log("-".repeat(78));
for (const col of COLS) {
  const u = `${url}/rest/v1/routes?select=id,${col}&${col}=not.is.null&limit=25`;
  let rows = [];
  for (let a = 0; a < 4 && !rows.length; a++) {
    try {
      const r = await fetch(u, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(25000) });
      if (!r.ok) { await new Promise((s) => setTimeout(s, 400 * 2 ** a)); continue; }
      rows = await r.json();
    } catch { await new Promise((s) => setTimeout(s, 400 * 2 ** a)); }
  }
  if (!rows.length) { console.log(`  ${col.padEnd(24)} ${"?".padEnd(10)} READ FAILED — not "empty"`); continue; }
  const shapes = [...new Set(rows.map((r) => shapeOf(r[col]).replace(/\(\d+\)/, "(…)").replace(/\[\d+\]/, "[…]")))];
  console.log(`  ${col.padEnd(24)} ${String(rows.length).padEnd(10)} ${shapes.join("  |  ")}`);
}
