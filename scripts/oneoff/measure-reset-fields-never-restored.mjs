// Which fields does the sign-in reset zero with NOTHING writing them back?
//
// The reset does one big Object.assign(ME, {...}) so a real account starts from a blank ME. Some
// fields are then restored every render by the legacy sync hack (`ME.routesLogged = logs.length`
// and friends); some are restored by `meLive`; the rest stay blank for the whole session, and any
// surface reading them shows a real climber as having done nothing.
//
// THIS EXISTS BECAUSE I GOT IT WRONG BY READING. I saw `routesLogged:0` in the reset and concluded
// the Profile reported 0 logged climbs. It does not — the sync hack keeps that field real, and a
// grep for `ME\.routesLogged=` would have settled it in seconds. "The reset zeroes it" is half the
// question; what writes it BACK is the other half, and the answer differs per field.
//
// The real defect that survived that correction was `catchLedger`: zeroed, never written back,
// and read by trustFactors — so three of four self surfaces scored a climber's belay catches at 0
// (#1424). This asks the same question of every other field at once.
//
// RESULT, 2026-09-02: 39 fields zeroed, 7 restored by the sync hack, 1 by meLive, 31 restored
// NOWHERE — and after reading them, ZERO further defects. catchLedger was the only one.
//
// Two of the 31 are read by trustFactors and both are correct:
//
//   years              Never settable — EditProfileScreen does not collect it (0 mentions in
//                      15,084 characters). trustFactors gives it `max: _yr!=null ? 14 : 0`, so an
//                      untracked field is excluded from the NUMERATOR AND THE DENOMINATOR and
//                      cannot depress the score; it reads "Not yet tracked". The Profile hero
//                      gates it too, so there is no dangling "yr exp" label. Same conditional-max
//                      design covers reliability, responseRate, partnerCount, conditionsReported
//                      and floatPlans.
//   communityVouches   Vouches are session state, not DB-backed, and received ones arrive through
//                      VOUCH_BOOST[id] which trustFactors adds separately. Reporting 0 stored
//                      vouches for an account with none is true.
//
// A RAW READ COUNT IS THE WRONG INSTRUMENT and the first run showed why: `lat` scored 144 because
// routes, areas and waypoints all have one. Counting only `ME.<field>` drops the whole list to
// single digits (years 6, lat 4, everything else <= 2), which is small enough to read. Do that
// before treating any row here as work.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");

// ---- 1. the reset's field list ----
const anchor = app.indexOf("catchLedger:{totalCatches:0,highFactorCatches:0,lastCatch:\"\",partnersSigned:0},safetyScore:0");
if (anchor < 0) { console.error("ANCHOR LOST — the sign-in reset's shape moved."); process.exit(1); }
// walk back to the Object.assign( that opens it
let open = app.lastIndexOf("Object.assign(ME,{", anchor);
if (open < 0) { console.error("ANCHOR LOST — could not find the reset's Object.assign(ME,{."); process.exit(1); }
let depth = 0, end = -1;
for (let i = app.indexOf("{", open); i < app.length; i++) {
  if (app[i] === "{") depth++;
  else if (app[i] === "}") { depth--; if (!depth) { end = i; break; } }
}
const resetBody = app.slice(open, end + 1);
const reset = [...new Set([...resetBody.matchAll(/[{,]([a-zA-Z_][a-zA-Z0-9_]*):/g)].map((m) => m[1]))];
if (reset.length < 15) { console.error(`parsed only ${reset.length} reset fields — the walk broke`); process.exit(1); }

// ---- 2. what writes each one back ----
const syncWrites = new Set([...app.matchAll(/\bME\.([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g)].map((m) => m[1]));
const ml = /meLive=useMemo\(function\(\)\{[\s\S]{0,900}?\},\[[^\]]*\]\);/.exec(app);
if (!ml) { console.error("ANCHOR LOST — meLive moved."); process.exit(1); }
const meLiveFields = new Set([...ml[0].matchAll(/([a-zA-Z_][a-zA-Z0-9_]*):/g)].map((m) => m[1]));

// ---- 3. is it read anywhere at all? ----
const all = app + core + rd;
const readCount = (f) => (all.match(new RegExp("\\.\\b" + f + "\\b", "g")) || []).length;
// trustFactors is the one function known to turn these into a number on screen
const tf = /function trustFactors\(c\)\{[\s\S]*?\n\}/.exec(core) || [""];
const inTrust = (f) => new RegExp("\\bc\\." + f + "\\b").test(tf[0]);

console.log(`reset zeroes ${reset.length} field(s) on ME\n`);
const rows = reset.map((f) => ({
  f,
  sync: syncWrites.has(f),
  meLive: meLiveFields.has(f),
  reads: readCount(f),
  trust: inTrust(f),
}));

const unrestored = rows.filter((r) => !r.sync && !r.meLive);
console.log(`  restored by the sync hack: ${rows.filter((r) => r.sync).length}`);
console.log(`  restored by meLive:        ${rows.filter((r) => r.meLive && !r.sync).length}`);
console.log(`  NOT restored anywhere:     ${unrestored.length}\n`);

console.log("  NOT RESTORED — sorted by how often the field is read:\n");
for (const r of unrestored.sort((a, b) => b.reads - a.reads)) {
  const flag = r.trust ? "  <-- READ BY trustFactors" : "";
  console.log(`    ${r.f.padEnd(22)} ${String(r.reads).padStart(4)} read(s)${flag}`);
}

console.log(`\n  A read count is not a defect count. It counts every \`.field\` in three files, so a`);
console.log(`  field named the same on another object inflates it. Read the sites before acting —`);
console.log(`  and check whether a separate React state already holds the real value, which is the`);
console.log(`  usual reason a blank ME field is harmless.`);
