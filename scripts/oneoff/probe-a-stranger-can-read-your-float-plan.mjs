// CAN A CLIMBER WHO IS NOT IN YOUR CREW READ YOUR FLOAT PLAN?
//
// `0036` writes the intended model down in its own comment, in as many words:
//
//     crews holds float_plan/meet_place/meet_time (sensitive - see docs/BACKEND.md:
//     "shared with your emergency contact... can call for help if you're overdue").
//     Base-table read is organizer-or-confirmed-member ONLY, never public. Public
//     "browse open crews" is served by the crew_listings view below, which exposes
//     only a safe column subset by construction.
//
// `0068_crews_readable_by_invited_members` widened that SELECT to ANY `crew_members` row,
// whatever its status, so that an INVITED member could see the crew they were invited to.
// It also admits `pending` -- and a `pending` row is the climber's OWN REQUEST, which
// `0086` let anybody insert for themselves on ANY crew at any status but 'confirmed'
// (`invited_by = auth.uid()` is satisfied by naming yourself). `crew_members` SELECT is
// `using (true)`, so crew ids are enumerable. `0180` closes both halves.
//
// READING POLICIES IS NOT ENOUGH AND THIS REPO KNOWS IT. `0095`'s own header records that an
// RLS subquery is evaluated as the CALLING role, so a policy can "look present, pass review,
// and enforce nothing" -- and that the service role bypasses RLS entirely, so a service-key
// probe reports success either way. So this uses THREE REAL ACCOUNTS and every read under test
// goes through the anon key plus that climber's own JWT. The service key creates the accounts
// and tears them down, and does nothing else.
//
// IT ASSERTS WHAT MUST STILL WORK, not only what must be refused. A policy change that only
// ever denies is satisfied by denying everything -- so the organiser, the confirmed member and
// the INVITED member all have to keep reading the crew, and the app's own request-to-join has
// to keep succeeding. Those are sections 4-6 and they are the load-bearing half.
//
// Hand-run: it needs the service key, which CI must never hold.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const SERVICE = requireServiceKey();
const ANON = anonKey();
const DOMAIN = "climbmatch-qa.invalid";

let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };
// process.exit() skips `finally`, so a failure would leak three auth users and a crew.
const dead = (m) => { throw new Error("BROKEN PROBE: " + m); };

const auth = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });

// Every read/write UNDER TEST goes through here: anon key + the climber's own JWT, which is
// exactly what the app sends. Never the service key -- it bypasses RLS and answers the wrong
// question, which is the trap 0095's header records.
async function asUser(jwt, path, init = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  let body = null;
  try { body = await r.json(); } catch { /* 204 */ }
  return { status: r.status, body };
}
const rows = (r) => (Array.isArray(r.body) ? r.body : []);
// Section 2's attempts can SUCCEED before 0180, and a leftover row makes the next insert collide
// (409) -- which reads as "the request was refused" when it was my own harness in the way. Clear
// the stranger's membership between attempts so every result is attributable.
const clearStranger = async (crewId, id) =>
  fetch(`${SUPABASE_URL}/rest/v1/crew_members?crew_id=eq.${crewId}&user_id=eq.${id}`, {
    method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  }).catch(() => {});

async function createUser(tag) {
  const stamp = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `ui-${tag}-${stamp}@${DOMAIN}`;
  const password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const r = await auth("admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: `Probe ${tag}` } }),
  });
  const body = await r.json();
  if (!r.ok || !body?.id) dead(`admin create user failed (${r.status}): ${JSON.stringify(body)}`);
  const t = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tb = await t.json();
  if (!t.ok || !tb?.access_token) dead(`sign in failed (${t.status})`);
  return { id: body.id, email, jwt: tb.access_token };
}

const FLOAT = {
  route: "Mount Baker — North Ridge",
  party: 2,
  vehicle: "Blue Subaru Outback, plate QA-0000",
  parking: "Heliotrope Ridge trailhead, upper lot",
  depart: "2026-09-12 03:30",
  hardReturn: "2026-09-12 21:00",
  emergency: "Emergency contact: Alex Fixture, 555-0100",
};

let owner, stranger, member, crewId;
try {
  console.log("\nsetting up three real accounts\n");
  owner = await createUser("own");
  stranger = await createUser("str");
  member = await createUser("mem");
  ok(`organiser, a confirmed member, and an unrelated climber`);

  const mk = await asUser(owner.jwt, "crews?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      created_by: owner.id,
      route_id: "wa_mount_baker_north_ridge",
      dates: ["2026-09-12"],
      meet_place: "Heliotrope Ridge TH, upper lot",
      meet_time: "03:30",
      float_plan: FLOAT,
      cap: 4,
    }),
  });
  if (mk.status >= 300 || !rows(mk)[0]) dead(`owner could not create a crew (${mk.status}): ${JSON.stringify(mk.body)}`);
  crewId = rows(mk)[0].id;
  for (const [u, status] of [[owner, "confirmed"], [member, "confirmed"]]) {
    const r = await asUser(owner.jwt, "crew_members", {
      method: "POST",
      body: JSON.stringify({ crew_id: crewId, user_id: u.id, invited_by: owner.id, status }),
    });
    if (r.status >= 300) dead(`organiser could not seat ${status} member (${r.status}): ${JSON.stringify(r.body)}`);
  }
  ok("a PRIVATE crew carrying a float plan, meet place and meet time");

  console.log("\n1. CONTROL — before anything, the stranger cannot read it\n");

  const before = await asUser(stranger.jwt, `crews?id=eq.${crewId}&select=*`);
  if (rows(before).length === 0)
    ok("a climber with no membership row reads 0 crews — so any row they get later is attributable");
  else fail(`expected 0 rows, got ${rows(before).length} (${before.status}) — the control is broken, nothing below is attributable`);

  console.log("\n2. a stranger may only ever ASK\n");

  const asInvited = await asUser(stranger.jwt, "crew_members?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ crew_id: crewId, user_id: stranger.id, invited_by: stranger.id, status: "invited" }),
  });
  if (asInvited.status >= 300)
    ok(`self-inserting at 'invited' is refused (${asInvited.status}) — being invited is the organiser's act`);
  else fail(`a climber who was never invited awarded themselves status='invited' (${asInvited.status})`);
  await clearStranger(crewId, stranger.id);

  const asConfirmed = await asUser(stranger.jwt, "crew_members?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ crew_id: crewId, user_id: stranger.id, invited_by: stranger.id, status: "confirmed" }),
  });
  if (asConfirmed.status >= 300) ok(`self-inserting at 'confirmed' is refused (${asConfirmed.status})`);
  else fail(`a stranger confirmed themselves onto the crew (${asConfirmed.status})`);
  await clearStranger(crewId, stranger.id);

  console.log("\n3. ...and asking must not open the crew\n");

  const req = await asUser(stranger.jwt, "crew_members?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ crew_id: crewId, user_id: stranger.id, invited_by: stranger.id, status: "pending" }),
  });
  // The app's own request-to-join writes exactly this, so it MUST still succeed.
  if (req.status < 300 && rows(req).length === 1) ok("the app's own request-to-join still works (a 'pending' row)");
  else fail(`request-to-join was refused (${req.status}) — this breaks asking to join an open crew`);

  const after = await asUser(stranger.jwt, `crews?id=eq.${crewId}&select=*`);
  if (rows(after).length === 0) {
    ok("a pending requester reads 0 crews — the float plan never leaves the crew");
  } else {
    const r = rows(after)[0];
    fail("a climber who is NOT in this crew read its row");
    if (r.float_plan) fail(`   float_plan is readable: ${JSON.stringify(r.float_plan).slice(0, 160)}…`);
    if (r.meet_place) fail(`   meet_place is readable: ${r.meet_place}`);
    if (r.meet_time) fail(`   meet_time is readable: ${r.meet_time}`);
  }

  const chat = await asUser(owner.jwt, "crews_messages", {
    method: "POST",
    body: JSON.stringify({ crew_id: crewId, user_id: owner.id, body: "Probe: upper lot at 03:30." }),
  });
  if (chat.status >= 300) dead(`organiser could not post to the crew chat (${chat.status})`);
  const readChat = await asUser(stranger.jwt, `crews_messages?crew_id=eq.${crewId}&select=*`);
  if (rows(readChat).length === 0) ok("...and reads 0 crew messages — the chat holds");
  else fail(`a pending requester read ${rows(readChat).length} crew message(s)`);

  console.log("\n4. WHAT MUST STILL WORK — the organiser\n");

  const own = await asUser(owner.jwt, `crews?id=eq.${crewId}&select=*`);
  if (rows(own).length === 1 && rows(own)[0].float_plan) ok("the organiser still reads their own crew and its float plan");
  else fail(`the organiser lost their own crew (${own.status}, ${rows(own).length} rows)`);

  console.log("\n5. WHAT MUST STILL WORK — a confirmed member\n");

  const mem = await asUser(member.jwt, `crews?id=eq.${crewId}&select=*`);
  if (rows(mem).length === 1 && rows(mem)[0].float_plan) ok("a confirmed member still reads the crew and its float plan");
  else fail(`a confirmed member lost the crew (${mem.status}, ${rows(mem).length} rows)`);
  const memChat = await asUser(member.jwt, `crews_messages?crew_id=eq.${crewId}&select=*`);
  if (rows(memChat).length >= 1) ok("...and still reads the crew chat");
  else fail("a confirmed member lost the crew chat");

  console.log("\n6. WHAT MUST STILL WORK — an INVITED member (0068's whole purpose)\n");

  // The organiser invites the stranger for real. Their pending row is replaced by an invite.
  await clearStranger(crewId, stranger.id);
  const inv = await asUser(owner.jwt, "crew_members?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ crew_id: crewId, user_id: stranger.id, invited_by: owner.id, status: "invited" }),
  });
  if (inv.status >= 300) fail(`the organiser could not invite anybody (${inv.status}): ${JSON.stringify(inv.body)}`);
  else ok("the organiser can still invite a climber at status 'invited'");

  const invRead = await asUser(stranger.jwt, `crews?id=eq.${crewId}&select=*`);
  if (rows(invRead).length === 1) ok("an INVITED climber still reads the crew — 0068's intent is preserved");
  else fail(`an invited climber cannot read the crew (${invRead.status}) — this breaks the invite card`);

  // useMyCrewInvites' own shape: crew_members filtered to 'invited', embedding crews(*).
  const shape = await asUser(stranger.jwt, `crew_members?user_id=eq.${stranger.id}&status=eq.invited&select=*,crews(*)`);
  const emb = rows(shape)[0];
  if (emb && emb.crews && emb.crews.id === crewId) ok("...and useMyCrewInvites' embed still resolves the crew");
  else fail(`useMyCrewInvites' embed came back empty (${shape.status}) — the invite card would render nothing`);

  console.log("");
  if (bad) console.log(`${bad} finding(s).`);
  else console.log("ok — a climber who is not in the crew cannot read the crew, and everyone who is still can.");
} finally {
  // Teardown is REPORTED, not merely attempted -- check:outage threw its leak report away and
  // made a teardown failure invisible until somebody counted rows by hand.
  const svc = (path, init) =>
    fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    });
  const left = [];
  if (crewId) {
    await svc(`crews_messages?crew_id=eq.${crewId}`, { method: "DELETE" }).catch(() => {});
    await svc(`crew_members?crew_id=eq.${crewId}`, { method: "DELETE" }).catch(() => {});
    await svc(`crews?id=eq.${crewId}`, { method: "DELETE" }).catch(() => {});
    const back = await svc(`crews?id=eq.${crewId}&select=id`).then((r) => r.json()).catch(() => null);
    if (Array.isArray(back) && back.length) left.push(`crew ${crewId}`);
  }
  for (const u of [owner, stranger, member]) {
    if (!u) continue;
    const r = await auth(`admin/users/${u.id}`, { method: "DELETE" }).catch(() => null);
    if (!r || r.status >= 300) left.push(`auth user ${u.id}`);
  }
  if (left.length) console.error("TEARDOWN LEFT BEHIND: " + left.join(", "));
  else console.log("  teardown: crew and all three accounts removed");
}
process.exit(bad ? 1 : 0);
