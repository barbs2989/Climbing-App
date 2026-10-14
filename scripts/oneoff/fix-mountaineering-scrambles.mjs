// The five rows the 2026-10-08 mountaineering research called scrambles (no glacier, no 5th class, Class 1-3 ground):
// Ellinor, North Gardner SW, Plummer R1, Tricouni SW slopes, Windy Creek trail. Relabel mountaineering -> scrambling,
// then sync dominant_discipline on those peaks and on Mount Crowder (its one route went alpine) ONLY where the route
// counts back it. Assert-then-set (each PATCH filters on the value it expects), then re-read. usage: [--dry]
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
const dry = process.argv.includes("--dry");
if (!dry) requireServiceKey();

const IDS = "wa_mount_ellinor_standard wa_north_gardner_mountain_southwest wa_plummer_peak_r1 wa_tricouni_peak_southwest_slopes wa_windy_peak_windy_creek_trail".split(" ");
const rows = await selectAll("routes", "id,discipline,disciplines,area_id", `id=in.(${IDS.join(",")})`, { pageSize: 20 });
for (const r of rows) {
  if (r.discipline !== "mountaineering") { console.log("skip", r.id, r.discipline); continue; }
  const ds = ["scrambling", ...(Array.isArray(r.disciplines) ? r.disciplines : []).filter((d) => d !== "scrambling" && d !== "mountaineering")];
  console.log(dry ? "would scramble" : "scramble", r.id, JSON.stringify(ds));
  if (!dry) await patchRow("routes", r.id, { discipline: "scrambling", disciplines: ds }, { filter: "discipline=eq.mountaineering" });
}

const areas = [...new Set([...rows.map((r) => r.area_id), "wa_mount_crowder"])];
for (const id of areas) {
  const [a] = await selectAll("areas", "id,name,dominant_discipline", `id=eq.${id}`, { pageSize: 2 });
  if (a.dominant_discipline !== "mountaineering") continue;
  const rs = await selectAll("routes", "id,discipline", `area_id=eq.${id}`, { pageSize: 500 });
  const count = {}; for (const r of rs) count[r.discipline] = (count[r.discipline] || 0) + 1;
  const top = Object.entries(count).sort((x, y) => y[1] - x[1]);
  // in --dry the rows above are not yet written, so read the post-change state from the plan
  if (dry) for (const r of rows) if (r.area_id === id && r.discipline === "mountaineering") { count.mountaineering--; count.scrambling = (count.scrambling || 0) + 1; }
  const best = Object.entries(count).sort((x, y) => y[1] - x[1])[0];
  console.log(id, JSON.stringify(count), "->", best[0]);
  if (best[0] !== "mountaineering" && best[1] > (count.mountaineering || 0) && !dry) await patchRow("areas", id, { dominant_discipline: best[0] }, { filter: "dominant_discipline=eq.mountaineering" });
}
if (!dry) {
  const back = await selectAll("routes", "id,discipline,disciplines", `id=in.(${IDS.join(",")})`, { pageSize: 20 });
  const bad = back.filter((r) => r.discipline !== "scrambling" || r.disciplines[0] !== "scrambling");
  console.log("re-read:", back.length, "wrong:", bad.length);
  if (bad.length) process.exit(1);
}
