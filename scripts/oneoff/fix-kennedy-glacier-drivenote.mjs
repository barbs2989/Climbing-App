#!/usr/bin/env node
// wa_glacier_peak_kennedy_glacier gives driving directions to a trailhead that is not its own.
//
// THE ROW SETTLES IT, AND MY FIRST READING OF IT WAS WRONG. Reported by audit:expiring-closures
// and left unrepaired because "which half is wrong is a judgement no column settles", I then
// guessed that `road.name` was the stray on the grounds that four of five siblings name FR 49.
// That is inference from the NEIGHBOURS rather than from the row, and the row disagrees:
//
//   White Chuck   road.name                    "White Chuck Road (FR 23)"
//   White Chuck   approach_logistics.trailhead "White Chuck River Trailhead"
//   White Chuck   waypoint Trailhead           "White Chuck River Trailhead"
//   White Chuck   approach                     "from the White Chuck River Trailhead (FS-23...)"
//   FR 49         road.driveNote               "...to Sloan Creek Road (FR 49)..."
//
// and the dissenting driveNote shares its first FIFTY characters with three siblings' — it was
// copied from a neighbour, which is the same mechanism audit:trailhead-road section 2 records.
//
// THE REPAIR IS A DELETION, and deliberately not a rewrite: there is no White Chuck driveNote
// anywhere in the catalog to copy, so writing one would be research typed into a repair script —
// the thing fix-road-blocks-from-a-named-sibling.mjs exists to make impossible. Removing a false
// direction loses nothing: road.name and road.status still name the road and its closure, and the
// route's own approach prose describes the walk.
import { selectAll, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_glacier_peak_kennedy_glacier";
const WHITE = /white ?chuck|fs-?23\b|fr ?23\b|road 23\b/i;
const SAUK = /sloan creek|fr ?49\b|north fork sauk/i;

const [r] = await selectAll("routes", "id,road,approach,approach_logistics,waypoints,access", `id=eq.${ID}`, { pageSize: 10 });
if (!r) { console.error(`FAIL — ${ID} not found.`); process.exit(1); }
const rd = r.road || {}, al = r.approach_logistics || {};
const wp = (r.waypoints || []).find((w) => /trailhead/i.test(String(w.type || "") + String(w.name || "")));

// Re-assert the whole finding against the live row before touching it: if a later pass has already
// repaired this, or flipped the row's identity, refuse rather than write.
const problems = [];
if (!WHITE.test(String(rd.name || ""))) problems.push("road.name no longer names White Chuck");
if (!WHITE.test(String(al.trailhead || ""))) problems.push("the logistics trailhead is no longer White Chuck");
if (!WHITE.test(String(wp && wp.name || ""))) problems.push("the Trailhead waypoint is no longer White Chuck");
if (!rd.driveNote) problems.push("road.driveNote is already empty — already repaired?");
else if (!SAUK.test(rd.driveNote) || WHITE.test(rd.driveNote)) problems.push("road.driveNote no longer points only at FR 49");

if (problems.length) { console.error(`REFUSED — ${problems.join("; ")}`); process.exit(1); }

console.log(`${ID}`);
console.log(`  road.name      ${rd.name}`);
console.log(`  logistics TH   ${al.trailhead}`);
console.log(`  waypoint TH    ${wp.name}`);
console.log(`  road.driveNote ${String(rd.driveNote).replace(/\s+/g, " ").slice(0, 160)}`);
console.log(`\n  -> clearing road.driveNote (directions to a trailhead this route does not use)\n`);

if (!APPLY) { console.log("(dry run — pass --apply)"); process.exit(0); }
requireServiceKey();
const next = { ...rd };
delete next.driveNote;
await patchRow("routes", ID, { road: next });
const [after] = await selectAll("routes", "id,road", `id=eq.${ID}`, { pageSize: 10 });
const still = (after.road || {}).driveNote;
console.log(still ? `FAILED — driveNote survived: ${String(still).slice(0, 80)}` : "written and re-read: road.driveNote is gone; road.name and road.status intact");
console.log(`  road.name   ${(after.road || {}).name}`);
console.log(`  road.status ${String((after.road || {}).status || "").slice(0, 90)}`);
process.exitCode = still ? 1 : 0;
