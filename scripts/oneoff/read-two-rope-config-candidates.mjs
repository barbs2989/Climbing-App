// The two rule-3 candidates named by NEITHER triage writeup. Read-only.
// Rule 3 is report-only by construction: the discriminator is which rope configuration the
// stored table corresponds to, and no regex can see that. This prints the row's own fields so
// a human can decide. It writes nothing -- halving a length would replace one fabricated
// number with another, and `null` is correct where no source publishes a distance.
import { loadEnv } from "../lib/supabase-env.mjs";
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };
const IDS = ["wa_chimney_rock_west_face", "wa_west_face_2"];
const COLS = "id,name,area_id,rappels,rappel_count_note,rappel_detail,descent_text,gear,rope_length_m,rope_type";
for (const id of IDS) {
  const r = await fetch(`${U}/rest/v1/routes?id=eq.${id}&select=${COLS}`, { headers: H });
  if (!r.ok) { console.log(id, "ERR", r.status, (await r.text()).slice(0, 200)); continue; }
  const [row] = await r.json();
  if (!row) { console.log(id, "NO ROW"); continue; }
  console.log("=".repeat(78));
  console.log(`${row.id}   ${row.name}   [${row.area_id}]`);
  console.log("-".repeat(78));
  for (const k of ["rappels", "rappel_count_note", "rope_length_m", "rope_type", "gear"]) {
    if (row[k] != null && row[k] !== "") console.log(`  ${k}: ${typeof row[k] === "object" ? JSON.stringify(row[k]) : row[k]}`);
  }
  if (Array.isArray(row.rappel_detail)) {
    console.log("  rappel_detail:");
    row.rappel_detail.forEach((d, i) => console.log(`    [${i}] lengthM=${d.lengthM ?? "null"}  ${JSON.stringify(d.notes || d.note || "")}`));
  }
  if (row.descent_text) console.log("  descent_text:\n    " + String(row.descent_text).replace(/\n/g, "\n    "));
  console.log("");
}
