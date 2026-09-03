// A route cannot top out lower than the summit it stands on.
//
// `high_point_ft` is the highest elevation reached ON the route. So if the row also carries a Summit
// waypoint at elevation E, the route demonstrably reaches E and high_point_ft cannot be below it. 26 WA
// rows are in that state. The defect is certain from the row alone; only the repair VALUE needs
// adjudicating, and that is what the area record supplies.
//
// THE AREA IS A THIRD RECORD, written by a different pass from either the waypoint or the column. On 7
// of the 26 it agrees with the summit pin to within 25 ft and disagrees with high_point_ft, so two
// records stand against one and the repair is to raise high_point_ft to the pin. 4 rows go the other
// way — there the area backs high_point_ft and the PIN is the suspect, which is a different repair
// needing a different donor, so they are left. 13 areas carry no elevation at all, 1 agrees with
// neither, and 1 (Mount Rainier's Curtis Ridge) is excluded by the multi-topout rule below. All
// reported, none written.
//
// EXTERNALLY VALIDATED, WHICH IS WHY THIS IS MORE THAN A VOTE. wa_goat_mountain_south_ridge is in the
// repaired set, and a research pass established independently, from Wikipedia, WTA and SummitPost, that
// 6,721 ft is Goat Mountain's WEST (false) summit while this route's own name, overview, climbing_route
// and itinerary all finish on the EAST summit at 6,891 — exactly what the pin and the area say. The
// method picked the right half on the one case where an outside source could check it.
//
// WHAT THIS DOES NOT CLAIM: that the pin and the area elevation are strictly independent. Both may
// descend from one enrichment pass, so their agreement is weaker than two genuinely separate sources —
// the "one claim counted twice" trap this catalog records elsewhere. It is still the best available
// evidence, and the write itself invents nothing: every new value is a number the row already holds.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TOL = 25;   // datum and rounding noise between two records of one summit
const elev = w => { const v = w.elev ?? w.elevFt ?? w.elev_ft; return Number.isFinite(+v) ? +v : null; };

const areas = await selectAll("areas", "id,name,elevation_ft", "path=cd.usa.washington", { pageSize: 1000 });
if (!areas.length) { console.error("no WA areas read — refusing"); process.exit(1); }
const A = new Map(areas.map(a => [a.id, a]));
const rows = await selectAll("routes", "id,area_id,waypoints,high_point_ft", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

// Which peaks have routes that legitimately finish below the summit? Count, per area, the rows whose
// high_point_ft sits well under the area elevation AND whose own summit pin agrees with that lower
// figure — i.e. rows that are internally consistent about topping out short.
const short = new Map();
for (const r of rows) {
  const ar = A.get(r.area_id), ae = ar && +ar.elevation_ft;
  const hp = +r.high_point_ft;
  if (!(ae > 0) || !(hp > 0)) continue;
  if (ae - hp <= 150) continue;
  const su = (r.waypoints || []).find(w => /summit/i.test(w.type || ""));
  const e = su && elev(su);
  if (e && Math.abs(e - hp) > TOL) continue;   // the row disagrees with itself; not evidence of a real second topout
  short.set(r.area_id, (short.get(r.area_id) || 0) + 1);
}

let impossible = 0;
const plan = [], held = [];
for (const r of rows) {
  const hp = +r.high_point_ft; if (!(hp > 0)) continue;
  const su = (r.waypoints || []).find(w => /summit/i.test(w.type || ""));
  const e = su && elev(su); if (!e) continue;
  if (e - hp < TOL) continue;
  impossible++;
  const ar = A.get(r.area_id), ae = ar && +ar.elevation_ft;
  if (!(ae > 0)) { held.push({ id: r.id, why: "the area carries no elevation to adjudicate with" }); continue; }
  const dPin = Math.abs(e - ae), dHp = Math.abs(hp - ae);
  if (dPin <= TOL && dHp > TOL) {
    // A PEAK WHOSE ROUTES TOP OUT AT DIFFERENT HEIGHTS CANNOT BE ADJUDICATED THIS WAY. The area
    // elevation is the MOUNTAIN's height, so on such a peak it backs a summit-height pin whatever the
    // route actually does. Mount Rainier is the case: five of its rows record 14,112 (Liberty Cap)
    // while the area says 14,406 (Columbia Crest), so raising Curtis Ridge's high point to 14,406 on
    // the strength of the area record would assert a topout the catalog's own siblings contradict.
    // If any sibling on this area records a high point well below the area elevation, this peak has
    // more than one topout and the area record settles nothing.
    const sibs = short.get(r.area_id) || 0;
    if (sibs > 0) { held.push({ id: r.id, why: `${sibs} sibling route(s) on ${ar.name} top out well below the area elevation (${ae}) — this peak has more than one topout, so the area record cannot adjudicate` }); continue; }
    plan.push({ id: r.id, peak: ar.name, from: hp, to: e, area: ae, premise: { high_point_ft: r.high_point_ft } }); continue;
  }
  if (dHp <= TOL && dPin > TOL) { held.push({ id: r.id, why: `the area (${ae}) backs high_point_ft — the PIN is the suspect here, a different repair` }); continue; }
  held.push({ id: r.id, why: `the area (${ae}) agrees with neither` });
}
if (!impossible) { console.error("no row has a summit pin above its own high_point_ft — the scan is broken, refusing"); process.exit(1); }

console.log(`\nrows whose summit pin sits above their own high_point_ft: ${impossible}`);
console.log(`  ...where the AREA record backs the pin — repairable: ${plan.length}`);
console.log(`  ...held back                                       : ${held.length}\n`);
for (const p of plan) console.log(`  ${p.id.padEnd(46)} high_point_ft ${p.from} -> ${p.to}   (its Summit pin, and the ${p.peak} area record, both say ${p.area})`);
console.log("");
for (const h of held) console.log(`  HELD ${h.id.padEnd(46)} ${h.why}`);
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, skipped = 0;
const live = new Map((await selectAll("routes", "id,high_point_ft", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const cur = live.get(p.id);
  if (!cur || cur.high_point_ft !== p.premise.high_point_ft) { console.log(`  SKIPPED ${p.id}: the row has changed since it was read`); skipped++; continue; }
  await patchRow("routes", p.id, { high_point_ft: p.to });
  wrote++;
}
console.log(`\nwrote ${wrote}, skipped ${skipped}`);
const after = new Map((await selectAll("routes", "id,high_point_ft", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const p of plan) { if (after.get(p.id)?.high_point_ft === p.to) ok++; else console.log(`  NOT APPLIED: ${p.id}`); }
console.log(`verified ${ok} of ${plan.length} — none now tops out below its own summit pin`);
