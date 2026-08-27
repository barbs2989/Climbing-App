#!/usr/bin/env node
// Injection harness for check:seed-only-surfaces.
//
// Every case proves its edit LANDED by checksum before the guard is believed — an edit that
// silently matched nothing reports as "guard missed" and sends you editing a correct file.
// Files are restored byte-identically and the restore is asserted.
//
// Cases 5 and 6 must stay SILENT. A guard that fires on a component rendered on BOTH paths
// would be telling authors to un-wire live code, which is the direction that teaches people
// to ignore it.
import fs from "fs";
import crypto from "crypto";
import { execFileSync } from "child_process";

const APP = "ClimbMatch.jsx", CORE = "ClimbMatchCore.jsx";
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 10);

// anchors, each asserted to occur exactly once
const SEED_ANCHOR = "{!USE_DB&&<>";
const LIVE_ANCHOR = "<DbAreaBrowser";
const AL_INNER = "Latest from this area</div>";
const CORE_TAIL = "\nfunction InjA(){return null;}\nfunction InjB(){return null;}\nfunction InjC(){return null;}\n";

const CASES = [
  { name: "1-undeclared-in-seed-branch", expect: "fail", want: /InjA/,
    edits: [[APP, SEED_ANCHOR, SEED_ANCHOR + "<InjA/>"], [CORE, null, CORE_TAIL]] },
  { name: "2-declared-but-now-live", expect: "fail", want: /AreaLatest.*now reachable on the live path/s,
    edits: [[APP, LIVE_ANCHOR, "<AreaLatest area={null}/>" + LIVE_ANCHOR]] },
  { name: "3-declared-but-deleted", expect: "fail", want: /AreaLatest is declared seed-only and no longer exists/,
    edits: [[CORE, "function AreaLatest({area,onOpenReport})", "function AreaLatestRenamed({area,onOpenReport})"],
            [CORE, ",AreaLatest,", ",AreaLatestRenamed,"]] },
  { name: "4-anchor-lost", expect: "fail", want: /ANCHOR LOST/,
    edits: [[APP, SEED_ANCHOR, "{!USE_DB_RENAMED&&<>"]] },
  { name: "5-transitive-through-a-seed-only-host", expect: "fail", want: /InjB/,
    edits: [[CORE, AL_INNER, AL_INNER + "<InjB/>"], [CORE, null, CORE_TAIL]] },
  { name: "6-rendered-on-BOTH-paths-must-stay-silent", expect: "pass", want: null,
    edits: [[APP, SEED_ANCHOR, SEED_ANCHOR + "<InjC/>"],
            [APP, LIVE_ANCHOR, "<InjC/>" + LIVE_ANCHOR], [CORE, null, CORE_TAIL]] },
];

let pass = 0, fails = [];
for (const c of CASES) {
  const originals = new Map();
  for (const [f] of c.edits) if (!originals.has(f)) originals.set(f, fs.readFileSync(f, "utf8"));
  const before = new Map([...originals.keys()].map((f) => [f, sum(f)]));
  let landed = true;
  try {
    for (const [f, find, repl] of c.edits) {
      const cur = fs.readFileSync(f, "utf8");
      if (find === null) { fs.writeFileSync(f, cur + repl); continue; }
      const n = cur.split(find).length - 1;
      if (n !== 1) { landed = false; fails.push(`${c.name}: anchor ${JSON.stringify(find.slice(0,40))} matched ${n}x in ${f}`); break; }
      fs.writeFileSync(f, cur.replace(find, repl));
    }
    if (landed) {
      const moved = [...before.keys()].every((f) => sum(f) !== before.get(f));
      if (!moved) { landed = false; fails.push(`${c.name}: EDIT NEVER LANDED (checksum unchanged)`); }
    }
    if (landed) {
      let out = "", code = 0;
      try { out = execFileSync("node", ["scripts/check-seed-only-surfaces.mjs"], { encoding: "utf8" }); }
      catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status || 1; }
      const fired = code !== 0;
      const okExpect = c.expect === "fail" ? fired : !fired;
      const okWant = !c.want || c.want.test(out);
      if (okExpect && okWant) { console.log(`  CAUGHT  ${c.name}`); pass++; }
      else fails.push(`${c.name}: expected ${c.expect}, got ${fired ? "fail" : "pass"}${okWant ? "" : " (message did not name the defect)"}\n${out.split("\n").filter(l=>/FAIL|ANCHOR|ok —/.test(l)).slice(0,4).join("\n")}`);
    }
  } finally {
    for (const [f, src] of originals) fs.writeFileSync(f, src);
    for (const f of before.keys()) if (sum(f) !== before.get(f)) fails.push(`${c.name}: RESTORE FAILED for ${f}`);
  }
}
console.log(`\n${pass}/${CASES.length} cases behaved as specified.`);
if (fails.length) { console.log("\n" + fails.join("\n")); process.exit(1); }
