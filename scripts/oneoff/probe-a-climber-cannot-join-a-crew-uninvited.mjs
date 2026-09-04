// Can a climber put THEMSELVES into somebody else's crew? 0086 says no, twice over, and nothing
// has ever tried it.
//
// WHY IT MATTERS. Crew membership is a read capability, not a label: `crews_messages` SELECT is
// confirmed-member-or-creator, and a crew carries a FLOAT PLAN — who is on the mountain, when they
// are due back, and an emergency contact. So a climber who could seat themselves as `confirmed`
// would gain the chat and that plan for any crew whose id they could guess.
//
// 0036 shipped the INSERT policy as `auth.uid() = user_id or auth.uid() = created_by` — no status
// constraint at all, so self-seating at ANY status was permitted. 0086 replaced it and closed two
// doors, which is the pair this probe walks:
//
//   INSERT  invited_by = auth.uid() and ( you created the crew
//                                         or (auth.uid() = user_id and status <> 'confirmed') )
//   UPDATE  a member may move their OWN row to 'confirmed' only if
//           invited_by = the crew's created_by — i.e. the row came from the organizer
//
// The second is the interesting one: without it, the first is trivially defeated by inserting at
// 'pending' and then promoting yourself.
//
// WHY ONE ACCOUNT CANNOT ANSWER IT: the whole question is what a SECOND real climber can do to a
// crew that is not theirs, and the service role bypasses RLS entirely, so a service-key probe
// reports success either way. Every write under test goes through the anon key plus that
// climber's own JWT. The service key creates the accounts and reads rows back, and nothing else.
//
// CONTROLS RUN ALONGSIDE, because "refused" means nothing if RLS is refusing for an unrelated
// reason — the always-passing guard 0095 warns about. Two of them: a join REQUEST at 'pending'
// must still be allowed (that is the app's own join flow, and a probe that broke it would be
// reporting the feature as the defect), and a genuine invite must still be acceptable.
//
// Writes to the live project; per-run fixture. The one crew this probe creates itself is deleted
// explicitly and read back — a crew left behind blocks its owner's account delete on the FK, which
// is how a previous probe here leaked three accounts.
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
// Never process.exit() mid-run: it skips `finally` and would leak the crew below.
const dead = (m) => { throw new Error(m); };

async function req(key, jwt, method, pathQ, body, extraHeaders) {
  const h = { apikey: key, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json", ...(extraHeaders || {}) };
  if (method === "POST" || method === "PATCH") h.Prefer = "return=representation";
  const r = await fetch(`${SUPA}/rest/v1/${pathQ}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let out = null; try { out = await r.json(); } catch {}
  return { status: r.status, body: out };
}
const asUser = (jwt, m, p, b) => req(ANON, jwt, m, p, b);
const asService = (m, p, b) => req(SERVICE, SERVICE, m, p, b);

async function signIn(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) dead(`could not sign in as ${email}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}
const refused = (s) => s === 401 || s === 403;

let fixture = null, targetCrewId = null;

try {
  fixture = await createFixture(log);
  if (!fixture.mate || !fixture.mate.password) dead("no mate password — this probe must write AS the second account.");

  const ownerTok = await signIn(fixture.owner.email, fixture.owner.password);
  const mateTok  = await signIn(fixture.mate.email,  fixture.mate.password);

  // A crew the mate has NO row on. The fixture's two crews both have the mate confirmed, so
  // neither can express "uninvited". Created by the OWNER through the anon path, so the crew's
  // own INSERT policy is exercised rather than bypassed.
  const made = await asUser(ownerTok, "POST", "crews", { created_by: fixture.owner.id, route_id: "wa_mount_baker_north_ridge", cap: 4 });
  if (made.status !== 201 || !Array.isArray(made.body) || !made.body[0]) dead(`could not create the target crew: ${made.status} ${JSON.stringify(made.body).slice(0, 200)}`);
  targetCrewId = made.body[0].id;
  log(`  target crew ${String(targetCrewId).slice(0, 8)} — owner-created, the mate has no row on it`);

  const none = await asService("GET", `crew_members?crew_id=eq.${targetCrewId}&user_id=eq.${fixture.mate.id}&select=status`);
  must(Array.isArray(none.body) && none.body.length === 0, "the mate starts with NO membership row on that crew");

  log("\n  ATTACK 1 — seat yourself as a confirmed member:");
  const a1 = await asUser(mateTok, "POST", "crew_members",
    { crew_id: targetCrewId, user_id: fixture.mate.id, status: "confirmed", invited_by: fixture.mate.id });
  must(refused(a1.status), `refused (${a1.status}${a1.body && a1.body.code ? " " + a1.body.code : ""})`);
  // A STATUS IS NOT EVIDENCE ABOUT ROWS — read the table back with the key that sees everything.
  const after1 = await asService("GET", `crew_members?crew_id=eq.${targetCrewId}&user_id=eq.${fixture.mate.id}&select=status`);
  must(Array.isArray(after1.body) && after1.body.length === 0, "...and no row landed");

  log("\n  CONTROL — a join REQUEST is still allowed, or the app's own join flow is broken:");
  const req1 = await asUser(mateTok, "POST", "crew_members",
    { crew_id: targetCrewId, user_id: fixture.mate.id, status: "pending", invited_by: fixture.mate.id });
  must(req1.status === 201, `the mate CAN ask to join at status 'pending' (${req1.status})`);

  log("\n  ATTACK 2 — having asked, promote yourself to confirmed:");
  const a2 = await asUser(mateTok, "PATCH",
    `crew_members?crew_id=eq.${targetCrewId}&user_id=eq.${fixture.mate.id}`, { status: "confirmed" });
  // PostgREST answers a with-check violation 403, and a zero-row PATCH 200/204 with an empty body.
  // Both are "it did not happen", so the row read-back below is what actually decides.
  const after2 = await asService("GET", `crew_members?crew_id=eq.${targetCrewId}&user_id=eq.${fixture.mate.id}&select=status`);
  const stillPending = Array.isArray(after2.body) && after2.body.length === 1 && after2.body[0].status === "pending";
  must(stillPending, `the row is STILL 'pending' after the self-promotion attempt (${JSON.stringify(after2.body)}, http ${a2.status})`);

  log("\n  ...AND NO ACCESS WAS GAINED, which is what the membership was for:");
  const seed = await asUser(ownerTok, "POST", "crews_messages",
    { crew_id: targetCrewId, user_id: fixture.owner.id, body: "organiser-only chat" });
  must(seed.status === 201, `the organiser can post in their own crew (${seed.status})`);
  const peek = await asUser(mateTok, "GET", `crews_messages?crew_id=eq.${targetCrewId}&select=id`);
  must(peek.status === 200 && Array.isArray(peek.body) && peek.body.length === 0,
    `an unconfirmed climber reads 0 messages from that crew (${peek.status}, ${Array.isArray(peek.body) ? peek.body.length : "?"} rows)`);

  log("\n  CONTROL — a GENUINE invite can still be accepted, or the fix broke joining:");
  // The fixture's second crew is mate-created with the owner seated `invited` BY the mate, so
  // invited_by = the crew's created_by and the UPDATE policy's escape clause applies. Without
  // this, a policy that simply refused every promotion would pass every assertion above.
  const inv = await asService("GET", `crews?created_by=eq.${fixture.mate.id}&select=id`);
  if (!Array.isArray(inv.body) || inv.body.length !== 1) dead(`expected one mate-created crew, got ${JSON.stringify(inv.body).slice(0, 160)}`);
  const acc = await asUser(ownerTok, "PATCH",
    `crew_members?crew_id=eq.${inv.body[0].id}&user_id=eq.${fixture.owner.id}`, { status: "confirmed" });
  const accRow = await asService("GET", `crew_members?crew_id=eq.${inv.body[0].id}&user_id=eq.${fixture.owner.id}&select=status`);
  must(Array.isArray(accRow.body) && accRow.body.length === 1 && accRow.body[0].status === "confirmed",
    `an invitee CAN accept a real invite (${JSON.stringify(accRow.body)}, http ${acc.status})`);

} catch (e) {
  console.error("\n" + String(e && e.stack ? e.stack : e).slice(0, 900));
  bad++;
} finally {
  // The crew this probe created is NOT in the fixture's undo list, and crews.created_by is an FK
  // to the owner's account — so leaving it behind blocks the account delete and leaks both
  // accounts forever. Remove its rows first, then read back.
  if (targetCrewId) {
    await asService("DELETE", `crews_messages?crew_id=eq.${targetCrewId}`).catch(() => {});
    await asService("DELETE", `crew_members?crew_id=eq.${targetCrewId}`).catch(() => {});
    await asService("DELETE", `crews?id=eq.${targetCrewId}`).catch(() => {});
    const left = await asService("GET", `crews?id=eq.${targetCrewId}&select=id`).catch(() => ({ body: [] }));
    const n = Array.isArray(left.body) ? left.body.length : -1;
    if (n !== 0) { console.error(`LEAKED: the target crew ${targetCrewId} could not be removed (${n}).`); bad++; }
    else log("  target crew removed, read back empty.");
  }
  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
