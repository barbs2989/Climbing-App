// The audit's impossible-camp list shows FOUR camps naming Ruth Mountain / the Ruth Glacier
// assigned to routes on "Mamie Peak", whose high point the catalog gives as 5,000 ft. Ruth
// Mountain is 7,115 ft near Mount Shuksan. Either the camps are on the wrong routes, or there are
// two Mamie Peaks and the catalog has picked the wrong one — the "a name is not an identity" trap
// at the AREA level rather than the site level.
//
// Ask the rows before concluding anything: where is this Mamie Peak, what else is filed there,
// and does its own prose name Ruth Mountain?
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};

const areas = await q("areas?select=id,name,lat,lng,area_type,path,route_count&name=ilike.*mamie*");
if (!areas.length) { console.log("FAIL: no area named Mamie — the audit named one, so this read is wrong"); process.exit(1); }
console.log(`== areas named "Mamie": ${areas.length}\n`);
areas.forEach((a) => console.log(`   ${a.id.padEnd(28)} "${a.name}" [${a.area_type}]  ${a.lat},${a.lng}  ${a.route_count} route(s)\n      ${a.path}`));

// Ruth Mountain, for comparison — how far apart are they really?
const ruth = await q("areas?select=id,name,lat,lng,area_type&name=ilike.*ruth*mountain*");
console.log(`\n== areas named "Ruth Mountain": ${ruth.length}`);
ruth.forEach((a) => console.log(`   ${a.id.padEnd(28)} "${a.name}" [${a.area_type}]  ${a.lat},${a.lng}`));

const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));
for (const m of areas) for (const r of ruth) {
  if (m.lat == null || r.lat == null) continue;
  console.log(`\n   "${m.name}" is ${km(m, r).toFixed(1)} km from "${r.name}"`);
}

for (const a of areas) {
  const rs = await q(`routes?select=id,name,discipline,high_point_ft,gain_ft,bivy,overview&area_id=eq.${encodeURIComponent(a.id)}&limit=50`);
  console.log(`\n== routes on ${a.id} (${rs.length}):`);
  for (const r of rs) {
    console.log(`   ${r.id}  "${r.name}"  ${r.discipline}  high ${r.high_point_ft} ft  gain ${r.gain_ft}`);
    for (const b of (r.bivy || [])) console.log(`      camp: "${String(b.name || "").slice(0, 62)}"  ${b.elev ?? b.elevM ?? "—"}`);
    // The route's OWN prose is the third record — if it names Ruth Mountain, the camps belong.
    const ov = String(r.overview || "");
    const names = [...new Set((ov.match(/\b(Ruth|Icy|Shuksan|Hannegan|Mamie|Olympic|Quinault|Skokomish)\w*/g) || []))];
    if (names.length) console.log(`      overview mentions: ${names.join(", ")}`);
  }
}
