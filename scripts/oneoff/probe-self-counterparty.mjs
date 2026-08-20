// Can you be your own counterparty? `vouches` and `belay_catches` each record a relationship
// between TWO people, and neither said the two had to differ. RLS binds only the acting side
// (`auth.uid() = from_id`; `auth.uid() = belayer_id or auth.uid() = climber_id`), so the other
// side was free — including free to be you.
//
// The LEGITIMATE cases are asserted first and matter most: a constraint that blocks a real vouch
// or a real catch would be worse than the hole it closes. A probe for a new constraint has to
// prove the constraint is narrow, not just that it fires.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ANON = anonKey(), SVC = requireServiceKey();
const tag = `sc${Date.now().toString(36)}`;
const users = [];
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
async function rest(path, { token, method = "GET", body } = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { method,
    headers: { apikey: ANON, "Content-Type": "application/json", Authorization: `Bearer ${token || ANON}` },
    body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await j(r) };
}
async function svc(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}${path}`, { ...opts, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", ...(opts.headers || {}) } });
  return { status: r.status, body: await j(r) };
}
// Judge by what reaches the table, never by the status code — see 0165's header for the
// `Prefer: return=representation` trap that made an earlier probe report the exact opposite.
const landed = async (table, col, val) =>
  ((await svc(`/rest/v1/${table}?${col}=like.${val}*&select=*`)).body || []);

try {
  const A = await signup(`${tag}-a@climbmatch.invalid`);
  const B = await signup(`${tag}-b@climbmatch.invalid`);
  for (const u of [A, B]) if (u.id) users.push(u.id);
  if (!A.token || !B.token) { console.error("FAIL: no session for one of the accounts"); process.exit(1); }
  console.log(`A=${A.id.slice(0, 8)} B=${B.id.slice(0, 8)}\n`);

  // ── the legitimate cases must keep working ────────────────────────────────
  await rest("/vouches", { token: A.token, method: "POST",
    body: { from_id: A.id, to_id: B.id, reason: `${tag}-real` } });
  (await landed("vouches", "reason", `${tag}-real`)).length === 1
    ? ok("A can vouch for B — a real vouch is unaffected")
    : bad("a REAL vouch did not land — the constraint is too broad, which is worse than the bug");

  await rest("/belay_catches", { token: A.token, method: "POST",
    body: { belayer_id: A.id, climber_id: B.id, date_occurred: "2026-08-19", description: `${tag}-real` } });
  (await landed("belay_catches", "description", `${tag}-real`)).length === 1
    ? ok("A can log catching B — a real catch is unaffected")
    : bad("a REAL belay catch did not land — the constraint is too broad");

  // ── the defects ───────────────────────────────────────────────────────────
  await rest("/vouches", { token: A.token, method: "POST",
    body: { from_id: A.id, to_id: A.id, reason: `${tag}-self` } });
  (await landed("vouches", "reason", `${tag}-self`)).length === 0
    ? ok("A cannot vouch for A")
    : bad("A VOUCHED FOR A — useClimberVouches counts it among 'trust signals from others'");

  await rest("/belay_catches", { token: A.token, method: "POST",
    body: { belayer_id: A.id, climber_id: A.id, date_occurred: "2026-08-19", description: `${tag}-self` } });
  (await landed("belay_catches", "description", `${tag}-self`)).length === 0
    ? ok("A cannot log catching A")
    : bad("A LOGGED CATCHING A — you cannot belay yourself");
} finally {
  for (const t of ["vouches", "belay_catches"]) {
    const col = t === "vouches" ? "reason" : "description";
    for (const r of await landed(t, col, tag)) await svc(`/rest/v1/${t}?id=eq.${r.id}`, { method: "DELETE" }).catch(() => {});
  }
  for (const id of users) {
    await svc(`/rest/v1/profiles?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
    await svc(`/auth/v1/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
  }
  const v = await svc("/rest/v1/vouches?select=id"), b = await svc("/rest/v1/belay_catches?select=id");
  console.log(`\ncleanup: ${users.length} accounts removed · vouches now ${(v.body || []).length}, belay_catches ${(b.body || []).length}`);
}
process.exit(fail ? 1 : 0);

// MEASURED on the live project, before and after 0167:
//
//                                  before        after
//   A vouches for B                landed        landed   <- MUST keep working
//   A logs catching B              landed        landed   <- MUST keep working
//   A vouches for A                201 <-BUG     no row
//   A logs catching A              201 <-BUG     no row
//
// STILL OPEN, and deliberately not fixed by 0167: A can log a catch with belayer_id = A and
// climber_id = ANY stranger, unbounded, crediting itself with catches for people it has never
// climbed with. Whether that needs the other party's confirmation is a product decision, not a
// constraint — the UI already speaks of "partners confirmed", which suggests an intended model.
//
// A oneoff, not a check:* guard: needs the service key to delete the accounts and rows it creates,
// and writes to auth on the live project.
