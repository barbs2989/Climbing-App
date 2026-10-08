// The whole friend-request lifecycle, walked by three REAL accounts against the live database.
//
// Every friend feature in the app is one row in `connections` (0087) moving through
// pending -> accepted | declined, or being deleted. The policies were reviewed when they were
// written; the LIFECYCLE never was. In particular nothing had asked:
//   * can a request be sent AGAIN after a decline or an unfriend (the pair index is UNORDERED,
//     so a leftover row turns the second request into a 23505)?
//   * can the person you asked send you a request back while yours is pending?
//   * does a BLOCK stop a climber sending you friend requests? (0185's header says
//     "There is no trigger on `connections`" and blockUser() touches connections not at all.)
//
// Method, same as check:block-guarantees: the service key CREATES the accounts and READS BACK
// outcomes, nothing else. Every write under test goes through the anon key plus that climber's
// own JWT. A status code is never the verdict -- RLS answers a refused PATCH with 200 and zero
// rows -- so each attack is judged by reading the row back.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const DOMAIN = "climbmatch-qa.invalid";
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const findings = [];
const ok = (label) => { pass++; console.log("  ok   " + label); };
const bad = (label, detail) => { fail++; console.log("  FAIL " + label + (detail ? "  -- " + detail : "")); };
// A NOTE is a measured behaviour that is not a policy violation but matters to the product.
const note = (label) => { findings.push(label); console.log("  NOTE " + label); };

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
const code = (res) => (res && res.body && res.body.code) || "";

async function createUser(tag, name) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "friends-" + tag + "-" + stamp + "@" + DOMAIN;
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

// Writes as a climber.
const request = (from, to, extra) => api("/rest/v1/connections", {
  method: "POST", body: JSON.stringify({ requester: from.id, addressee: to.id, ...(extra || {}) }),
}, anonKey(), from.jwt);
const respond = (as, rowId, status) => api("/rest/v1/connections?id=eq." + rowId, {
  method: "PATCH", body: JSON.stringify({ status }),
}, anonKey(), as.jwt);
const remove = (as, rowId) => api("/rest/v1/connections?id=eq." + rowId, { method: "DELETE" }, anonKey(), as.jwt);
const readAs = (as, a, b) => api("/rest/v1/connections?select=id,requester,addressee,status&or=(and(requester.eq." + a.id + ",addressee.eq." + b.id + "),and(requester.eq." + b.id + ",addressee.eq." + a.id + "))", { method: "GET" }, anonKey(), as.jwt);
// The verdict: what the database actually holds for this pair.
async function truth(a, b) {
  const r = await api("/rest/v1/connections?select=id,requester,addressee,status&or=(and(requester.eq." + a.id + ",addressee.eq." + b.id + "),and(requester.eq." + b.id + ",addressee.eq." + a.id + "))", { method: "GET" }, svc);
  if (r.status >= 300 || !Array.isArray(r.body)) throw new Error("service read-back failed (" + r.status + ")");
  return r.body;
}

const made = [];
async function destroy() {
  for (const u of made) await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
}

async function main() {
  console.log("friend-request lifecycle — three real accounts, anon key + each climber's own JWT" + NL);
  const A = await createUser("a", "Ada Fixture");
  const B = await createUser("b", "Bo Fixture");
  const C = await createUser("c", "Cy Fixture");
  made.push(A, B, C);
  for (const u of [A, B, C]) u.jwt = await signIn(u);

  // ---- 1. SEND
  const send = await request(A, B);
  let rows = await truth(A, B);
  if (send.status < 300 && rows.length === 1 && rows[0].status === "pending") ok("A sends B a request — one pending row");
  else throw new Error("CONTROL FAILED: A could not request B (" + send.status + " " + JSON.stringify(send.body) + ")");
  const rowAB = rows[0].id;

  // ---- 2. FORGERY ATTEMPTS — each must leave the database unchanged
  const forgedFrom = await request({ ...C, id: B.id, jwt: C.jwt }, A); // C claims to be B
  rows = await truth(B, A);
  if (forgedFrom.status >= 300 && rows.length === 1 && rows[0].id === rowAB) ok("C cannot send a request in B's name (" + (code(forgedFrom) || forgedFrom.status) + ")");
  else bad("C cannot send a request in B's name", forgedFrom.status + " " + JSON.stringify(rows));
  const forgedAccepted = await request(C, B, { status: "accepted" });
  rows = await truth(C, B);
  if (forgedAccepted.status >= 300 && rows.length === 0) ok("C cannot insert an already-ACCEPTED connection to a stranger (" + (code(forgedAccepted) || forgedAccepted.status) + ")");
  else bad("C cannot insert an already-ACCEPTED connection", forgedAccepted.status + " " + JSON.stringify(rows));
  await respond(A, rowAB, "accepted");
  rows = await truth(A, B);
  if (rows[0].status === "pending") ok("the REQUESTER cannot accept their own request (row still pending)");
  else bad("the REQUESTER cannot accept their own request", JSON.stringify(rows));
  await respond(C, rowAB, "declined");
  rows = await truth(A, B);
  if (rows[0].status === "pending") ok("a THIRD climber cannot answer someone else's request");
  else bad("a THIRD climber cannot answer someone else's request", JSON.stringify(rows));
  const del3 = await remove(C, rowAB);
  rows = await truth(A, B);
  if (rows.length === 1) ok("a THIRD climber cannot delete someone else's request");
  else bad("a THIRD climber cannot delete someone else's request", del3.status);

  // ---- 3. VISIBILITY
  const seenB = await readAs(B, A, B), seenC = await readAs(C, A, B);
  if (Array.isArray(seenB.body) && seenB.body.length === 1) ok("B (the addressee) can see the incoming request");
  else bad("B can see the incoming request", JSON.stringify(seenB.body));
  if (Array.isArray(seenC.body) && seenC.body.length === 0) ok("C cannot see a request between A and B");
  else bad("C cannot see a request between A and B", JSON.stringify(seenC.body));

  // ---- 4. CROSSED REQUESTS — B asks A while A's request to B is pending
  const crossed = await request(B, A);
  rows = await truth(A, B);
  if (crossed.status >= 300 && code(crossed) === "23505" && rows.length === 1) note("a CROSSED request (B asks A while A->B is pending) is refused 23505 — the client must turn it into an ACCEPT, or B sees an error");
  else if (crossed.status < 300) bad("crossed request created a second half-relationship", JSON.stringify(rows));
  else note("crossed request refused with " + (code(crossed) || crossed.status));

  // ---- 5. DECLINE, then ASK AGAIN
  await respond(B, rowAB, "declined");
  rows = await truth(A, B);
  if (rows.length === 1 && rows[0].status === "declined") ok("B declines — row is 'declined'");
  else bad("B declines", JSON.stringify(rows));
  const again = await request(A, B);
  if (again.status >= 300 && code(again) === "23505") note("after a DECLINE, a fresh request is refused 23505 while the declined row exists");
  else if (again.status < 300) note("after a DECLINE, a fresh request is accepted immediately");
  // The requester can still withdraw the (quietly) declined request -- but since 0267 they cannot then
  // ask again for 21 days. That closes the withdraw-and-re-ask loop this probe used to record as a NOTE.
  await remove(A, rowAB);
  const again2 = await request(A, B);
  rows = await truth(A, B);
  if (again2.status >= 300 && rows.length === 0) ok("a declined requester cannot withdraw and re-ask (0267 cooldown: " + ((again2.body && again2.body.message) || again2.status) + ")");
  else bad("a declined requester cannot withdraw and re-ask", again2.status + " " + JSON.stringify(rows));
  // The DECLINER changing their mind is not held to the cooldown: B asks A, A accepts.
  const fromDecliner = await request(B, A);
  rows = await truth(A, B);
  if (fromDecliner.status < 300 && rows.length === 1) ok("...while the DECLINER may ask at any time");
  else bad("the decliner may ask at any time", fromDecliner.status + " " + JSON.stringify(fromDecliner.body));
  const rowAB2 = rows[0] && rows[0].id;

  // ---- 6. ACCEPT, then UNFRIEND, then re-request
  await respond(A, rowAB2, "accepted");
  rows = await truth(A, B);
  if (rows[0] && rows[0].status === "accepted") ok("A accepts — row is 'accepted'");
  else bad("A accepts", JSON.stringify(rows));
  await respond(A, rowAB2, "pending");
  rows = await truth(A, B);
  if (rows[0].status === "accepted") ok("an accepted connection cannot be pushed back to pending");
  else bad("an accepted connection cannot be pushed back to pending", JSON.stringify(rows));
  await remove(A, rowAB2);
  rows = await truth(A, B);
  if (rows.length === 0) ok("A unfriends B — the row is gone for both");
  else bad("A unfriends B", JSON.stringify(rows));
  const after = await request(B, A);
  rows = await truth(A, B);
  if (after.status < 300 && rows.length === 1 && rows[0].requester === B.id) ok("after an unfriend, either side can ask again");
  else bad("after an unfriend, either side can ask again", after.status + " " + JSON.stringify(after.body));
  const rowBA = rows[0] && rows[0].id;

  // ---- 7. BLOCK vs. FRIENDSHIP (0257). Before it, all three of these were NOTES: a block left the
  // friendship in place and a blocked climber could still send requests. Now they are guarantees.
  await respond(A, rowBA, "accepted");
  rows = await truth(A, B);
  if (!(rows.length === 1 && rows[0].status === "accepted")) throw new Error("CONTROL FAILED: A and B are not friends before the block");
  const blk = await api("/rest/v1/blocked_users", { method: "POST", body: JSON.stringify({ blocker: A.id, blocked: B.id }) }, anonKey(), A.jwt);
  if (blk.status >= 300) throw new Error("A could not block B (" + blk.status + " " + JSON.stringify(blk.body) + ")");
  rows = await truth(A, B);
  if (rows.length === 0) ok("blocking a FRIEND ends the friendship server-side (0257 trigger)");
  else bad("blocking a FRIEND ends the friendship server-side", JSON.stringify(rows));
  const fromBlocked = await request(B, A);
  rows = await truth(A, B);
  if (fromBlocked.status >= 300 && rows.length === 0) ok("the BLOCKED climber cannot send their blocker a friend request (" + (code(fromBlocked) || fromBlocked.status) + ")");
  else bad("the BLOCKED climber cannot send their blocker a friend request", fromBlocked.status + " " + JSON.stringify(rows));
  const msg = JSON.stringify(fromBlocked.body || "");
  if (!/block/i.test(msg)) ok("...and the refusal never says the word 'block' (" + ((fromBlocked.body && fromBlocked.body.message) || "") + ")");
  else bad("...and the refusal never says the word 'block'", msg);
  const fromBlocker = await request(A, B);
  rows = await truth(A, B);
  if (fromBlocker.status >= 300 && rows.length === 0) ok("the BLOCKER cannot hold a request to someone they blocked either — unblock first");
  else bad("the BLOCKER cannot hold a request to someone they blocked", fromBlocker.status + " " + JSON.stringify(rows));
  // A pending request is cleared by a block too, whichever side sent it.
  const cPending = await request(C, A);
  if (cPending.status >= 300) throw new Error("CONTROL FAILED: C could not request A (" + cPending.status + ")");
  const blk2 = await api("/rest/v1/blocked_users", { method: "POST", body: JSON.stringify({ blocker: A.id, blocked: C.id }) }, anonKey(), A.jwt);
  if (blk2.status >= 300) throw new Error("A could not block C (" + blk2.status + ")");
  rows = await truth(A, C);
  if (rows.length === 0) ok("blocking someone with a PENDING request to you clears the request");
  else bad("blocking someone with a PENDING request to you clears the request", JSON.stringify(rows));
  // Unblocking lifts the guard: the control that proves the refusals above were the block, not something else.
  const unb = await api("/rest/v1/blocked_users?blocker=eq." + A.id + "&blocked=eq." + B.id, { method: "DELETE" }, anonKey(), A.jwt);
  const afterUnblock = await request(B, A);
  rows = await truth(A, B);
  if (unb.status < 300 && afterUnblock.status < 300 && rows.length === 1) ok("after UNBLOCKING, a friend request goes through again");
  else bad("after UNBLOCKING, a friend request goes through again", unb.status + "/" + afterUnblock.status + " " + JSON.stringify(rows));
  if (rows[0]) await remove(B, rows[0].id);

  // ---- 8. THE REQUEST NOTE (0257). Delivered to the addressee, private to the pair, not editable.
  // C -> B: B withdrew their own request to A at the end of step 7, so 0267's cooldown now holds B -> A.
  const longNote = await request(C, B, { note: "x".repeat(301) });
  if (longNote.status >= 300 && code(longNote) === "23514") ok("a note over 300 characters is refused (23514)");
  else bad("a note over 300 characters is refused", longNote.status + " " + code(longNote));
  const withNote = await request(C, B, { note: "Want to rope up for the West Ridge next weekend?" });
  rows = await truth(C, B);
  if (withNote.status < 300 && rows[0] && rows[0].id) ok("a request can carry a note");
  else bad("a request can carry a note", withNote.status + " " + JSON.stringify(withNote.body));
  const nRow = rows[0] && rows[0].id;
  const bSees = await api("/rest/v1/connections?select=note&id=eq." + nRow, { method: "GET" }, anonKey(), B.jwt);
  if (Array.isArray(bSees.body) && bSees.body[0] && /West Ridge/.test(bSees.body[0].note || "")) ok("...the ADDRESSEE can read it");
  else bad("...the ADDRESSEE can read it", JSON.stringify(bSees.body));
  const aSees = await api("/rest/v1/connections?select=note&id=eq." + nRow, { method: "GET" }, anonKey(), A.jwt);
  if (Array.isArray(aSees.body) && aSees.body.length === 0) ok("...a third climber cannot");
  else bad("...a third climber cannot", JSON.stringify(aSees.body));
  await api("/rest/v1/connections?id=eq." + nRow, { method: "PATCH", body: JSON.stringify({ note: "edited by the addressee" }) }, anonKey(), B.jwt);
  const noteNow = await api("/rest/v1/connections?select=note&id=eq." + nRow, { method: "GET" }, svc);
  if (noteNow.body && noteNow.body[0] && /West Ridge/.test(noteNow.body[0].note || "")) ok("...and the addressee cannot rewrite it");
  else bad("...and the addressee cannot rewrite it", JSON.stringify(noteNow.body));

  console.log(NL + pass + " passed, " + fail + " failed, " + findings.length + " behaviour note(s).");
}

// process.exit() skips finally; throw instead, and tear down in finally (check:block-guarantees' lesson).
try {
  await main();
} finally {
  await destroy();
  const left = await api("/rest/v1/connections?select=id&or=(" + made.map((u) => "requester.eq." + u.id).join(",") + ")", { method: "GET" }, svc);
  console.log("torn down " + made.length + " account(s); connection rows left behind: " + (Array.isArray(left.body) ? left.body.length : "UNKNOWN"));
}
process.exitCode = fail ? 1 : 0;
