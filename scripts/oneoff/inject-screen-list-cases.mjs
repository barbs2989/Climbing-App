// Cases for check:screen-lists.
//
// Its healthy output is "ok", which is also what a scan whose vocabulary stopped parsing prints,
// so the fail-closed cases matter as much as the catching ones. Cases 1 and 2 are the REAL
// historical defects — five guards omitting `ranks`, and check:token-boxes walking a route
// sub-tab that does not exist — reproduced by putting the files back the way they were.
//
// Cases 5 and 8 must stay SILENT: a complete list and a below-threshold list are both correct,
// and a guard that flags them would be telling authors to break working code.
//
// Every case proves its edit LANDED by checksum before the guard is believed, and restores the
// file byte-identically afterwards.
//
//   node scripts/oneoff/inject-screen-list-cases.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const abs = (f) => path.join(ROOT, f);
const sum = (f) => createHash("sha1").update(readFileSync(abs(f))).digest("hex");

const run = () => {
  try {
    return { code: 0, out: execFileSync("node", [abs("scripts/check-screen-lists.mjs")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
};

const CASES = [
  {
    name: "1 REAL: a guard drops the Ranks tab (the state five guards shipped in)",
    file: "scripts/check-horizontal-overflow.mjs",
    edit: (s) => s.replace('["today", "routes", "discover", "crew", "logbook", "ranks", "me"]', '["today", "routes", "discover", "crew", "logbook", "me"]'),
    want: (r) => r.code === 1 && /check-horizontal-overflow[\s\S]*never walks ranks/.test(r.out),
  },
  {
    name: "2 REAL: a route sub-tab list walks a tab the route page does not have",
    file: "scripts/check-prose-in-token-boxes.mjs",
    edit: (s) => s.replace('["overview", "conditions", "planner", "safety", "photos", "partners"]', '["overview", "conditions", "planner", "safety", "photos", "ranks"]'),
    want: (r) => r.code === 1 && /token-boxes[\s\S]*walks ranks, which is not one of the route page/.test(r.out) && /never walks partners/.test(r.out),
  },
  {
    name: "3 the app's NAV cannot be found -> ANCHOR LOST, never ok",
    file: "ClimbMatch.jsx",
    edit: (s) => s.replace("NAV=[{id:\"today\"", "NAVX=[{id:\"today\""),
    want: (r) => r.code === 1 && /ANCHOR LOST/.test(r.out) && /Nothing below was checked/.test(r.out),
  },
  {
    name: "4 the route sub-tab bar cannot be found -> ANCHOR LOST, never ok",
    file: "RouteDetail.jsx",
    edit: (s) => s.replace('[["overview","Overview"]', '[["overviewX","Overview"]'),
    want: (r) => r.code === 1 && /ANCHOR LOST/.test(r.out),
  },
  {
    name: "5 SILENT: a complete list is correct work and must not be flagged",
    file: "scripts/check-outage.mjs",
    edit: (s) => s.replace('["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks", "Profile"]', '["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks",  "Profile"]'),
    want: (r) => r.code === 0,
  },
  {
    name: "6 a declared subset that has become COMPLETE is stale bookkeeping",
    file: "scripts/check-anniversary.mjs",
    edit: (s) => s.replace('tabs: ["me", "today", "crew", "logbook"]', 'tabs: ["me", "today", "crew", "logbook", "routes", "discover", "ranks"]'),
    want: (r) => r.code === 1 && /STALE PARTIAL_ON_PURPOSE[\s\S]*now COMPLETE/.test(r.out),
  },
  {
    name: "7a a declared subset that was EDITED must be re-justified, not silently inherited",
    file: "scripts/check-anniversary.mjs",
    edit: (s) => s.replace('tabs: ["me", "today", "crew", "logbook"]', 'tabs: ["me", "today", "crew"]'),
    want: (r) => r.code === 1 && /STALE PARTIAL_ON_PURPOSE[\s\S]*has CHANGED/.test(r.out),
  },
  {
    name: "7b a declared subset whose list is GONE is stale bookkeeping",
    file: "scripts/check-anniversary.mjs",
    edit: (s) => s.replace('tabs: ["me", "today", "crew", "logbook"]', 'tabs: ["me"]'),
    want: (r) => r.code === 1 && /STALE PARTIAL_ON_PURPOSE[\s\S]*has no nav-id list at all/.test(r.out),
  },
  {
    name: "8 SILENT: two tab names is below the threshold and is not a screen list",
    file: "scripts/check-fire.mjs",
    edit: (s) => 'const _unrelated = ["today", "routes"];\n' + s,
    want: (r) => r.code === 0,
  },
];

let bad = 0;
for (const c of CASES) {
  const before = readFileSync(abs(c.file), "utf8");
  const beforeSum = sum(c.file);
  const after = c.edit(before);
  if (after === before) { console.log(`MISS  ${c.name}\n        EDIT NEVER LANDED — the pattern did not match. The harness is wrong, not the guard.`); bad++; continue; }
  writeFileSync(abs(c.file), after);
  if (sum(c.file) === beforeSum) { console.log(`MISS  ${c.name}\n        EDIT NEVER LANDED (checksum unchanged)`); bad++; writeFileSync(abs(c.file), before); continue; }
  const r = run();
  writeFileSync(abs(c.file), before);
  if (sum(c.file) !== beforeSum) { console.log(`MISS  ${c.name}\n        RESTORE FAILED — ${c.file} is not byte-identical. Fix it by hand before continuing.`); bad++; continue; }
  const ok = c.want(r);
  if (!ok) bad++;
  console.log(`${ok ? "ok   " : "MISS "} ${c.name}`);
  if (!ok) console.log(`        exit=${r.code}\n        ${r.out.trim().split("\n").slice(0, 6).join("\n        ")}`);
}
console.log(`\n${CASES.length - bad}/${CASES.length} behaved as specified.`);
process.exit(bad ? 1 : 0);
