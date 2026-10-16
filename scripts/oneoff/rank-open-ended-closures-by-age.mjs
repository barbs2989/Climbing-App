// Which open-ended closures are old enough that the world has probably resolved them?
//
// The affirmative class is closed (rank-closure-backlog-by-consequence: 0 left). What remains is
// ~115 claims that assert a CLOSURE, which is the recoverable direction — but not harmless, and the
// founding case of this whole audit is exactly one of them:
//
//   wa_mount_hopper_standard  "Closed indefinitely since October 2025 ... no confirmed 2026
//                              reopening as of the most recent NPS update."
//   FS-24 and the Staircase area reopened 8 July 2026.
//
// A stale closure sends a party to a different mountain. Recoverable, but it is still a false
// statement, and it silently removes a route from consideration — the reader never learns they were
// turned away from an open road.
//
// THE MECHANICAL PROXY FOR "PROBABLY RESOLVED": an open-ended closure whose stated CAUSE carries a
// date, where that date is old. A closure caused by a storm eight months ago has had a repair
// season; one caused last month has not. This does not decide anything — it orders the queue.
//
// WHAT IT DELIBERATELY DOES NOT DO: rank a PERMANENT closure as stale. A washout with no funded
// repair is a durable fact and is what these fields are for — the Dosewallips road has correctly
// read "closed indefinitely" since a January 2002 washout, and its age is the reason it is RIGHT,
// not the reason it is suspect. Those are separated, not sorted to the top.
//
// Consumes audit:expiring-closures --json. One classifier.
// Report-only, read-only.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let payload;
try {
  payload = JSON.parse(execFileSync("node", [path.join(ROOT, "scripts/audit-expiring-closures.mjs"), "--json"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, cwd: ROOT }));
} catch (e) { console.error(`FAIL — could not read the audit: ${String(e.message).slice(0, 200)}`); process.exit(1); }
if (!payload || !payload.findings || !payload.findings.length) {
  console.error("FAIL — the audit returned no findings; refusing to report an empty queue"); process.exit(1);
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MRE = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";

/* The CAUSE date, not any date. "since December 2025", "after the January 2002 washout", "damaged in
   the Dec 2025 floods" — the moment the road broke. A closure ORDER's own window is excluded by the
   audit already (SELF_LIMITING), so what is left here is prose dating the event. */
const CAUSE = new RegExp(`\\b(?:since|after|from|in|following|caused by)\\b[^.;]{0,40}?\\b(${MRE})?\\.?\\s*(20\\d\\d)\\b`, "i");

// A durable cause is not a stale claim, however old. These are the fields' correct content.
const PERMANENT = /permanentl|decommission|no funded|will not be (re)?built|abandoned|never (?:be )?(?:repaired|rebuilt)/i;

const NOW = new Date();
const rows = [];
for (const f of payload.findings) {
  if (f.tier !== "open-ended") continue;
  const m = CAUSE.exec(f.text);
  if (!m) continue;
  const year = +m[2];
  const mon = m[1] ? MONTHS[m[1].slice(0, 3).toLowerCase()] : 6; // no month named -> mid-year
  if (mon == null || !year) continue;
  const when = new Date(Date.UTC(year, mon, 1));
  const months = Math.round((NOW - when) / (30.44 * 24 * 3600 * 1000));
  rows.push({ ...f, when, months, permanent: PERMANENT.test(f.text) });
}

if (!rows.length) { console.error("FAIL — no open-ended closure names a dated cause; the needle broke"); process.exit(1); }

const durable = rows.filter(r => r.permanent);
const queue = rows.filter(r => !r.permanent).sort((a, b) => b.months - a.months);
const undated = queue.filter(r => !r.checked);

console.log(`${payload.flagged} shelf-life value(s). ${rows.length} open-ended closure(s) name a dated cause.\n`);
console.log(`   ${durable.length} state a DURABLE cause (permanent / no funded repair) — age is why they are RIGHT`);
console.log(`   ${queue.length} state a repairable cause · ${undated.length} of those carry no checked date\n`);

console.log("QUEUE — oldest repairable cause first, undated only:\n");
for (const r of undated.slice(0, 14)) {
  const yrs = (r.months / 12).toFixed(1);
  console.log(`   ${String(r.months).padStart(3)} mo (${yrs} yr)  ${r.id}  ${r.field}`);
  if (r.roadName) console.log(`        road: ${r.roadName}`);
  console.log(`        ${r.text.slice(0, 165)}\n`);
}

console.log(`READ, DO NOT SWEEP. An old cause is a reason to LOOK, never a finding: a road can be shut
for years and still be shut, which is why the durable bucket is separated rather than sorted last.
The check is one query per road, and the outcome is as often "still closed, now dated" as it is a
repair — this grind has produced both, and "correct, no edit" is a result worth recording.`);
