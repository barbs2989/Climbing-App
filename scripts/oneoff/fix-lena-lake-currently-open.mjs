// The last affirmative undated access claim in the WA backlog.
//
// rank-closure-backlog-by-consequence.mjs asks which shelf-life claims say the road is OPEN and
// carry no checked date, on the asymmetry this grind demonstrated: a stale CLOSED claim sends a
// party to a different mountain, recoverably, from home. A stale OPEN claim sends them up a road
// that is not there, and they find out at the gate. Every real defect found in this grind —
// Forbidden Peak, three Little Sister routes, Cinderella, Copper Peak — was affirmative.
//
// After that work, exactly ONE remains:
//
//   wa_lena_lake_to_mt_stone_traverse  road.status
//     "... Currently open per recent Olympic NF alerts."
//
// THE CLAIM IS TRUE. THE WORD "RECENT" IS NOT. The Olympic NF release it rests on is dated
// 30 July 2025 — thirteen months old — and says, verbatim: "Currently the Hamma Hamma Campground,
// Lena Creek Campground and the Lena Lake Trailhead and all other day use sites, trails, and
// trailheads on FS-25 remain open." The Hamma Fire closures in it apply to the FS-24 road network
// (NF-2401, NF-2480, NF-2421, NF-2441, NF-2464, NF-2469, NF-2471), not to FS-25. WTA's Lena Lake
// page carries no closure alert and describes the 7.5 paved miles as ordinary access.
//
// So this is not a factual repair. It removes an unsupportable freshness claim and states WHY the
// road is open — which is the more useful fact, because a reader who has heard of the Hamma Fire
// wants to know whether it reaches this road.
//
// AND IT IS THE FIRST USE OF 0172 FOR WHAT THE COLUMN IS FOR: the prose no longer has to carry its
// own freshness, because access_checked_at does. That is the whole point of the column — "date it
// or drop the claim" was unfollowable while there was nowhere to put the date.
// [[routes-can-carry-a-checked-date]]
//
// Exact find -> replace, refused unless `find` matches EXACTLY once in the live value.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_lena_lake_to_mt_stone_traverse";
const CHECKED = "2026-08-27T12:00:00Z";

const FIND = "Currently open per recent Olympic NF alerts.";
const REPL = "Open: the Hamma Fire closures on this side of the Olympics apply to the FS-24 road network, not to FS-25, and Olympic NF records the Lena Lake Trailhead and the other FS-25 day-use sites as open.";

if (APPLY) requireServiceKey();

const rows = await selectAll("routes", "id,road,access,access_checked_at", `id=eq.${ID}`);
if (rows.length !== 1) { console.error(`read ${rows.length} of 1 route — refusing`); process.exit(1); }
const r = rows[0];
const road = { ...(r.road || {}) };
const cur = road.status;

if (typeof cur !== "string") { console.error("road.status is not a string — refusing"); process.exit(1); }
const hits = cur.split(FIND).length - 1;
if (hits !== 1) { console.error(`find matched ${hits}x, expected 1 — refusing`); process.exit(1); }

const next = cur.replace(FIND, REPL);
/* The result must not re-assert its own freshness. That is the defect being repaired, and it is the
   one a rewrite most easily reintroduces — "currently", "as of", "recent" all read as fresh while
   resting on a thirteen-month-old release. The DATE now lives in access_checked_at. */
if (/\bcurrently\b|\bas of\b|\brecent\b/i.test(next)) { console.error("the result still claims its own freshness — refusing"); process.exit(1); }

console.log(`${ID}  road.status`);
console.log(`   -  ${cur}`);
console.log(`   +  ${next}`);
console.log(`\naccess_checked_at: ${r.access_checked_at || "(none)"} -> ${CHECKED}`);
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

road.status = next;
await patchRow("routes", ID, { road, access_checked_at: CHECKED });

const after = await selectAll("routes", "id,road,access_checked_at", `id=eq.${ID}`);
const a = after[0];
const okText = typeof a.road.status === "string" && a.road.status.includes("FS-24 road network") && !/\bcurrently\b|\brecent\b/i.test(a.road.status);
const okDate = !!a.access_checked_at;
console.log(`\n${okText ? "ok" : "FAIL"}  the freshness claim is gone and the reason is stated`);
console.log(`${okDate ? "ok" : "FAIL"}  the row now records when it was checked: ${a.access_checked_at}`);
process.exit(okText && okDate ? 0 : 1);
