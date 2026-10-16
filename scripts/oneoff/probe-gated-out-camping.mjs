// The OPPOSITE defect to the one the open gate note describes: a route that CARRIES camping data
// and whose discipline the gate excludes, so the section renders nowhere. That is the
// descent_text shape — a column populated on real rows and on screen for nobody.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const H = headers(anonKey());
const GATED = new Set(["alpine", "mountaineering", "scrambling", "ice", "mixed"]);
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,high_point_ft,gain_ft,pitches,bivy&bivy=not.is.null&limit=1000`, { headers: H });
if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }
const out = rows.filter((x) => !GATED.has(String(x.discipline || "").toLowerCase()) && (x.bivy || []).length);
console.log(`== routes carrying camping data whose discipline the gate EXCLUDES: ${out.length}\n`);
for (const x of out) {
  console.log(`${x.id}  "${x.name}"  discipline=${x.discipline}  high ${x.high_point_ft} ft  gain ${x.gain_ft}  ${x.pitches}p`);
  for (const b of (x.bivy || [])) console.log(`    site: "${b.name}"  elev ${b.elev ?? b.elevM ?? "—"} type ${b.type || "—"}`);
}
