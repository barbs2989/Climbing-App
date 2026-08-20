// Can a stranger post into YOUR crew's chat? 0042's INSERT policy on crews_messages reads
//
//   exists (select 1 from crew_members m where m.crew_id = crew_id and m.user_id = auth.uid() ...)
//
// The author meant crews_messages.crew_id, but inside that subquery an unqualified crew_id binds
// to the INNER table's column, so Postgres stored it as `m.crew_id = m.crew_id` — always true.
// The membership test therefore collapses from "a confirmed member of THIS crew" to "a confirmed
// member of ANY crew". The SELECT policy two lines above writes crews_messages.crew_id and is
// correct, which is why reads are scoped and writes are not.
//
// This proves it rather than reading it. THREE accounts, because two cannot tell the two failure
// modes apart:
//   A  owns crew A and is a confirmed member of it
//   B  owns crew B and is a confirmed member of it   -> the exploit: B writes into crew A
//   C  is in NO crew                                 -> the control: C must still be refused
// If C were also allowed, the policy would simply be absent and the story above would be wrong.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ANON = anonKey(), SVC = requireServiceKey();
const tag = `cm${Date.now().toString(36)}`;
const users = [], crews = [];
let fail = 0;
const ok  = (m) => console.log(`ok   ${m}`);
const bad = (m) => { console.log(`FAIL ${m}`); fail++; };

async function j(r) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }
async function signup(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Probe-passw0rd!", data: { name: email.split("@")[0] } }) });
  const b = await j(r);
  return { id: b?.id || b?.user?.id, token: b?.access_token };
}
async function rest(path, { token, method = "GET", body, prefer } = {}) {
  const h = { apikey: ANON, "Content-Type": "application/json", Authorization: `Bearer ${token || ANON}` };
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await j(r) };
}
async function svc(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", ...(opts.headers || {}) } });
  return { status: r.status, body: await j(r) };
}

// A real route id, so the crew's FK is satisfied without inventing one.
async function anyRouteId() {
  const r = await svc("/rest/v1/routes?select=id&limit=1");
  return Array.isArray(r.body) && r.body[0] ? r.body[0].id : null;
}

try {
  const A = await signup(`${tag}-a@climbmatch.invalid`);
  const B = await signup(`${tag}-b@climbmatch.invalid`);
  const C = await signup(`${tag}-c@climbmatch.invalid`);
  for (const u of [A, B, C]) if (u.id) users.push(u.id);
  if (!A.token || !B.token || !C.token) { console.error("FAIL: no session for one of the three accounts"); process.exit(1); }

  const routeId = await anyRouteId();
  if (!routeId) { console.error("FAIL: could not read a route id — cannot satisfy crews.route_id"); process.exit(1); }

  // Each of A and B owns a crew and is a CONFIRMED member of their own.
  const mk = async (u) => {
    const c = await svc("/rest/v1/crews", { method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ route_id: routeId, created_by: u.id, dates: [] }) });
    const id = Array.isArray(c.body) ? c.body[0]?.id : null;
    if (id) { crews.push(id);
      await svc("/rest/v1/crew_members", { method: "POST", body: JSON.stringify({ crew_id: id, user_id: u.id, status: "confirmed" }) }); }
    return id;
  };
  const crewA = await mk(A), crewB = await mk(B);
  if (!crewA || !crewB) { console.error("FAIL: could not create both crews"); process.exit(1); }
  console.log(`A owns crew ${crewA.slice(0, 8)} · B owns crew ${crewB.slice(0, 8)} · C is in no crew\n`);

  // Baseline — the legitimate case must work, or everything below is meaningless.
  const own = await rest("/crews_messages", { token: A.token, method: "POST",
    body: { crew_id: crewA, user_id: A.id, body: "probe: own crew" } });
  own.status === 201 ? ok("A can post in A's own crew (201) — the policy is not simply refusing everything")
                     : bad(`A could not post in A's own crew (${own.status}) — baseline broken, later results mean nothing`);

  // THE EXPLOIT — B is a confirmed member of a DIFFERENT crew.
  const intruder = await rest("/crews_messages", { token: B.token, method: "POST",
    body: { crew_id: crewA, user_id: B.id, body: "probe: intruder" } });
  intruder.status === 403 || intruder.status === 401
    ? ok(`B cannot post into A's crew (${intruder.status})`)
    : bad(`B POSTED INTO A'S CREW (${intruder.status}) — any confirmed member of any crew can write into any crew's chat`);

  // THE CONTROL — C belongs to no crew. If C is refused, the membership test is running and
  // merely comparing the wrong thing. If C succeeds, there is no membership test at all.
  const stranger = await rest("/crews_messages", { token: C.token, method: "POST",
    body: { crew_id: crewA, user_id: C.id, body: "probe: no crew" } });
  stranger.status === 403 || stranger.status === 401
    ? ok(`C, who is in no crew, is refused (${stranger.status}) — the membership check runs at all, so a B failure above means it compares the WRONG crew rather than nothing`)
    : bad(`C, in no crew, also posted (${stranger.status}) — the membership check is absent entirely, not miswritten`);

  // Reads are scoped correctly (the SELECT policy qualifies its column), so an intruder can
  // write into a conversation they cannot read. Worth stating: it bounds the severity.
  const bRead = await rest(`/crews_messages?crew_id=eq.${crewA}&select=id,body`, { token: B.token });
  const seen = Array.isArray(bRead.body) ? bRead.body.length : -1;
  seen === 0 ? ok("B cannot READ A's crew messages — the SELECT policy is correctly qualified")
             : bad(`B read ${seen} message(s) from A's crew — the read side is leaking too`);
} finally {
  for (const id of crews) {
    await svc(`/rest/v1/crews_messages?crew_id=eq.${id}`, { method: "DELETE" }).catch(() => {});
    await svc(`/rest/v1/crew_members?crew_id=eq.${id}`, { method: "DELETE" }).catch(() => {});
    await svc(`/rest/v1/crews?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
  }
  for (const id of users) {
    await svc(`/rest/v1/profiles?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
    await svc(`/auth/v1/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
  }
  const lm = await svc("/rest/v1/crews_messages?select=id");
  const lc = await svc("/rest/v1/crews?select=id");
  console.log(`\ncleanup: ${users.length} accounts, ${crews.length} crews removed · crews_messages now ${(lm.body || []).length}, crews ${(lc.body || []).length}`);
}
process.exit(fail ? 1 : 0);

// MEASURED on the live project, before and after 0163:
//
//                                      before      after
//   A posts in A's own crew            201         201     <- must keep working
//   B (member of another crew) into A  201  <-BUG  403
//   C (member of no crew) into A       403         403
//   B reads A's crew messages          0 rows      0 rows
//
// The C row is the load-bearing one and it is a CONTROL, not a nice-to-have: with only A and B,
// "B was refused" is equally consistent with a correct policy and with a policy that refuses
// everyone, and "B got in" is equally consistent with a miswritten membership test and with no
// test at all. C separates them. Keep it even though it passes in both states.
//
// This is a NEGATIVE-result probe by design: with 0163 applied it prints four oks, which is also
// what a probe that measures nothing prints. Its proof of failure is not a simulation — it is the
// run against the LIVE PRE-FIX policy, where the B row came back 201 and exited 1. That is better
// evidence than an inverted assertion (which only shows the arithmetic runs) and better than
// re-dropping the policy to re-demonstrate it, which would reopen the hole on production to prove
// something already measured. If you change this probe later and need to re-establish that it can
// fail, rebuild the 0042 text in a BRANCH DATABASE, never here.
//
// A oneoff, not a check:* guard: it needs the service key (to seed crews and delete the accounts
// it creates) and it writes to auth on the live project. Re-run after any change to the
// crews_messages policies.
