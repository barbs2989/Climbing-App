// A route's `disciplines` LIST must agree with its primary `discipline` (owner, 2026-10-24, on Monte Cristo:
// "Why does Monte Cristo standard scramble say the route is a 5.6? ... Most people don't scramble a 5.6").
//
// The walk-up audits (#1849, #1854 and rounds 3-5) re-filed `discipline` and left `disciplines` alone, so 83
// peak routes carried a list that did not even name their own primary. The route page's badges and the
// discipline filters read the list, so Monte Cristo — alpine since #1854 — still showed "Scrambling 5.6".
// rDiscs()/DiscBadges now always lead with catOf(r); this repairs the rows themselves, and migration 0366 keeps
// later writes honest.
//
// The rules, the same ones catOf, rDiscs and trigger 0366 apply:
//   1. A scramble with a YDS 5.x in grade/rock_grade/alpine_grade is ALPINE (Cardinal SE Slopes, Mount Meany,
//      Huckleberry West Face, Lundin East Ridge: each carries a rope or rack for its 5th-class pitch). The
//      Mountaineers list Monte Cristo's North Col as a "Basic Alpine Climb"; their scrambles are unroped.
//   2. The list leads with the primary; "scramble" is spelled "scrambling" (the chip key).
//   3. A route with a 5.x grade is not ALSO a scramble: "scrambling" leaves its list.
//   4. A mountaineering row graded Class 1-2 with nothing harder in any grade column is a walk-up — mountaineering
//      ONLY (owner, 2026-09-24) — so its list loses "alpine" and "scrambling" (Mount Townsend's trail, Baker's
//      Easton Glacier).
//   Nothing at Class 3+: whether a Class 3 glacier route is ALSO "alpine" was settled by the walk-up audits, and a
//   first draft that rebuilt lists from the Class grade would have tagged Rainier's Disappointment Cleaver a scramble.
// NOT touched: wa_dragontail_peak_r3 (Pandora's Box), the one documented exemption in audit:mountaineering-rule
// (its 5.6 is an optional summit pinnacle) — writing its list would fire trigger 0280/0366 and relabel it.
//
// Also renames the three "Standard Scramble" rows whose required crux is roped 5th class:
//   Monte Cristo -> "North Col" (The Mountaineers: "Monte Cristo/North Col"; SummitPost: "North Col"),
//   Horseshoe Peak, Spire Mountain -> "Standard Route".
//
// Assert-then-set, read back, rollback file written first. --dry writes nothing. ~100 rows, paced at 4/s.
import { writeFileSync } from "node:fs";
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const YDS = /(?<![\d.])5\.(\d{1,2})[abcd]?[+-]?(?!\d)(?!\s*(?:mi\b|miles?\b|km\b|hrs?\b|hours?\b))/i;
const five = (r) => [r.grade, r.rock_grade, r.alpine_grade].some((g) => { const m = YDS.exec(String(g || "")); return !!m && +m[1] <= 15; });
// Class 1-2 and nothing technical in any grade column: a walk-up, which is mountaineering ONLY (owner, 2026-09-24).
const walkUp = (r) => /^Class [12]\b(?!\s*-\s*[3-5])/i.test(String(r.grade || "")) && !five(r) &&
  ![r.grade, r.rock_grade, r.alpine_grade].some((g) => /\b(WI|AI|M)\d|class\s*[345]/i.test(String(g || "")));
const HELD =new Set(["wa_dragontail_peak_r3"]);
const RENAME = {
  wa_monte_cristo_peak_scramble: { from: "Standard Scramble", to: "North Col" },
  wa_horseshoe_peak_scramble: { from: "Standard Scramble", to: "Standard Route" },
  wa_spire_mountain_scramble: { from: "Standard Scramble", to: "Standard Route" },
};

const cols = "id,name,discipline,disciplines,grade,rock_grade,alpine_grade";
const rows = [];
for (const disc of ["alpine", "mountaineering", "scrambling"]) rows.push(...await selectAll("routes", cols, `discipline=eq.${disc}`, { key, pageSize: 1000 }));
console.log(`read ${rows.length} alpine/mountaineering/scrambling rows`);
if (rows.length < 1000) { console.error("too few rows read — refusing"); process.exit(2); }

const plan = [];
for (const r of rows) {
  if (HELD.has(r.id)) continue;
  const list = Array.isArray(r.disciplines) ? r.disciplines : null;
  let disc = r.discipline;
  if (disc === "scrambling" && five(r)) disc = "alpine";
  let ds = list;
  if (list && list.length) {
    ds = list.map((d) => (d === "scramble" ? "scrambling" : d));
    if (!ds.includes(disc)) ds = [disc, ...ds];
    ds = ds.filter((d, i, a) => a.indexOf(d) === i);
    if (five(r)) ds = ds.filter((d) => d !== "scrambling");
    if (disc === "mountaineering" && walkUp(r)) ds = ds.filter((d) => d !== "alpine" && d !== "scrambling");
  }
  const body = {};
  if (disc !== r.discipline) body.discipline = disc;
  if (list && JSON.stringify(ds) !== JSON.stringify(list)) body.disciplines = ds;
  const rn = RENAME[r.id];
  if (rn && r.name !== rn.to) { if (r.name !== rn.from) throw new Error(`${r.id} is named "${r.name}", expected "${rn.from}"`); body.name = rn.to; }
  if (Object.keys(body).length) plan.push({ r, body });
}
for (const id of Object.keys(RENAME)) if (!rows.some((r) => r.id === id)) throw new Error(`rename target ${id} not read`);

for (const { r, body } of plan) console.log(r.id, "|", r.grade, "|", r.discipline, JSON.stringify(r.disciplines), "->", JSON.stringify(body));
console.log(`${plan.length} rows to change`);
if (DRY) process.exit(0);

const stamp = Date.now();
writeFileSync(`scripts/rollback-disciplines-list-${stamp}.json`, JSON.stringify(plan.map(({ r, body }) =>
  ({ id: r.id, ...Object.fromEntries(Object.keys(body).map((k) => [k, r[k]])) })), null, 1));
let ok = 0;
for (const { r, body } of plan) {
  const row = await patchRow("routes", r.id, body, { filter: `discipline=eq.${r.discipline}` });
  // The trigger may reorder or add to the list; what must hold is the primary and the list naming it.
  if (body.discipline && row.discipline !== body.discipline) throw new Error(`${r.id}: discipline read back ${row.discipline}`);
  if (Array.isArray(row.disciplines) && row.disciplines.length && !row.disciplines.includes(row.discipline)) throw new Error(`${r.id}: list still lacks its primary`);
  if (body.name && row.name !== body.name) throw new Error(`${r.id}: name read back ${row.name}`);
  ok++;
  await new Promise((res) => setTimeout(res, 250));
}
console.log(`changed ${ok} of ${plan.length}; rollback scripts/rollback-disciplines-list-${stamp}.json`);
