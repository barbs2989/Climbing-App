// Group the expiring-closure backlog by CLOSURE EVENT, not by route.
//
// audit:expiring-closures reports 126 values on 95 routes, and researching 126 times would be the
// wrong unit: one closure serves many routes. FR 6200 beyond Atkinson Flat covers Carne, Dumbell,
// Buck and Chiwawa at once; the Suiattle order covers a dozen Glacier Peak and Ptarmigan Traverse
// lines. Research once per event, apply to every row that cites it.
//
// IT RE-DERIVED THE AUDIT'S CLASSIFICATION AND WAS LOOSER THAN IT — TWO INFLATIONS, BOTH SILENT.
// The first version wrote its own shelf-life needle (`\bcurrently\b|\bindefinitel|as of …`) and its
// own event key, and got both wrong in the direction that manufactures work:
//
//   1. A SECOND CLASSIFIER. Its needle matched far more than the audit's four tiers, which apply
//      SELF_LIMITING and PERMANENT exclusions. In the Suiattle corridor it swept ~20 routes where
//      the audit flags exactly ONE — the other 19 already cite closure order 06-05-26-03 and its
//      end date, which is the very form the audit treats as acceptable. Anyone working that list
//      would have been "fixing" nineteen correct rows. Same shape as the four grade parsers.
//      It now consumes `audit:expiring-closures --json`. ONE classifier, and this file is not it.
//
//   2. A KEY THAT SPLITS ONE EVENT. Keying on order-number > road+milepost > first distinctive
//      token of road.name fragments a single closure across several groups whenever rows spell the
//      road differently or only some cite the order: FR 6200 appeared THREE times, Hozomeen three
//      times. So "4 of 57 events done" credited four settled events with 20 routes when they cover
//      36 of 98. Finished work looked unfinished.
//      [[a-detectors-clustering-key-decides-what-it-can-see]] — recorded for a key too narrow to
//      SEE a class; this is the same property costing coverage the other way round.
//
// Report-only. Prints what the settled events already cover, then the true remainder.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/* Events already researched, matched on what their rows SAY rather than on the key that grouped
   them — the key is the thing shown wrong above. Each is a claim that the research was done and
   applied; an entry matching nothing is reported as stale rather than passing silently. */
const SETTLED = [
  { name: "FR 6200 / Atkinson Flat", note: "still closed, order #06-17-07-2026-11 (20 May 2026 - 31 Dec 2027)",
    re: /06-17-07-2026-11|atkinson flat|chiwawa river road|FR ?6200|forest road 6200|phelps creek/i },
  { name: "Cascade River Road / MP 20", note: "gated at Eldorado MP 20; 9 rows correct, 1 live error fixed",
    re: /cascade river road|eldorado (?:creek )?(?:trailhead )?\(?(?:MP|milepost) ?20|boston basin/i },
  { name: "Harts Pass / FS 5400", note: "NOT SETTLEABLE — public sources stop at May 2026",
    re: /harts pass|FS ?(?:road )?5400/i },
  { name: "Silver-Skagit / Hozomeen", note: "correct, no edit — Border 2 Fire still active (NPS, 10 Aug 2026)",
    re: /silver[- ]skagit|hozomeen|border 2 fire|international boundary/i },
  { name: "Suiattle River Road (FR 26)", note: "still closed, order #06-05-26-03 (2 Apr 2026 - 1 Jan 2028) — verified vs the USFS alert",
    re: /suiattle|06-05-26-03|downey creek/i },
];

let payload;
try {
  payload = JSON.parse(execFileSync("node", [path.join(ROOT, "scripts/audit-expiring-closures.mjs"), "--json"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, cwd: ROOT }));
} catch (e) {
  console.error(`FAIL — could not read the audit's classification: ${String(e.message).slice(0, 200)}`);
  process.exit(1);
}
if (!payload || !Array.isArray(payload.findings) || !payload.findings.length) {
  console.error("FAIL — the audit returned no findings. Refusing to report an empty worklist, which is\nindistinguishable from a clean backlog."); process.exit(1);
}

const covered = new Map(SETTLED.map(s => [s.name, { routes: new Set(), values: 0, note: s.note }]));
const rest = [];
for (const f of payload.findings) {
  const hay = `${f.text} ${f.roadName || ""}`;
  const hit = SETTLED.find(s => s.re.test(hay));
  if (hit) { const c = covered.get(hit.name); c.routes.add(f.id); c.values++; }
  else rest.push(f);
}

console.log(`${payload.flagged} flagged value(s) on ${new Set(payload.findings.map(f => f.id)).size} route(s), from audit:expiring-closures\n`);
console.log("ALREADY RESEARCHED — what each settled event actually covers:\n");
let stale = 0;
for (const [name, c] of covered) {
  if (!c.values) { console.log(`   STALE  ${name} — matches nothing in the backlog now; re-check or drop the entry`); stale++; continue; }
  console.log(`   ${String(c.values).padStart(3)} value(s) / ${String(c.routes.size).padStart(2)} route(s)  ${name}`);
  console.log(`                          ${c.note}`);
}
const cv = [...covered.values()].reduce((n, c) => n + c.values, 0);
console.log(`\n   ${cv} of ${payload.flagged} value(s) (${Math.round(cv / payload.flagged * 100)}%) belong to an event already researched.\n`);

// Group the remainder by ROAD NAME, which is the honest key once the order numbers are spent.
const byRoad = new Map();
for (const f of rest) {
  const road = (f.roadName || "(no road.name)").trim();
  if (!byRoad.has(road)) byRoad.set(road, { routes: new Set(), values: [], });
  const g = byRoad.get(road); g.routes.add(f.id); g.values.push(f);
}
const list = [...byRoad.entries()].sort((a, b) => b[1].routes.size - a[1].routes.size || b[1].values.length - a[1].values.length);
console.log(`REMAINING: ${new Set(rest.map(f => f.id)).size} route(s), ${rest.length} value(s), in ${list.length} road group(s)\n`);
console.log("WORKLIST — most routes unblocked first:\n");
for (const [road, g] of list.slice(0, 20)) {
  console.log(`${String(g.routes.size).padStart(3)} route(s) / ${g.values.length} value(s)  ${road}`);
  const s = g.values[0];
  console.log(`      [${s.tier}] ${s.id} ${s.field}: ${s.text.slice(0, 150)}`);
}
const top = list.slice(0, 10).reduce((n, e) => n + e[1].routes.size, 0);
console.log(`\nThe top 10 road groups cover ${top} of the ${new Set(rest.map(f => f.id)).size} remaining routes.`);
if (stale) { console.error(`\n${stale} SETTLED entry(s) matched nothing — bookkeeping is stale.`); process.exitCode = 1; }
