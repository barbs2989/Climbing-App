// Does the SIGNED-IN "Delete my account & data" branch actually record a request?
// Gap 1 of the policy audit has only ever been read from source: "the signed-in deletion
// branch has never been exercised by anyone -- there is no standing test account".
// The caller swallows a throw (`catch(_e){_dr="failed"}`) and shows a different toast, so an
// RLS refusal is INVISIBLE from the outside. This drives the real write path with a real JWT.
// Creates a throwaway account on the reserved .invalid domain and removes it again.
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from
  "../lib/supabase-env.mjs";

const SVC = requireServiceKey(), ANON = anonKey();
const email = `probe-del-${Date.now()}@climbmatch-probe.invalid`, password = "Pr0be!" + Math.random().toString(36).slice(2, 10);
const j = async r => { const t = await r.text(); try { return [r.status, JSON.parse(t)]; } catch { return [r.status, t]; } };
let uid = null, ok = 0, bad = 0;
const say = (pass, label, detail) => { pass ? ok++ : bad++; console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? " -- " + detail : ""}`); };

try {
  // 1. a real account
  let [s, b] = await j(await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST", headers: headers(SVC, { "Content-Type": "application/json" }),
    body: JSON.stringify({ email, password, email_confirm: true }) }));
  if (s !== 200 && s !== 201) throw new Error(`could not create probe account: ${s} ${JSON.stringify(b)}`);
  uid = b.id; console.log(`probe account ${uid}\n`);

  // 2. sign in the way the app does -- anon key, real password grant
  [s, b] = await j(await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }) }));
  const jwt = b.access_token;
  say(s === 200 && !!jwt, "a real account can sign in", `http ${s}`);
  if (!jwt) throw new Error("no JWT, cannot exercise the branch");
  const asUser = { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json", Prefer: "return=representation" };

  // 3. THE BRANCH: exactly what raiseDataRequest(uid,"delete",note) sends
  [s, b] = await j(await fetch(`${SUPABASE_URL}/rest/v1/data_requests`, { method: "POST", headers: asUser,
    body: JSON.stringify({ user_id: uid, kind: "delete", note: "Requested from Settings → Delete my account", status: "open" }) }));
  say(s === 201, 'raiseDataRequest(uid,"delete") is ACCEPTED under RLS', `http ${s} ${s !== 201 ? JSON.stringify(b) : ""}`);
  const rowId = Array.isArray(b) && b[0] ? b[0].id : null;

  // 4. the user can SEE their own request -- the toast promises it is on file
  [s, b] = await j(await fetch(`${SUPABASE_URL}/rest/v1/data_requests?select=id,kind,status&user_id=eq.${uid}`, { headers: asUser }));
  say(s === 200 && Array.isArray(b) && b.length === 1 && b[0].kind === "delete" && b[0].status === "open",
    "the climber can read their own open request back", `http ${s} rows=${Array.isArray(b) ? b.length : "?"}`);

  // 5. the status constraint is REAL (defect 0085 swept five tables for exactly this)
  [s, b] = await j(await fetch(`${SUPABASE_URL}/rest/v1/data_requests`, { method: "POST", headers: asUser,
    body: JSON.stringify({ user_id: uid, kind: "delete", status: "done" }) }));
  say(s === 403 || s === 401, "a self-raised status='done' is REFUSED", `http ${s}`);

  // 6. cannot raise one for somebody else
  [s, b] = await j(await fetch(`${SUPABASE_URL}/rest/v1/data_requests`, { method: "POST", headers: asUser,
    body: JSON.stringify({ user_id: "00000000-0000-0000-0000-000000000000", kind: "delete", status: "open" }) }));
  say(s === 403 || s === 401, "cannot raise a request for another account", `http ${s}`);

  // 7. and cannot silently withdraw it -- "a request you can edit is not a record"
  if (rowId) {
    [s] = await j(await fetch(`${SUPABASE_URL}/rest/v1/data_requests?id=eq.${rowId}`, { method: "DELETE", headers: asUser }));
    const [s2, b2] = await j(await fetch(`${SUPABASE_URL}/rest/v1/data_requests?select=id&user_id=eq.${uid}`, { headers: asUser }));
    say(Array.isArray(b2) && b2.length === 1, "the request survives the climber trying to delete it", `delete http ${s}, rows still ${Array.isArray(b2) ? b2.length : "?"}`);
  }
} catch (e) { bad++; console.log(`  FAIL  ${e.message}`); }
finally {
  if (uid) {
    await fetch(`${SUPABASE_URL}/rest/v1/data_requests?user_id=eq.${uid}`, { method: "DELETE", headers: headers(SVC) });
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: headers(SVC) });
    const [, left] = await j(await fetch(`${SUPABASE_URL}/rest/v1/data_requests?select=id&user_id=eq.${uid}`, { headers: headers(SVC) }));
    console.log(`\ncleanup: account delete http ${r.status}, rows left ${Array.isArray(left) ? left.length : "?"}`);
  }
  console.log(`\n${bad ? "FAILED" : "ok"} -- ${ok} passed, ${bad} failed`);
  process.exit(bad ? 1 : 0);
}
