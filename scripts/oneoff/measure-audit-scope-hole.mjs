// How many WA routes carry a real alpine descent record but sit OUTSIDE the audit's discipline scope?
// The rotation reports 809/809 audited; that number is only as good as the scope behind it.
import { selectAll } from "../lib/supabase-env.mjs";
const DISCIPLINES = ["mountaineering", "alpine", "scrambling"];
const rows = await selectAll("routes",
  "id,discipline,disciplines,rope_length_m,rappels,rappel_detail,descent_text,pitches,areas!inner(path,area_type)",
  "", { pageSize: 1000 });
const wa = rows.filter(r => String(r.areas?.path || "").startsWith("usa.washington."));
const inScope = r => DISCIPLINES.includes(r.discipline) ||
  (Array.isArray(r.disciplines) && r.disciplines.some(d => DISCIPLINES.includes(d)));
const hasDescent = r => r.rope_length_m != null ||
  (Array.isArray(r.rappel_detail) && r.rappel_detail.length) ||
  /rappel/i.test(String(r.descent_text || "")) ||
  /rappel/i.test(Array.isArray(r.rappels) ? r.rappels.join(" ") : String(r.rappels || ""));
const out = wa.filter(r => !inScope(r) && hasDescent(r));
console.log(`WA routes: ${wa.length}`);
console.log(`  in audit scope: ${wa.filter(inScope).length}`);
console.log(`  OUT of scope but carrying a rope/rappel record: ${out.length}`);
// Which of those sit on a PEAK rather than a roadside crag -- i.e. are alpine in substance.
const onPeak = out.filter(r => ["peak", "mountain", "summit"].includes(String(r.areas?.area_type || "")));
console.log(`  ...of those, on a peak-typed area: ${onPeak.length}`);
const byDisc = {};
for (const r of onPeak) byDisc[r.discipline || "null"] = (byDisc[r.discipline || "null"] || 0) + 1;
console.log("  their discipline column:", JSON.stringify(byDisc));
console.log("\n  sample (peak-typed, out of scope, multi-pitch):");
for (const r of onPeak.filter(r => Number(r.pitches) > 1).slice(0, 12))
  console.log(`    ${r.id}  [${r.discipline}]  ${r.pitches}p  ${String(r.areas.path).split(".").pop()}`);
