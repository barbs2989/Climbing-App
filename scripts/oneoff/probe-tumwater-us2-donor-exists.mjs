// Castle Rock's whole subtree carries zero road blocks, so any donor for wa_upper_castle_toprope_wall
// sits further out. US-2 runs ~300 miles across the state, so a block that merely says "US-2" is the
// "a drive has several named legs" trap `audit:trailhead-road` records — a Stevens Pass block is a
// true statement about the wrong stretch of the same highway. A legitimate donor has to name the
// TUMWATER CANYON / Castle Rock stretch specifically.
//
// So: search the whole Leavenworth subtree (and then WA-wide) for a block naming both the highway
// and the canyon, and report whether one exists at all. A negative result is the finding.
import { selectAll } from "../lib/supabase-env.mjs";

const leaves = (v, out = []) => {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
};

const all = await selectAll("routes", "id,name,area_id,road", "id=like.wa_*", { pageSize: 1000 });
if (!all.length) { console.error("FAIL — read zero routes."); process.exit(1); }
const withRoad = all.filter((r) => r.road && leaves(r.road).length);
console.log(`${all.length} wa_* routes, ${withRoad.length} carrying a road block\n`);

const us2 = withRoad.filter((r) => /\b(?:US|U\.S\.)[\s-]?2\b|\bHighway 2\b|\bHwy 2\b/i.test(leaves(r.road).join(" ")));
const tumwater = withRoad.filter((r) => /tumwater/i.test(leaves(r.road).join(" ")));
const both = withRoad.filter((r) => {
  const s = leaves(r.road).join(" ");
  return /\b(?:US|U\.S\.)[\s-]?2\b|\bHighway 2\b|\bHwy 2\b/i.test(s) && /tumwater|castle rock/i.test(s);
});
console.log(`blocks naming US-2 anywhere:            ${us2.length}`);
console.log(`blocks naming Tumwater:                 ${tumwater.length}`);
console.log(`blocks naming US-2 AND Tumwater/Castle: ${both.length}\n`);

const show = (label, arr) => {
  console.log(`--- ${label} ---`);
  const seen = new Set();
  for (const r of arr) {
    const k = JSON.stringify(r.road);
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`  ${r.id}  area=${r.area_id}`);
    for (const [kk, vv] of Object.entries(r.road)) if (typeof vv === "string" && vv.trim()) console.log(`     ${kk}: ${vv.slice(0, 200)}`);
    if (seen.size >= 8) { console.log(`  ... more not printed`); break; }
  }
  if (!arr.length) console.log("  (none)");
  console.log("");
};
show("US-2 AND Tumwater/Castle Rock — the only legitimate donors", both);
show("Tumwater named anywhere in a block", tumwater);
show("US-2 named anywhere (sample) — NOT donors, different stretch", us2.slice(0, 30));
