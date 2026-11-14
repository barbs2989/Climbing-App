// Cases for the cross-screen count check wired into check:ui.
//
// Its healthy output is silence, which is also what a checker whose regexes stopped matching
// prints. These drive `checkScreenCounts` over REAL captured snapshots — no browser, no dev
// server — so they run in seconds and can be re-run on any machine.
//
// CASE 2 IS NOT SYNTHETIC. It is the actual browser capture from before #1203, in which the
// Profile said "3 active" and the Logbook said "4 climbs to go". Reproducing a defect that really
// happened, from a real recording, is stronger evidence than an injected one — the same standard
// check:rls case 1 and check:token-boxes case 0 are held to.
//
//   node scripts/oneoff/inject-screen-count-cases.mjs [beforeSnapshot afterSnapshot]
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkScreenCounts } from "../lib/screen-counts.mjs";

const [beforePath, afterPath] = process.argv.slice(2);
// The two recordings used to be hard-coded to one machine's job tmp dir, so nobody else could run
// this. The AFTER capture is now taken here, from the current app, when no path is given (about two
// minutes: it is the same walk as `npm run check:ui`). The BEFORE recording of the #1203 defect was
// never committed and cannot be re-taken from today's code, so without one the case rebuilds that
// exact shape (Profile "3 active" against Logbook "4 climbs to go") from the fresh capture.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let AFTER = afterPath;
if (!AFTER) {
  AFTER = path.join(mkdtempSync(path.join(tmpdir(), "screen-count-")), "ui.json");
  console.log("no snapshot given -- capturing one with check:ui (takes a couple of minutes)...");
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check-ui.mjs"), "--snapshot", AFTER], { cwd: ROOT, encoding: "utf8" });
  if (!existsSync(AFTER)) { console.error("check:ui wrote no snapshot, so there is nothing to measure:\n" + (r.stdout || "").slice(-600) + (r.stderr || "")); process.exit(1); }
}
const BEFORE = beforePath || null;
for (const p of [BEFORE, AFTER]) if (p && !existsSync(p)) {
  console.error(`missing snapshot ${p}\nRe-create with: npm run check:ui -- --snapshot <file>`);
  process.exit(1);
}
const after = JSON.parse(readFileSync(AFTER, "utf8"));
if (!after.Logbook || !after["Profile:Activity"]) { console.error("the AFTER snapshot lacks Logbook/Profile:Activity — wrong file?"); process.exit(1); }

const clone = o => JSON.parse(JSON.stringify(o));
const before = BEFORE ? JSON.parse(readFileSync(BEFORE, "utf8"))
  : (() => { const s = clone(after); s["Profile:Activity"] = s["Profile:Activity"].replace(/My objectives\n(\d+) active/, "My objectives\n3 active"); return s; })();
const run = s => checkScreenCounts(s);
const kinds = r => r.map(x => x.kind).join(",");

const CASES = [
  { name: "a clean capture stays silent",
    build: () => after, want: r => r.length === 0 },

  { name: BEFORE ? "the REAL #1203 defect (captured, not injected)" : "the #1203 defect shape (Profile 3 active vs Logbook 4 to go; rebuilt, no recording given)",
    build: () => before,
    want: r => r.some(x => x.kind === "disagree" && x.group === "objectives" && /climbs to go=4.*active=3/s.test(x.msg)) },

  { name: "a CUSTOM LIST badge is not mistaken for the objectives one",
    build: () => { const s = clone(after); s.Logbook = s.Logbook.replace(/1 climb to go/, "9 climbs to go"); return s; },
    want: r => r.length === 0 },

  { name: "the objectives heading moved -> NOT COMPARED, never silent",
    build: () => { const s = clone(after); s.Logbook = s.Logbook.replace("MY OBJECTIVES", "MY GOALS"); return s; },
    want: r => r.some(x => x.kind === "unmeasured" && x.group === "objectives") },

  { name: "a screen was never captured -> NOT COMPARED, never silent",
    build: () => { const s = clone(after); delete s["Profile:Activity"]; return s; },
    want: r => r.some(x => x.kind === "unmeasured" && x.group === "objectives") },

  { name: "two counts of the friends list disagreeing on one screen",
    build: () => { const s = clone(after); s["Crew:Friends"] = s["Crew:Friends"].replace("See all friends (2)", "See all friends (5)"); return s; },
    want: r => r.some(x => x.group === "friends" && x.kind === "disagree") },
];

let bad = 0;
for (const c of CASES) {
  let r;
  try { r = run(c.build()); } catch (e) { r = [{ kind: "threw", group: "-", msg: e.message }]; }
  const ok = c.want(r);
  if (!ok) bad++;
  console.log(`${ok ? "ok   " : "MISS "} ${c.name}`);
  if (!ok) console.log(`        got [${kinds(r) || "silence"}]: ` + (r[0] ? r[0].msg.slice(0, 150) : "nothing reported"));
}
console.log(`\n${CASES.length - bad}/${CASES.length} behaved as specified.`);
process.exit(bad ? 1 : 0);
