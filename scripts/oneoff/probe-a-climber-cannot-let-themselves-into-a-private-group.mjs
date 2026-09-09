// Can a climber let themselves into a group they were never admitted to?
//
// MEASURED ANSWER: YES, and it is the read capability. One unguarded INSERT into `group_members`
// seats an outsider in a PRIVATE, trust-gated group and hands them its name, location and full
// member roster. Everything else a member might try — flipping visibility, self-promotion, evicting
// the owner, disbanding — is correctly refused, so this is one precise hole rather than an
// unguarded table. The trust half is documented in ClimbMatch.jsx as a deliberate UI-only guardrail;
// the VISIBILITY half is documented there as "the half the app actually enforces", and that is the
// claim this contradicts. See the DECLARED GAP block below for why it is not repaired here.
//
// 0086 closed exactly this for CREWS — a climber could seat themselves `confirmed`, so the fix
// forbids self-seating above `pending` and forbids self-promotion. GROUPS are the same shape one
// entity over and have never been walked. Reading 0090, the insert policy is:
//
//     create policy "group_members join self" on group_members for insert
//       with check (auth.uid() = user_id and role = 'member');
//
// It constrains WHO you may seat (yourself) and AT WHAT ROLE (member). It references neither
// `groups.visibility` nor `groups.policy`. Two consequences worth measuring rather than asserting:
//
//   PRIVACY. `groups read public or member` is `using (visibility = 'public' or is_group_member(id))`,
//   and `group_members read visible` admits any member. So membership is the read capability: if the
//   insert above succeeds against a PRIVATE group, the climber gains its name, blurb, location and
//   full member roster. Needing the uuid first is not access control.
//
//   THE JOIN GATE. `groups.policy` is 'open' | 'approval' | 'trust'. Nothing in RLS reads it, so an
//   approval-only or trust-gated group would be enforced by the client alone. #1638 has just been
//   merged fixing that client gate ("a group could tell you your trust is 14 and then admit you to a
//   Trust 55+ only group"), which is worth nothing if the API admits anyone.
//
// A REALISTIC ROUTE TO THE ID, since a private group cannot be listed: the live INSERT policy
// refuses a group created private (CLAUDE.md records `42501`, and the fixture creates public then
// PATCHes), so every private group in this project was PUBLIC for a window and its id was readable
// by anyone during it. Note the id, join afterwards.
//
// THE FILE AND THE LIVE POLICY ARE RECORDED AS DISAGREEING HERE, and no static guard can see it:
// 0090 says `groups insert own` is `with check (auth.uid() = created_by)` with no visibility clause,
// which permits creating a private group outright, while the live database is documented as
// refusing it. `check:rls` replays MIGRATIONS, not the database. Section 0 settles which is true.
//
// WHY TWO ACCOUNTS: the service role bypasses RLS, so a service-key probe reports success either
// way. Everything under test goes through the anon key plus that climber's own JWT.
//
// A STATUS CODE DECIDES NOTHING. An RLS refusal is 403 for an authenticated role (401 for anon) and
// a zero-row PATCH answers 200 — so every attack is settled by reading the row back with the
// service key, which sees everything.
//
// Writes to the live project; the probe's own group is deleted with a read-back in `finally`,
// because `groups.created_by` is an FK to the owner and a group left behind blocks the account
// delete — which is how an earlier probe here leaked three accounts.
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

// An RLS refusal arrives as 403 for an authenticated role and 401 for anon — same refusal, two
// status codes — and `Prefer: return=representation` needs the SELECT policy as well as the INSERT
// one. Both were met in the previous probe in this series; neither is load-bearing here, but the
// representation is asked for only where the row is genuinely wanted back.
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
let fixture = null, groupId = null;

try {
  fixture = await createFixture(log);
  if (!fixture.mate || !fixture.mate.password) dead("no mate password — this probe must act AS the outsider.");
  const ownerTok = await signIn(fixture.owner.email, fixture.owner.password);
  const mateTok  = await signIn(fixture.mate.email,  fixture.mate.password);

  // ── 0. CAN A GROUP BE CREATED PRIVATE? (the recorded file-vs-live disagreement) ──────────────
  log("\n  Creating the group the mate was never admitted to:");
  const direct = await asUser(ownerTok, "POST", "groups",
    { name: `Probe private group ${TAG}`, visibility: "private", policy: "trust", created_by: fixture.owner.id });
  if (direct.status === 201) {
    groupId = direct.body[0].id;
    note(`a group CAN be created private outright (http 201) — 0090's file is right and CLAUDE.md's "live refuses it" note is STALE`);
  } else {
    note(`creating private outright was refused (http ${direct.status}) — matches the recorded live behaviour, so 0090's file does NOT describe the live policy`);
    const pub = await asUser(ownerTok, "POST", "groups",
      { name: `Probe private group ${TAG}`, visibility: "public", policy: "trust", created_by: fixture.owner.id });
    if (pub.status !== 201) dead(`could not create the probe group at all (http ${pub.status}): ${JSON.stringify(pub.body).slice(0, 200)}`);
    groupId = pub.body[0].id;
    const flip = await asUser(ownerTok, "PATCH", `groups?id=eq.${groupId}`, { visibility: "private" });
    if (flip.status !== 200) dead(`could not flip the probe group private (http ${flip.status})`);
    note("created public then flipped private — which is why every private group in this project had a public window");
  }

  const state = await asService("GET", `groups?id=eq.${groupId}&select=visibility,policy`);
  const st = (state.body || [])[0] || {};
  must(st.visibility === "private" && st.policy === "trust",
    `the group is PRIVATE and gated policy="${st.policy}" — so nothing below is about an open group`);

  // ── VACUITY GUARD ───────────────────────────────────────────────────────────────────────────
  // Every claim below rests on the mate genuinely being an outsider. If they could already read the
  // group, "they gained access" would be true of a state they were in beforehand.
  const before = await asUser(mateTok, "GET", `groups?id=eq.${groupId}&select=id,name`);
  must(Array.isArray(before.body) && before.body.length === 0,
    `CONTROL: the mate cannot read the private group before joining (${(before.body || []).length} rows) — so they are genuinely outside it`);

  const rosterBefore = await asUser(mateTok, "GET", `group_members?group_id=eq.${groupId}&select=user_id`);
  must(Array.isArray(rosterBefore.body) && rosterBefore.body.length === 0,
    `...nor its member roster (${(rosterBefore.body || []).length} rows)`);

  // ── 1. THE GAP: seat yourself in a private, trust-gated group ────────────────────────────────
  //
  // THIS IS A DECLARED GAP, ASSERTED IN ITS CURRENT STATE SO IT FAILS AS STALE THE MOMENT IT IS
  // CLOSED — the convention `check:a11y-badges` uses for the AreaLatest coverage hole. A gap
  // nothing asserts is a gap that rots, and a probe left permanently red is one people re-run and
  // ignore.
  //
  // The TRUST half is already documented in ClimbMatch.jsx beside GROUP_TRUST_MIN: "A UI GUARDRAIL,
  // NOT A SECURITY BOUNDARY: groups/group_members RLS carries no trust clause, so a determined
  // client can still insert the row." That is honest and deliberate, and this measures it.
  //
  // THE VISIBILITY HALF IS NOT, AND THAT IS THE FINDING. The same comment says "VISIBILITY WINS
  // because it is the half the app actually enforces: the browse list filters private groups out
  // for non-members, and `groups` RLS is read-public-or-member." Enforced against READING, yes —
  // but not against JOINING, and joining is self-service, so membership converts one unguarded
  // INSERT into the group's name, location and full member roster. The private-group promise rests
  // on the same open door as the trust promise.
  //
  // WHY THIS IS NOT FIXED HERE. The obvious repair — add `visibility`/`policy` clauses to
  // "group_members join self" — makes a private group unjoinable by ANYONE and an 'approval' group
  // unjoinable full stop, because neither an invite flow nor an approval flow exists (approval
  // toasts "this preview doesn't send it to a moderator yet"). That is the trap this series keeps
  // recording: a policy that refuses everything passes every attack assertion while having broken
  // the feature. Closing it needs the invite/approval path built first, which is a product
  // decision rather than a policy edit.
  log("\n  DECLARED GAP — an outsider seats themselves in a private, trust-gated group:");
  const join = await asUser(mateTok, "POST", "group_members",
    { group_id: groupId, user_id: fixture.mate.id, role: "member" }, { represent: false });
  const seat = await asService("GET", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.mate.id}&select=role`);
  const seated = Array.isArray(seat.body) && seat.body.length === 1;
  must(seated,
    `an uninvited climber CAN still join a private trust-gated group (http ${join.status}) — declared gap; if this now FAILS the hole is closed, delete this block and the note in ClimbMatch.jsx`);

  const after = await asUser(mateTok, "GET", `groups?id=eq.${groupId}&select=id,name,blurb,location`);
  const rosterAfter = await asUser(mateTok, "GET", `group_members?group_id=eq.${groupId}&select=user_id,role`);
  must(Array.isArray(after.body) && after.body.length === 1,
    `...and that one INSERT hands them the private group itself — name "${((after.body || [])[0] || {}).name}"`);
  must(Array.isArray(rosterAfter.body) && rosterAfter.body.length === 2,
    `...and its full member roster (${(rosterAfter.body || []).length} members) — so "visibility wins" holds for READING and not for JOINING`);
  await asService("DELETE", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.mate.id}`).catch(() => {});

  // ── 2. WHAT A MEMBER MAY NOT DO ─────────────────────────────────────────────────────────────
  // Seat the mate with the SERVICE key so these are asked of a legitimate member. Without this the
  // refusals below would be expected of a correct policy for the wrong reason — the vacuity trap.
  log("\n  ...and as a genuine MEMBER, seated by the owner rather than by themselves:");
  await asService("POST", "group_members", { group_id: groupId, user_id: fixture.mate.id, role: "member" }, { represent: false });
  const nowIn = await asService("GET", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.mate.id}&select=role`);
  if (!(Array.isArray(nowIn.body) && nowIn.body.length === 1)) dead("could not seat the mate as a member for the second half.");

  const expose = await asUser(mateTok, "PATCH", `groups?id=eq.${groupId}`, { visibility: "public" });
  const vis = await asService("GET", `groups?id=eq.${groupId}&select=visibility`);
  must(((vis.body || [])[0] || {}).visibility === "private",
    `a member cannot make a private group PUBLIC (http ${expose.status} — a zero-row PATCH answers 200)`);

  const promote = await asUser(mateTok, "PATCH", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.mate.id}`, { role: "moderator" });
  const roleNow = await asService("GET", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.mate.id}&select=role`);
  must(((roleNow.body || [])[0] || {}).role === "member",
    `...nor promote themselves to moderator (still "${((roleNow.body || [])[0] || {}).role}", http ${promote.status})`);

  const evict = await asUser(mateTok, "DELETE", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.owner.id}`);
  const ownerSeat = await asService("GET", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.owner.id}&select=role`);
  must(Array.isArray(ownerSeat.body) && ownerSeat.body.length === 1,
    `...nor evict the owner (http ${evict.status}) — a 204 is not evidence a row went`);

  const disband = await asUser(mateTok, "DELETE", `groups?id=eq.${groupId}`);
  const alive = await asService("GET", `groups?id=eq.${groupId}&select=id`);
  must(Array.isArray(alive.body) && alive.body.length === 1,
    `...nor disband the group (http ${disband.status})`);

  // ── 3. CONTROLS: the owner's own authority still works ───────────────────────────────────────
  log("\n  CONTROL — the owner still has authority over their own group:");
  const ownFlip = await asUser(ownerTok, "PATCH", `groups?id=eq.${groupId}`, { visibility: "public" });
  const ownVis = await asService("GET", `groups?id=eq.${groupId}&select=visibility`);
  must(((ownVis.body || [])[0] || {}).visibility === "public",
    `the owner CAN change visibility (http ${ownFlip.status}) — so the member's refusal above is about authority`);

  const ownPromote = await asUser(ownerTok, "PATCH", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.mate.id}`, { role: "moderator" });
  const ownRole = await asService("GET", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.mate.id}&select=role`);
  must(((ownRole.body || [])[0] || {}).role === "moderator",
    `...and CAN promote a member (http ${ownPromote.status})`);

  // A member leaving of their own accord must keep working, or the delete policy has been tightened
  // into refusing the one thing it exists to permit.
  const leave = await asUser(mateTok, "DELETE", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.mate.id}`);
  const left = await asService("GET", `group_members?group_id=eq.${groupId}&user_id=eq.${fixture.mate.id}&select=role`);
  must(Array.isArray(left.body) && left.body.length === 0,
    `...and a member CAN leave of their own accord (http ${leave.status})`);

} catch (e) {
  console.error("\n" + String(e && e.stack ? e.stack : e).slice(0, 900));
  bad++;
} finally {
  // `groups.created_by` is an FK to the owner's account, so a group left behind blocks the account
  // delete and leaks BOTH accounts forever. Read back rather than trusting the status.
  if (groupId) {
    await asService("DELETE", `group_members?group_id=eq.${groupId}`).catch(() => {});
    await asService("DELETE", `groups?id=eq.${groupId}`).catch(() => {});
    const left = await asService("GET", `groups?id=eq.${groupId}&select=id`).catch(() => ({ body: [] }));
    const n = Array.isArray(left.body) ? left.body.length : -1;
    if (n !== 0) { console.error(`LEAKED: the probe group survived cleanup (${n}).`); bad++; }
    else log("  probe group removed.");
  }
  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
