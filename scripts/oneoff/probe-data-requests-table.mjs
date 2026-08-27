// Settings offers "Export my data" and "Opt out of non-essential processing" with no "not wired
// yet" caveat, while the Delete control beside them carries one. That asymmetry is what made them
// worth checking. `raiseDataRequest` returns "unavailable" when the TABLE is missing, so the
// honest copy is only honest if the table is actually there — otherwise every request quietly
// takes the "Requests aren't switched on yet" path, which is truthful but means the feature does
// nothing.
//
// Read with BOTH keys: an anon count on an RLS table comes back 0 with a 200 whatever it holds,
// and here a missing table and an empty one are the distinction that matters.
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const svc = requireServiceKey();
const anon = anonKey();

const probe = async (key, label) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/data_requests?select=id`, {
    headers: { ...headers(key), Prefer: "count=exact", Range: "0-0" },
  });
  const cr = (r.headers.get("content-range") || "").split("/")[1];
  const body = r.ok ? "" : (await r.text()).slice(0, 120);
  console.log(`${label.padEnd(8)} HTTP ${r.status}` + (r.ok ? `  rows=${cr}` : `  ${body}`));
  return r.status;
};

const a = await probe(anon, "anon");
const s = await probe(svc, "service");

console.log();
if (s === 404 || s === 400) {
  console.log("THE TABLE IS MISSING. Both controls take the \"Requests aren't switched on yet\"");
  console.log("path — truthful copy, but the migration has not run, so nothing is ever recorded.");
  process.exit(1);
}
console.log("data_requests exists, so a request from Settings really is written and the copy");
console.log("(\"handled by hand, so it isn't instant\") describes what happens.");
if (a !== s) console.log(`NOTE: anon saw ${a} and the service key saw ${s} — RLS is scoping reads, as it should.`);
