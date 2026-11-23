import { selectAll } from "file:///C:/Users/nate_/dev/Climbing-App/.claude/worktrees/map-pins-per-discipline/scripts/lib/supabase-env.mjs";
import fs from "fs";
const open = JSON.parse(fs.readFileSync("research/open12.json")).filter(x => x.status === "stuck" || !x.status).map(x => x.id);
const mine = [];
for (let i = 0; i < open.length; i += 30) mine.push(...await selectAll("routes", "id,name,area_id", `id=in.(${open.slice(i, i + 30).join(",")})`));
const areas = [...new Set(mine.map(r => r.area_id))];
const all = [];
for (let i = 0; i < areas.length; i += 30) all.push(...await selectAll("routes", "id,name,area_id,approach_logistics", `area_id=in.(${areas.slice(i, i + 30).join(",")})`));
const out = {};
for (const a of areas) {
  const rs = all.filter(r => r.area_id === a);
  out[a] = { open: rs.filter(r => open.includes(r.id)).map(r => r.name), pinned: rs.filter(r => r.approach_logistics?.trailheadLat).map(r => `${r.name} => ${r.approach_logistics.trailhead}`) };
}
fs.writeFileSync("sib12.json", JSON.stringify(out, null, 1));
for (const [a, v] of Object.entries(out)) { const ths = new Set(v.pinned.map(p => p.split(" => ")[1])); console.log(`\n${a}: open[${v.open.join("; ")}] lots=${ths.size}`); for (const p of v.pinned) console.log("   ", p.slice(0, 150)); }
