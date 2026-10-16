#!/usr/bin/env node
// Repair waypoint arrays whose ONLY fault is sequence: the summit listed second, with the
// approach points that precede it on the ground listed after it. `waypoints[].directions`
// is POSITIONAL — each string is "how do I get to this point from the previous one" — so an
// out-of-order array cannot carry directions at all, and the writer refuses those routes.
// This unblocks them.
//
// It is deliberately NOT a bulk sort, because sorting is exactly the wrong tool for most of
// what the audit flagged. Three faults look alike in a listing and want opposite treatment:
//
//   sequence   the array holds one coherent approach in the wrong order      -> sort (this)
//   coordinate the points are wrong on the ground, order is irrelevant       -> research
//   two-trailhead  the array splices two DIFFERENT approaches together      -> NEVER sort
//
// The third is the dangerous one. wa_iron_cap_mountain_south_route carries six Middle Fork
// points AND a "West Fork Foss River Trailhead" — a different valley, ~10 km away over a
// ridge. Sorting that by distance interleaves the two into one confident, unwalkable
// sequence, and then a directions pass would narrate it leg by leg. Refusing is the feature.
//
// So a route is repaired only if ALL of these hold, and it is SKIPPED (loudly) otherwise:
//   1. every waypoint carries a numeric distMi, except trailing null-distance reference
//      points ("base / area reference point"), which are pinned in place at the end
//   2. no two reordered points TIE on distMi — a tie means the sort cannot know the
//      intended order, and Burgner-Stanley has three points at 9.5 where the true order is
//      camp -> chimney -> summit -> rappel. A stable sort would silently pick one.
//   3. the sequence is not ALREADY sorted (nothing to do)
//   4. after sorting, position 1 still has the smallest distance — i.e. the trailhead did
//      not move, which is the signature of a spliced second approach
//   5. no waypoint already carries `directions`. A written leg describes the point BEFORE
//      it; reordering under existing directions silently re-points every one of them.
//
// Dry run by default. Pass --write to apply. Every original array is written to a backup
// file BEFORE any write, and every row is re-read and compared afterwards, because a 200
// is not evidence the data changed.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WRITE = process.argv.includes("--write");
const num = (w) => {
  const v = w.distMi ?? w.dist_mi;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

function plan(wps) {
  if (!Array.isArray(wps) || wps.length < 3) return { skip: "fewer than 3 waypoints" };
  if (wps.some((w) => w.directions && String(w.directions).trim()))
    return { skip: "already carries directions — reordering would re-point every leg" };

  // trailing null-distance reference points stay pinned at the end
  let end = wps.length;
  while (end > 0 && num(wps[end - 1]) === null) end--;
  const movable = wps.slice(0, end);
  const pinned = wps.slice(end);

  if (movable.length < 3) return { skip: "fewer than 3 distance-carrying waypoints" };
  if (movable.some((w) => num(w) === null))
    return { skip: "a null distance sits INSIDE the sequence — order is unknowable" };

  const ds = movable.map(num);
  const ties = ds.filter((d, i) => ds.indexOf(d) !== i);
  if (ties.length)
    return { skip: `tie on distMi (${[...new Set(ties)].join(", ")}) — the sort cannot know the intended order` };

  const sorted = [...movable].sort((a, b) => num(a) - num(b));
  if (sorted.every((w, i) => w === movable[i])) return { skip: "already in order" };

  // The first waypoint must already BE the nearest — i.e. the array starts at the trailhead
  // and only the tail is scrambled. If sorting would promote something else into position 1,
  // the array does not begin where the climber begins, and that is the two-approach splice
  // rather than a sequence fault. wa_smears_jugs_and_rock_roll starts at "Snow Lakes@6" with
  // a route-base point at 0.2 buried mid-array; sorting hoists the base of the climb above
  // the trailhead and produces a chain that starts at the crag.
  //
  // The first version of this gate read `num(sorted[0]) !== Math.min(...ds)`, which is
  // VACUOUS — sorting guarantees sorted[0] is the minimum, so it could never fire. Compare
  // identity against the ORIGINAL first element, not a property of the sorted output.
  if (movable[0] !== sorted[0])
    return { skip: "the array does not start at its nearest point — likely two approaches spliced together" };

  return { next: [...sorted, ...pinned], moved: sorted.filter((w, i) => w !== movable[i]).length };
}

const areas = await selectAll("areas", "id,name,path", null, { pageSize: 1000 });
const waIds = areas.filter((a) => (a.path || "").includes("washington")).map((a) => a.id);
console.log(`WA areas: ${waIds.length}`);

const rows = [];
for (let i = 0; i < waIds.length; i += 40)
  rows.push(...await selectAll("routes", "id,name,waypoints",
    `area_id=in.(${waIds.slice(i, i + 40).join(",")})`, { pageSize: 200 }));

const withWp = rows.filter((r) => Array.isArray(r.waypoints) && r.waypoints.length >= 3);
console.log(`WA routes with >=3 waypoints: ${withWp.length}\n`);

const todo = [], skipped = new Map();
for (const r of withWp) {
  const p = plan(r.waypoints);
  if (p.skip) { skipped.set(p.skip, (skipped.get(p.skip) || 0) + 1); continue; }
  todo.push({ r, next: p.next, moved: p.moved });
}

console.log(`--- REPAIRABLE: ${todo.length} routes ---`);
for (const { r, next, moved } of todo) {
  console.log(`\n${r.id}  "${r.name}"  (${moved} of ${r.waypoints.length} move)`);
  console.log(`   was: ${r.waypoints.map((w) => `${w.name}@${num(w) ?? "-"}`).join(" -> ").slice(0, 200)}`);
  console.log(`   now: ${next.map((w) => `${w.name}@${num(w) ?? "-"}`).join(" -> ").slice(0, 200)}`);
}

console.log(`\n--- SKIPPED, by reason ---`);
for (const [why, n] of [...skipped].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${why}`);

if (!WRITE) { console.log(`\nDRY RUN — pass --write to apply to ${todo.length} routes.`); process.exit(0); }
if (!todo.length) { console.log("\nnothing to write"); process.exit(0); }

requireServiceKey();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = path.join(ROOT, "scripts", "oneoff", `waypoint-order-backup-${stamp}.json`);
fs.writeFileSync(backup, JSON.stringify(
  Object.fromEntries(todo.map(({ r }) => [r.id, r.waypoints])), null, 2));
console.log(`\nbackup written: ${path.relative(ROOT, backup)}`);

let wrote = 0;
for (const { r, next } of todo) {
  await patchRow("routes", r.id, { waypoints: next });
  wrote++;
}
console.log(`patched ${wrote} routes; reconciling...`);

// Re-read and compare. A 200 is not evidence.
let bad = 0;
for (const { r, next } of todo) {
  const [live] = await selectAll("routes", "id,waypoints", `id=eq.${r.id}`, { pageSize: 5 });
  const got = (live?.waypoints || []).map((w) => w.name).join("|");
  const want = next.map((w) => w.name).join("|");
  if (got !== want) { console.log(`  MISMATCH ${r.id}\n    want ${want}\n    got  ${got}`); bad++; }
}
console.log(bad ? `\nFAILED — ${bad} route(s) did not match after write` : `\nok — all ${wrote} reconciled`);
process.exit(bad ? 1 : 0);
