// WHICH USER ACTIONS SAY NOTHING?
//
// The repo guards the wrong-toast direction already -- check:writes catches a success message in
// front of an unobservable failure, check:claims catches a success toast for a write that only
// runs signed-in. Nothing asks the OPPOSITE question: which writes give no feedback at all?
//
// TWO BUGS IN THE FIRST DRAFT, both of which made it report far too little:
//   1. lib/db.js writes are imported UNDER ALIASES (`addComment as dbAddComment`), so scanning
//      for the raw name misses every real call site and matches only the import line.
//   2. `re.exec(src)` before `src.matchAll(re)` advances a global regex's lastIndex, silently
//      dropping the first match and mis-reporting positions.
// It found 36 sites across 69 writes. Distrust a first run.
//
// RESULT, 2026-08-14: NO GAPS. Every db write the user can trigger already reports success or
// failure. The count went 10 -> 7 -> 3 as each detector bug was fixed, and the final 3 were then
// READ INDIVIDUALLY and are all false positives. They are listed here as reasons, not passes --
// if one of them ever becomes real, the reason below stops matching and should be re-checked:
//
//   reconcileGuideVerification  lib/DbGuideDashboard.jsx  runs in a useEffect ON MOUNT, not from
//                               a user action. A toast there is noise, not feedback.
//   submitGuideApplication      lib/DbGuideApply.jsx      DOES notify -- ~35 lines below the
//                               call, outside the 700-char window, because the payload literal
//                               is long. Widening the window blindly would swallow real gaps.
//   submitContribution          ClimbMatchCore.jsx        has BOTH paths: .then -> setSent(true)
//                               and .catch -> setSaveErr("Couldn't submit that climb — ...").
//                               The vocabulary below simply did not know those two setter names.
//
// So the real feedback gap in this app was NOT in the write path -- see the sibling
// audit-clipboard-feedback.mjs, which found the float-plan Copy button.
//
// Read-only. Reports; writes nothing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx",
  ...fs.readdirSync(path.join(ROOT, "lib")).filter(f => /\.jsx?$/.test(f) && f !== "db.js").map(f => "lib/" + f)];

const db = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const WRITES = [...db.matchAll(/^export async function ([a-zA-Z0-9_]+)/gm)].map(m => m[1])
  .filter(n => !/^(fetch|get|count)/.test(n));
if (WRITES.length < 20) { console.error("REFUSING — parsed too few writes; the scan broke"); process.exit(1); }

// Resolve each file's LOCAL name for every write, following `x as y` aliases.
function localNames(src) {
  const map = new Map();                                  // localName -> canonical
  for (const imp of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'][^"']*db(?:\.js)?["']/g)) {
    for (const part of imp[1].split(",")) {
      const m = part.trim().match(/^([a-zA-Z0-9_]+)(?:\s+as\s+([a-zA-Z0-9_]+))?$/);
      if (!m) continue;
      const canonical = m[1], local = m[2] || m[1];
      if (WRITES.includes(canonical)) map.set(local, canonical);
    }
  }
  return map;
}

const FEEDBACK_SRC = "showToast|notify\\s*\\(|setToast|setErr|setError|setMsg|setMessage|setStatus|setSaved|setNotice|onClose\\s*\\(|setOpen\\s*\\(\\s*false|onDone|onSaved|onSuccess|alert\\s*\\(";
const FEEDBACK = new RegExp(FEEDBACK_SRC);
const WINDOW = 700;

// THIRD BUG, and the one that mattered most: feedback is often reached through a NAMED handler.
// `dbDeleteComment(id).then(cmRefetch).catch(cmFail)` looks silent, and `cmFail` is
// `function(){showToast("Could not save your comment — check your connection and retry")}`.
// Reporting that as a gap would send someone to add a toast that is already there — the
// "a guard that flags correct work teaches people to ignore it" failure. So collect every local
// identifier whose own definition contains feedback, and treat a reference to it as feedback.
function feedbackHelpers(src) {
  const names = new Set();
  for (const m of src.matchAll(/(?:const|let|var|function)\s+([a-zA-Z0-9_$]+)\s*=?\s*(?:=\s*)?(?:async\s*)?(?:function\s*)?\(/g)) {
    const body = src.slice(m.index, m.index + 500);
    if (FEEDBACK.test(body)) names.add(m[1]);
  }
  return names;
}

// SELF-TEST, and it is not optional. The expected result of this audit is "no gaps", which is
// exactly what a broken detector prints. So synthesise one source that IS silent and one that is
// not, and require the right verdict on each before any real file is read. Same discipline as
// check:overflow, whose self-test runs before it walks a single screen.
function scanSource(src) {
  const names = localNames(src);
  const helpers = feedbackHelpers(src);
  const helperRe = helpers.size ? new RegExp(`\\b(?:${[...helpers].join("|")})\\b`) : null;
  const out = { silent: [], loud: [] };
  for (const [local, canonical] of names) {
    for (const m of src.matchAll(new RegExp(`\\b${local}\\s*\\(`, "g"))) {
      const ls = src.lastIndexOf("\n", m.index) + 1, le = src.indexOf("\n", m.index);
      if (/^\s*import\b/.test(src.slice(ls, le < 0 ? src.length : le))) continue;
      const around = src.slice(Math.max(0, m.index - WINDOW), m.index + WINDOW);
      (FEEDBACK.test(around) || (helperRe && helperRe.test(around)) ? out.loud : out.silent)
        .push({ write: canonical, local, line: src.slice(0, m.index).split("\n").length });
    }
  }
  return out;
}
const IMPORT = `import { createCrew, deleteCrewRow as dbDeleteCrew } from "./lib/db.js";\n`;
const SILENT_FIXTURE = IMPORT + `const go = async () => { await createCrew({a:1}); refetch(); };\n`;
const LOUD_FIXTURE = IMPORT + `const go = async () => { try { await createCrew({a:1}); notify("Crew created."); } catch(e) { notify("Nope."); } };\n`;
const ALIAS_FIXTURE = IMPORT + `const go = async () => { await dbDeleteCrew(1); refetch(); };\n`;
const st1 = scanSource(SILENT_FIXTURE), st2 = scanSource(LOUD_FIXTURE), st3 = scanSource(ALIAS_FIXTURE);
const selftest = st1.silent.length === 1 && st2.silent.length === 0 && st2.loud.length === 1 && st3.silent.length === 1;
if (!selftest) {
  console.error("SELF-TEST FAILED — this detector cannot be trusted to report anything.");
  console.error(`  silent fixture: ${st1.silent.length} silent (want 1)`);
  console.error(`  loud fixture:   ${st2.silent.length} silent / ${st2.loud.length} loud (want 0 / 1)`);
  console.error(`  alias fixture:  ${st3.silent.length} silent (want 1) — proves aliases are followed`);
  process.exit(1);
}
console.log("self-test: ok — a silent write is caught, a notified one is not, aliases are followed\n");

let scanned = 0, totalSites = 0;
const silent = [], loudSet = new Set();
for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, "utf8");
  scanned++;
  const names = localNames(src);
  if (!names.size) continue;
  const helpers = feedbackHelpers(src);
  const helperRe = helpers.size ? new RegExp(`\\b(?:${[...helpers].join("|")})\\b`) : null;
  for (const [local, canonical] of names) {
    for (const m of src.matchAll(new RegExp(`\\b${local}\\s*\\(`, "g"))) {
      const lineStart = src.lastIndexOf("\n", m.index) + 1;
      const lineEnd = src.indexOf("\n", m.index);
      const line = src.slice(lineStart, lineEnd < 0 ? src.length : lineEnd);
      if (/^\s*import\b/.test(line)) continue;
      totalSites++;
      const around = src.slice(Math.max(0, m.index - WINDOW), m.index + WINDOW);
      if (FEEDBACK.test(around) || (helperRe && helperRe.test(around))) loudSet.add(canonical);
      else silent.push({ file: rel, write: canonical, local, line: src.slice(0, m.index).split("\n").length });
    }
  }
}
if (!scanned || !totalSites) { console.error("REFUSING — found no call sites; the scan broke"); process.exit(1); }

const byWrite = new Map();
for (const s of silent) { if (!byWrite.has(s.write)) byWrite.set(s.write, []); byWrite.get(s.write).push(s); }
const fullySilent = [...byWrite.entries()].filter(([w]) => !loudSet.has(w));
const partial = [...byWrite.entries()].filter(([w]) => loudSet.has(w));

console.log(`scanned ${scanned} files, ${WRITES.length} write functions, ${totalSites} call sites`);
console.log(`writes with feedback somewhere: ${loudSet.size}`);
console.log(`silent call sites:              ${silent.length}\n`);
console.log(`=== EVERY call site silent (${fullySilent.length}) — the real gaps ===\n`);
for (const [w, s] of fullySilent.sort((a, b) => a[0].localeCompare(b[0])))
  console.log(`  ${w.padEnd(26)} ${s.map(x => `${x.file}:${x.line}`).join(", ")}`);
console.log(`\n=== SOME call sites silent (${partial.length}) — inconsistency, not absence ===\n`);
for (const [w, s] of partial.sort((a, b) => b[1].length - a[1].length))
  console.log(`  ${w.padEnd(26)} ${s.length} silent at ${s.map(x => `${x.file}:${x.line}`).slice(0, 4).join(", ")}`);
