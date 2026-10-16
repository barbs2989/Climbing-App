// THE THREE BLOCK GUARANTEES, RUN AS TWO REAL CLIMBERS.
//
// The Blocked-climbers screen makes hard promises: a blocked climber "can't message you, add you
// to a crew, or open your profile from their account". Three migrations implement those, and ALL
// THREE say in their own text that the behaviour was never actually exercised:
//
//   0088_blocked_users            a message guard (trigger)
//   0094_block_stops_crew_invite  "a real two-account test needs a second signed-up climber"
//   0095_blocked_cannot_read_profile
//       "BEHAVIOUR CANNOT BE PROVEN WITH ONE ACCOUNT. ... Until that is run, this is reviewed
//        and reasoned, NOT verified."
//
// That is a stated limitation, and this repo has learned to read one as a worklist. The
// machinery to close it already exists — scripts/lib/ui-fixture.mjs creates two real accounts —
// it had simply never been pointed at these.
//
// WHY IT HAS TO BE TWO ACCOUNTS, from 0095's own header: RLS subqueries are evaluated as the
// CALLING role, and 0088 restricts reading `blocked_users` to the blocker. A policy written the
// obvious way therefore runs its subquery AS THE BLOCKED PARTY, finds nothing, and returns the
// profile — "the policy would look present, pass review, and enforce nothing". The escape is a
// SECURITY DEFINER function. Nothing about that is observable from one account, and the service
// role bypasses RLS entirely, so a service-key probe would report success either way.
//
// NEVER THE SERVICE KEY FOR AN ASSERTION. It is used to CREATE the two accounts and for nothing
// else; every read and write under test goes through the anon key plus that climber's own JWT,
// which is the whole question.
//
// CONTROLS RUN FIRST, BEFORE ANY BLOCK. "0 rows after blocking" proves nothing unless the same
// read returned a row before it — RLS could be refusing for an unrelated reason, which is exactly
// the always-passing guard 0095 warns about. And each guarantee is RESTORED after unblocking, so
// a refusal is attributable to the block rather than to something else breaking mid-run.
//
// HAND-RUN, LOCAL ONLY, and deliberately not wired into CI — the same call check:message-delivery
// records. It needs the service key to create accounts (CI must never hold it), and the control
// leg inserts a `messages` row, which has NO delete policy: on per-run accounts that row goes
// with the cascade, but against CI's durable pair it would leak one per run forever.
import { SUPABASE_URL, anonKey } from "./lib/supabase-env.mjs";
import { createFixture } from "./lib/ui-fixture.mjs";

const URL = SUPABASE_URL;
const ANON = anonKey();
if (!URL || !ANON) { console.error("FAIL: no Supabase url/anon key — nothing was verified."); process.exit(1); }

let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`);
  if (!cond) fail++;
};
const dead = (m) => { throw new Error("nothing was verified: " + m); };

// The plain password grant, written here rather than imported: ui-fixture does not export its
// copy, and an auth POST is not the thing under test. What must never be retyped is the logic
// being verified, and none of that lives in this function.
async function signIn(user) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.access_token) dead(`could not sign in as ${user.email} (${r.status})`);
  return body.access_token;
}

// Every request under test: anon key + this climber's own JWT. No service key anywhere below.
const as = (token) => async (path, init = {}) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON, Authorization: `Bearer ${token}`,
      "Content-Type": "application/json", Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: r.status, json, text };
};

console.log("creating two real accounts (service key is used HERE and nowhere else)…");
const fx = await createFixture((m) => console.log(m));
const A = fx.owner, B = fx.mate;                       // A blocks B
let blockRowId = null, bCrewId = null;

try {
  const aTok = await signIn(A), bTok = await signIn(B);
  const a = as(aTok), b = as(bTok);
  console.log(`  A = ${A.name} <${A.email}>\n  B = ${B.name} <${B.email}>\n`);

  // B needs a crew of its own to invite A into: 0094's trigger fires on crew_members insert, and
  // the live insert policy requires invited_by = auth.uid() on a crew you created.
  const mk = await b("crews", { method: "POST", body: JSON.stringify({
    created_by: B.id, route_id: "wa_mount_baker_north_ridge" }) });
  if (mk.status >= 300 || !Array.isArray(mk.json) || !mk.json[0]) {
    dead(`B could not create a crew (${mk.status}) ${mk.text.slice(0, 200)} — the 0094 leg cannot run`);
  }
  bCrewId = mk.json[0].id;

  // ---------------------------------------------------------------- CONTROLS, before any block
  const seeBefore = await b(`profiles?id=eq.${A.id}&select=id`);
  ok("CONTROL — B can read A's profile before the block",
    seeBefore.status === 200 && Array.isArray(seeBefore.json) && seeBefore.json.length === 1,
    `${seeBefore.status} ${JSON.stringify(seeBefore.json)}`);

  const msgBefore = await b("messages", { method: "POST", body: JSON.stringify({
    sender_id: B.id, recipient_id: A.id, body: "block probe — control" }) });
  ok("CONTROL — B can message A before the block", msgBefore.status < 300,
    `${msgBefore.status} ${msgBefore.text.slice(0, 160)}`);

  const invBefore = await b("crew_members", { method: "POST", body: JSON.stringify({
    crew_id: bCrewId, user_id: A.id, invited_by: B.id, status: "invited" }) });
  ok("CONTROL — B can invite A to a crew before the block", invBefore.status < 300,
    `${invBefore.status} ${invBefore.text.slice(0, 160)}`);
  // Removed so the post-block insert is the same operation, not a duplicate-key refusal wearing
  // a block's clothes.
  if (invBefore.status < 300) {
    await b(`crew_members?crew_id=eq.${bCrewId}&user_id=eq.${A.id}`, { method: "DELETE" });
  }

  // ------------------------------------------------------------------------------- A blocks B
  const blk = await a("blocked_users", { method: "POST", body: JSON.stringify({
    blocker: A.id, blocked: B.id }) });
  if (blk.status >= 300 || !Array.isArray(blk.json) || !blk.json[0]) {
    dead(`A could not block B (${blk.status}) ${blk.text.slice(0, 200)}`);
  }
  blockRowId = blk.json[0].id;
  console.log("\n  A has blocked B.\n");

  // --------------------------------------------------------------------- the three guarantees
  const seeAfter = await b(`profiles?id=eq.${A.id}&select=id`);
  ok("0095 — a blocked climber cannot read the blocker's profile",
    seeAfter.status === 200 && Array.isArray(seeAfter.json) && seeAfter.json.length === 0,
    `${seeAfter.status} ${JSON.stringify(seeAfter.json)} — the SECURITY DEFINER escape is not holding`);

  const msgAfter = await b("messages", { method: "POST", body: JSON.stringify({
    sender_id: B.id, recipient_id: A.id, body: "block probe — should be refused" }) });
  ok("0088 — a blocked climber cannot message the blocker", msgAfter.status >= 400,
    `insert returned ${msgAfter.status} — the message went through`);

  const invAfter = await b("crew_members", { method: "POST", body: JSON.stringify({
    crew_id: bCrewId, user_id: A.id, invited_by: B.id, status: "invited" }) });
  ok("0094 — a blocked climber cannot add the blocker to a crew", invAfter.status >= 400,
    `insert returned ${invAfter.status} — the invite went through`);

  // Neither refusal may name the block: confirming one TO the blocked party is the leak the read
  // policy exists to prevent, and both migrations say so in their own comments.
  const leak = /block/i;
  ok("the message refusal does not disclose the block to the blocked climber",
    !leak.test(msgAfter.text), msgAfter.text.slice(0, 200));
  ok("the crew refusal does not disclose the block to the blocked climber",
    !leak.test(invAfter.text), invAfter.text.slice(0, 200));

  // ---------------------------------------------------- unblock: the refusals must be the BLOCK
  await a(`blocked_users?id=eq.${blockRowId}`, { method: "DELETE" });
  blockRowId = null;
  const seeRestored = await b(`profiles?id=eq.${A.id}&select=id`);
  ok("unblocking restores the profile read — so the refusal was the block, not something else",
    seeRestored.status === 200 && Array.isArray(seeRestored.json) && seeRestored.json.length === 1,
    `${seeRestored.status} ${JSON.stringify(seeRestored.json)}`);
} catch (e) {
  console.error("\nFAIL (" + (e && e.message ? e.message : e) + ")");
  fail++;
} finally {
  try { if (blockRowId) {
    const aTok = await signIn(A);
    await as(aTok)(`blocked_users?id=eq.${blockRowId}`, { method: "DELETE" });
  } } catch {}
  try { if (bCrewId) {
    const bTok = await signIn(B);
    await as(bTok)(`crews?id=eq.${bCrewId}`, { method: "DELETE" });
  } } catch {}
  const left = await fx.cleanup();
  if (Array.isArray(left) && left.length) {
    console.log(`\nteardown could not remove: ${JSON.stringify(left)}`);
    fail++;
  }
}

console.log(fail
  ? `\n${fail} failure(s).`
  : "\nall three block guarantees hold against two real accounts, and lift when the block does.");
process.exitCode = fail ? 1 : 0;
