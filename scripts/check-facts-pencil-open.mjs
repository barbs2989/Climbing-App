#!/usr/bin/env node
// check:facts-pencil-open — one locked field must not lock the empty fields beside it.
//
// THE BREAK (owner, 2026-11-11): on every crag route the ROUTE FACTS card's pencil opened the FLAG
// sheet, never the editor, while Location and Pitches on that same card read "Not on file yet". The
// card pencil called openFix("grade"), a crag route's grade is always HIGH (0406), and openFix sends
// a HIGH field's pencil to the flag sheet. The card heading said "High · locked" too, because
// HEAD_KEYS mapped "ROUTE FACTS" / "TECHNICAL STATS" to grade. The database was never the problem: it
// locks per field and an empty field is LOW (_route_field_level_for), so it would take the edit.
//
// What this holds:
//   1. lib/firstEditable.js — a pencil covering several fields opens at an empty field first, then a
//      medium one, never at a locked one while an open one exists, and never at a key the level map
//      does not carry; all-locked returns the first key (that pencil then opens the flag sheet).
//   2. RouteDetail.jsx — the facts card's no-field pencil goes through factsPencilKey/firstEditable,
//      not a bare "grade" fallback.
//   3. CragFactSection.tsx — a section's pencil picks its field through firstEditable.
//   4. lib/confidence.jsx — "ROUTE FACTS" and "TECHNICAL STATS" are not in HEAD_KEYS.
//   5. TechStats.tsx — the grade carries its own ConfChip, so the lock is still SHOWN on the grade.
// Each source check is run against the pre-fix text too (the injection suite below) and must fail it.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { firstEditable } from "../lib/firstEditable.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");
const fails = [];
const fail = (m) => fails.push(m);
const eq = (got, want, what) => { if (got !== want) fail(`firstEditable ${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };

// 1. Behaviour.
const crag = { grade: "high", location: "low", pitchCount: "low", length: "medium", bolts: "high" };
eq(firstEditable(crag, ["grade", "location", "pitchCount"]), "location", "grade locked, location empty");
eq(firstEditable(crag, ["grade", "bolts", "length", "pitchCount"]), "pitchCount", "prefers an empty field over a medium one");
eq(firstEditable(crag, ["grade", "bolts", "length"]), "length", "a medium field when nothing is empty");
eq(firstEditable(crag, ["grade", "bolts"]), "grade", "all locked returns the first key");
eq(firstEditable(crag, ["grade", "notAFormKey", "bolts"]), "grade", "an unknown key is never chosen as open");
eq(firstEditable(null, ["location", "grade"]), "location", "no levels loaded returns the first key");
eq(firstEditable(crag, [null, undefined, "", "location"]), "location", "empty keys are skipped");
eq(firstEditable(crag, []), null, "no keys");

// 2-5. Source.
const SRC = {
  rd: read("RouteDetail.jsx"),
  sec: read("src/components/CragFactSection.tsx"),
  conf: read("lib/confidence.jsx"),
  ts: read("src/components/TechStats.tsx"),
};
function sourceFindings(s) {
  const out = [];
  if (/openFix\(typeof f==="string"\?f:"grade"\)/.test(s.rd)) out.push("RouteDetail.jsx: the facts card pencil falls back to openFix(\"grade\"), so a locked grade sends the whole card to the flag sheet");
  if (!/const factsPencilKey=function\(\)\{[^}]*firstEditable\(/.test(s.rd)) out.push("RouteDetail.jsx: factsPencilKey no longer picks its field through firstEditable");
  if (!/openFix\(typeof f==="string"\?f:factsPencilKey\(\)\)/.test(s.rd)) out.push("RouteDetail.jsx: the facts card pencil does not call factsPencilKey()");
  if (!/firstEditable\(/.test(s.sec)) out.push("CragFactSection.tsx: the section pencil does not pick its field through firstEditable");
  const hk = (s.conf.match(/export const HEAD_KEYS = \{([\s\S]*?)\n\};/) || [])[1];
  if (hk == null) out.push("lib/confidence.jsx: HEAD_KEYS not found");
  else {
    const live = hk.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const h of ["ROUTE FACTS", "TECHNICAL STATS"]) if (live.includes(`"${h}"`)) out.push(`lib/confidence.jsx: HEAD_KEYS maps "${h}" again, so the card heading wears the grade's lock`);
  }
  if (!/<ConfChip level=\{_gradeLv\}/.test(s.ts)) out.push("TechStats.tsx: the grade no longer carries its own ConfChip, so a locked grade is not shown as locked");
  return out;
}
sourceFindings(SRC).forEach(fail);

// Injection: each mutation is the pre-fix shape and must be caught.
const INJECT = [
  ["card pencil back to grade", (s) => ({ ...s, rd: s.rd.split("f:factsPencilKey()").join("f:\"grade\"") })],
  ["section pencil without firstEditable", (s) => ({ ...s, sec: s.sec.replace(/firstEditable/g, "firstRow") })],
  ["ROUTE FACTS back in HEAD_KEYS", (s) => ({ ...s, conf: s.conf.replace("export const HEAD_KEYS = {", "export const HEAD_KEYS = {\n  \"ROUTE FACTS\": \"grade\",") })],
  ["grade chip removed", (s) => ({ ...s, ts: s.ts.replace("<ConfChip level={_gradeLv}", "<span data-x={_gradeLv}") })],
];
for (const [name, mut] of INJECT) {
  const m = mut(SRC);
  if (JSON.stringify(m) === JSON.stringify(SRC)) { fail(`injection "${name}" changed nothing — its anchor is stale`); continue; }
  if (!sourceFindings(m).length) fail(`injection "${name}" was NOT caught`);
}

if (fails.length) {
  console.error("check:facts-pencil-open FAILED:\n  - " + fails.join("\n  - "));
  process.exit(1);
}
console.log(`check:facts-pencil-open: ok — firstEditable behaves (8 cases), the facts card and section pencils open at an open field, the grade carries its own lock, and ${INJECT.length}/${INJECT.length} injections caught`);
