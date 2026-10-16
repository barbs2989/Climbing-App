// Does the data_requests channel actually WORK for a real client, and does its RLS actually
// refuse what it claims to? #934 shipped it as the app's only contact route — the Privacy Policy
// points at it for deletion, export and opt-out — and the table has never held a row, so every
// statement about it so far has been read off pg_policy rather than measured.
//
// Structure is not behaviour. All three policies have `roles = null`, i.e. they apply to PUBLIC
// including anon; the only thing refusing an anonymous insert is `user_id = auth.uid()` going
// NULL. That is almost certainly right, and "almost certainly" is what the acceptance trigger
// looked like before it was exercised.
//
// Two real accounts, because the SELECT policy's whole job is "your own", and one account cannot
// tell "only mine" from "everything".
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ANON = anonKey(), SVC = requireServiceKey();
const tag = `dr${Date.now().toString(36)}`;
const made = [];
let fail = 0;

const ok   = (m) => console.log(`ok   ${m}`);
const bad  = (m) => { console.log(`FAIL ${m}`); fail++; };

async function j(res) { const t = await res.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }

async function signup(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Probe-passw0rd!", data: { name: email.split("@")[0] } }),
  });
  const b = await j(r);
  const id = b?.id || b?.user?.id;
  const token = b?.access_token;
  return { id, token, status: r.status };
}
// as(token) — a request with a USER's jwt is what the app sends; apikey stays the anon key.
async function rest(path, { token, method = "GET", body, prefer } = {}) {
  const h = { apikey: ANON, "Content-Type": "application/json", Authorization: `Bearer ${token || ANON}` };
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await j(r) };
}
async function svc(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", ...(opts.headers || {}) } });
  return { status: r.status, body: await j(r) };
}

try {
  const A = await signup(`${tag}-a@climbmatch.invalid`);
  const B = await signup(`${tag}-b@climbmatch.invalid`);
  for (const u of [A, B]) if (u.id) made.push(u.id);
  if (!A.token || !B.token) { console.error(`FAIL: no session returned (A=${A.status} B=${B.status}) — cannot test RLS as a user`); process.exit(1); }
  console.log(`two accounts: A=${A.id.slice(0, 8)} B=${B.id.slice(0, 8)}\n`);

  // 1. the path the app actually calls
  const ins = await rest("/data_requests", { token: A.token, method: "POST", prefer: "return=representation",
    body: { user_id: A.id, kind: "delete", note: "probe", status: "open" } });
  ins.status === 201 ? ok("a signed-in user can raise a request (201)")
                     : bad(`signed-in insert returned ${ins.status} ${JSON.stringify(ins.body).slice(0, 200)}`);

  // 2. anon must not be able to file one against anybody
  const anonIns = await rest("/data_requests", { method: "POST", body: { user_id: A.id, kind: "delete", status: "open" } });
  anonIns.status === 401 || anonIns.status === 403
    ? ok(`anon insert refused (${anonIns.status})`)
    : bad(`anon insert returned ${anonIns.status} — an unauthenticated caller filed a request`);

  // 3. THE 0085 CLASS: the INSERT policy names status='open'. Nothing had ever tried to send
  //    another value, so this is the first time the constraint has been asked to do its job.
  const forged = await rest("/data_requests", { token: A.token, method: "POST",
    body: { user_id: A.id, kind: "delete", status: "closed" } });
  forged.status === 403 || forged.status === 401
    ? ok(`a forged status is refused (${forged.status}) — a user cannot file a request pre-closed`)
    : bad(`status='closed' insert returned ${forged.status} — a user can self-close, so an ignored request is indistinguishable from an actioned one`);

  // 4. and cannot file one AS someone else
  const asOther = await rest("/data_requests", { token: A.token, method: "POST",
    body: { user_id: B.id, kind: "delete", status: "open" } });
  asOther.status === 403 || asOther.status === 401
    ? ok(`cannot raise a request as another user (${asOther.status})`)
    : bad(`insert with another user_id returned ${asOther.status}`);

  // 5. B files their own, then each must see ONLY their own
  await rest("/data_requests", { token: B.token, method: "POST", body: { user_id: B.id, kind: "export", status: "open" } });
  const aSees = await rest("/data_requests?select=id,user_id,kind", { token: A.token });
  const rows = Array.isArray(aSees.body) ? aSees.body : [];
  const foreign = rows.filter((r) => r.user_id !== A.id);
  rows.length >= 1 && foreign.length === 0
    ? ok(`A reads ${rows.length} row(s), all A's own — the SELECT policy scopes to the owner`)
    : bad(`A saw ${rows.length} row(s), ${foreign.length} belonging to someone else`);

  // 6. a non-admin must not be able to close their own request
  const upd = await rest(`/data_requests?user_id=eq.${A.id}`, { token: A.token, method: "PATCH",
    prefer: "return=representation", body: { status: "closed" } });
  const changed = Array.isArray(upd.body) ? upd.body.length : 0;
  // PostgREST answers 200 with [] when RLS matched no row — success and no-op look identical.
  changed === 0
    ? ok(`a non-admin cannot close a request (${upd.status}, 0 rows changed)`)
    : bad(`a user closed their own request (${changed} row(s)) — the admin-only UPDATE policy is not holding`);
} finally {
  for (const id of made) {
    await svc(`/rest/v1/data_requests?user_id=eq.${id}`, { method: "DELETE" }).catch(() => {});
    await svc(`/rest/v1/profiles?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
    await svc(`/auth/v1/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
  }
  const left = await svc(`/rest/v1/data_requests?select=id`);
  console.log(`\ncleanup: ${made.length} accounts removed, ${(left.body || []).length} data_requests row(s) left in the table`);
}
process.exit(fail ? 1 : 0);

// Measured 2026-08-19 against the live project — all six pass, table left empty:
//   201 insert · anon 401 · forged status 403 · other user_id 403 · reads only own · update 0 rows
//
// So the channel works and its RLS holds. That is a real result, not an empty one: before this,
// every claim about these policies was read off pg_policy, and `roles` is null on all three —
// they apply to PUBLIC including anon, and the only thing refusing an anonymous insert is
// `user_id = auth.uid()` going NULL. Now measured rather than reasoned.
//
// Injection-tested 2/2, and the second is the one that matters, because a probe whose expected
// result is "nothing leaked" is exactly what a blind probe prints:
//   1. Invert the forged-status expectation -> FAIL, printing the real 403. Proves assertion 3
//      reads a live response rather than passing on a default.
//   2. Point A's read at the SERVICE key, which bypasses RLS -> FAIL "A saw 2 row(s), 1 belonging
//      to someone else". This simulates a genuinely broken SELECT policy, so it proves the
//      cross-user check can actually see a leak. Inverting the assertion would not: it would only
//      prove the arithmetic runs.
//
// Trap worth keeping: PostgREST answers 200 with [] when RLS matched no row, so a refused UPDATE
// and a successful one are the same status code. Assertion 6 counts returned rows under
// Prefer: return=representation — never the status.
//
// A oneoff, not a check:* guard: it needs the service key to delete the accounts it creates and
// it writes to auth on the live project. Re-run by hand after any change to 0145's policies or
// to raiseDataRequest / myOpenDataRequests in lib/db.js.
