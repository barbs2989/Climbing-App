// Injection harness for audit:road-coverage's self-test. The audit's headline COPY number is ZERO,
// which is exactly what a broken finder prints — so the self-test is the only thing standing
// between "nothing is copyable" and "nothing was measured". A self-test that has never gone red is
// a self-test you do not have.
//
// Each case proves its edit LANDED BY CHECKSUM before judging the guard. That rule earned itself
// repeatedly in this repo: an edit that silently fails to apply reports as "guard missed" when the
// guard is innocent.
//
// Run: node scripts/oneoff/inject-road-coverage-selftest-cases.mjs
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const SRC = new URL("../audit-road-coverage.mjs", import.meta.url).pathname;
const TMP = new URL("../audit-road-coverage.__inject.mjs", import.meta.url).pathname;
const original = readFileSync(SRC, "utf8");
const sum = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "roadIds returns nothing — every route reports 0 matching, i.e. a false 'nothing is copyable'",
    edit: (s) => s.replace("function roadIds(text) {\n  const out = new Set();", "function roadIds(text) {\n  const out = new Set(); return out;"),
    expect: "fail",
  },
  {
    name: "generic stop-list emptied — 'road' matches every road name, a vacuous WIDE match",
    edit: (s) => s.replace(/const GENERIC = new Set\(\[[^\]]*\]\);/, "const GENERIC = new Set([]);"),
    expect: "fail",
  },
  {
    name: "donor scope widened past the area — a Stevens Pass block reaches a Tumwater route",
    edit: (s) => s.replace("const donorsFor = (r) => (byArea[r.area_id] || []).filter((s) => s.id !== r.id && has(s.road));",
      "const donorsFor = (r) => all.filter((s) => s.id !== r.id && has(s.road));"),
    expect: "fail",
  },
  {
    name: "place stop-list emptied — a shared colour word becomes a place identity",
    edit: (s) => s.replace(/const PLACE_GENERIC = new Set\(\[[^\]]*\]\);/, "const PLACE_GENERIC = new Set([]);"),
    expect: "fail",
  },
  {
    name: "placeIds returns nothing — the five trailhead-named copies fall back to RESEARCH",
    edit: (s) => s.replace("function placeIds(text) {\n  const out = new Set();", "function placeIds(text) {\n  const out = new Set(); return out;"),
    expect: "fail",
  },
  {
    name: "the walk gate removed — the audit drifts back toward the 1,371 it exists to replace",
    edit: (s) => s.replace("    if (!walks(r) || !roadSilent(r)) continue;", "    if (!roadSilent(r)) continue;"),
    expect: "fail",
  },
  {
    name: "untouched source must PASS — the harness itself must not be what turns it red",
    edit: (s) => s,
    expect: "pass",
  },
];

let bad = 0;
for (const c of CASES) {
  const patched = c.edit(original);
  const landed = c.name.startsWith("untouched") ? true : sum(patched) !== sum(original);
  if (!landed) { console.log(`\n[${c.name}]\n   EDIT NEVER LANDED — the pattern did not match. Fix the case, do not doubt the guard.`); bad++; continue; }
  writeFileSync(TMP, patched);
  let out = "", code = 0;
  try { out = execFileSync("node", [TMP], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ""}${e.stderr || ""}`; }
  finally { try { unlinkSync(TMP); } catch {} }

  const red = code !== 0 && /SELF-TEST FAIL|Refusing to report/.test(out);
  const got = red ? "fail" : "pass";
  const ok = got === c.expect;
  if (!ok) bad++;
  console.log(`\n[${ok ? "OK " : "MISS"}] ${c.name}`);
  console.log(`   edit landed: ${landed}   expected ${c.expect}, got ${got}`);
  const line = out.split("\n").find((l) => /SELF-TEST FAIL/.test(l));
  if (line) console.log(`   ${line.trim()}`);
}
console.log(`\n${CASES.length - bad}/${CASES.length} cases behaved as expected.`);
process.exit(bad ? 1 : 0);
