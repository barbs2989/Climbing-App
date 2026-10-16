// The recorded worry names three specific routes — two Cape Disappointment gullies and an
// Agathla Tower gully — as "drawing a camping panel at sea level and in the desert".
//
// CampingPanel returns null when a route has no sites, so that can only be true if these rows
// CARRY camping data. The same memory also lists them as the routes deliberately left OUT of the
// camping enrichment. Both cannot hold. Ask the rows.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const IDS = ["wa_gully_1", "wa_gully_2", "wa_east_gully", "wa_chelan_butte"];
const H = headers(anonKey());
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,high_point_ft,bivy,waypoints&id=in.(${IDS.join(",")})`, { headers: H });
if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.log("FAIL: none of those ids exist — the claim names routes that are gone"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const isCamp = (w) => /camp|bivy|bivouac/i.test(String((w && w.type) || ""));
let drawing = 0;
for (const x of rows) {
  const sites = arr(x.bivy).length + arr(x.waypoints).filter(isCamp).length;
  if (sites) drawing++;
  console.log(`${x.id.padEnd(20)} ${String(x.discipline).padEnd(12)} high ${String(x.high_point_ft ?? "—").padStart(6)} ft  sites=${sites}  -> panel ${sites ? "RENDERS" : "does not render"}`);
}
console.log(`\nfound ${rows.length} of ${IDS.length} ids; ${drawing} actually draw the panel`);
console.log(drawing === 0
  ? `\n-> The worry is MOOT while these rows carry no camping data: the panel returns null, so the\n   gate is drawing nothing. It becomes live only if somebody enriches them, and the memory\n   already records that they were deliberately left out. Nothing to fix.`
  : `\n-> ${drawing} row(s) really do draw it. The gate question is live.`);
