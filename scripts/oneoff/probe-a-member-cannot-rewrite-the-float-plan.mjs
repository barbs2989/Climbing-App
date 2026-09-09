// What can a confirmed crew MEMBER change about a crew that is not theirs? Two things are
// safety-bearing and neither has ever been exercised.
//
// THE FLOAT PLAN. `crews.float_plan`, `meet_place` and `meet_time` are the record of who is on the
// mountain, where they started and when they are due back — docs/BACKEND.md calls it the thing
// "shared with your emergency contact... can call for help if you're overdue". 0036 protects the
// row with `organizer can update own crew` USING (auth.uid() = created_by) and NO with-check.
// Postgres falls back to the USING expression for the check when none is given, so it should hold
// in both directions — but "should, by a default I have read about" is not a measurement.
//
// THE READY STATE. A crew reads Ready when every confirmed member has acked the same day
// (datesAgreed/agreedDate). Acks live in crew_day_acks, whose INSERT policy is
// `auth.uid() = user_id AND you are a confirmed member of THIS crew`. If a member could ack on
// somebody else's behalf, a crew would show as everyone-agreed while a partner had agreed to
// nothing — a false green on the screen a party uses to decide the trip is on.
//
// WHY TWO ACCOUNTS: every one of these is a question about what a climber can do to a row that
// belongs to somebody else, and the service role bypasses RLS entirely. Writes under test all go
// through the anon key plus that climber's own JWT.
//
// A STATUS CODE DECIDES NOTHING HERE. PostgREST answers a with-check violation 403 and a zero-row
// PATCH 200 with an empty body — both mean "it did not happen" — so every attack is settled by
// reading the row back with the service key, which sees everything.
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
if (!SUPA || !ANON || !SERVICE) { console.error("needs the Supabase url, anon key and service key."); process.exit(1); }

const log = (...a) => console.log(...a);
let bad = 0, asserted = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };
const dead = (m) => { throw new Error(m); };  // never process.exit(): it skips `finally`

async function req(key, jwt, method, pathQ, body) {
  const h = { apikey: key, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" };
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
  if (!j.access_token) dead(`could not sign in as ${email}`);
  return j.access_token;
}

const TAG = process.env.GITHUB_RUN_ID || `local-${process.pid}-${Date.now()}`;
const DAY = "2027-08-14";
let fixture = null;

try {
  fixture = await createFixture(log);
  if (!fixture.mate || !fixture.mate.password) dead("no mate password — this probe must write AS the member.");
  const ownerTok = await signIn(fixture.owner.email, fixture.owner.password);
  const mateTok  = await signIn(fixture.mate.email,  fixture.mate.password);
  const crewId = fixture.crew.id;

  // The state everything below rests on: the mate is a CONFIRMED member. If they were not, every
  // refusal would be expected of a correct policy for the wrong reason and the run would be vacuous.
  const seat = await asService("GET", `crew_members?crew_id=eq.${crewId}&user_id=eq.${fixture.mate.id}&select=status`);
  must(Array.isArray(seat.body) && seat.body.length === 1 && seat.body[0].status === "confirmed",
    `the mate is a CONFIRMED member of the crew (${JSON.stringify(seat.body)}) — so every refusal below is about authority, not membership`);

  log("\n  CONTROL — the organiser CAN write the float plan, or every refusal below is meaningless:");
  const good = await asUser(ownerTok, "PATCH", `crews?id=eq.${crewId}`,
    { float_plan: { filedBy: "owner", tag: TAG }, meet_place: "Owner trailhead", meet_time: "05:00" });
  const afterGood = await asService("GET", `crews?id=eq.${crewId}&select=float_plan,meet_place,meet_time`);
  const g = (afterGood.body || [])[0] || {};
  must(g.float_plan && g.float_plan.filedBy === "owner", `the organiser's float plan landed (http ${good.status})`);
  must(g.meet_place === "Owner trailhead", "...and the meeting place with it");

  log("\n  ATTACK — a confirmed MEMBER rewrites the float plan and the meeting point:");
  const a1 = await asUser(mateTok, "PATCH", `crews?id=eq.${crewId}`,
    { float_plan: { filedBy: "mate", tag: TAG }, meet_place: "Somewhere else", meet_time: "23:59" });
  const afterA1 = await asService("GET", `crews?id=eq.${crewId}&select=float_plan,meet_place,meet_time`);
  const a = (afterA1.body || [])[0] || {};
  must(a.float_plan && a.float_plan.filedBy === "owner",
    `the float plan is UNCHANGED and still the organiser's (${JSON.stringify(a.float_plan)}, http ${a1.status})`);
  must(a.meet_place === "Owner trailhead", `...and so is the meeting place ("${a.meet_place}")`);
  must(a.meet_time === "05:00", `...and the meeting time ("${a.meet_time}")`);

  log("\n  ATTACK — a member disbands a crew that is not theirs:");
  const a2 = await asUser(mateTok, "DELETE", `crews?id=eq.${crewId}`);
  const stillThere = await asService("GET", `crews?id=eq.${crewId}&select=id`);
  must(Array.isArray(stillThere.body) && stillThere.body.length === 1,
    `the crew still exists (http ${a2.status}) — a 204 is not evidence a row went`);

  log("\n  READY STATE — an ack is what makes a crew read as agreed:");
  const ownAck = await asUser(mateTok, "POST", "crew_day_acks", { crew_id: crewId, user_id: fixture.mate.id, date: DAY });
  must(ownAck.status === 201, `a confirmed member CAN ack their own day (${ownAck.status})`);

  const forged = await asUser(mateTok, "POST", "crew_day_acks", { crew_id: crewId, user_id: fixture.owner.id, date: DAY });
  const acks = await asService("GET", `crew_day_acks?crew_id=eq.${crewId}&date=eq.${DAY}&select=user_id`);
  const ownerAcked = (acks.body || []).some((r) => r.user_id === fixture.owner.id);
  must(!ownerAcked,
    `a member CANNOT ack on the organiser's behalf (http ${forged.status}) — otherwise the crew reads "everyone agreed" while a partner agreed to nothing`);

  const del = await asUser(mateTok, "DELETE", `crew_day_acks?crew_id=eq.${crewId}&user_id=eq.${fixture.owner.id}&date=eq.${DAY}`);
  must(true, `(un-acking somebody else is a no-op by policy; http ${del.status})`);

  log("\n  ...and a climber who has NOT joined cannot ack at all:");
  // The fixture's other crew has the owner seated `invited`, not confirmed — the exact
  // non-confirmed state the ack policy's membership clause exists to refuse.
  const inv = await asService("GET", `crews?created_by=eq.${fixture.mate.id}&select=id`);
  if (!Array.isArray(inv.body) || inv.body.length !== 1) dead(`expected one mate-created crew, got ${JSON.stringify(inv.body).slice(0, 160)}`);
  const notYet = await asUser(ownerTok, "POST", "crew_day_acks", { crew_id: inv.body[0].id, user_id: fixture.owner.id, date: DAY });
  const invAcks = await asService("GET", `crew_day_acks?crew_id=eq.${inv.body[0].id}&select=user_id`);
  must(Array.isArray(invAcks.body) && invAcks.body.length === 0,
    `an invited-but-unconfirmed climber cannot ack (http ${notYet.status}, ${Array.isArray(invAcks.body) ? invAcks.body.length : "?"} rows)`);

} catch (e) {
  console.error("\n" + String(e && e.stack ? e.stack : e).slice(0, 900));
  bad++;
} finally {
  if (fixture) {
    // crew_day_acks cascades on crews delete, which the fixture performs — but whether a cascade
    // fires is a property of the schema rather than of this script, so read back afterwards.
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); bad++; }
    else log("  fixture removed.");
    const acksLeft = await asService("GET", `crew_day_acks?date=eq.${DAY}&select=crew_id`).catch(() => ({ body: [] }));
    const n = Array.isArray(acksLeft.body) ? acksLeft.body.length : -1;
    if (n > 0) { console.error(`LEAKED: ${n} crew_day_acks row(s) survived the crew delete.`); bad++; }
    else log("  day acks gone with the crew.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
