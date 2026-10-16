// One-shot verifier for 0232 (verified_user_ids). Run once after applying the migration:
//   node scripts/oneoff/verify-0232-verified-status-reaches-others.mjs
// Spends nothing it cannot clean up: two per-run fixture accounts, removed at the end.
//
// It asserts the four things the migration claims, as the callers that matter:
//   1. a signed-OUT caller is refused (anon holds no EXECUTE);
//   2. a signed-in climber gets back exactly the verified ids among those it asks about — ids the
//      owner-only table itself will NOT show them, which is the whole point of the definer;
//   3. an unverified id is absent;
//   4. a climber who verifies becomes visible.
// Expected to exit 0 exactly when those hold. It pins no ids: the verified set is read from the
// table with the service key at run time.
import { createFixture } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const URL_ = SUPABASE_URL, ANON = anonKey(), SVC = requireServiceKey();
let failed = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { failed++; console.log("  FAIL  " + m); };
const call = async (path, { key, jwt, body, method = "POST" } = {}) => {
  const r = await fetch(URL_ + path, { method, headers: { apikey: key, Authorization: "Bearer " + (jwt || key), "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, body: j };
};
const ids = (b) => new Set((Array.isArray(b) ? b : []).map((r) => (typeof r === "string" ? r : r.verified_user_ids)));

const verifiedRows = await call("/rest/v1/verification_records?select=user_id&verification_type=eq.email&status=eq.verified", { key: SVC, method: "GET" });
const truth = new Set((verifiedRows.body || []).map((r) => r.user_id));
console.log(`verify-0232 — ${truth.size} verified email record(s) in the table (service key)`);

const fx = await createFixture(() => {});
try {
  const jwt = fx.session.access_token;
  const ask = [...truth, fx.mate.id];

  const anon = await call("/rest/v1/rpc/verified_user_ids", { key: ANON, body: { p_ids: ask } });
  if (anon.status === 401 || anon.status === 403 || (anon.body && anon.body.code === "42501")) ok(`signed-out caller refused (${anon.status})`);
  else fail(`signed-out caller got ${anon.status} ${JSON.stringify(anon.body).slice(0, 120)}`);

  const direct = await call(`/rest/v1/verification_records?select=user_id&user_id=in.(${[...truth].join(",") || "00000000-0000-0000-0000-000000000000"})`, { key: ANON, jwt, method: "GET" });
  const seenDirect = (direct.body || []).length;
  if (seenDirect === 0) ok("the table itself shows a signed-in climber NONE of the others' records (owner-only RLS intact)");
  else fail(`the table leaked ${seenDirect} other climber record(s) directly`);

  const got = await call("/rest/v1/rpc/verified_user_ids", { key: ANON, jwt, body: { p_ids: ask } });
  const g = ids(got.body);
  const same = g.size === truth.size && [...truth].every((x) => g.has(x));
  if (got.status === 200 && same) ok(`signed-in climber sees exactly the ${truth.size} verified id(s) asked about`);
  else fail(`signed-in climber got ${got.status} with ${g.size} id(s), expected ${truth.size}`);
  if (!g.has(fx.mate.id)) ok("an unverified climber is absent from the answer");
  else fail("an unverified climber came back as verified");

  const v = await call("/rest/v1/rpc/verify_my_email", { key: ANON, jwt, body: {} });
  const after = ids((await call("/rest/v1/rpc/verified_user_ids", { key: ANON, jwt, body: { p_ids: [fx.owner.id, fx.mate.id] } })).body);
  if (v.status === 200 && after.has(fx.owner.id) && !after.has(fx.mate.id)) ok("a climber who verifies becomes visible; the other stays absent");
  else fail(`after verify_my_email (${v.status}) the answer was ${JSON.stringify([...after])}`);
} finally {
  await call(`/rest/v1/verification_records?user_id=in.(${fx.owner.id},${fx.mate.id})`, { key: SVC, method: "DELETE" });
  await fx.cleanup();
}
console.log(failed ? `\nverify-0232: ${failed} FAILED` : "\nverify-0232: ok");
process.exit(failed ? 1 : 0);
