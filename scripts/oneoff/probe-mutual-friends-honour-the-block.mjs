// Does `mutual_connections` (0185) refuse to NAME a climber who blocked the caller?
//
// `0182` filtered the profile being OPENED and not the person being NAMED. The guard asserts both
// filters as SOURCE; that proves the migration says the right thing and nothing about what the
// database does -- which is exactly the trap `0095`'s header records, where a block check "would
// look present, pass review, and enforce nothing" because an RLS subquery runs as the CALLER. The
// service role bypasses RLS entirely, so a service-key probe reports success either way.
//
// So the service key CREATES the accounts and touches nothing else. Every read, every block and
// every connection under test goes through the anon key plus that climber's own JWT.
//
// THREE ACCOUNTS, because a mutual needs A and B both connected to C, and the block needs C to act
// against A. That is one more than scripts/lib/ui-fixture.mjs builds.
//
// THE CONTROL RUNS BEFORE ANY BLOCK. "C is absent once C blocks A" is equally true of a function
// that broke, a connection that never landed and a JWT that expired, so each case asserts C is
// THERE first, blocks, asserts C is GONE, unblocks and asserts C RETURNED.
//
// AND THE SUPPRESSION MUST BE CALLER-RELATIVE, not a global mute. Section 4 is the load-bearing
// half: with C still blocking A, B must STILL see C. A "fix" that dropped any row touched by a
// block would pass every section above and quietly break the feature for uninvolved readers.
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
  return { status: r.status, body, text };
}

async function createUser(tag, name) {
  const email = "blk-" + tag + "-" + Date.now() + "@" + DOMAIN;
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

// The way the APP makes one: the requester asks, the addressee accepts. Writing an `accepted` row
// with the service key would manufacture a state RLS refuses -- 0180's header records that trap.
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

// Blocking goes through the blocker's own JWT, exactly as lib/db.js's blockUser() does. It writes
// ONLY the block row -- the connection survives, which is what makes this defect reachable at all.
async function block(blocker, blocked) {
  const { status, body } = await api("/rest/v1/blocked_users", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ blocker: blocker.id, blocked: blocked.id }),
  }, anonKey(), blocker.jwt);
  if (status >= 300) throw new Error("block " + blocker.tag + "->" + blocked.tag + " failed (" + status + "): " + JSON.stringify(body));
  const row = Array.isArray(body) ? body[0] : body;
  if (!row || !row.id) throw new Error("block " + blocker.tag + "->" + blocked.tag + " returned no row");
  return row.id;
}

async function unblock(blocker, rowId) {
  const { status } = await api("/rest/v1/blocked_users?id=eq." + rowId, { method: "DELETE" }, anonKey(), blocker.jwt);
  if (status >= 300) throw new Error("unblock " + blocker.tag + " failed (" + status + ")");
}

async function mutuals(caller, others) {
  const { status, body, text } = await api("/rest/v1/rpc/mutual_connections", {
    method: "POST",
    body: JSON.stringify({ others: others.map((o) => o.id) }),
  }, anonKey(), caller && caller.jwt);
  return { status, rows: Array.isArray(body) ? body : [], body, text: text || "" };
}

// The connection is asserted to SURVIVE the block, because the whole reachability argument rests
// on it. If a future trigger severs it, this probe's premise is gone and it must say so rather
// than passing on a state that no longer exists.
async function stillConnected(a, b) {
  const { status, body } = await api(
    "/rest/v1/connections?select=status&requester=in.(" + a.id + "," + b.id + ")&addressee=in.(" + a.id + "," + b.id + ")",
    {}, anonKey(), a.jwt);
  if (status >= 300) return false;
  return Array.isArray(body) && body.some((r) => r.status === "accepted");
}

const made = [];
async function destroy() {
  for (const u of made) {
    await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
  }
}

const sees = (r, who) => r.rows.some((x) => x.mutual_id === who.id);

async function main() {
  console.log("mutual_connections vs blocked_users — three real accounts, anon key + each climber's own JWT" + NL);

  const A = await createUser("a", "Ada Fixture");
  const B = await createUser("b", "Bo Fixture");
  const C = await createUser("c", "Cy Fixture");
  made.push(A, B, C);
  for (const u of [A, B, C]) u.jwt = await signIn(u);

  await connect(A, C);
  await connect(B, C);

  console.log("1. the control — no block anywhere, so C is named to A as a mutual with B" + NL);

  const base = await mutuals(A, [B]);
  if (base.status >= 300) {
    bad("A sees C as a mutual with B", "status " + base.status + " " + JSON.stringify(base.body));
    return;                       // every case below is vacuous without this
  }
  if (sees(base, C)) ok("with nobody blocked, A sees C as a mutual with B");
  else { bad("with nobody blocked, A sees C as a mutual with B", JSON.stringify(base.rows)); return; }

  console.log(NL + "2. a climber who blocked you is not NAMED to you — the 0182 gap" + NL);

  const cBlocksA = await block(C, A);

  if (await stillConnected(A, C)) ok("the block leaves the accepted connection standing, which is what makes this reachable");
  else bad("the block leaves the connection standing", "the premise is gone: something now severs the connection, so this probe proves nothing");

  const blocked = await mutuals(A, [B]);
  if (blocked.status >= 300) {
    bad("A can still call the RPC after being blocked", "status " + blocked.status);
  } else if (!sees(blocked, C)) {
    ok("C blocked A, so C is no longer named to A as a mutual with B");
  } else {
    bad("C blocked A, so C is no longer named to A", JSON.stringify(blocked.rows));
  }

  console.log(NL + "3. ...and the refusal does not NAME the block" + NL);

  // useMyBlocked's own comment: never show somebody who blocked them, because that "would turn a
  // safety tool into a notification". 0088/0094/0095 all refuse without disclosing, and
  // check:block-guarantees asserts it. A row that is simply absent names nothing.
  if (!/block/i.test(blocked.text)) ok("the response says nothing about a block — it is a shorter list, not a notification");
  else bad("the response says nothing about a block", blocked.text.slice(0, 200));

  console.log(NL + "4. the suppression is CALLER-RELATIVE, not a global mute" + NL);

  // The load-bearing non-vacuity case. C still blocks A here. A fix that dropped any row touched
  // by a block would pass sections 2 and 3 and silently break the feature for uninvolved readers.
  const forB = await mutuals(B, [A]);
  if (forB.status >= 300) {
    bad("B can still read their own mutuals", "status " + forB.status);
  } else if (sees(forB, C)) {
    ok("C's block of A does not hide C from B — the filter is about the caller, not the row");
  } else {
    bad("C's block of A does not hide C from B", "C vanished for an uninvolved reader: " + JSON.stringify(forB.rows));
  }

  console.log(NL + "5. unblocking restores them, so the flag is what did it" + NL);

  await unblock(C, cBlocksA);
  const restored = await mutuals(A, [B]);
  if (sees(restored, C)) ok("C unblocks A and is named again");
  else bad("C unblocks A and is named again", JSON.stringify(restored.rows));

  console.log(NL + "6. the MIRROR is deliberately not built — a climber YOU blocked is still named" + NL);

  // 0185's header states this and why: it is a preference rather than a privacy question, there is
  // no precedent (useMyConnections filters blocked climbers in NEITHER direction), and
  // profile_owner_blocked_me cannot express it. Pinned so reciprocity cannot be added silently --
  // and so the real fix above cannot be removed by somebody who mistakes it for the mirror.
  const aBlocksC = await block(A, C);
  const mirror = await mutuals(A, [B]);
  if (sees(mirror, C)) ok("A blocked C and still sees C named — the documented decision, not an oversight");
  else bad("A blocked C and still sees C named", "reciprocity appears to have been added; 0185 says it needs its own sentence in the documents first");
  await unblock(A, aBlocksC);

  console.log(NL + "7. 0182's original half still holds — the profile OPENED is filtered too" + NL);

  const bBlocksA = await block(B, A);
  const opened = await mutuals(A, [B]);
  if (opened.rows.length === 0) ok("B blocked A, so A opening B's profile is shown nobody in common");
  else bad("B blocked A, so A is shown nobody", JSON.stringify(opened.rows));
  await unblock(B, bBlocksA);
}

main()
  .catch((e) => { fail++; console.log("  FAIL harness: " + e.message); })
  .finally(async () => {
    await destroy();
    console.log(NL + (fail
      ? "probe-mutual-friends-honour-the-block: " + fail + " failed of " + (pass + fail) + "."
      : "probe-mutual-friends-honour-the-block: ok — a blocker is not named, the block is not disclosed, and uninvolved readers are unaffected (" + pass + " assertions)."));
    process.exitCode = fail ? 1 : 0;
  });
