// A glacier headwall told to go in the season its own prose says the bergschrund is open.
//
// wa_jack_mountain_northeast_glacier stores season "May-Jul" and a best_season reading "Early season,
// when the glacier is still filled in and the bergschrund is closed." Its access.notes says "Best
// season: August-September (least snow)." Those cannot both be advice for this route: least snow is
// the argument for a ROCK line, and on a glacier route it is the argument against — less snow means
// open crevasses and an open schrund, which is precisely what the row's own best_season names as the
// thing to avoid.
//
// THE OUTLIER IS DELETED, NOT OVERRULED, and no season is asserted by this script. Two of the row's
// own records agree with each other AND supply a mechanism; the third gives a reason that belongs to
// a different kind of climb. Removing it leaves season and best_season standing, both already on
// screen, so nothing is composed and nothing is lost.
//
// THE CLASS IS ONE, MEASURED, so no detector is built for it. Across all 8,365 WA rows exactly four
// carry a "Best season:" claim inside their access block, and only this one is DISJOINT from the
// season column — no month in common. A detector for a class of one is the thing this repo keeps
// declining to build; the measurement is the finding, and it is recorded here rather than shipped as
// a guard.
//
// The sentence is matched exactly and asserted unique, and the script re-checks at apply time that the
// two surviving records still say what makes this the outlier — so if season or best_season is ever
// rewritten to agree with August, this refuses rather than deleting the wrong one.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_jack_mountain_northeast_glacier";
const FIND = " Best season: August-September (least snow).";
const EARLY = /early season|schrund is closed|bergschrund is closed|still filled in/i;
const SEASON_EARLY = /\bmay\b|\bjun\b|\bjul\b/i;

const r = (await selectAll("routes", "id,season,best_season,access", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }
const cur = String(r.access?.notes ?? "");
if (!cur.includes(FIND)) { console.log("nothing to do — the August claim is already gone."); process.exit(0); }
if (cur.split(FIND).length - 1 !== 1) { console.error("the sentence appears more than once — refusing"); process.exit(1); }

// the two records that make this the outlier must still say so
if (!SEASON_EARLY.test(String(r.season || ""))) { console.error(`season is now ${JSON.stringify(r.season)} — it no longer contradicts August, refusing`); process.exit(1); }
if (!EARLY.test(String(r.best_season || ""))) { console.error("best_season no longer argues for early season — refusing"); process.exit(1); }

const after = cur.replace(FIND, "");
console.log(`season      : ${JSON.stringify(r.season)}`);
console.log(`best_season : ${JSON.stringify(String(r.best_season).slice(0, 140))}`);
console.log(`\n  ${TARGET}.access.notes`);
console.log(`     from ${JSON.stringify(cur)}`);
console.log(`     to   ${JSON.stringify(after)}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", TARGET, { access: { ...r.access, notes: after } });
const a = (await selectAll("routes", "id,season,best_season,access", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
const ok = !String(a.access?.notes ?? "").includes("Best season: August") && SEASON_EARLY.test(String(a.season || "")) && EARLY.test(String(a.best_season || ""));
console.log(ok ? "verified: the August claim is gone and both early-season records remain" : "NOT APPLIED");
