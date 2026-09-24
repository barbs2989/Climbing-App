#!/usr/bin/env node
// check:trailhead-direction-shape — the TRAILHEAD card's directions say how to DRIVE there.
//
// approach_logistics.trailheadDirection renders under the trailhead's name, beside "Drive here".
// On 2026-09-24 230 routes carried the WALK in it — "From Slate Pass at the end of Harts Pass Road:
// backpack ~13 miles via the Whistler Cutoff toward the Pasayten base camps", "South side from
// Paradise: Skyline Trail to the Muir Snowfield and Camp Muir", a bare "North". Every guard the
// repo had asked whether the column was populated, and it was. The defect was its SHAPE, which is
// the class CLAUDE.md records for `season`, `grade` and `bivy[]` — a fourth column, same mistake.
//
// Two sections, and the split is deliberate:
//
//   1. STATIC, in the build. lib/trailheadDirectionShape.js must agree with every hand verdict in
//      scripts/trailhead-directions-reviewed.json — 456 values, BOTH directions: each "drive" value
//      passes and each walk / not-directions value is caught. The detector is a deny-list over
//      English, so this is what stops an edit to it from silently widening (a false alarm on good
//      directions, which the card would then HIDE) or narrowing (the next Slate Pass). Needs no DB.
//
//   2. LIVE, with --live. Reads every route's trailheadDirection with the ANON key (routes is
//      publicly readable, and a checker that could write could corrupt what it checks) and fails on
//      any value the detector refuses. Not a build gate, for the reason rappel-length-drift.yml
//      gives: it is a property of the DATABASE, which no PR can cause or fix. It runs daily.
//      Fails closed on a short read, since its realistic failure mode is a false pass.
//
// The write path is guarded separately: check:sql refuses a .sql file that writes such a value,
// which is how these got in (31 of the 48 values the committed enrichment .sql files write fail).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { trailheadDirectionProblem } from "../lib/trailheadDirectionShape.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = process.argv.includes("--live");
let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

// ── 1. the detector agrees with every reviewed verdict ─────────────────────────────────────────
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/trailhead-directions-reviewed.json"), "utf8"));
const rows = corpus.rows || [];
// A corpus that shrank to nothing would agree with anything. 456 when written; the floor leaves room
// to prune a value, not to lose the file.
if (rows.length < 400) { console.error(`check:trailhead-direction-shape FAILED — the reviewed corpus has ${rows.length} rows, expected 400+. Nothing was checked.`); process.exit(1); }
const byVerdict = {};
for (const r of rows) {
  byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
  const why = trailheadDirectionProblem(r.text);
  if (r.verdict === "drive" && why) fail(`refuses good directions (${why}) — the card would HIDE them: ${JSON.stringify(r.text.slice(0, 120))}`);
  if (r.verdict !== "drive" && !why) fail(`lets a ${r.verdict} value through: ${JSON.stringify(r.text.slice(0, 120))}`);
  if (!["drive", "walk", "walk-after-drive", "not-directions"].includes(r.verdict)) fail(`unknown verdict ${JSON.stringify(r.verdict)} on ${JSON.stringify(r.text.slice(0, 60))}`);
}
if ((byVerdict.drive || 0) < 200 || rows.length - (byVerdict.drive || 0) < 100) fail(`the corpus is lopsided (${JSON.stringify(byVerdict)}) — it must hold both kinds to test both directions`);
if (!failures) ok(`the detector agrees with all ${rows.length} reviewed values (${byVerdict.drive} drive, ${rows.length - byVerdict.drive} walk or not-directions)`);

// ── 2. the live catalog ────────────────────────────────────────────────────────────────────────
if (LIVE) {
  const { selectAll, anonKey } = await import("./lib/supabase-env.mjs");
  const all = await selectAll("routes", "id,approach_logistics", "approach_logistics=not.is.null", { key: anonKey(), pageSize: 1000 });
  const withDir = all.filter(r => r.approach_logistics && typeof r.approach_logistics.trailheadDirection === "string" && r.approach_logistics.trailheadDirection.trim());
  // 829 rows / 718 with a direction after the 2026-09-24 repair. An anon read that RLS or an outage
  // empties would otherwise report a clean catalog.
  if (all.length < 500 || withDir.length < 300) {
    console.error(`\ncheck:trailhead-direction-shape FAILED — read ${all.length} routes, ${withDir.length} with directions; expected 500+ / 300+.`);
    console.error("A short read cannot certify the catalog. Not a pass.");
    process.exit(1);
  }
  const bad = withDir.map(r => [r.id, r.approach_logistics.trailheadDirection, trailheadDirectionProblem(r.approach_logistics.trailheadDirection)]).filter(x => x[2]);
  for (const [id, v, why] of bad) fail(`${id}: ${why} — ${JSON.stringify(v.length > 140 ? v.slice(0, 140) + "…" : v)}`);
  if (!bad.length) ok(`all ${withDir.length} live trailhead directions end at the trailhead`);
} else {
  console.log("  (skip) live catalog — pass --live to scan it; that runs daily in trailhead-direction-shape.yml");
}

if (failures) {
  console.log(`\ncheck:trailhead-direction-shape FAILED — ${failures} problem(s).`);
  console.log("A trailhead direction must END AT THE TRAILHEAD: repair the row (cut it back to the drive part,");
  console.log("or clear it — the walk belongs in `approach`). If the detector is what is wrong, add the value to");
  console.log("scripts/trailhead-directions-reviewed.json with its verdict FIRST, then change the rule until both agree.");
  process.exit(1);
}
console.log("\ncheck:trailhead-direction-shape passed.");
