#!/usr/bin/env node
// Injection harness for check:alpine-conditions.
//
// Its healthy output is "each discipline reads its own conditions", which is what a guard that has
// stopped looking prints too. Each case puts back one way the alpine Conditions tab could tell a
// climber the wrong thing, proves the edit LANDED by checksum, runs the guard, and restores every
// file byte-identically. Judged on the guard's own FAIL lines (an injection that trips a different
// assertion is not a catch), and an expectation already present in the clean run is refused.
//   1  the refreeze flag on a snow-free scramble (glacier logic where it means the opposite)
//   2  a start that forgets the way DOWN (the owner's "going down is more dangerous")
//   3  a start counted back from a Planner FLOOR (too late, the dangerous direction)
//   4  roadside waterfall ice read as alpine ice (a start time and softening where neither exist)
//   5  a thunder deadline that ignores noon
//   6  the tab gate reverted to crags only
//   7  the weather panel back on Safety for alpine routes
//   8  a flag that hard-codes mph (check:units' failure, on this card)
//   9  a failed forecast that no longer says it is not a reading
//   10 SILENT: a reworded "what a forecast cannot see" line keeps its claim
//
// DO NOT COMMIT WHILE THIS RUNS — it edits the app source in place (#1190).
import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "RouteDetail.jsx");
const LOGIC = path.join(ROOT, "lib", "alpineConditions.js");
const CARD = path.join(ROOT, "lib", "AlpineConditionsCard.jsx");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

const CASES = [
  { name: "1. a snow-free scramble gets the glacier's refreeze logic", file: LOGIC,
    find: "  if (snowLegs && ctx.snowFt != null) {", repl: "  if (ctx.snowFt != null) {",
    expect: "fail", expectText: "a snow-free scramble gets NO refreeze" },
  { name: "2. the start forgets the way down", file: LOGIC,
    find: "const need = L.fromCamp ? L.up * (1 + LIMITS.descentShareOfPush) : L.up + (L.down || 0);", repl: "const need = L.up;",
    expect: "fail", expectText: "start = softening - (6 h up + 4 h down)" },
  { name: "3. a start is counted back from a Planner floor", file: LOGIC,
    find: "if (L && !L.floor && L.up != null) {", repl: "if (L && L.up != null) {",
    expect: "fail", expectText: "only a FLOOR gives NO start" },
  { name: "4. roadside waterfall ice is read as alpine ice", file: LOGIC,
    find: "if (d === \"ice\") return (/\\bAI\\s*\\d/i.test(g) || snowInGrade || isPeak(route)) ? \"alpineice\" : \"waterfall\";", repl: "if (d === \"ice\") return \"alpineice\";",
    expect: "fail", expectText: "roadside WI4 on a crag is WATERFALL ice" },
  { name: "5. the thunder deadline ignores noon", file: LOGIC,
    find: "const noon = noonOf(fc, day), off = Math.min(noon, thunder.at);", repl: "const noon = noonOf(fc, day), off = thunder.at;",
    expect: "fail", expectText: "off the summit by NOON" },
  { name: "6. the Conditions tab is gated to crags again",
    find: "x[0]===\"forecast\"?(showScore||showAlpineCond):true", repl: "x[0]===\"forecast\"?showScore:true",
    expect: "fail", expectText: "the Conditions tab is offered and its card mounts" },
  { name: "7. the weather panel is back on Safety for alpine routes",
    find: "{showScore||showAlpineCond?null:wxEl()}", repl: "{showScore?null:wxEl()}",
    expect: "fail", expectText: "the weather panel left Safety" },
  { name: "8. a flag hard-codes mph", file: CARD,
    find: "case \"wind\": return \"Summit gusts to \" + uWind(v.gust);", repl: "case \"wind\": return \"Summit gusts to \" + Math.round(v.gust) + \" mph\";",
    expect: "fail", expectText: "in metric units only" },
  { name: "9. a failed forecast no longer says it is not a reading", file: CARD,
    find: "Couldn’t load the forecast, so no flags are shown. This is not a reading of the conditions.", repl: "Couldn’t load the forecast.",
    expect: "fail", expectText: "a failed forecast shows NO flags" },
  { name: "10. SILENT: the glacier's blind-spot line is reworded, claim intact", file: CARD,
    find: "glacier: \"A forecast can’t see whether bridges are open or a boot track is in — check recent reports.\",", repl: "glacier: \"A forecast can’t see whether bridges are open or a boot track is in — read the latest reports.\",",
    expect: "pass" },
];

const SNAP = new Map([FILE, LOGIC, CARD].map((f) => [f, fs.readFileSync(f, "utf8")]));
const restoreAll = () => { for (const pair of SNAP) fs.writeFileSync(pair[0], pair[1]); };
const treeOk = () => [...SNAP].every((pair) => sum(fs.readFileSync(pair[0], "utf8")) === sum(pair[1]));
let bad = 0;

function run() {
  try { return { status: "pass", out: execFileSync("node", [path.join(ROOT, "scripts", "check-alpine-conditions.mjs")], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; }
  catch (e) { return { status: "fail", out: String((e && e.stdout) || "") + String((e && e.stderr) || "") }; }
}

const clean = run();
if (clean.status !== "pass") { console.log("  BROKEN  check:alpine-conditions does not pass on a clean tree"); process.exit(1); }
console.log("  ok      clean tree: check:alpine-conditions passes");
for (const c of CASES) if (c.expectText && clean.out.split("\n").some((l) => l.indexOf("  FAIL") === 0 && l.includes(c.expectText))) { console.log(`  BROKEN  ${c.name}: its expectation already FAILS on the clean run`); bad++; }

for (const c of CASES) {
  const target = c.file || FILE, origin = SNAP.get(target);
  if (!origin.includes(c.find)) { console.log(`  BROKEN  ${c.name}: anchor not found — re-anchor this case`); bad++; continue; }
  fs.writeFileSync(target, origin.replace(c.find, c.repl));
  const landed = sum(fs.readFileSync(target, "utf8")) !== sum(origin);
  let got;
  try { got = run(); } finally { restoreAll(); }
  if (!treeOk()) { console.log("  BROKEN  TREE NOT RESTORED — a file did not come back byte-identically"); process.exit(1); }
  if (!landed) { console.log(`  BROKEN  ${c.name}: edit never landed`); bad++; continue; }
  if (got.status !== c.expect) { console.log(`  MISS    ${c.name} — guard ${got.status}ed, expected ${c.expect}`); bad++; continue; }
  if (c.expectText && !got.out.split("\n").filter((l) => l.indexOf("  FAIL") === 0).some((l) => l.includes(c.expectText))) { console.log(`  WRONG FAILURE  ${c.name} — the guard failed, but on a different assertion than this case names`); bad++; continue; }
  console.log(`  ok      ${c.name} — guard ${got.status === "fail" ? "CAUGHT it" : "stayed quiet"}`);
}
console.log("");
console.log(bad ? `${bad} problem(s) — check:alpine-conditions is not proven.` : `ok — ${CASES.length}/${CASES.length}, and every file is byte-identical to where it started.`);
process.exit(bad ? 1 : 0);
