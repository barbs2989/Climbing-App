// Does `mutual_connections` (0182) actually work, and does it stay shut where it should?
//
// WHY THIS NEEDS THREE REAL ACCOUNTS AND CANNOT BE REASONED ABOUT. `0087` restricts reading
// `connections` to the two people on the row, so the intersection this function computes is
// something NO CLIENT CAN VERIFY for itself -- which is exactly the situation `0095`'s header
// warns about: a definer that "would look present, pass review, and enforce nothing". And the
// service role bypasses RLS entirely, so a service-key probe reports success either way.
//
// So: the service key CREATES the accounts and touches nothing else. Every read and write under
// test goes through the anon key plus that climber's own JWT, which is the entire question.
//
// A mutual friend needs THREE people -- A and B both connected to C -- which is one more than
// scripts/lib/ui-fixture.mjs builds, and is why this does not reuse it.
//
// THE CONTROLS RUN FIRST AND ARE THE NON-VACUITY PROOF. "Zero rows after blocking" means nothing
// unless the same call returned a row before it: the function could be refusing for an unrelated
// reason, and an empty result is what a broken definer returns too.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const DOMAIN = "climbmatch-qa.invalid";
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const ok = (label) => { pass++; console.log("  ok   " + label); };
const bad = (label, detail) => { fail++; console.log("  FAIL " + label + (detail ? "  -- " + detail : "")); };

const svc = requireServiceKey();

async function api(path, opts, key, jwt) {
  const r = await fetch(SUPABASE_URL + path, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: "Bearer " + (jwt || key),
      "Content-Type": "application/json",
      ...(opts && opts.headers ? opts.headers : {}),
    },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}

async function createUser(tag, name) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "mutual-" + tag + "-" + stamp + "@" + DOMAIN;
  const password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const { status, body } = await api("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
  }, svc);
  if (status >= 300 || !body || !body.id) throw new Error("create " + tag + " failed (" + status + "): " + JSON.stringify(body));
  return { id: body.id, email, password, name, tag };
}

async function signIn(u) {
  const { status, body } = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: u.email, password: u.password }),
  }, anonKey());
  if (status >= 300 || !body || !body.access_token) throw new Error("sign in " + u.tag + " failed (" + status + ")");
  return body.access_token;
}

// A connection is made the way the APP makes one: the requester asks, the addressee accepts.
// Writing an `accepted` row directly with the service key would manufacture a state RLS refuses
// -- the trap check:signed-in records from the other side.
async function connect(from, to) {
  const ins = await api("/rest/v1/connections?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ requester: from.id, addressee: to.id }),
  }, anonKey(), from.jwt);
  if (ins.status >= 300) throw new Error("request " + from.tag + "->" + to.tag + " failed (" + ins.status + "): " + JSON.stringify(ins.body));
  const rowId = Array.isArray(ins.body) && ins.body[0] && ins.body[0].id;
  if (!rowId) throw new Error("request " + from.tag + "->" + to.tag + " returned no row");
  const upd = await api("/rest/v1/connections?id=eq." + rowId + "&select=id,status", {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "accepted" }),
  }, anonKey(), to.jwt);
  if (upd.status >= 300 || !Array.isArray(upd.body) || upd.body.length !== 1) {
    throw new Error("accept " + to.tag + " failed (" + upd.status + "): " + JSON.stringify(upd.body));
  }
  return rowId;
}

async function mutuals(caller, others) {
  const { status, body } = await api("/rest/v1/rpc/mutual_connections", {
    method: "POST",
    body: JSON.stringify({ others: others.map((o) => o.id) }),
  }, anonKey(), caller && caller.jwt);
  return { status, rows: Array.isArray(body) ? body : [], body };
}

const made = [];
async function destroy() {
  for (const u of made) {
    await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
  }
}

async function main() {
  console.log("mutual_connections — three real accounts, anon key + each climber's own JWT" + NL);

  const A = await createUser("a", "Ada Fixture");
  const B = await createUser("b", "Bo Fixture");
  const C = await createUser("c", "Cy Fixture");
  made.push(A, B, C);
  for (const u of [A, B, C]) u.jwt = await signIn(u);

  // ---- CONTROL: nothing is connected yet, so there is nothing in common.
  const before = await mutuals(A, [B]);
  if (before.status >= 300) bad("control call succeeds", "status " + before.status + " " + JSON.stringify(before.body));
  else if (before.rows.length === 0) ok("control: with no connections at all, A and B share nobody");
  else bad("control: with no connections at all, A and B share nobody", JSON.stringify(before.rows));

  // ---- Build the mutual: A-C and B-C, both through request-then-accept.
  await connect(A, C);
  await connect(B, C);

  const withMutual = await mutuals(A, [B]);
  if (withMutual.status >= 300) {
    bad("A sees the mutual friend", "status " + withMutual.status + " " + JSON.stringify(withMutual.body));
  } else if (withMutual.rows.length === 1 && withMutual.rows[0].mutual_id === C.id && withMutual.rows[0].other_id === B.id) {
    ok("A sees exactly one mutual friend with B, and it is C");
  } else {
    bad("A sees exactly one mutual friend with B, and it is C", JSON.stringify(withMutual.rows));
  }

  // The relationship is symmetric: B must see the same thing about A.
  const fromB = await mutuals(B, [A]);
  if (fromB.rows.length === 1 && fromB.rows[0].mutual_id === C.id) ok("...and B sees the same mutual friend with A");
  else bad("...and B sees the same mutual friend with A", JSON.stringify(fromB.rows));

  // ---- It must never return somebody the CALLER is not already connected to.
  // C is connected to both A and B. Asking C about A returns B only if C knows B -- which C
  // does not... C knows A and B. So ask a sharper question: A asks about C. A and C are
  // connected to each other; their only shared person would be someone both know.
  const aAboutC = await mutuals(A, [C]);
  const leaked = aAboutC.rows.filter((r) => r.mutual_id !== C.id && r.mutual_id !== A.id);
  const allKnownToA = leaked.every((r) => r.mutual_id === C.id);
  if (aAboutC.rows.every((r) => r.mutual_id !== A.id)) ok("the caller is never returned as their own mutual friend");
  else bad("the caller is never returned as their own mutual friend", JSON.stringify(aAboutC.rows));
  if (allKnownToA) ok("every row returned is someone the caller is already connected to");
  else bad("every row returned is someone the caller is already connected to", JSON.stringify(leaked));

  // ---- A SIGNED-OUT CALLER GETS NOTHING. The grant was revoked from anon, so this should be
  // refused outright rather than merely returning an empty set.
  const anon = await mutuals(null, [B]);
  if (anon.status >= 300) ok("a signed-out caller is refused (" + anon.status + ")");
  else if (anon.rows.length === 0) ok("a signed-out caller learns nothing (empty, status " + anon.status + ")");
  else bad("a signed-out caller learns nothing", JSON.stringify(anon.rows));

  // ---- BLOCKS. B blocks A; A must stop seeing mutual friends with B, or this is a way round
  // the block that 0095 closed on the profile read.
  const blk = await api("/rest/v1/blocked_users", {
    method: "POST",
    body: JSON.stringify({ blocker: B.id, blocked: A.id }),
  }, anonKey(), B.jwt);
  if (blk.status >= 300) {
    bad("B can block A (precondition)", "status " + blk.status + " " + JSON.stringify(blk.body));
  } else {
    ok("B blocks A");
    const blocked = await mutuals(A, [B]);
    if (blocked.rows.length === 0) ok("...and A no longer sees mutual friends with B");
    else bad("...and A no longer sees mutual friends with B", JSON.stringify(blocked.rows));

    // The block is one-directional in this function: B is the one who blocked, so B may still
    // look. Asserting it keeps the rule from being "quietly deny everything", which every
    // deny-side assertion above would also be satisfied by.
    const stillB = await mutuals(B, [A]);
    if (stillB.rows.length === 1) ok("...while B, who did the blocking, still sees theirs");
    else bad("...while B, who did the blocking, still sees theirs", JSON.stringify(stillB.rows));
  }

  console.log(NL + pass + " passed, " + fail + " failed.");
}

// process.exit() skips finally, which is how check:block-guarantees leaked two accounts and a
// crew on its first failure. Throw instead, and tear down in finally.
try {
  await main();
} finally {
  await destroy();
  console.log("torn down " + made.length + " account(s).");
}
process.exitCode = fail ? 1 : 0;
