// Did suppressing the duplicate reports LOSE anything?
//
// The dedupe removes a pin from `waypointOffLine` when a more specific category already named
// it. The failure mode is obvious and silent: suppress one that nothing else reports, and a real
// defect disappears from a report that gets quieter and reads as progress. That is strictly
// worse than the double count it replaces.
//
// So compare DISTINCT (route, waypoint) pairs across the two dumps, not totals. Every pair in the
// before-dump must still appear in the after-dump under some category.
//
// The catalog is written by other sessions while this runs, so a pair present before and absent
// after is reported for inspection rather than treated as proof of a bug — but it must be
// explainable, and an empty list needs no explaining.
//
// Read-only, no DB.
// Usage: verify-waypoint-dedupe-lost-nothing.mjs <before.json> <after.json>
import fs from "node:fs";

const [beforeP, afterP] = process.argv.slice(2);
if (!beforeP || !afterP) { console.error("usage: <before.json> <after.json>"); process.exit(1); }

const PIN = ["trailheadOffLine", "trailheadNotAtStart", "truncatedTrack", "summitOffLine",
             "trackNotEndingAtSummit", "waypointOffLine"];

function pins(path) {
  const F = JSON.parse(fs.readFileSync(path, "utf8")).findings || {};
  const m = new Map();
  for (const k of PIN) for (const f of F[k] || []) {
    if (f.wp) m.set(`${f.id} :: ${f.wp}`, k);
  }
  return m;
}

const A = pins(beforeP), B = pins(afterP);
console.log(`distinct pins before: ${A.size}`);
console.log(`distinct pins after:  ${B.size}`);

const lost = [...A.keys()].filter(k => !B.has(k));
const gained = [...B.keys()].filter(k => !A.has(k));
console.log(`\nlost (in before, not after):  ${lost.length}`);
lost.forEach(k => console.log(`   was ${A.get(k)}   ${k}`));
console.log(`\ngained (in after, not before): ${gained.length}`);
gained.forEach(k => console.log(`   now ${B.get(k)}   ${k}`));

// Recategorisation is expected and fine — the summit split moves pins between two categories on
// purpose. Print it so the move is visible rather than assumed.
const moved = [...A.entries()].filter(([k, v]) => B.has(k) && B.get(k) !== v);
console.log(`\nsame pin, different category: ${moved.length}`);
const byMove = new Map();
for (const [k, v] of moved) {
  const key = `${v} -> ${B.get(k)}`;
  byMove.set(key, (byMove.get(key) || 0) + 1);
}
[...byMove.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`   ${String(n).padStart(4)}  ${k}`));

process.exit(lost.length ? 1 : 0);
