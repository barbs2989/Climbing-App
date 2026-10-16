/* Does this row describe ONE route?

   The companion to audit-enrichment-bleed.mjs, and the one that would actually have caught
   #816's find. wa_gunsight_peak_standard is a Class 5.6 glacier route that was carrying a
   four-station rappel table lifted from a published trip report for a 5.11+, 6-pitch rock
   route on a different summit. That contamination came from OUTSIDE the catalog, so it left no
   internal duplicate to find — and the id and area were both correct, so no identity guard
   could see it either.

   What it DID leave was a row at war with itself: an easy glacier scramble carrying the
   descent profile of a hard technical rock climb. So ask that question directly — is the
   enrichment consistent with the route's own grade, discipline and pitch count? Enrichment
   written about a different route usually disagrees with the row it landed on, and disagreeing
   with yourself is detectable without knowing the truth.

   Report-only, and deliberately narrow: every rule below fires on a CONTRADICTION, not on an
   absence. Missing data is a different problem and this script says nothing about it. */
import { anonKey, selectAll } from "../lib/supabase-env.mjs";

const key = anonKey();
/* Read the small table FIRST and retry it. Doing the 205k-row routes scan first and then
   asking for areas throws away twenty minutes of work when the second read draws a 57014,
   which is intermittent on this project. Cheap reads go first; expensive reads go last. */
const withRetry = async (label, fn) => {
  for (let i = 0; i < 4; i++) {
    try { return await fn(); }
    catch (e) { if (!/57014|statement timeout/.test(String(e)) || i === 3) throw e; console.log(`  (${label}: timeout, retry ${i + 1})`); }
  }
};
const A = Object.fromEntries((await withRetry("areas", () => selectAll("areas", "id,name", "", { pageSize: 1000, key }))).map((a) => [a.id, a.name]));

const rows = await selectAll(
  "routes",
  "id,name,area_id,grade,discipline,pitches,pitch_detail,rappel_detail,rappels,length_m,gear",
  "", { pageSize: 1000, key });
if (!rows.length) throw new Error("empty read — refusing to report a clean result");
console.log(`scanned ${rows.length} routes\n`);

const num = (v) => (typeof v === "number" ? v : null);
const arr = (v) => (Array.isArray(v) ? v : []);
// A scramble grade: class 1-4, or an unroped walk-up. NOT 5.x.
const SCRAMBLE = /^\s*(?:class\s*)?[1-4](?:st|nd|rd|th)?(?:\s*class)?\b/i;
const YDS = /5\.(\d{1,2})/;
const hardYds = (g) => { const m = YDS.exec(String(g || "")); return m ? +m[1] : null; };

const findings = { pitchCount: [], scrambleRaps: [], scrambleTech: [], stationLen: [], soloPitch: [] };

for (const r of rows) {
  const pd = arr(r.pitch_detail), rd = arr(r.rappel_detail);
  const p = num(r.pitches), g = String(r.grade || "");

  /* 1. The row states a pitch count and then lists MORE pitches than it claims. Fewer is
        normal (only some pitches described); more is a contradiction. */
  if (p != null && p > 0 && pd.length > p) findings.pitchCount.push({ r, says: p, has: pd.length });

  /* 2. A scramble grade carrying a multi-station rappel descent. One rappel off a summit
        block is ordinary on a class 3-4 peak; a four-station line is a technical descent and
        suggests the table came from somewhere else. */
  if (SCRAMBLE.test(g) && rd.length >= 3) findings.scrambleRaps.push({ r, stations: rd.length });

  /* 3. A scramble grade carrying pitch-by-pitch 5th-class grades. */
  if (SCRAMBLE.test(g)) {
    const hard = pd.filter((x) => x && YDS.test(String(x.grade || "")));
    if (hard.length >= 2) findings.scrambleTech.push({ r, n: hard.length, sample: hard[0].grade });
  }

  /* 4. Rappel stations longer than the route itself. A 600 m descent on a 100 m climb means
        the table is not describing this line. Only fires when both numbers exist. */
  const lens = rd.map((x) => x && x.lengthM).filter((n) => typeof n === "number" && n > 0);
  const total = lens.reduce((a, b) => a + b, 0);
  if (r.length_m > 0 && total > 0 && total > r.length_m * 2.5) {
    findings.stationLen.push({ r, total, routeLen: r.length_m });
  }

  /* 5. A single-pitch route with a multi-station rappel table. */
  if (p === 1 && rd.length >= 3) findings.soloPitch.push({ r, stations: rd.length });
}

const show = (title, list, fmt) => {
  console.log(`=== ${list.length}  ${title}`);
  for (const x of list.slice(0, 15)) console.log(`   ${x.r.id.padEnd(46)} ${(A[x.r.area_id] || "?").padEnd(26)} ${fmt(x)}`);
  if (list.length > 15) console.log(`   … and ${list.length - 15} more`);
  console.log("");
};
show("lists MORE pitches than it claims to have", findings.pitchCount, (x) => `pitches=${x.says} but ${x.has} described`);
show("scramble grade with a 3+ station rappel descent", findings.scrambleRaps, (x) => `${x.r.grade} · ${x.stations} stations`);
show("scramble grade with 5th-class pitch grades", findings.scrambleTech, (x) => `${x.r.grade} · ${x.n} technical pitches (e.g. ${x.sample})`);
show("rappel stations far longer than the route", findings.stationLen, (x) => `${x.total} m of rappel on a ${x.routeLen} m route`);
show("single pitch, multi-station rappel table", findings.soloPitch, (x) => `${x.stations} stations`);

const total = Object.values(findings).reduce((a, l) => a + l.length, 0);
console.log(`${total} internal contradictions across ${rows.length} routes.`);
console.log(`Each is a QUESTION: a row disagreeing with itself is evidence that some of it was`);
console.log(`written about a different route. Confirm against a source before editing.`);
