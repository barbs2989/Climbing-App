// Two migrations must never share a number.
//
// This happened THREE times on 2026-08-06 alone, with parallel sessions each writing the
// "next" migration against the same main:
//   * 0082 twice — the consensus RPC fix was renumbered to 0084 after #590 took 0082
//   * 0088 twice — hazard votes renumbered to 0089 after #624 took 0088
//   * 0091 twice — blocked-profile-read and saved-searches BOTH landed on main
//
// supabase/migrations/README-numbering.md already warns about it. A warning is not a guard,
// and the first two were caught only because someone happened to look. The third was not.
//
// Why it matters beyond tidiness: these files are handed to a human to paste into the SQL
// editor. "Run 0091" stopped being an instruction and became a question. It also broke
// in-code references — lib/db.js briefly carried comments citing "0082" for two different
// migrations, one of which was a security fix.
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "supabase", "migrations");
if (!fs.existsSync(DIR)) { console.log("check:migrations: no supabase/migrations directory — nothing to check"); process.exit(0); }

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql"));
const byNumber = new Map();
const malformed = [];

for (const f of files) {
  const m = f.match(/^(\d{4})_/);
  // A file that does not start with four digits and an underscore cannot be ordered at all,
  // which is its own bug — flag rather than skip, so a typo is not silently exempt.
  if (!m) { malformed.push(f); continue; }
  const n = m[1];
  if (!byNumber.has(n)) byNumber.set(n, []);
  byNumber.get(n).push(f);
}

// Historical duplicates are grandfathered through a baseline, the same shape as
// undefined-refs-baseline.json and session-claims-baseline.json. Eleven pairs predate this
// guard — mostly July's gear-audit batches, all long applied. Renumbering someone else's
// applied migration churns history to no benefit, and a guard that fails on day one for
// reasons nobody will fix is a guard people learn to ignore.
//
// The baseline is keyed by number -> the exact file list. If a NEW file joins a
// grandfathered number, the list stops matching and it fails — so the baseline forgives
// the past without opening the door.
const BASELINE_PATH = path.join(process.cwd(), "scripts", "migration-numbers-baseline.json");
const baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")).accepted || {} : {};

const allDupes = [...byNumber.entries()].filter(([, fs_]) => fs_.length > 1).sort();
const dupes = allDupes.filter(([n, names]) => {
  const known = baseline[n];
  if (!known) return true;
  const a = [...names].sort().join("|"), b = [...known].sort().join("|");
  return a !== b;
});
const grandfathered = allDupes.length - dupes.length;
if (!dupes.length && !malformed.length) {
  console.log(`check:migrations: ok — ${files.length} migrations, no new duplicate numbers.${grandfathered ? ` (${grandfathered} historical pair(s) grandfathered.)` : ""}`);
  process.exit(0);
}

if (dupes.length) {
  console.error(`\n${dupes.length} migration number(s) used more than once:\n`);
  for (const [n, names] of dupes) {
    console.error(`  ${n}:`);
    for (const name of names.sort()) console.error(`    ${name}`);
  }
  console.error(`
These files get pasted into the SQL editor by hand, so a shared number turns
"run 0091" into a question rather than an instruction — and any code comment
citing that number now points at two different migrations.

Renumber the one that is NOT yet applied to the live database to the next free
number, and update any comment referencing it. If BOTH are already applied,
renumber the later-merged one anyway: the file name is documentation, and the
applied state does not depend on it.`);
}

if (malformed.length) {
  console.error(`\n${malformed.length} migration file(s) do not start with a 4-digit number:\n`);
  for (const f of malformed.sort()) console.error(`    ${f}`);
  console.error("\nWithout a leading NNNN_ the apply order is undefined.");
}

process.exit(1);
