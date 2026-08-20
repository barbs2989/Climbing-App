// Injection harness for check:waypoint-placement. Its healthy output is "ok", which is exactly what
// a guard that renders nothing also prints — and this one bundles and renders, so it has plenty of
// ways to pass having measured nothing.
//
// Every case proves its edit LANDED BY CHECKSUM before judging the guard. That rule has earned
// itself repeatedly here: an edit that silently fails to apply reports as "guard missed" when the
// guard is innocent.
//
// Run: node scripts/oneoff/inject-waypoint-placement-cases.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../..", import.meta.url).pathname;
const FILES = { core: ROOT + "ClimbMatchCore.jsx", rd: ROOT + "RouteDetail.jsx" };
const ORIG = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, readFileSync(p, "utf8")]));
const sum = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "the honesty line is deleted — an unplaced pin looks identical to a placed one",
    file: "rd",
    edit: (s) => s.replace(/\{placed\?null:<div style=\{\{fontSize:11,color:C\.textMuted,marginTop:6,lineHeight:1\.45\}\}>No coordinate on file[^<]*<\/div>\}/, "{null}"),
    expect: "fail",
  },
  {
    name: "an UNPLACED row is made a control — a tap that pans the map to nothing",
    file: "rd",
    edit: (s) => s.replace("const act=(placed&&onFocus)?", "const act=(onFocus)?"),
    expect: "fail",
  },
  {
    name: "the tap hint renders with no placed waypoint — promises an impossible interaction",
    file: "rd",
    edit: (s) => s.replace("{(onFocus&&anyPlaced)?", "{(onFocus)?"),
    expect: "fail",
  },
  {
    name: "wpPlaced stops checking lng — the eight-site bug restored",
    file: "core",
    edit: (s) => s.replace(/export function wpPlaced\(w\)\{[^\n]*\n/, "export function wpPlaced(w){return !!w&&w.lat!=null;}\n"),
    expect: "fail",
  },
  {
    name: "wpPlaced accepts the empty string — the Gulf of Guinea case",
    file: "core",
    edit: (s) => s.replace('la===""||ln===""', "false"),
    expect: "fail",
  },
  {
    name: "GPXMap re-inlines a bare lat-null test alongside the helper",
    file: "core",
    edit: (s) => s.replace("const wpPts=(waypoints||[]).filter(w=>wpPlaced(w));", "const wpPts=(waypoints||[]).filter(w=>w&&w.lat!=null);"),
    expect: "fail",
  },
  {
    name: "untouched source must PASS — the harness must not be what turns it red",
    file: "core",
    edit: (s) => s,
    expect: "pass",
  },
];

let bad = 0;
for (const c of CASES) {
  const path = FILES[c.file];
  const patched = c.edit(ORIG[c.file]);
  const landed = c.name.startsWith("untouched") ? true : sum(patched) !== sum(ORIG[c.file]);
  if (!landed) { console.log(`\n[MISS] ${c.name}\n   EDIT NEVER LANDED — the pattern did not match. Fix the case, do not doubt the guard.`); bad++; continue; }
  writeFileSync(path, patched);
  let out = "", code = 0;
  try { out = execFileSync("node", [ROOT + "scripts/check-waypoint-placement.mjs"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ""}${e.stderr || ""}`; }
  finally { writeFileSync(path, ORIG[c.file]); }

  const got = code !== 0 ? "fail" : "pass";
  const ok = got === c.expect;
  if (!ok) bad++;
  console.log(`\n[${ok ? "OK " : "MISS"}] ${c.name}`);
  console.log(`   edit landed: ${landed}   expected ${c.expect}, got ${got}`);
  const line = out.split("\n").find((l) => l.startsWith("FAIL —"));
  if (line) console.log(`   ${line.trim().slice(0, 170)}`);
}
/* Restore every file regardless of how we exited, then prove the tree is byte-identical. A harness
   that leaves an injection behind is worse than no harness. */
for (const [k, p] of Object.entries(FILES)) writeFileSync(p, ORIG[k]);
for (const [k, p] of Object.entries(FILES)) if (sum(readFileSync(p, "utf8")) !== sum(ORIG[k])) { console.error(`RESTORE FAILED for ${k}`); bad++; }
console.log(`\n${CASES.length - bad}/${CASES.length} cases behaved as expected; sources restored.`);
process.exit(bad ? 1 : 0);
