// Were the "0 rows live, so it is LATENT" conclusions measured with a key that could SEE the
// rows?
//
// Several decisions in memory rest on a table being empty — most consequentially the guide
// application review queue, which was deliberately NOT built because `guide_documents` was
// recorded as having 0 rows. But an ANON count on an RLS-protected table returns 0 whatever the
// table holds: `climb_logs` reads 0 to anon and has 1 row to the service key. A filtered read is
// not an empty one, and here it decided not to build a trust-and-safety surface.
//
// IT ALSO ANSWERS A SECOND QUESTION NOW: which unflagged reads are even MEASURABLE by
// `check:outage`. That guard compares a healthy walk against a failing one, so a table the
// fixture has no rows in is empty in BOTH and its screen cannot move — "an absence the fixture
// happens to share is unmeasurable, not absent". Knowing which tables are empty live is what
// separates "this read is honest" from "nothing could have told us".
//
// TWO OF ITS NINE ROWS NAMED TABLES THAT DO NOT EXIST, and had reported `err` since it was
// written: `guides` and `blocks`. The app reads `guide_profiles` and `blocked_users`. Nothing in
// `lib/db.js` has ever read either of the missing names, so those rows were never measuring
// anything — and a probe whose whole job is "is this table genuinely empty" printing `err` for
// two tables trains you to skim the column that matters.
//
// So the list is no longer merely declared. Every entry is checked against the tables
// `lib/db.js` actually reads, and a name the app does not read FAILS as stale rather than
// printing a quiet `err`. Same rule as `KNOWN` in check:field-renders and `NEEDS_EXTRA_STATE` in
// the overlay scaffold: an exemption list that cannot rot.
//
// Read-only. Any failed query is reported as INCONCLUSIVE, never as absence.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const svc = requireServiceKey();
const anon = anonKey();

// Tables whose emptiness has been used as evidence, or whose emptiness decides whether an
// unflagged read can be measured at all. Each carries WHY it is here, so a future reader can tell
// a load-bearing row from one somebody added out of curiosity.
const TABLES = [
  // Decisions rest on these being empty.
  ["guide_documents", "the guide application review queue was NOT built on this being 0"],
  ["guide_profiles", "same decision — the guide surfaces as a whole"],
  ["user_reports", "moderation: no suspension flow was built on this being 0"],
  ["content_reports", "the other reporting surface; same question"],
  ["contributions", "route photos and fix suggestions both live here"],
  // The outage-flag census: does an unflagged read have anything to be empty ABOUT?
  ["climb_logs", "flagged (logsUnavailable); kept as the known anon-vs-service contrast"],
  ["vouches", "UNFLAGGED — feeds \"Vouches you've given (N)\", a count of a failed read"],
  ["belay_catches", "flagged (catchesUnavailable) — was reverted once, see #1239/#1248"],
  ["hazard_votes", "UNFLAGGED — route page hazard votes"],
  ["inquiries", "UNFLAGGED — the guide dashboard's inquiry list"],
  ["topos", "flagged in RouteDetail (toposUnavailable); is it measurable?"],
  ["verification_records", "no flag by DESIGN — the session is the authority; see #1256"],
  ["blocked_users", "flagged (blockedUnavailable). Was listed here as \"blocks\", which does not exist"],
];

// Derived, not declared: what does the app actually read? A name absent from this set is stale
// bookkeeping and fails the run.
const dbSrc = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const READ = new Set([...dbSrc.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]));
if (READ.size < 20) {
  console.error(`FAIL — parsed only ${READ.size} table reads out of lib/db.js. That is a broken`);
  console.error("scan, not an app that reads nothing. Nothing below would mean anything.");
  process.exit(1);
}

const stale = TABLES.filter(([t]) => !READ.has(t));
if (stale.length) {
  console.error("FAIL — stale entries: lib/db.js does not read these tables, so measuring them");
  console.error("says nothing about the app. Fix the name or drop the row.\n");
  for (const [t, why] of stale) console.error(`  ${t}  (listed because: ${why})`);
  process.exit(1);
}

async function one(key, table) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: headers(key, { Prefer: "count=exact", Range: "0-0" }),
  }).catch((e) => ({ ok: false, status: 0, _err: String((e && e.message) || e) }));
  if (!r.ok) return { err: `${r.status}${r._err ? " " + r._err : ""}` };
  const cr = r.headers.get("content-range") || "";
  const n = cr.includes("/") ? cr.split("/")[1] : "?";
  return { n: n === "*" ? null : Number(n) };
}

console.log(`checked ${TABLES.length} table(s) against the ${READ.size} lib/db.js reads\n`);
console.log("table                anon    service   verdict");
console.log("-------------------- ------- --------- -------------------------------------------");
let missing = 0, empty = 0;
for (const [t] of TABLES) {
  const a = await one(anon, t);
  const s = await one(svc, t);
  let verdict;
  if (s.err && /404|42P01/.test(s.err)) { verdict = `NO SUCH TABLE (${s.err})`; missing++; }
  else if (s.err) verdict = `INCONCLUSIVE — service query failed (${s.err})`;
  else if (s.n === 0) { verdict = "genuinely empty"; empty++; }
  else if (a.err) verdict = `${s.n} row(s); anon query failed (${a.err})`;
  else if (a.n === 0) verdict = `NOT EMPTY — ${s.n} row(s) INVISIBLE to anon (RLS)`;
  else verdict = `${s.n} row(s), ${a.n} visible to anon`;
  const fmt = (x) => (x.err ? "err" : String(x.n));
  console.log(`${t.padEnd(20)} ${fmt(a).padEnd(7)} ${fmt(s).padEnd(9)} ${verdict}`);
}

console.log("\nAn anon 0 on an RLS-protected table is not evidence of an empty table.");
console.log(`${empty} of ${TABLES.length} are genuinely empty. For an UNFLAGGED read, that means`);
console.log("check:outage cannot measure it: the section is empty in the healthy run too, so");
console.log("rule 2 stays quiet and the run says nothing either way. Seeding the fixture is what");
console.log("would make it measurable — not another walk.");

if (missing) {
  // A table the app reads that the DATABASE lacks is a different and worse finding than a stale
  // list entry: check:schema is supposed to make that impossible.
  console.error(`\nFAIL — ${missing} table(s) are read by lib/db.js and do not exist in the database.`);
  process.exit(1);
}
