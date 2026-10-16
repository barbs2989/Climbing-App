/* Does the partner-browse row EVER show a match percentage for a real climber?
 *
 * RealClimberRow computes `_unk = compatUnknown(ME, _cand)` and renders
 *
 *     _unk >= 3 ? <a refusal>   // read from source; it USED to say "New profile — …yet"
 *               : _pct + "% match" + (_unk ? " · based on limited info" : "")
 *
 * ...where `_cand` is the row's OWN projection of the profile row. compatUnknown counts four
 * unknown signals: disciplines, objectives, pace, availability. So the question is not about the
 * climber at all — it is about which of those four `_cand` can carry.
 *
 * Report-only. No browser, no database: `_cand`'s object literal is lifted from the source and
 * EXECUTED, because a hand-typed copy would agree with itself whatever the row does, which is the
 * whole question.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
const core = strip(fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8"));

let bad = 0;
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

// ---- lift RealClimberRow, then its _cand literal
const i = core.indexOf("function RealClimberRow");
const j = core.indexOf("\nfunction ", i + 10);
const row = i < 0 ? "" : core.slice(i, j < 0 ? core.length : j);
if (row.length < 400) { fail("ANCHOR LOST: RealClimberRow could not be lifted"); process.exit(1); }

const candSrc = (row.match(/var _cand=\{([\s\S]*?)\};/) || [])[1];
if (!candSrc) { fail("ANCHOR LOST: _cand's object literal could not be lifted"); process.exit(1); }
const buildCand = new Function("p", "return {" + candSrc + "};");

// The sentence the row actually renders, LIFTED rather than restated — a copy would go stale the
// day somebody reworded it and this script would then report a screen nobody sees.
const refusalM = row.match(/_unk>=3\?<div[^>]*>([^<]{0,200})</);
if (refusalM === null) { fail("ANCHOR LOST: the refusal branch's text could not be lifted"); process.exit(1); }
const REFUSAL = refusalM[1];

// ---- bundle core so compatUnknown/compat are the REAL ones
const out = path.join(ROOT, ".tmp-browse-row-" + process.pid);
fs.mkdirSync(out, { recursive: true });
const entry = path.join(out, "entry.jsx");
fs.writeFileSync(entry, 'export { compatUnknown, compat } from "' + path.join(ROOT, "ClimbMatchCore.jsx") + '";\n');
const bundle = path.join(out, "core.mjs");
execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node",
  "--jsx=automatic", "--loader:.jsx=jsx", "--external:react", "--external:react-dom",
  "--external:@tanstack/react-query", "--define:import.meta.env={}", "--outfile=" + bundle],
  { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"] });
const { compatUnknown, compat } = await import("file://" + bundle);
fs.rmSync(out, { recursive: true, force: true });

// ---- the four signals compatUnknown counts, and whether _cand can carry each
console.log("\nWHAT _cand CARRIES (executed, not read):");
const rich = {
  id: "3f2a91cc-0000-4000-8000-000000000001", name: "Robin Belay", username: "robinb",
  show_name: true, resume_public: true, avatar: null, bio: "b", location: "Salt Lake City, UT",
  disciplines: ["sport", "trad", "alpine"], sport_grade: "5.11a", trad_grade: "5.10a",
  boulder_grade: "V4",
  // fields a maximally-complete profile row could plausibly carry:
  availability: ["weekends", "weekday_am"], hikingSpeedFtHr: 1200, objectiveIds: ["a", "b"],
};
const cand = buildCand(rich);
for (const k of ["disciplines", "objectiveIds", "hikingSpeedFtHr", "availability"]) {
  const v = cand[k];
  const carried = Array.isArray(v) ? v.length > 0 : v != null && v !== 0;
  console.log(`  ${k.padEnd(18)} ${carried ? "carried" : "DROPPED"}  ${JSON.stringify(v)}`);
}

// ---- a maximally-shared ME, so nothing is unknown on our side either
const ME = {
  id: 0, name: "Me", disciplines: ["sport", "trad", "alpine"], objectiveIds: ["a", "b"],
  hikingSpeedFtHr: 1200, availability: ["weekends", "weekday_am"],
  sportGrade: "5.11a", tradGrade: "5.10a", boulderGrade: "V4",
};

console.log("\nWHAT THE ROW RENDERS, over profile rows of increasing completeness:");
const rows = [
  ["bare (name only)", { id: "u", name: "A" }],
  ["one discipline", { id: "u", name: "A", disciplines: ["sport"] }],
  ["3 disciplines + all grades", { ...rich, availability: undefined, hikingSpeedFtHr: undefined }],
  ["every extra field set", { ...rich }],
];
let everScored = 0;
for (const [label, p] of rows) {
  const c = buildCand(p);
  const unk = compatUnknown(ME, c), pct = compat(ME, c);
  const rendered = unk >= 3
    ? REFUSAL
    : pct + "% match" + (unk ? " \u00b7 based on limited info" : "");
  if (unk < 3) everScored++;
  console.log(`  ${label.padEnd(30)} _unk=${unk}  _pct=${pct}  ->  ${JSON.stringify(rendered)}`);
}

console.log("\nVERDICT");
console.log(`  rows that showed a percentage: ${everScored} of ${rows.length}`);
if (everScored === 0) {
  console.log("  _unk >= 3 for EVERY row, including a maximally-complete profile.");
  console.log("  So the browse row NEVER shows a match %, and `_pct` is computed and read by nothing.");
  console.log(`  So the sentence below is the ONLY thing this row has ever rendered: ${JSON.stringify(REFUSAL)}`);
  console.log("  It used to read \"New profile — …score a match yet\", which blamed the CLIMBER for a");
  console.log("  projection the ROW drops, and promised a resolution no column can deliver.");
}
process.exit(bad ? 1 : 0);
