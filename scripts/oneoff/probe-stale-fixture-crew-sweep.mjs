// DRY RUN for the stale-crew sweep added to durable-fixture.mjs. Deletes nothing.
//
// The sweep runs only in CI (it needs the durable mate's session, and CI must never hold the
// service key, so the reverse is also true -- a local run cannot sign in as the mate). That makes
// the selector unverifiable by running it, which is exactly the situation where a sweep quietly
// matches the wrong rows. This asks the same question with the key a local machine does have.
//
// What it must show:
//   * the leaked crews ARE matched -- otherwise the sweep is decoration;
//   * no crew belonging to a REAL climber is matched -- a sweep that over-matches is far worse
//     than the leak it fixes, since it deletes other people's trip parties;
//   * the age gate holds back anything younger than 45 minutes, because deleting the crew of a
//     run already in flight is the failure mode CLAUDE.md records for sweepOrphans.
//
// Read-only, service key (it must see rows RLS hides from anon to count them honestly -- an anon
// 0 here would read as "nothing leaked").

import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const svc = requireServiceKey();
const q = (p) => fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(svc) }).then((r) => r.json());

const CREW_ROUTE_ID = "wa_mount_baker_north_ridge";
const AGE_MS = 45 * 60 * 1000;
const staleBefore = new Date(Date.now() - AGE_MS).toISOString();

const profiles = await q("profiles?select=id,name,username");
if (!Array.isArray(profiles) || !profiles.length) {
  console.error("FAIL — read no profiles. Nothing below would mean anything.");
  process.exit(1);
}
const mate = profiles.find((p) => p.username === "climbmatch-ci-mate");
if (!mate) {
  console.error("FAIL — no profile with username climbmatch-ci-mate. The durable pair is what");
  console.error("this sweep is scoped to; without it the selector cannot be checked at all.");
  process.exit(1);
}

const all = await q("crews?select=id,created_by,route_id,created_at&order=created_at.asc");
if (!Array.isArray(all)) {
  console.error("FAIL — could not read crews.");
  process.exit(1);
}
const nameOf = (id) => {
  const p = profiles.find((x) => x.id === id);
  return p ? `${p.name}${p.username ? " @" + p.username : ""}` : "(no profile row)";
};

// Exactly the selector the sweep uses.
const matched = all.filter((c) =>
  c.created_by === mate.id && c.route_id === CREW_ROUTE_ID && c.created_at < staleBefore);
const youngMate = all.filter((c) =>
  c.created_by === mate.id && c.route_id === CREW_ROUTE_ID && c.created_at >= staleBefore);
const others = all.filter((c) => c.created_by !== mate.id);

console.log(`crews live: ${all.length}`);
console.log(`  owned by the durable mate (${nameOf(mate.id)}): ${all.length - others.length}`);
console.log(`  owned by anyone else                          : ${others.length}`);
console.log(`\nWOULD SWEEP (older than 45 min): ${matched.length}`);
for (const c of matched) console.log(`  ${c.created_at}  ${c.id.slice(0, 8)}`);
console.log(`\nheld back by the age gate (a run may be using these): ${youngMate.length}`);
for (const c of youngMate) console.log(`  ${c.created_at}  ${c.id.slice(0, 8)}`);
console.log(`\nNOT matched — owned by someone other than the fixture mate: ${others.length}`);
for (const c of others) console.log(`  ${c.created_at}  ${nameOf(c.created_by)}`);

let bad = 0;
// The sweep must never reach a crew whose owner is not the fixture mate. This is the assertion
// that matters: over-matching deletes real climbers' trip parties.
const overreach = matched.filter((c) => c.created_by !== mate.id);
if (overreach.length) {
  console.error(`\nFAIL — ${overreach.length} matched crew(s) are not the fixture mate's.`);
  bad++;
}
if (youngMate.some((c) => matched.includes(c))) {
  console.error("\nFAIL — a crew younger than the age gate was matched.");
  bad++;
}
console.log(bad
  ? "\nthe selector is wrong — do not ship it"
  : "\nok — the selector reaches only the durable mate's own stale fixture crews.");
process.exitCode = bad ? 1 : 0;
