// WHAT DO REAL ACCOUNTS ACTUALLY SCORE ON THE MODEL THE GROUP GATE NOW ENFORCES?
//
// `groupTrustShortfall` used to enforce a group's "Trust 55+ only" policy on `vScore` — the CLIENT
// model — while the Profile showed the SERVER one. #1676 pointed the gate at the displayed score,
// which is correct and is NOT scale-preserving: a vouch is 4 points in one model and 1 in the
// other, so 55 became a different bar the moment that landed.
//
// Every argument about where the bar should sit is worthless without knowing what real climbers
// score, so this asks the database rather than reasoning from example profiles.
//
// SERVICE KEY, NOT ANON, AND THAT IS NOT A CONVENIENCE. `verification_records` is readable only by
// its owner and `belay_catches` only by the two parties, so an anon count returns 0 with a 200
// whatever the table holds — and a zero read as "nobody has any" is exactly the false premise this
// measurement exists to avoid. Read-only: it issues no write.
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const key = requireServiceKey();

async function get(pathAndQuery) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + pathAndQuery, { headers: headers(key) });
  const body = await r.text();
  return { ok: r.ok, status: r.status, body };
}

async function count(table) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?select=id", {
    headers: headers(key, { Prefer: "count=exact", Range: "0-0" }),
  });
  const cr = r.headers.get("content-range") || "";
  const n = Number(String(cr).split("/")[1]);
  return Number.isFinite(n) ? n : null;
}

const profiles = await get("profiles?select=id,name,created_at&limit=500");
if (!profiles.ok) {
  console.error(`FAIL: could not read profiles (${profiles.status}). Nothing was measured.`);
  process.exit(1);
}
const people = JSON.parse(profiles.body);
if (!people.length) {
  console.error("FAIL: zero profiles. An empty read is not evidence that nobody has an account.");
  process.exit(1);
}

console.log(`${people.length} real account(s) in the live project.\n`);

// `trust_scores_view` calls compute_trust_score() per row — the same function the app reads through
// `useMyServerTrust`, so this is the number a climber is shown rather than a re-implementation.
const view = await get("trust_scores_view?select=id,name,trust_score&limit=500");
if (!view.ok) {
  console.error(`FAIL: trust_scores_view unreadable (${view.status}) — ${view.body.slice(0, 200)}`);
  console.error("Without it this run is a statement about nothing.");
  process.exit(1);
}
const scores = JSON.parse(view.body).sort((a, b) => b.trust_score - a.trust_score);
console.log("  score  account");
for (const s of scores) console.log(`  ${String(s.trust_score).padStart(5)}  ${s.name || "(no name)"}`);

const admitted = (m) => scores.filter((s) => s.trust_score >= m).length;
console.log(`\n  admitted by a "Trust N+ only" group, of ${scores.length}:`);
for (const m of [55, 45, 35, 25, 20, 15, 10, 5]) {
  console.log(`    ${String(m).padStart(3)}+   ${String(admitted(m)).padStart(3)}`);
}

// The inputs the score is a function of. A component whose table is empty catalog-wide cannot be
// contributing to anyone's score, whatever its weight says.
console.log("\n  what feeds it, catalog-wide:");
for (const t of ["vouches", "belay_catches", "climb_logs", "verification_records", "groups", "crews"]) {
  console.log(`    ${t.padEnd(22)} ${String(await count(t) ?? "?").padStart(6)} row(s)`);
}

const vr = await get("verification_records?select=verification_type,status");
if (vr.ok) {
  const rows = JSON.parse(vr.body);
  const tally = {};
  for (const r of rows) tally[`${r.verification_type}/${r.status}`] = (tally[`${r.verification_type}/${r.status}`] || 0) + 1;
  console.log("\n  verification records by type/status:");
  const keys = Object.keys(tally);
  if (!keys.length) console.log("    none");
  for (const k of keys.sort()) console.log(`    ${k.padEnd(28)} ${tally[k]}`);
}
