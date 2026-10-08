// After the mountaineering->alpine relabel: an area whose dominant_discipline is still "mountaineering" but whose
// routes are now mostly alpine becomes alpine. Only areas the relabel touched (ids from relabelled.json); the
// hand-set peaks (Little Annapurna, Hoodoo, Storm King, Trapper) are never re-voted. usage: <relabelled.json> [--dry]
import fs from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
const dry = process.argv.includes("--dry");
const touched = [...new Set(JSON.parse(fs.readFileSync(process.argv[2], "utf8")).map((d) => d.area_id))];
if (!dry) requireServiceKey();
const SPECIAL = /annapurna|hoodoo|storm.?king|trapper/i;
const out = [];
for (const id of touched) {
  const [a] = await selectAll("areas", "id,name,dominant_discipline", `id=eq.${encodeURIComponent(id)}`, { pageSize: 5 });
  if (!a || a.dominant_discipline !== "mountaineering" || SPECIAL.test(a.name + a.id)) continue;
  const rs = await selectAll("routes", "id,discipline", `area_id=eq.${encodeURIComponent(id)}`, { pageSize: 500 });
  const n = (d) => rs.filter((r) => r.discipline === d).length;
  if (n("alpine") <= n("mountaineering")) continue;
  if (!dry) await patchRow("areas", id, { dominant_discipline: "alpine" }, { filter: "dominant_discipline=eq.mountaineering" });
  out.push(`${id} (${a.name}) alpine ${n("alpine")} vs mountaineering ${n("mountaineering")}`);
}
console.log((dry ? "would set " : "set ") + out.length + " of " + touched.length + " touched areas:\n" + out.join("\n"));
