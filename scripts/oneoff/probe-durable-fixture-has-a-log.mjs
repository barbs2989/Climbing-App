// READ-ONLY. Does the DURABLE CI fixture owner actually have a climb_logs row?
//
// #1467 asserted in its commit message that CI cannot see the Profile "0 logged" class because
// "the durable fixture has no logged climb". seed-ci-test-fixture.mjs line ~168 inserts exactly
// such a row, so that explanation may be wrong -- and it is now on main. Verify it.
//
// Service key, because an ANON count on an RLS-protected table returns 0 with a 200 whatever the
// table holds ([[an-anon-row-count-is-not-evidence-of-an-empty-table]]).
import { SUPABASE_URL, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const h = { apikey: key, Authorization: `Bearer ${key}` };

async function get(p) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: h });
  if (!r.ok) { console.error(`read failed ${r.status}: ${await r.text()}`); process.exit(1); }
  return r.json();
}

const logs = await get("climb_logs?select=id,user_id,route_id,date_climbed,notes");
console.log(`climb_logs rows (service key): ${logs.length}`);
for (const l of logs) console.log(`  ${l.user_id}  ${l.route_id}  ${l.date_climbed}  ${JSON.stringify(l.notes)}`);

const profs = await get("profiles?select=id,name,username,discoverable&name=ilike.*CI Fixture*");
console.log(`\nCI fixture profiles: ${profs.length}`);
for (const p of profs) console.log(`  ${p.id}  ${JSON.stringify(p.name)}  discoverable=${p.discoverable}`);

const ids = new Set(profs.map((p) => p.id));
const owned = logs.filter((l) => ids.has(l.user_id));
console.log(`\nlogs belonging to a CI fixture account: ${owned.length}`);
console.log(owned.length
  ? "=> the DURABLE fixture DOES have a log; #1467's stated reason for CI blindness is WRONG."
  : "=> no CI-fixture log; #1467's stated reason stands.");
