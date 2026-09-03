// Eleven routes carry a locator naming a mountain none of them is on.
//
// `access.notes` on 11 WA routes ends "Mount Tom area, North Cascades." — BYTE-IDENTICAL across all
// eleven, i.e. one string copied rather than eleven descriptions. Not one of the rows is on Mount Tom:
// they are Austera, Bonanza, Dorado Needle, Klawatti, Phantom, Snowfield, Glacier View Temple, Mount
// Baker, LITTLE TAHOMA, MOUNT RAINIER and MOUNT OLYMPUS. The last three are not in the North Cascades
// at all — Rainier is in the southern Cascades and Olympus is in the Olympic Mountains, a different
// range. A `wa_mount_tom` area does exist in the catalog, and none of these rows belongs to it.
//
// Found twice, three batches apart, on two unrelated mountains: batch 80 on Dorado Needle, batch 85 on
// Little Tahoma, where a research agent noted it directly contradicts the correct `parking_pass` and
// `permit` sitting beside it in the same row.
//
// WHAT IS REPAIRED AND WHAT IS NOT. Only the locator sentence is removed. It is demonstrably false on
// every row, so deleting it types nothing, invents nothing and loses nothing — the row's own area
// already records where the route is. The rest of the value ("Northwest Forest Pass required
// ($5/day or $30/annual). No specific climbing permit.") is LEFT ALONE and reported instead: it is
// plausible on the Forest Service peaks and wrong on the National Park ones (Rainier, Olympus and
// Little Tahoma charge their own climbing fees and take no Northwest Forest Pass), so which rows it
// belongs on is a per-row judgement rather than one edit.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const CLAUSE = " Mount Tom area, North Cascades.";

const areas = await selectAll("areas", "id,name,path", "path=cd.usa.washington", { pageSize: 1000 });
if (!areas.length) { console.error("no WA areas read — refusing"); process.exit(1); }
const A = new Map(areas.map(a => [a.id, a]));
const tomIds = new Set(areas.filter(a => /^mount tom$|^mt\.? tom$/i.test(a.name)).map(a => a.id));

const rows = await selectAll("routes", "id,area_id,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], onTom = [];
let examined = 0;
for (const r of rows) {
  const e = r.access; if (!e || typeof e !== "object") continue;
  for (const [k, v] of Object.entries(e)) {
    if (typeof v !== "string") continue;
    examined++;
    if (!v.includes(CLAUSE)) continue;
    // A row that genuinely IS on Mount Tom keeps its locator.
    const segs = String(A.get(r.area_id)?.path || "").split(".");
    if (tomIds.has(r.area_id) || segs.some(s => tomIds.has(s))) { onTom.push(r.id); continue; }
    const n = v.split(CLAUSE).length - 1;
    if (n > 1) { console.error(`REFUSING ${r.id}.${k}: the clause appears ${n} times`); process.exit(1); }
    plan.push({ id: r.id, k, peak: A.get(r.area_id)?.name, from: v, to: v.replace(CLAUSE, "").trimEnd(), premise: e });
  }
}
// FAIL CLOSED ON A BROKEN SCAN, NOT ON A FINISHED JOB. The first version refused whenever the clause
// appeared nowhere — which is precisely the state this script CREATES, so a second run reported its
// own success as "the scan is broken". The scan is broken if no access value was examined at all;
// the clause being absent afterwards is the point of the exercise.
if (!examined) { console.error(`examined 0 access values across ${rows.length} routes — the scan is broken, refusing`); process.exit(1); }
if (!plan.length && !onTom.length) { console.log("the locator appears on no route — already repaired, nothing to do."); process.exit(0); }
console.log(`\nvalues carrying the locator: ${plan.length + onTom.length}`);
console.log(`  ...on a route genuinely on Mount Tom, kept: ${onTom.length}`);
console.log(`  ...on a route elsewhere, locator removed: ${plan.length}\n`);
for (const p of plan) console.log(`  ${p.id.padEnd(44)} peak="${p.peak}"`);
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
console.log(`\n  from: ${JSON.stringify(plan[0].from)}`);
console.log(`  to:   ${JSON.stringify(plan[0].to)}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, refused = 0;
const live = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const cur = live.get(p.id)?.access;
  if (!cur || cur[p.k] !== p.from) { console.log(`  REFUSED ${p.id}: the row has changed since it was read`); refused++; continue; }
  await patchRow("routes", p.id, { access: { ...cur, [p.k]: p.to } });
  wrote++;
}
console.log(`\nwrote ${wrote}, refused ${refused}`);

const after = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0, left = 0;
for (const p of plan) { const v = after.get(p.id)?.access?.[p.k]; if (v === p.to) ok++; else console.log(`  NOT APPLIED: ${p.id}`); }
for (const r of after.values())
  for (const v of Object.values(r.access || {})) if (typeof v === "string" && v.includes(CLAUSE)) left++;
console.log(`verified ${ok} of ${plan.length}; values still carrying the locator: ${left} (expected ${onTom.length})`);
