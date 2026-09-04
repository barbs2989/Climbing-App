// 0163 fixed a crew-chat policy that let any confirmed member post into ANY crew's chat, and
// NOTHING HAS EVER EXERCISED IT. This does, with two real accounts.
//
// THE DEFECT 0163 FIXED. 0042 wrote the INSERT policy's subquery as `where m.crew_id = crew_id`.
// The subquery selects FROM crew_members, so the bare name binds to the INNER table and Postgres
// stored `m.crew_id = m.crew_id` — true for every row. The membership test collapsed from "a
// confirmed member of THIS crew" to "a confirmed member of ANY crew". 0163 qualifies it as
// `crews_messages.crew_id`.
//
// WHY ONE ACCOUNT CANNOT ANSWER IT, which is the whole reason this is a two-account probe and the
// argument 0095 already makes for the block guarantees: the broken policy and the fixed one are
// INDISTINGUISHABLE to a climber posting in a crew they belong to. Both let it through. The
// difference only appears when somebody who is confirmed SOMEWHERE ELSE posts here — and the
// service role bypasses RLS entirely, so a service-key probe reports success either way.
//
// THE FIXTURE ALREADY HAS THE STATE, and it needs no third crew:
//   crew        owner-created, BOTH accounts confirmed
//   inviteCrew  mate-created, the owner seated as `invited` and NOT confirmed
// So the owner posting into inviteCrew is exactly the 0163 shape — under the broken policy the
// owner's confirmed membership of `crew` would authorise it. The policy's other arm lets a crew's
// CREATOR post regardless, and inviteCrew was created by the mate, so that arm cannot rescue it
// either. A refusal is attributable to the qualified crew_id and to nothing else.
//
// CONTROLS RUN FIRST, and they are the non-vacuity proof: "0 rows inserted" means nothing unless
// the same write succeeded for somebody who is entitled to it. RLS could be refusing for an
// unrelated reason — the always-passing guard 0095 warns about.
//
// Every read and write under test goes through the ANON key plus that climber's own JWT. The
// service key creates the accounts and reads back what the anon path cannot see, and touches
// nothing else — what a second REAL account can do is the entire question.
//
// NOT INJECTION-PROVEN, and the reason is deliberate rather than an omission. The case would be to
// install 0042's broken policy on the live project, run, and restore — a knowingly-vulnerable
// policy on a live database, even for seconds, to test a fix that is already in. Refused. What
// stands in for it is a LOGICAL argument the run asserts rather than assumes: the broken predicate
// is "is this user confirmed in ANY crew", the probe proves by direct read that the owner IS
// confirmed in another crew, and the post is still refused. A policy that refuses a user the
// broken one would have admitted is checking the specific crew. That is an argument, not an
// injection, and it is labelled as one.
//
// Writes to the live project; per-run fixture, rows removed with the accounts.
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
if (!SUPA || !ANON || !SERVICE) {
  console.error("needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_KEY.");
  process.exit(1);
}

const log = (...a) => console.log(...a);
let bad = 0, asserted = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };
// NEVER process.exit() here: it skips `finally`, so the first failure would leak two accounts and
// two crews. This repo has that on record from a run that did exactly that.
const dead = (m) => { throw new Error(m); };

async function asUser(tokenOrKey, method, pathQ, body) {
  const h = { apikey: ANON, Authorization: `Bearer ${tokenOrKey}`, "Content-Type": "application/json" };
  if (method === "POST") h.Prefer = "return=representation";
  const r = await fetch(`${SUPA}/rest/v1/${pathQ}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let out = null;
  try { out = await r.json(); } catch {}
  return { status: r.status, body: out };
}
async function asService(method, pathQ, body) {
  const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
  if (method === "POST") h.Prefer = "return=representation";
  const r = await fetch(`${SUPA}/rest/v1/${pathQ}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let out = null;
  try { out = await r.json(); } catch {}
  return { status: r.status, body: out };
}
async function signIn(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) dead(`could not sign in as ${email}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}

// RUN_TAG so a message this run asserts on is its OWN. Two runs would otherwise read each other's
// rows — the concurrency hole check:message-delivery records finding in its own preview assertion.
const RUN_TAG = process.env.GITHUB_RUN_ID || `local-${process.pid}-${Date.now()}`;

let fixture = null;
const mine = [];  // crews_messages ids this run created, removed explicitly in teardown

try {
  fixture = await createFixture(log);
  if (!fixture.mate || !fixture.mate.password) dead("no mate password — this probe must write AS the second account.");

  const ownerTok = await signIn(fixture.owner.email, fixture.owner.password);
  const mateTok  = await signIn(fixture.mate.email,  fixture.mate.password);

  // The invite crew is not returned by the fixture, so find it: created by the mate, with the
  // owner seated on it. Read with the service key — the owner is only `invited`, and `crews` RLS
  // is created_by-or-member, so an anon read here would prove nothing about which row it is.
  const invRows = await asService("GET", `crews?created_by=eq.${fixture.mate.id}&select=id,created_by`);
  if (!Array.isArray(invRows.body) || invRows.body.length !== 1)
    dead(`expected exactly one mate-created crew, got ${JSON.stringify(invRows.body).slice(0, 200)}`);
  const inviteCrewId = invRows.body[0].id;

  // Assert the STATE this probe rests on rather than trusting the fixture's comment. If the owner
  // were confirmed on the invite crew, the refusal below would be expected of a CORRECT policy for
  // the wrong reason, and this whole run would be vacuous.
  const seat = await asService("GET", `crew_members?crew_id=eq.${inviteCrewId}&user_id=eq.${fixture.owner.id}&select=status`);
  must(Array.isArray(seat.body) && seat.body.length === 1 && seat.body[0].status === "invited",
    `the owner is seated on the mate's crew as "invited", not confirmed (got ${JSON.stringify(seat.body)})`);
  must(invRows.body[0].created_by !== fixture.owner.id,
    "the owner did NOT create that crew, so the policy's creator arm cannot authorise the post either");

  // THIS IS WHAT MAKES THE REFUSAL BELOW ATTRIBUTABLE, and without it the run is nearly vacuous.
  // The broken predicate is "is this user confirmed in ANY crew". So a refusal only discriminates
  // if the owner IS confirmed somewhere — otherwise the correct and the broken policy would both
  // refuse, for different reasons, and the probe could not tell them apart.
  //
  // The controls alone do NOT establish it: the owner CREATED crew A, so their successful post
  // there may be passing on the policy's creator arm rather than on confirmed membership. Read
  // the seat directly.
  const homeSeat = await asService("GET", `crew_members?crew_id=eq.${fixture.crew.id}&user_id=eq.${fixture.owner.id}&select=status`);
  must(Array.isArray(homeSeat.body) && homeSeat.body.length === 1 && homeSeat.body[0].status === "confirmed",
    `the owner IS confirmed in another crew (got ${JSON.stringify(homeSeat.body)}) — so the broken policy WOULD have let the post below through`);

  log("\n  CONTROLS — the same write must succeed for somebody entitled to it:");

  const ctlOwner = await asUser(ownerTok, "POST", "crews_messages",
    { crew_id: fixture.crew.id, user_id: fixture.owner.id, body: `owner in own crew ${RUN_TAG}` });
  must(ctlOwner.status === 201, `the owner CAN post in the crew they created (${ctlOwner.status})`);
  if (Array.isArray(ctlOwner.body) && ctlOwner.body[0]) mine.push(ctlOwner.body[0].id);

  const ctlMate = await asUser(mateTok, "POST", "crews_messages",
    { crew_id: fixture.crew.id, user_id: fixture.mate.id, body: `mate in a crew they joined ${RUN_TAG}` });
  must(ctlMate.status === 201, `a confirmed MEMBER can post in that crew (${ctlMate.status})`);
  if (Array.isArray(ctlMate.body) && ctlMate.body[0]) mine.push(ctlMate.body[0].id);

  log("\n  THE 0163 SHAPE — confirmed in crew A, posting into crew B:");

  const attack = await asUser(ownerTok, "POST", "crews_messages",
    { crew_id: inviteCrewId, user_id: fixture.owner.id, body: `SHOULD NOT LAND ${RUN_TAG}` });
  must(attack.status === 401 || attack.status === 403,
    `an invited-but-not-confirmed climber is REFUSED (${attack.status}${attack.body && attack.body.code ? " " + attack.body.code : ""})`);
  if (Array.isArray(attack.body) && attack.body[0]) mine.push(attack.body[0].id);

  // A STATUS IS NOT EVIDENCE ABOUT ROWS. This repo has read a 204 as a successful DELETE that RLS
  // had refused; read the table back with the service key, which sees everything.
  const landed = await asService("GET", `crews_messages?crew_id=eq.${inviteCrewId}&select=id,body`);
  const leaked = (Array.isArray(landed.body) ? landed.body : []).filter((m) => String(m.body || "").includes(RUN_TAG));
  must(leaked.length === 0, `...and NO row landed in that crew's chat (${leaked.length} found)`);
  for (const m of leaked) mine.push(m.id);

  log("\n  DELIVERY — the message a second real account sent must reach the other one:");

  const inbox = await asUser(ownerTok, "GET", `crews_messages?crew_id=eq.${fixture.crew.id}&select=id,user_id,body`);
  const rows = Array.isArray(inbox.body) ? inbox.body : [];
  const fromMate = rows.filter((m) => m.user_id === fixture.mate.id && String(m.body || "").includes(RUN_TAG));
  must(fromMate.length === 1, `the owner reads back exactly this run's message from the mate (${fromMate.length})`);
  must(fromMate.length === 1 && fromMate[0].body.includes("a crew they joined"),
    "...in the words the mate wrote");
  must(fromMate.length === 1 && fromMate[0].user_id === fixture.mate.id,
    "...carrying the SENDER's id, so the screen can attribute it");

  log("\n  AND THE OTHER DIRECTION — a crew you are only INVITED to is not readable:");
  const peek = await asUser(ownerTok, "GET", `crews_messages?crew_id=eq.${inviteCrewId}&select=id`);
  must(peek.status === 200 && Array.isArray(peek.body) && peek.body.length === 0,
    `the owner reads 0 messages from the crew they have not joined (${peek.status}, ${Array.isArray(peek.body) ? peek.body.length : "?"} rows)`);

} catch (e) {
  console.error("\n" + String(e && e.stack ? e.stack : e).slice(0, 900));
  bad++;
} finally {
  // crews_messages rows are removed EXPLICITLY and read back. 0176 gave `messages` a delete
  // policy; crews_messages is a different table and whether the cascade fires is a property of
  // the schema rather than of this script.
  for (const id of mine) await asService("DELETE", `crews_messages?id=eq.${id}`).catch(() => {});
  if (mine.length) {
    const left = await asService("GET", `crews_messages?id=in.(${mine.join(",")})&select=id`).catch(() => ({ body: [] }));
    const n = Array.isArray(left.body) ? left.body.length : -1;
    if (n !== 0) { console.error(`LEAKED: ${n} crews_messages row(s) could not be removed.`); bad++; }
    else log(`  removed ${mine.length} crew message(s), read back empty.`);
  }
  if (fixture) {
    const leakedRows = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leakedRows && leakedRows.length) { console.error("LEAKED: " + leakedRows.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
