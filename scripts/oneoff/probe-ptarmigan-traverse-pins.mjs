// WHOSE PIN IS IT? — reading the rows behind three adjudicated cross-route findings.
//
// adjudicate-cross-route-pins.mjs names wa_ptarmigan_traverse as the misplaced pin for THREE named
// points (Cache Col 2,779 m, Spire Point 2,124 m, and it is corroborated for Kool-Aid Lake at 74 m).
// A TRAVERSE legitimately passes near many features, so a distance alone cannot condemn it: a pin
// called "Spire Point" on a traverse may mean "where the traverse passes Spire Point" rather than
// the summit itself. That is a different claim from a misplaced copy, and only the row says which.
//
// Report-only. It prints the pins and the prose so a repair can be argued from the row.
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const H = headers(requireServiceKey());
const IDS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!IDS.length) { console.log("usage: node probe-ptarmigan-traverse-pins.mjs <routeId> [...]"); process.exit(1); }

for (const id of IDS) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,overview,approach,climbing_route,beta,descent_text&id=eq.${id}`;
  const r = await fetch(url, { headers: H });
  if (!r.ok) { console.log(`${id}: ${r.status}`); continue; }
  const [row] = await r.json();
  if (!row) { console.log(`${id}: no row`); continue; }
  console.log(`\n================ ${row.id} — ${row.name}`);
  const wps = Array.isArray(row.waypoints) ? row.waypoints : [];
  console.log(`waypoints (${wps.length}):`);
  for (const w of wps) {
    console.log(`   ${String(w.name || "?").padEnd(48)} ${w.lat},${w.lng}  ${w.elev ?? "—"} ft  [${w.type || "?"}]`);
  }
  for (const k of ["overview", "approach", "climbing_route", "beta", "descent_text"]) {
    const v = row[k];
    if (!v) continue;
    const t = typeof v === "string" ? v : JSON.stringify(v);
    console.log(`\n--- ${k} (${t.length} ch) ---\n${t.slice(0, 1800)}`);
  }
}
