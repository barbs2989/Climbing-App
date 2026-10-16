// The 14 WA routes filed as alpine/mountaineering/scrambling that sit on roadside crags or a
// drive-up summit. Dumps exactly those routes plus the disciplines used on the SAME crag row,
// which is the signal that actually discriminates — area type does not (see the rejected
// alpine-on-crag detector).
//
// Also prints the catalog's whole discipline vocabulary, because a reassignment must land on a
// value the app already understands rather than one invented here.
//
// Read-only. Fails closed on an empty read.
import { selectAll } from "../lib/supabase-env.mjs";

const AREAS = [
  "wa_south_face_3", "wa_west_face_6", "wa_north_side", "wa_goose_egg_mountain",
  "wa_amphitheater_the", "wa_chelan_butte", "wa_steeple_rock", "wa_agathla_tower",
  "wa_full_montey_the", "wa_osprey_wall",
];
const ALPINE = ["alpine", "mountaineering", "scrambling"];

const all = await selectAll("routes", "id,name,area_id,discipline,grade,pitches,gear,beta", "", { pageSize: 1000 });
if (!all.length) { console.log("FAIL: read no routes"); process.exit(1); }

const vocab = new Map();
for (const r of all) vocab.set(r.discipline, (vocab.get(r.discipline) || 0) + 1);
console.log("catalog discipline vocabulary (whole table):");
[...vocab.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`   ${String(n).padStart(7)}  ${k}`));

const areas = await selectAll("areas", "id,name,area_type", `id=in.(${AREAS.join(",")})`, { pageSize: 50 });
const byId = new Map(areas.map(a => [a.id, a]));

for (const id of AREAS) {
  const rs = all.filter(r => r.area_id === id);
  const a = byId.get(id) || { name: id, area_type: "?" };
  console.log(`\n===== ${a.name}  [${a.area_type}]  ${id}   (${rs.length} routes on this row)`);
  for (const r of rs) {
    const flag = ALPINE.includes(r.discipline) ? ">>" : "  ";
    console.log(`${flag} ${r.discipline.padEnd(13)} ${String(r.grade).padEnd(12)} p=${String(r.pitches).padEnd(5)} ${r.name}`);
    if (ALPINE.includes(r.discipline)) {
      console.log(`      id: ${r.id}`);
      console.log(`      gear: ${JSON.stringify(r.gear)}`);
      console.log(`      beta: ${JSON.stringify(String(r.beta || "").slice(0, 260))}`);
    }
  }
}
