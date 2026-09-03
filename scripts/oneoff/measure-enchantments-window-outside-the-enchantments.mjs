// A May 15 - Oct 31 permit window on rows outside the Enchantment Permit Area.
//
// MEASURED AND DELIBERATELY NOT SWEPT, for three separate reasons — any one of which would be enough.
//
// The premise came from a research pass: the Enchantment Permit Area's overnight quota window is
// May 15 - Oct 31 and is specific to that area, while a generic Alpine Lakes free self-issue permit
// carries no season, so a row outside the Enchantments bounding its self-issue permit to those dates
// has borrowed a rule that does not apply to it. 105 values state the window; 81 are on rows in or
// naming the Enchantments (correct); 24 are not.
//
// 1. THE DATE RANGE IS NOT UNIQUE TO THE ENCHANTMENTS. Two of the 24 read "Daily quota: 350
//    climbers/day (Apr 1-May 14), 110 climbers/day (May 15-Oct 31)" — that is Mount St Helens'
//    climbing quota, an unrelated rule that happens to share the dates. A sweep keyed on the window
//    would have rewritten a correct St Helens statement.
//
// 2. TWO RESEARCH PASSES DISAGREE ABOUT THE SAME CLAIM, and that is the decisive reason. An earlier
//    batch verified La Bohn's permit block as correct "several parts word for word", explicitly
//    including the Alpine Lakes self-issue permit "for day and overnight use... May 15 to October 31".
//    A later batch reports the same wording on a different row as wrong, saying the Forest Service
//    attaches no season to that permit at Salmon La Sac. Both cite the agency. They may both be right
//    — seasonality can differ by trailhead, since a self-issue box is only stocked in season — or one
//    may be wrong. Nothing here settles it, and this catalog's rule when two records disagree and the
//    tie cannot be broken is to say so rather than pick.
//
// 3. I COULD NOT VERIFY IT MYSELF. Two Forest Service URLs for the Alpine Lakes Wilderness returned a
//    page with no permit-season statement and a 404. A permit rule must not be rewritten without
//    reading it off a live agency page, and I did not get one.
//
// The Enchantments scope is resolved from the area PATH rather than a name guess, and separately from
// whether the row's own access apparatus names the Enchantments anywhere — either counts as in-scope,
// which is deliberately generous, because the cost of missing a genuine Enchantments row is calling a
// correct value wrong.
//
import { selectAll } from "../lib/supabase-env.mjs";

// The Enchantment Permit Area's overnight quota window is May 15 - Oct 31. It is specific to that area.
// A generic Alpine Lakes free self-issue permit carries no season.
const WINDOW = /may\s*15[^.;]{0,24}(?:oct|october)\s*31|(?:oct|october)\s*31[^.;]{0,24}may\s*15/i;
const SELFISSUE = /self[- ]issue|self[- ]issued|trailhead register/i;
const ENCH = /enchantment/i;
const rows = await selectAll("routes", "id,area_id,permit,access", "id=like.wa_*", { pageSize: 1000 });
const areas = await selectAll("areas", "id,name,path", "", { pageSize: 1000 });
const A = new Map(areas.map(a => [a.id, a]));
// which catalog areas ARE in the Enchantment permit area? use the path, not a name guess
const inEnch = r => {
  const p = String(A.get(r.area_id)?.path || "").toLowerCase();
  return /enchantment|colchuck|stuart|dragontail|prusik|little_annapurna|witches_tower|mcclellan/.test(p);
};

let n = 0, ench = 0, outside = 0;
const shapes = new Map();
for (const r of rows) {
  const hits = [];
  for (const [k, v] of [["permit", r.permit], ...Object.entries(r.access || {})]) {
    if (typeof v !== "string" || !WINDOW.test(v)) continue;
    const s = v.split(/(?<=[.;])\s+/).find(x => WINDOW.test(x)) || v;
    hits.push([k, s.trim()]);
  }
  if (!hits.length) continue;
  n++;
  // does the row itself name the Enchantments anywhere in its access apparatus?
  const all = [r.permit, ...Object.values(r.access || {})].map(x => String(x || "")).join(" | ");
  if (inEnch(r) || ENCH.test(all)) { ench++; continue; }
  outside++;
  const key = `${hits[0][0]}: ${hits[0][1].slice(0, 130)}`;
  shapes.set(key, (shapes.get(key) || 0) + 1);
  if (outside <= 8) {
    console.log(`\n  ${r.id}   (area: ${A.get(r.area_id)?.name})`);
    console.log(`     ${hits[0][0]}: ${JSON.stringify(hits[0][1].slice(0, 175))}`);
    console.log(`     self-issue wording? ${SELFISSUE.test(hits[0][1])}   row mentions Enchantments anywhere? no`);
  }
}
console.log(`\nvalues stating a May 15 - Oct 31 window: ${n}`);
console.log(`  ...on rows in or naming the Enchantment area (correct): ${ench}`);
console.log(`  ...on rows that do NOT: ${outside}\n`);
for (const [s, c] of [...shapes].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${String(c).padStart(3)} x ${s}`);
