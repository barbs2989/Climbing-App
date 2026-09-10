// Can a climber let themselves into a group they were never admitted to?
//
// MEASURED ANSWER, after 0178: NO — and the doors through the gate work, which is the half that
// makes the refusal shippable rather than a broken feature.
//
// The hole this closes is #1658's: `group_members join self` was
// `with check (auth.uid() = user_id and role = 'member')`, constraining WHO you seat and AT WHAT
// ROLE and reading neither `groups.visibility` nor `groups.policy`. Since
// `groups read public or member` keys on `is_group_member`, membership IS the read capability, so
// one INSERT handed an outsider a private group's name, blurb, location and full member roster.
//
// WHY THIS PROBE IS MOSTLY CONTROLS. A policy that refuses everything passes every attack
// assertion while having broken joining — the trap this series keeps recording — and tightening
// the gate is exactly the change most likely to cause it. So every refusal below is paired with
// the path that must still work:
//
//   REFUSED                                   STILL WORKS
//   self-seat into a private group            an invited climber accepts and is in
//   self-seat active into a gated group       a request lands, and a manager approves it
//   self-approve your own request             a manager approves it
//   promote yourself while accepting          a manager promotes you afterwards
//   invite somebody when you are not a manager  a manager invites
//                                             an OPEN public group is still one tap
//
// THE STATUS VOCABULARY IS `crew_members`', deliberately: pending / invited / active. Copying the
// design 0086 already proved beats a second vocabulary for one idea.
//
// `is_group_member` COUNTS ONLY `active`, and that is the load-bearing line: counting a request
// would hand an outsider the private group they were asking permission for — the original hole
// through the back door.
//
// WHY TWO ACCOUNTS: the service role bypasses RLS, so a service-key probe reports success either
// way. Everything under test goes through the anon key plus that climber's own JWT; the service
// key creates the accounts and reads rows back.
//
// A STATUS CODE DECIDES NOTHING. An RLS refusal is 403 for an authenticated role (401 for anon)
// and a zero-row PATCH answers 200 — so every attack is settled by reading the row back with the
// service key, which sees everything.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture } from "../lib/ui-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];

const SUPA = (envVal("VITE_SUPABASE_URL") || "").replace(/\/$/, "");
const ANON = envVal("VITE_SUPABASE_ANON_KEY");
const SERVICE = envVal("SUPABASE_SERVICE_KEY");
if (!SUPA || !ANON || !SERVICE) { console.error("needs the Supabase url, anon key and service key."); process.exit(1); }

const log = (...a) => console.log(...a);
let bad = 0, asserted = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };
const note = (m) => console.log(`  ---  ${m}`);
const dead = (m) => { throw new Error(m); };  // never process.exit(): it skips `finally`

async function req(key, jwt, method, pathQ, body, opts) {
  const h = { apikey: key, "Content-Type": "application/json" };
  if (jwt) h.Authorization = `Bearer ${jwt}`;
  const wantRow = !opts || opts.represent !== false;
  if ((method === "POST" || method === "PATCH") && wantRow) h.Prefer = "return=representation";
  const r = await fetch(`${SUPA}/rest/v1/${pathQ}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let out = null; try { out = await r.json(); } catch {}
  return { status: r.status, body: out };
}
const asUser = (jwt, m, p, b, o) => req(ANON, jwt, m, p, b, o);
const asService = (m, p, b, o) => req(SERVICE, SERVICE, m, p, b, o);

async function signIn(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) dead(`could not sign in as ${email}`);
  return j.access_token;
}

const TAG = process.env.GITHUB_RUN_ID || `local-${process.pid}-${Date.now()}`;
let fixture = null;
const made = [];   // every group this run creates, removed in `finally`

// Creating a group PRIVATE outright is refused by the live INSERT policy (measured in #1658 and
// re-confirmed each run below), so a private group is created public and flipped — which is also
// why every private group in this project had a public window in which its id was readable.
async function makeGroup(tok, ownerId, { visibility, policy }) {
  const r = await asUser(tok, "POST", "groups",
    { name: `Probe ${policy}/${visibility} ${TAG}`, visibility: "public", policy, created_by: ownerId });
  if (r.status !== 201) dead(`could not create a ${policy} group (http ${r.status}): ${JSON.stringify(r.body).slice(0, 200)}`);
  const id = r.body[0].id;
  made.push(id);
  if (visibility === "private") {
    const f = await asUser(tok, "PATCH", `groups?id=eq.${id}`, { visibility: "private" });
    if (f.status !== 200) dead(`could not flip that group private (http ${f.status})`);
  }
  return id;
}
const seatOf = async (gid, uid) => {
  const r = await asService("GET", `group_members?group_id=eq.${gid}&user_id=eq.${uid}&select=status,role`);
  return (r.body || [])[0] || null;
};

try {
  fixture = await createFixture(log);
  if (!fixture.mate || !fixture.mate.password) dead("no mate password — this probe must act AS the outsider.");
  const ownerTok = await signIn(fixture.owner.email, fixture.owner.password);
  const mateTok  = await signIn(fixture.mate.email,  fixture.mate.password);
  const OWNER = fixture.owner.id, MATE = fixture.mate.id;

  const direct = await asUser(ownerTok, "POST", "groups",
    { name: `Probe direct-private ${TAG}`, visibility: "private", policy: "open", created_by: OWNER });
  if (direct.status === 201) { made.push(direct.body[0].id); note("a group CAN be created private outright — 0090's file is right and the recorded live behaviour is STALE"); }
  else note(`creating private outright is still refused (http ${direct.status}) — 0090's file does NOT describe the live policy`);

  const priv = await makeGroup(ownerTok, OWNER, { visibility: "private", policy: "trust" });
  const gated = await makeGroup(ownerTok, OWNER, { visibility: "public", policy: "approval" });
  const open = await makeGroup(ownerTok, OWNER, { visibility: "public", policy: "open" });

  // ── VACUITY GUARD ───────────────────────────────────────────────────────────────────────────
  // Every refusal below only discriminates if the mate is genuinely outside these groups, and the
  // owner's own seat has to exist or "a manager may invite" is being asked of a non-manager.
  const ownerSeat = await seatOf(priv, OWNER);
  must(ownerSeat && ownerSeat.role === "owner" && ownerSeat.status === "active",
    `the creator is seated owner/active by the trigger (${JSON.stringify(ownerSeat)}) — so the invites below come from a real manager`);
  const before = await asUser(mateTok, "GET", `groups?id=eq.${priv}&select=id,name`);
  must(Array.isArray(before.body) && before.body.length === 0,
    `CONTROL: the mate cannot read the private group at all (${(before.body || []).length} rows) — genuinely outside it`);

  // ── 1. THE GATE ─────────────────────────────────────────────────────────────────────────────
  log("\n  THE GATE — self-seating, which is how #1658's outsider got in:");
  const selfPriv = await asUser(mateTok, "POST", "group_members",
    { group_id: priv, user_id: MATE, role: "member" }, { represent: false });
  must(!(await seatOf(priv, MATE)),
    `an outsider CANNOT seat themselves in a private group (http ${selfPriv.status}) — #1658's hole, closed`);

  const selfPend = await asUser(mateTok, "POST", "group_members",
    { group_id: priv, user_id: MATE, role: "member", status: "pending" }, { represent: false });
  must(!(await seatOf(priv, MATE)),
    `...nor request one (http ${selfPend.status}) — a private group reads "Invite only", so it takes neither`);

  const selfGated = await asUser(mateTok, "POST", "group_members",
    { group_id: gated, user_id: MATE, role: "member", status: "active" }, { represent: false });
  must(!(await seatOf(gated, MATE)),
    `...nor walk straight into an approval-gated group (http ${selfGated.status})`);

  // ── 2. THE DOORS ────────────────────────────────────────────────────────────────────────────
  log("\n  THE DOORS — what must still work, or the gate has broken joining:");
  const joinOpen = await asUser(mateTok, "POST", "group_members",
    { group_id: open, user_id: MATE, role: "member" }, { represent: false });
  const openSeat = await seatOf(open, MATE);
  must(openSeat && openSeat.status === "active",
    `an OPEN public group is still one tap (http ${joinOpen.status}, status "${openSeat && openSeat.status}")`);

  const ask = await asUser(mateTok, "POST", "group_members",
    { group_id: gated, user_id: MATE, role: "member", status: "pending" }, { represent: false });
  const asked = await seatOf(gated, MATE);
  must(asked && asked.status === "pending",
    `a climber CAN ask to join a gated group (http ${ask.status}, status "${asked && asked.status}")`);

  // NOT ASSERTED HERE, deliberately: "a pending request buys no read access". A gated group is
  // PUBLIC, and a public group's roster has been world-readable since 0090 — so on this group the
  // question is not expressible, and asserting it would fail against correct, pre-existing
  // behaviour. The invariant is tested where it can be: on the PRIVATE group below, where an
  // INVITED climber sees the group and not the roster until they accept.

  const selfApprove = await asUser(mateTok, "PATCH",
    `group_members?group_id=eq.${gated}&user_id=eq.${MATE}`, { status: "active" });
  must(((await seatOf(gated, MATE)) || {}).status === "pending",
    `...and they CANNOT approve themselves (http ${selfApprove.status} — a zero-row PATCH answers 200)`);

  const approve = await asUser(ownerTok, "PATCH",
    `group_members?group_id=eq.${gated}&user_id=eq.${MATE}`, { status: "active" });
  must(((await seatOf(gated, MATE)) || {}).status === "active",
    `...and the ORGANISER can approve it (http ${approve.status}) — so the refusal above is about authority`);

  // ── 3. THE INVITE, which is the only way into a private group now ────────────────────────────
  log("\n  THE INVITE — the only door into a private group:");
  const strangerInvite = await asUser(mateTok, "POST", "group_members",
    { group_id: priv, user_id: MATE, role: "member", status: "invited" }, { represent: false });
  must(!(await seatOf(priv, MATE)),
    `a climber cannot invite THEMSELVES (http ${strangerInvite.status}) — otherwise the invite path is the hole again`);

  const invite = await asUser(ownerTok, "POST", "group_members",
    { group_id: priv, user_id: MATE, role: "member", status: "invited" }, { represent: false });
  const invited = await seatOf(priv, MATE);
  must(invited && invited.status === "invited",
    `a manager CAN invite them (http ${invite.status}, status "${invited && invited.status}")`);

  const seesGroup = await asUser(mateTok, "GET", `groups?id=eq.${priv}&select=id,name`);
  must(Array.isArray(seesGroup.body) && seesGroup.body.length === 1,
    `...and an invitee can SEE what they were invited to (${(seesGroup.body || []).length} rows) — an invite naming an unreadable group is unusable`);

  const rosterWhileInvited = await asUser(mateTok, "GET", `group_members?group_id=eq.${priv}&user_id=eq.${OWNER}&select=user_id`);
  must(Array.isArray(rosterWhileInvited.body) && rosterWhileInvited.body.length === 0,
    `...but NOT the roster, until they accept (${(rosterWhileInvited.body || []).length} rows) — an invitation is not membership`);

  const sneakyPromote = await asUser(mateTok, "PATCH",
    `group_members?group_id=eq.${priv}&user_id=eq.${MATE}`, { status: "active", role: "moderator" });
  must(((await seatOf(priv, MATE)) || {}).role === "member",
    `...and accepting cannot promote them in the same breath (http ${sneakyPromote.status})`);

  const accept = await asUser(mateTok, "PATCH",
    `group_members?group_id=eq.${priv}&user_id=eq.${MATE}`, { status: "active" });
  const accepted = await seatOf(priv, MATE);
  must(accepted && accepted.status === "active",
    `...and they CAN accept (http ${accept.status}, status "${accepted && accepted.status}")`);

  const rosterNow = await asUser(mateTok, "GET", `group_members?group_id=eq.${priv}&select=user_id`);
  must(Array.isArray(rosterNow.body) && rosterNow.body.length === 2,
    `...and only THEN does the roster open to them (${(rosterNow.body || []).length} members)`);

  // ── 3b. THE READS THE APP DEPENDS ON ────────────────────────────────────────────────────────
  // A door nobody can SEE is not a door. These mirror the two queries `useGroupJoinRequests` and
  // `useMyGroupInvites` issue, because a policy can permit the write and still hide the row that
  // tells somebody to act on it — and then a request reaches nobody exactly as before.
  log("\n  THE READS — a request a manager cannot see reaches nobody:");
  const managerSees = await asUser(ownerTok,
    "GET", `group_members?group_id=eq.${gated}&status=eq.pending&select=group_id,user_id`);
  must(Array.isArray(managerSees.body) && managerSees.body.some((r) => r.user_id === MATE) === false,
    `(the gated request was already approved above, so nothing is pending there now — ${(managerSees.body || []).length} rows)`);

  const pending2 = await makeGroup(ownerTok, OWNER, { visibility: "public", policy: "approval" });
  await asUser(mateTok, "POST", "group_members",
    { group_id: pending2, user_id: MATE, role: "member", status: "pending" }, { represent: false });
  const seen = await asUser(ownerTok,
    "GET", `group_members?group_id=eq.${pending2}&status=eq.pending&select=group_id,user_id`);
  must(Array.isArray(seen.body) && seen.body.length === 1 && seen.body[0].user_id === MATE,
    `an organiser CAN see a pending request on their own group (${(seen.body || []).length} rows) — the query useGroupJoinRequests issues`);

  // An invitation to a PRIVATE group sits on a roster its recipient cannot read, so without
  // 0178's `group_members read own` the one person it is for would never see it.
  const priv2 = await makeGroup(ownerTok, OWNER, { visibility: "private", policy: "open" });
  await asUser(ownerTok, "POST", "group_members",
    { group_id: priv2, user_id: MATE, role: "member", status: "invited" }, { represent: false });
  const mineInv = await asUser(mateTok,
    "GET", `group_members?user_id=eq.${MATE}&status=eq.invited&select=group_id`);
  must(Array.isArray(mineInv.body) && mineInv.body.some((r) => r.group_id === priv2),
    `an invitee CAN see their own invitation to a private group (${(mineInv.body || []).length} rows) — the query useMyGroupInvites issues`);

  // ── 4. A MEMBER'S CEILING is unchanged by all of this ────────────────────────────────────────
  log("\n  ...and a genuine member still cannot run the group:");
  const expose = await asUser(mateTok, "PATCH", `groups?id=eq.${priv}`, { visibility: "public" });
  const vis = await asService("GET", `groups?id=eq.${priv}&select=visibility`);
  must(((vis.body || [])[0] || {}).visibility === "private",
    `a member cannot make a private group PUBLIC (http ${expose.status})`);

  const promote = await asUser(mateTok, "PATCH", `group_members?group_id=eq.${priv}&user_id=eq.${MATE}`, { role: "moderator" });
  must(((await seatOf(priv, MATE)) || {}).role === "member",
    `...nor promote themselves (http ${promote.status})`);

  const disband = await asUser(mateTok, "DELETE", `groups?id=eq.${priv}`);
  const alive = await asService("GET", `groups?id=eq.${priv}&select=id`);
  must(Array.isArray(alive.body) && alive.body.length === 1,
    `...nor disband it (http ${disband.status}) — a 204 is not evidence a row went`);

  const leave = await asUser(mateTok, "DELETE", `group_members?group_id=eq.${priv}&user_id=eq.${MATE}`);
  must(!(await seatOf(priv, MATE)),
    `CONTROL: ...but they CAN leave of their own accord (http ${leave.status})`);

} catch (e) {
  console.error("\n" + String(e && e.stack ? e.stack : e).slice(0, 900));
  bad++;
} finally {
  // `groups.created_by` is an FK to the owner's account, so a group left behind blocks the account
  // delete and leaks BOTH accounts forever. Read back rather than trusting the status.
  for (const id of made) {
    await asService("DELETE", `group_members?group_id=eq.${id}`).catch(() => {});
    await asService("DELETE", `groups?id=eq.${id}`).catch(() => {});
  }
  let left = 0;
  for (const id of made) {
    const r = await asService("GET", `groups?id=eq.${id}&select=id`).catch(() => ({ body: [] }));
    left += Array.isArray(r.body) ? r.body.length : 1;
  }
  if (left) { console.error(`LEAKED: ${left} probe group(s) survived cleanup.`); bad++; }
  else log(`  probe groups removed (${made.length}).`);

  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
