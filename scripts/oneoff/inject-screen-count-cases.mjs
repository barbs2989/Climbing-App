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
import { readFileSync, existsSync } from "node:fs";
import { checkScreenCounts } from "../lib/screen-counts.mjs";

const [beforePath, afterPath] = process.argv.slice(2);
const BEFORE = beforePath || "/Users/nathanbarber/.claude/jobs/30bb9906/tmp/ui-ground.json";
const AFTER = afterPath || "/Users/nathanbarber/.claude/jobs/30bb9906/tmp/ui2.json";
for (const p of [BEFORE, AFTER]) if (!existsSync(p)) {
  console.error(`missing snapshot ${p}\nRe-create with: npm run check:ui -- --snapshot <file>`);
  process.exit(1);
}
const before = JSON.parse(readFileSync(BEFORE, "utf8"));
const after = JSON.parse(readFileSync(AFTER, "utf8"));
if (!after.Logbook || !after.Profile) { console.error("the AFTER snapshot lacks Logbook/Profile — wrong file?"); process.exit(1); }

const clone = o => JSON.parse(JSON.stringify(o));
const run = s => checkScreenCounts(s);
const kinds = r => r.map(x => x.kind).join(",");

const CASES = [
  { name: "a clean capture stays silent",
    build: () => after, want: r => r.length === 0 },

  { name: "the REAL #1203 defect (captured, not injected)",
    build: () => before,
    want: r => r.some(x => x.kind === "disagree" && x.group === "objectives" && /climbs to go=4.*active=3/s.test(x.msg)) },

  { name: "a CUSTOM LIST badge is not mistaken for the objectives one",
    build: () => { const s = clone(after); s.Logbook = s.Logbook.replace(/1 climb to go/, "9 climbs to go"); return s; },
    want: r => r.length === 0 },

  { name: "the objectives heading moved -> NOT COMPARED, never silent",
    build: () => { const s = clone(after); s.Logbook = s.Logbook.replace("MY OBJECTIVES", "MY GOALS"); return s; },
    want: r => r.some(x => x.kind === "unmeasured" && x.group === "objectives") },

  { name: "a screen was never captured -> NOT COMPARED, never silent",
    build: () => { const s = clone(after); delete s.Profile; return s; },
    want: r => r.some(x => x.kind === "unmeasured" && x.group === "objectives") },

  { name: "a total smaller than its own unfinished part",
    build: () => { const s = clone(after); s.Home = s.Home.replace(/My objectives\n4 routes/, "My objectives\n1 route"); return s; },
    want: r => r.some(x => x.kind === "disagree" && /LESS than/.test(x.msg)) },

  { name: "two counts of the friends list disagreeing on one screen",
    build: () => { const s = clone(after); s["Crew:Friends"] = s["Crew:Friends"].replace("See all (2)", "See all (5)"); return s; },
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
