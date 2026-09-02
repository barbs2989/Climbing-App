// The NPS group-size exception is stored BACKWARDS on the one zone it exists for.
//
// NPS North Cascades Wilderness Trip Planner, read directly 2026-09-02 (page last updated 21 Apr 2026):
//   "The size limit is 12 within all trail corridors and camps, and in cross-country zones around
//    Mount Shuksan, Eldorado Peak, and Forbidden Peak. Group size limit is 6 for the remainder of the
//    cross-country zones."   ...and "Group size limits include people and stock."
//
// The FIRST run repaired 16 routes inside those three zones, 11 of them carrying prose that NAMED
// Eldorado while assigning it the 6 — the exception applied to exactly the zone it exists for.
// The consequence is a legal party of 8-12 being told to split. A SECOND run then corrected the
// scope (see the ZONES comment below) and repaired 13 more.
//
// THIS IS NOT THE CLOSURE GRIND (stopped 2026-08-28) and the distinction is structural, not a
// technicality: a closure is a dated, transient order, so writing one into a column nothing re-reads
// creates a lie with a fuse. This is a STANDING REGULATION with no expiry, published as a permanent
// rule, and the catalog ALREADY STORES IT CORRECTLY on 8 Mount Shuksan routes — so this is internal
// inconsistency, not a novel claim.
//
// ZONE MEMBERSHIP IS RESOLVED BY AREA PATH ANCESTRY, NEVER BY NAME. Eldorado Peak's own routes are
// filed under a child area called "Main Peak" — a generic name that exists elsewhere in the catalog —
// so a name filter both MISSED them and would have matched unrelated peaks. The same lookup confirms
// Dorado Needle is a child of wa_eldorado_peak, which corroborates the zone membership from the
// catalog's own tree rather than from an inference about the NPS zone map.
//
// WHAT IS DELIBERATELY NOT TOUCHED:
//   - the 3 rows storing no numeric limit. Absence is not a false claim, and filling it would be
//     adding a claim rather than correcting one.
//   - the 55 rows elsewhere carrying the same boilerplate. They are NOT in a named zone, so 6 is
//     probably right for them; the boilerplate's reach is not the defect's reach. ("A cluster's size
//     is not its defect count" is now six-for-six in this project.)
//   - the "Boston Basin camping restricted to two designated sites" sentence, which is correct on a
//     Forbidden Peak row and foreign content on an Eldorado/Dorado one. That is a per-row judgement.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

// THE FIRST RUN OF THIS SCRIPT WAS UNDER-SCOPED AND THIS IS THE CORRECTION.
// It used the NPS Wilderness Trip Planner, which says the limit is 12 "in cross-country zones around
// Mount Shuksan, Eldorado Peak, and Forbidden Peak". THAT IS A SUMMARY. The authoritative page
// (planyourvisit/cross-country-zones.htm, last updated 1 May 2024) enumerates 62 zones and names
// ELEVEN with a 12-person limit: Boston Basin, Eldorado, Forbidden, Hidden Lake, Icy, Inspiration,
// Nooksack, Price, Sulphide Glacier, Torment Basin, Triad. Reading the summary as the list left 13
// routes unrepaired. A SUMMARY PAGE IS NOT THE AUTHORITATIVE LIST.
//
// Two of the missing zones exist as real ancestor areas in this catalog's own tree and are added here:
//   wa_boston_basin — a genuine parent area; Boston Peak, Buckner, Sahale, Sharkfin Tower,
//                     Mount Torment and Aiguille de l'M all sit under it. 7.4 km from Eldorado.
//   wa_the_triad    — an area of exactly that name, 2.9 km from Eldorado.
//
// "INSPIRATION" IS DELIBERATELY NOT ADDED, and the reason is the name-collision class this audit keeps
// finding. NPS's 12-person zones are a Cascade Pass/Eldorado cluster and Eldorado's own approach
// crosses the INSPIRATION GLACIER — but this catalog's "Inspiration Peak" is in the SOUTHERN PICKETS,
// measured 28.3 km away, against Boston Basin's 7.4 and the Triad's 2.9. Two different Inspirations;
// the Pickets peak is in a 6-person zone. Hidden Lake, Icy, Nooksack, Price and Sulphide Glacier are
// likewise not added: they have no matching ancestor area, and "Icy" and "Price" are common words, so
// a name match there would be a guess rather than a boundary test.
const ZONES = ["wa_eldorado_peak", "wa_forbidden_peak", "wa_mount_shuksan",
               "wa_boston_basin", "wa_the_triad"];

// The exact clause to replace, and its replacement. An exact find/replace asserted to match ONCE, so
// nothing can be invented and a row whose prose has since changed is refused rather than rewritten.
const BAD = "Group size capped at 6 in off-trail cross-country zones (which includes Boston Basin/Eldorado approaches; 12 in on-trail corridors).";
const GOOD = "Group size limit is 12 in trail corridors and camps and in the eleven named cross-country zones — Boston Basin, Eldorado, Forbidden, Hidden Lake, Icy, Inspiration, Nooksack, Price, Sulphide Glacier, Torment Basin and Triad — one of which this route is in; 6 in the remaining cross-country zones. Limits include people and stock.";

const routes = await selectAll("routes", "id,area_id,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${routes.length}`);
if (routes.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }
const areas = await selectAll("areas", "id,name,path", "path=cd.usa.washington", { pageSize: 1000 });
if (!areas.length) { console.error("no WA areas read — refusing"); process.exit(1); }
const A = new Map(areas.map(a => [a.id, a]));

const plan = [];
for (const r of routes) {
  const a = A.get(r.area_id); if (!a) continue;
  const segs = String(a.path || "").split(".");
  const zone = ZONES.find(z => segs.includes(z) || a.id === z);
  if (!zone) continue;
  const acc = r.access;
  if (!acc || typeof acc !== "object" || Array.isArray(acc)) continue;
  const key = "group_limit" in acc ? "group_limit" : ("groupLimit" in acc ? "groupLimit" : null);
  if (!key || acc[key] !== 6) continue;

  const rules = typeof acc.rules === "string" ? acc.rules : null;
  const nBad = rules ? rules.split(BAD).length - 1 : 0;
  if (rules && nBad > 1) { console.error(`REFUSING ${r.id}: the clause appears ${nBad} times, cannot replace unambiguously`); process.exit(1); }
  plan.push({ id: r.id, zone, area: a.name, key, fixesProse: nBad === 1,
              premise: { [key]: 6, rules: acc.rules ?? null } });
}

const withProse = plan.filter(p => p.fixesProse);
console.log(`\nrows inside a named 12-person zone storing group_limit 6: ${plan.length}`);
console.log(`  ...whose rules text also states the exception backwards: ${withProse.length}`);
console.log(`  ...whose rules text carries no contradicting number:     ${plan.length - withProse.length}\n`);
for (const p of plan)
  console.log(`  ${p.id.padEnd(46)} ${p.zone.padEnd(20)} area="${p.area}"  ${p.fixesProse ? "+ prose" : ""}`);

if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, refused = 0;
const live = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const r = live.get(p.id);
  if (!r || !r.access || typeof r.access !== "object") { console.log(`  REFUSED ${p.id}: no access object`); refused++; continue; }
  const acc = r.access;
  if (acc[p.key] !== p.premise[p.key] || (acc.rules ?? null) !== p.premise.rules) {
    console.log(`  REFUSED ${p.id}: the row has changed since it was read`); refused++; continue;
  }
  const next = { ...acc, [p.key]: 12 };
  if (p.fixesProse) next.rules = acc.rules.split(BAD).join(GOOD);
  await patchRow("routes", p.id, { access: next });
  wrote++;
}
console.log(`\nwrote ${wrote}, refused ${refused}`);

// A 200 is not evidence the data changed. Re-read and reconcile.
const after = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0; const bad = [];
for (const p of plan) {
  const acc = after.get(p.id)?.access;
  const numOk = acc && acc[p.key] === 12;
  const proseOk = !p.fixesProse || (typeof acc?.rules === "string" && !acc.rules.includes(BAD) && acc.rules.includes(GOOD));
  if (numOk && proseOk) ok++; else bad.push(p.id);
}
console.log(`verified ${ok} of ${plan.length}${bad.length ? `; NOT applied: ${bad.join(", ")}` : ""}`);
const left = [...after.entries()].filter(([id]) => plan.some(p => p.id === id))
  .filter(([, r]) => (r.access?.group_limit ?? r.access?.groupLimit) === 6);
console.log(`rows in a named zone still storing 6: ${left.length}`);
