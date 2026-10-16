// Which shelf-life claims say the road is OPEN, and carry no checked date?
//
// The closure backlog is ~118 values in 47 road groups with no batching leverage left, so the
// question stops being "which cluster is biggest" and becomes "which claim hurts most if wrong".
//
// EVERY REAL DEFECT FOUND IN THIS GRIND WAS AFFIRMATIVE, not stale-negative:
//   wa_forbidden_peak_east_ridge     "Open to vehicles ... all the way to the Cascade Pass trailhead"
//   wa_little_sister_* (x3)          "Open as of mid-2026 but see seasonalGate"   (road shut at MP 7)
//   wa_cinderella_peak_scramble      "Good gravel/paved forest road ... check alerts for washouts"
//   wa_copper_peak_south_route       Spider Gap "the only current access option"  (also gated)
//
// The asymmetry is the whole point. A stale CLOSED claim sends a party to a different mountain —
// annoying, recoverable, and they find out from home. A stale OPEN claim sends them up a road that
// is not there, and they find out at the gate, having burned the drive and often the weather window.
// So an affirmative claim with no recorded check date is the sharpest thing left in this backlog.
//
// Consumes audit:expiring-closures --json: ONE classifier. A previous version of the sibling
// worklist wrote its own shelf-life needle and listed ~20 correct Suiattle routes as work.
//
// Report-only, read-only.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let payload;
try {
  payload = JSON.parse(execFileSync("node", [path.join(ROOT, "scripts/audit-expiring-closures.mjs"), "--json"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, cwd: ROOT }));
} catch (e) {
  console.error(`FAIL — could not read the audit: ${String(e.message).slice(0, 200)}`); process.exit(1);
}
if (!payload || !payload.findings || !payload.findings.length) {
  console.error("FAIL — the audit returned no findings; refusing to report an empty worklist"); process.exit(1);
}

/* AFFIRMATIVE ACCESS, anchored. "open" and "passable" appear constantly mid-sentence in ways that
   are the OPPOSITE of a claim — "open to foot and bike beyond the closure" IS a closure, and
   "reopened in May 2026 after ..." is history. Anchoring to the start of the value or a sentence
   boundary is what separates a claim from a mention. */
const SAYS_OPEN = /(?:^|[.;]\s*|—\s*|-\s+)(?:currently\s+)?(?:open\b(?!\s*(?:to\s+(?:foot|bike|hike|hikers|pedestrian|non-motor)|beyond|until|from))|good\b|passable\b|drivable\b|fully open\b)/i;

// A value that also states a closure is making a compound statement, not an affirmative one.
const ALSO_SHUT = /\bclosed\b|\bwashout\b|\bwashed out\b|\bgated at\b|\bimpassable\b|\bno vehicle access\b/i;

const rows = payload.findings
  .filter(f => SAYS_OPEN.test(f.text) && !ALSO_SHUT.test(f.text));

const undated = rows.filter(f => !f.checked);
const dated = rows.filter(f => f.checked);

console.log(`${payload.flagged} shelf-life value(s) on ${new Set(payload.findings.map(f => f.id)).size} route(s).`);
console.log(`${rows.length} of them assert the road is OPEN or drivable without also stating a closure.`);
console.log(`   ${dated.length} carry a checked date · ${undated.length} do NOT\n`);

if (!rows.length) {
  console.log(`No affirmative access claim is left in the backlog. That is the good outcome: what
remains asserts closures, and a stale closure is the recoverable direction.`);
  process.exit(0);
}

console.log("AFFIRMATIVE AND UNDATED — the sharpest thing left, most consequential first:\n");
for (const f of undated) {
  console.log(`   ${f.id}  [${f.tier}]  ${f.field}`);
  if (f.roadName) console.log(`      road: ${f.roadName}`);
  console.log(`      ${f.text.slice(0, 190)}\n`);
}
if (dated.length) {
  console.log(`ALREADY CHECKED (lower priority — a reader can judge the age):`);
  for (const f of dated) console.log(`   ${f.id} ${f.field} — checked ${String(f.checked).slice(0, 10)}`);
  console.log("");
}

console.log(`READ BEFORE RESEARCHING. An affirmative claim is not automatically wrong — most roads
are open, and saying so is the correct content of road.status. What makes these worth the query is
that they assert access AND nothing records when anyone last checked, so neither a climber nor this
report can tell a current statement from a two-season-old one.`);
