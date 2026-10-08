// Relabels mountaineering routes that REQUIRE 5th-class rock or technical ice as alpine (user rule 2026-10-08).
// usage: node fix-mountaineering-with-fifth-class.mjs <tiers.json> <resultN.json>... [--dry]
// Tier A (a 5.x in a grade column or a pitch) is applied outright; every other row only on a researched
// "alpine" verdict of high or medium confidence. Assert-then-set: the PATCH carries discipline=eq.mountaineering,
// so a row someone changed meanwhile matches nothing and is reported, not overwritten.
import fs from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const dry = process.argv.includes("--dry");
const [tiersPath, ...resPaths] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const T = JSON.parse(fs.readFileSync(tiersPath, "utf8"));
const verdicts = Object.fromEntries(resPaths.flatMap((p) => JSON.parse(fs.readFileSync(p, "utf8"))).map((v) => [v.id, v]));

const want = new Map();
for (const r of T.A || []) want.set(r.id, "tier A");
for (const v of Object.values(verdicts)) if (v.verdict === "alpine" && v.confidence !== "low") want.set(v.id, `researched ${v.confidence}`);
console.log("to relabel:", want.size, dry ? "(dry)" : "");
if (!dry) requireServiceKey();

const ids = [...want.keys()];
const rows = [];
for (let i = 0; i < ids.length; i += 40) rows.push(...await selectAll("routes", "id,name,discipline,disciplines,area_id", `id=in.(${ids.slice(i, i + 40).map(encodeURIComponent).join(",")})`, { pageSize: 100 }));
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
const done = [], skipped = [];
for (const id of ids) {
  const r = byId[id];
  if (!r) { skipped.push([id, "missing"]); continue; }
  if (r.discipline !== "mountaineering") { skipped.push([id, "now " + r.discipline]); continue; }
  const ds = ["alpine", ...(Array.isArray(r.disciplines) ? r.disciplines : ["mountaineering"]).filter((d) => d !== "alpine")];
  if (!dry) await patchRow("routes", id, { discipline: "alpine", disciplines: ds }, { filter: "discipline=eq.mountaineering" });
  done.push({ id, name: r.name, area_id: r.area_id, why: want.get(id) });
}
console.log("relabelled:", done.length, "skipped:", skipped.length, JSON.stringify(skipped));

if (!dry) {
  const back = [];
  for (let i = 0; i < done.length; i += 40) back.push(...await selectAll("routes", "id,discipline,disciplines", `id=in.(${done.slice(i, i + 40).map((d) => encodeURIComponent(d.id)).join(",")})`, { pageSize: 100 }));
  const bad = back.filter((r) => r.discipline !== "alpine" || !r.disciplines.includes("alpine"));
  console.log("re-read:", back.length, "wrong:", bad.length);
  if (bad.length) process.exit(1);
}
fs.writeFileSync(process.env.CLAUDE_JOB_DIR ? process.env.CLAUDE_JOB_DIR + "/tmp/relabelled.json" : "relabelled.json", JSON.stringify(done, null, 1));
