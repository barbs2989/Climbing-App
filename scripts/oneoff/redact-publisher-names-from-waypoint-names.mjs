// 17 WAYPOINT NAMES NAME A PUBLISHER, IN A FIELD THE CITATION AUDIT NEVER SCANS.
//
// `audit:prose-citations` reads `waypoints[].note` and NOT `waypoints[].name` -- its collection loop
// tests `typeof w.note === "string"` and nothing else. So the sweep that closed the waypoint-note
// class reports 0 remaining there while 17 breaches sit ONE FIELD OVER in the same array. Measured
// with the audit's OWN `NAMED` needle, lifted from its source rather than re-implemented (a second
// implementation of "is this a citation?" would disagree with the guard, and this repo has been
// burned by exactly that): 4,232 WA waypoint names scanned, 17 hits across 9 distinct strings, every
// one Mountain Project. Waypoint notes: 0.
//
// PIN NAMES RENDER. They label the marker on the route map, they are the row a climber reads under
// WAYPOINTS, and `gpxDownload` writes them into the GPX file carried into the field.
//
// THE REPAIR DELETES THE PUBLISHER AND KEEPS THE HEDGE, which is what makes it safe. Batch 109
// declined this exact edit on wa_little_sister_southeast_ridge, reasoning that removing the
// parenthetical would leave a pin claiming to BE the route's location when it is really the area's
// coordinate -- so the citation was the honest half. That objection dissolves once the publisher is
// separated from the disclosure: "(Mountain Project reference point)" -> "(reference point)" keeps
// every word that hedges and drops only the attribution. The same holds for all nine strings; none
// becomes a stronger claim than it was.
//
// Each edit is an exact whole-name match, asserted to occur where expected, applied per row, printed
// as the RESULTING name, verified by re-read, and idempotent.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const APPLY = process.argv.includes("--apply");

// find -> replace, whole waypoint NAME. Publisher out, hedge kept.
const EDITS = new Map([
  ["Cathedral Peak South Face / Monk area pin (Mountain Project)", "Cathedral Peak South Face / Monk area pin"],
  ["North Side wall (Mountain Project GPS pin)", "North Side wall (GPS pin)"],
  ["Bears Breast Mountain summit (route GPS reference, Mountain Project)", "Bears Breast Mountain summit (route GPS reference)"],
  ["Route GPS pin (Mountain Project, SW Face)", "Route GPS pin (SW Face)"],
  ["Little Sister North Face (Mountain Project reference point)", "Little Sister North Face (reference point)"],
  ["Little Sister Southeast Ridge (Mountain Project reference point)", "Little Sister Southeast Ridge (reference point)"],
  ["Little Sister West Face (Mountain Project reference point)", "Little Sister West Face (reference point)"],
  ["Northwest Face/Corner (Mountain Project route pin)", "Northwest Face/Corner (route pin)"],
  ["Lexington Tower / Tooth and Claw (Mountain Project marker)", "Lexington Tower / Tooth and Claw (marker)"],
]);
// EVERY REPLACEMENT MUST KEEP A HEDGE OR DROP A REDUNDANT ONE -- never turn a disclosed reference pin
// into a bare claim about where the route is. Asserted here so a future edit cannot quietly do that.
for (const [from, to] of EDITS) {
  if (/mountain ?project|summitpost|wta|alltrails|peakbagger|wikipedia|caltopo/i.test(to))
    { console.error(`REFUSED: replacement still names a publisher: ${JSON.stringify(to)}`); process.exit(1); }
  const hedged = s => /\b(pin|marker|reference|reference point|GPS)\b/i.test(s);
  if (hedged(from) && !hedged(to))
    { console.error(`REFUSED: ${JSON.stringify(from)} -> ${JSON.stringify(to)} drops the hedge — the pin would claim to BE the route's location`); process.exit(1); }
  if (to.length >= from.length) { console.error(`REFUSED: ${JSON.stringify(to)} is not shorter than the original — this repair only DELETES`); process.exit(1); }
}

const rows = await selectAll("routes", "id,waypoints,areas!inner(path)",
  "areas.path=cd.usa.washington", { pageSize: 500, key: KEY });
if (rows.length < 5000) { console.error(`SHORT READ: ${rows.length} WA rows`); process.exit(1); }

const plans = [];
let already = 0;
for (const r of rows) {
  const wps = r.waypoints;
  if (!Array.isArray(wps)) continue;
  let touched = 0;
  const next = wps.map(w => {
    const n = String(w?.name ?? "");
    if (!EDITS.has(n)) return w;
    touched++;
    return { ...w, name: EDITS.get(n) };
  });
  if (touched) plans.push({ id: r.id, touched, body: { waypoints: next },
                            names: next.filter((w, i) => w.name !== wps[i]?.name).map(w => w.name) });
  else if (wps.some(w => [...EDITS.values()].includes(String(w?.name ?? "")))) already++;
}
console.log(`rows already carrying a redacted name: ${already}`);
if (!plans.length) { console.log("Nothing to do — no waypoint name matches an edit."); process.exit(0); }

const total = plans.reduce((a, p) => a + p.touched, 0);
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${total} waypoint name(s) across ${plans.length} row(s):\n`);
for (const p of plans) console.log(`  -> ${p.id}   RESULT name(s) = ${JSON.stringify(p.names)}`);
if (!APPLY) { console.log("\nRe-run with --apply."); process.exit(0); }

for (const p of plans) { await patchRow("routes", p.id, p.body, { key: KEY }); }
console.log(`\napplied ${plans.length} row(s)`);

// VERIFY BY RE-READ, with the audit's own needle. A 200 is not evidence the rows changed.
const after = await selectAll("routes", "id,waypoints,areas!inner(path)",
  "areas.path=cd.usa.washington", { pageSize: 500, key: KEY });
const NAMED = /\bWTA\b|Washington Trails Association|AllTrails|SummitPost|Peakbagger|Mountain ?Project|Wikipedia|CalTopo|\bGaia\b/i;
let left = 0;
for (const r of after) for (const w of r.waypoints || []) if (NAMED.test(String(w?.name ?? ""))) { left++; console.error(`  !! still: ${r.id} ${JSON.stringify(w.name)}`); }
console.log(left ? `\nVERIFY FAILED — ${left} waypoint name(s) still name a publisher.` : "\nVerified by re-read: 0 waypoint names name a publisher.");
process.exit(left ? 1 : 0);
