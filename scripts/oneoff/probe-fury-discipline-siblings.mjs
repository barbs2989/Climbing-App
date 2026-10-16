// wa_mount_fury_east_direct_east_ridge is filed `trad`, which the camping gate excludes — so its
// two recorded camps (Access Creek Basin, Luna Col) render nowhere, on one of the most committing
// approaches in Washington.
//
// Is the DISCIPLINE the wrong half, or the gate? A single row cannot say. Its siblings on the
// same peak can: if every other route up Mount Fury is alpine/mountaineering, a lone `trad` is a
// label that slipped, not a genuinely different kind of climb. This is the same comparative
// method audit:trailhead-road uses — judge a row against the ones that must agree with it.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
const target = (await q("routes?select=id,name,discipline,area_id,high_point_ft,gain_ft,pitches,grade&id=eq.wa_mount_fury_east_direct_east_ridge"))[0];
if (!target) { console.log("FAIL: the target route no longer exists under that id"); process.exit(1); }
console.log(`TARGET  ${target.id}`);
console.log(`        name "${target.name}"  discipline=${target.discipline}  grade "${target.grade}"`);
console.log(`        area ${target.area_id}  high ${target.high_point_ft} ft  gain ${target.gain_ft} ft  ${target.pitches}p\n`);

const sibs = await q(`routes?select=id,name,discipline,grade,pitches,gain_ft&area_id=eq.${encodeURIComponent(target.area_id)}&limit=200`);
console.log(`SIBLINGS in ${target.area_id}: ${sibs.length}\n`);
const byDisc = new Map();
for (const s of sibs) byDisc.set(s.discipline, (byDisc.get(s.discipline) || 0) + 1);
[...byDisc.entries()].sort((a, b) => b[1] - a[1]).forEach(([d, n]) => console.log(`   ${String(d).padEnd(16)} ${n}`));
console.log("");
sibs.forEach((s) => console.log(`   ${s.id === target.id ? "->" : "  "} ${String(s.discipline).padEnd(15)} ${String(s.pitches ?? "—").padStart(3)}p  gain ${String(s.gain_ft ?? "—").padStart(6)}  "${s.name}"`));

const others = sibs.filter((s) => s.id !== target.id);
const alpineish = others.filter((s) => /alpine|mountaineer|scrambl|ice|mixed/i.test(String(s.discipline || "")));
console.log(`\n   siblings that ARE gated in: ${alpineish.length}/${others.length}`);
console.log(others.length && alpineish.length === others.length
  ? `   -> every other route on this peak is gated in. The lone "trad" is the outlier.`
  : `   -> the peak is mixed; the label is not obviously wrong. Read before changing anything.`);
