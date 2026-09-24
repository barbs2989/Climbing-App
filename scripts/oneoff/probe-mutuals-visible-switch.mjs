// Does `mutuals_visible` (0184) actually suppress anything, at BOTH ends, under RLS?
//
// The guard asserts the filter as SOURCE. That proves the migration says the right thing and
// nothing about what the database does with it -- which is precisely the trap `0095`'s header
// records: an RLS-adjacent rule can "look present, pass review, and enforce nothing". The
// service role bypasses RLS entirely, so a service-key probe reports success either way. So the
// service key CREATES the accounts and touches nothing else; every read and every write under
// test goes through the anon key plus that climber's own JWT.
//
// THREE ACCOUNTS, because a mutual friend needs A and B both connected to C. That is one more
// than scripts/lib/ui-fixture.mjs builds, which is why this does not reuse it.
//
// EVERY SUPPRESSION IS SANDWICHED BY A CONTROL. "Zero rows once the switch is off" is equally
// true of a function that broke, a connection that never landed, and a JWT that expired. Each
// case here asserts the row is THERE, turns the switch off, asserts it is GONE, turns it back on
// and asserts it RETURNED -- so the disappearance is attributable to the flag and to nothing else.
//
// ONE COLUMN IS FILTERED AT TWO POINTS and the two are different promises, so they are tested
// separately: the person NAMED (C hides -> C is not named to anyone) and the profile being
// OPENED (B hides -> B's own edges stop being shown to a reader).
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
  const email = "mv-" + tag + "-" + Date.now() + "@" + DOMAIN;
  const password = "Probe!" + Math.random().toString(36).slice(2, 10);
  const { status, body } = await api("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
  }, svc);
  if (status >= 300 || !body || !body.id) throw new Error("create " + tag + " failed (" + status + "): " + JSON.stringify(body));
  return { tag, name, email, password, id: body.id };
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
// Writing an `accepted` row with the service key would manufacture a state RLS refuses.
async function connect(from, to) {
  const ins = await api("/rest/v1/connections", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ requester: from.id, addressee: to.id, status: "pending" }),
  }, anonKey(), from.jwt);
  if (ins.status >= 300) throw new Error("request " + from.tag + "->" + to.tag + " failed (" + ins.status + "): " + JSON.stringify(ins.body));
  const upd = await api("/rest/v1/connections?requester=eq." + from.id + "&addressee=eq." + to.id, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "accepted" }),
  }, anonKey(), to.jwt);
  if (upd.status >= 300) throw new Error("accept " + to.tag + " failed (" + upd.status + "): " + JSON.stringify(upd.body));
}

async function mutuals(caller, others) {
  const { status, body } = await api("/rest/v1/rpc/mutual_connections", {
    method: "POST",
    body: JSON.stringify({ others: others.map((o) => o.id) }),
  }, anonKey(), caller && caller.jwt);
  return { status, rows: Array.isArray(body) ? body : [], body };
}

// THE CLIMBER'S OWN JWT, not the service key: whether a climber can set their own preference at
// all is part of what is under test. A service-key write would prove nothing about RLS.
async function setVisible(u, value) {
  const { status, body } = await api("/rest/v1/profiles?id=eq." + u.id, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ mutuals_visible: value }),
  }, anonKey(), u.jwt);
  if (status >= 300) throw new Error("set mutuals_visible=" + value + " for " + u.tag + " failed (" + status + "): " + JSON.stringify(body));
  const row = Array.isArray(body) ? body[0] : body;
  if (!row || row.mutuals_visible !== value) {
    throw new Error("read-back for " + u.tag + " says " + JSON.stringify(row && row.mutuals_visible) + ", not " + value);
  }
}

const made = [];
async function destroy() {
  for (const u of made) {
    await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
  }
}

const sees = (r, who) => r.rows.some((x) => x.mutual_id === who.id);

async function main() {
  console.log("mutuals_visible — three real accounts, anon key + each climber's own JWT" + NL);

  const A = await createUser("a", "Ada Fixture");
  const B = await createUser("b", "Bo Fixture");
  const C = await createUser("c", "Cy Fixture");
  made.push(A, B, C);
  for (const u of [A, B, C]) u.jwt = await signIn(u);

  await connect(A, C);
  await connect(B, C);

  console.log("1. the control — the switch is on by default, so the mutual is visible" + NL);

  const base = await mutuals(A, [B]);
  if (base.status >= 300) {
    bad("A sees C as a mutual with B", "status " + base.status + " " + JSON.stringify(base.body));
    return;                       // every case below is vacuous without this
  }
  if (sees(base, C)) ok("a brand-new account defaults to visible, and A sees C as a mutual with B");
  else { bad("a brand-new account defaults to visible", JSON.stringify(base.rows)); return; }

  console.log(NL + "2. the person NAMED can take themselves out of it" + NL);

  await setVisible(C, false);
  ok("C can set their own preference through RLS with their own JWT");
  const cHidden = await mutuals(A, [B]);
  if (!sees(cHidden, C)) ok("...and C is no longer named to A as a mutual with B");
  else bad("C is no longer named to A", JSON.stringify(cHidden.rows));

  await setVisible(C, true);
  const cBack = await mutuals(A, [B]);
  if (sees(cBack, C)) ok("...and turning it back on restores them, so the flag is what did it");
  else bad("turning it back on restores C", JSON.stringify(cBack.rows));

  console.log(NL + "3. the profile being OPENED can stop showing its own edges" + NL);

  await setVisible(B, false);
  const bHidden = await mutuals(A, [B]);
  if (bHidden.rows.length === 0) ok("B hides, and A opening B's profile is shown nobody in common");
  else bad("B hides and A is shown nobody", JSON.stringify(bHidden.rows));

  await setVisible(B, true);
  const bBack = await mutuals(A, [B]);
  if (sees(bBack, C)) ok("...and restored when B turns it back on");
  else bad("restored when B turns it back on", JSON.stringify(bBack.rows));

  console.log(NL + "4. it governs EXPOSURE, not access — hiding yourself does not blind you" + NL);

  // The deliberate asymmetry, and the one most likely to be "fixed" into reciprocity by someone
  // who has not read 0184's header. resume_public and show_on_ranks behave the same way.
  await setVisible(A, false);
  const aHidden = await mutuals(A, [B]);
  if (sees(aHidden, C)) ok("A hides themselves and still sees their own mutuals with B");
  else bad("A hides themselves and still sees their own mutuals", JSON.stringify(aHidden.rows));
  await setVisible(A, true);

  console.log(NL + "5. still shut where it was already shut" + NL);

  const anon = await mutuals(null, [B]);
  if (anon.status >= 300) ok("a signed-out caller is refused outright (status " + anon.status + ")");
  else bad("a signed-out caller is refused", "status " + anon.status + " " + JSON.stringify(anon.body));
}

main()
  .catch((e) => { fail++; console.log("  FAIL harness: " + e.message); })
  .finally(async () => {
    await destroy();
    console.log(NL + (fail
      ? "probe-mutuals-visible-switch: " + fail + " failed of " + (pass + fail) + "."
      : "probe-mutuals-visible-switch: ok — the switch suppresses at both ends, restores, and does not blind its owner (" + pass + " assertions)."));
    process.exitCode = fail ? 1 : 0;
  });
