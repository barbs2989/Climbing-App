// 2026-10-14 research pass on what the mountaineering audit left.
//  - Windy Peak: a trail reaches the summit (Class 1-2, no snow or glacier travel); the Mountaineers file it under Easy
//    Scrambles. The two remaining "mountaineering" walk-ups become scrambling like their sibling, which makes the
//    peak 3 of 3 scrambling, so the area follows.
//  - Lovin' Arms: Mountain Project lists its pitch 2 as "5.10a, 5.10c A0, or 5.11c", so "(or 5.11c)" is real and the
//    catalog's highest-grade rule gives 11.75. (An earlier pass set 10.75 on incomplete research.)
//  Left alone on purpose: Ellinor SE Chute (snow), North Gardner NW Couloir (spring snow couloir), Crowder (no record found).
// Assert-then-set, then re-read. usage: [--dry]
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
const dry = process.argv.includes("--dry");
if (!dry) requireServiceKey();
const WINDY = ["wa_windy_peak_iron_gate_trail", "wa_windy_peak_trail"];
const rows = await selectAll("routes", "id,discipline,disciplines", `id=in.(${WINDY.join(",")})`, { pageSize: 5 });
for (const r of rows) {
  if (r.discipline !== "mountaineering") { console.log("skip", r.id, r.discipline); continue; }
  const ds = ["scrambling", ...(Array.isArray(r.disciplines) ? r.disciplines : []).filter((d) => d !== "scrambling" && d !== "mountaineering")];
  console.log(dry ? "would scramble" : "scramble", r.id, JSON.stringify(ds));
  if (!dry) await patchRow("routes", r.id, { discipline: "scrambling", disciplines: ds }, { filter: "discipline=eq.mountaineering" });
}
const [a] = await selectAll("areas", "id,dominant_discipline", "id=eq.wa_windy_peak", { pageSize: 2 });
console.log("area wa_windy_peak", a.dominant_discipline, "-> scrambling");
if (!dry && a.dominant_discipline === "mountaineering") await patchRow("areas", "wa_windy_peak", { dominant_discipline: "scrambling" }, { filter: "dominant_discipline=eq.mountaineering" });
const [l] = await selectAll("routes", "id,grade_num", "id=eq.wa_full_or_nearly_wall_routes_lovin_arms", { pageSize: 2 });
console.log("lovin' arms", l.grade_num, "-> 11.75");
if (!dry && Number(l.grade_num) === 10.75) await patchRow("routes", l.id, { grade_num: 11.75 }, { filter: "grade_num=eq.10.75" });
if (!dry) {
  const back = await selectAll("routes", "id,discipline", "area_id=eq.wa_windy_peak", { pageSize: 10 });
  const [aa] = await selectAll("areas", "id,dominant_discipline", "id=eq.wa_windy_peak", { pageSize: 2 });
  const [ll] = await selectAll("routes", "id,grade_num", "id=eq.wa_full_or_nearly_wall_routes_lovin_arms", { pageSize: 2 });
  const bad = back.filter((r) => r.discipline !== "scrambling").length + (aa.dominant_discipline !== "scrambling") + (Number(ll.grade_num) !== 11.75);
  console.log("re-read: windy", back.length, "area", aa.dominant_discipline, "lovin", ll.grade_num, "wrong:", bad);
  if (bad) process.exit(1);
}
