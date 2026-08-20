// Can one person manufacture "3 climbers agree"?
//
// contributions.contributor has DEFAULT (auth.uid())::text, and the INSERT policy checks only
// `auth.uid() is not null`. A DEFAULT is not a constraint — it applies when the column is OMITTED,
// and a client that sends an explicit value overrides it. submitContribution() stamps the value in
// JS, so the honesty of the whole consensus threshold rests on the client.
//
// That threshold is not cosmetic: lib/db.js's own comment says consensus counts DISTINCT
// contributors, and an agreed correction out-votes the enrichment on a route — approach, descent,
// rappels, gear. Route safety text.
//
// user_reports.reporter is the same shape with one difference that matters: a NULL reporter is
// DELIBERATE (lib/db.js: "someone being harassed must not be blocked from reporting by being
// logged out"), so the question here is only whether someone else's uid can be forged in.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ANON = anonKey(), SVC = requireServiceKey();
const tag = `cf${Date.now().toString(36)}`;
const users = [];
const madeContribs = [], madeReports = [];
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
const idsOf = (b) => (Array.isArray(b) ? b.map((x) => x.id).filter(Boolean) : []);

try {
  const A = await signup(`${tag}-a@climbmatch.invalid`);
  const B = await signup(`${tag}-b@climbmatch.invalid`);
  for (const u of [A, B]) if (u.id) users.push(u.id);
  if (!A.token || !B.token) { console.error("FAIL: no session for one of the accounts"); process.exit(1); }
  const rid = (await svc("/rest/v1/routes?select=id&limit=1")).body?.[0]?.id;
  if (!rid) { console.error("FAIL: could not read a route id"); process.exit(1); }
  console.log(`A=${A.id.slice(0, 8)} B=${B.id.slice(0, 8)} route=${rid}\n`);

  // Baseline: an honest contribution, contributor omitted so the DEFAULT applies.
  const honest = await rest("/contributions", { token: A.token, method: "POST", prefer: "return=representation",
    body: { route_id: rid, kind: "field", field: "probe_field", value: { v: "honest" } } });
  madeContribs.push(...idsOf(honest.body));
  const stamped = Array.isArray(honest.body) ? honest.body[0]?.contributor : null;
  stamped === A.id
    ? ok("an omitted contributor defaults to the caller's own uid")
    : bad(`omitted contributor came back as ${stamped}, expected ${A.id}`);

  // 1. FORGERY — A attributes a contribution to B.
  const forged = await rest("/contributions", { token: A.token, method: "POST", prefer: "return=representation",
    body: { route_id: rid, kind: "field", field: "probe_field", value: { v: "forged" }, contributor: B.id } });
  madeContribs.push(...idsOf(forged.body));
  forged.status === 403 || forged.status === 401
    ? ok(`A cannot attribute a contribution to B (${forged.status})`)
    : bad(`A FILED A CONTRIBUTION AS B (${forged.status}) — contributor is client-supplied and unchecked`);

  // 2. MANUFACTURED CONSENSUS — the threshold is DISTINCT contributors, so three invented
  //    strings from one account are worth three climbers agreeing.
  const invented = [`${tag}-ghost-1`, `${tag}-ghost-2`, `${tag}-ghost-3`];
  let accepted = 0;
  for (const who of invented) {
    const r = await rest("/contributions", { token: A.token, method: "POST", prefer: "return=representation",
      body: { route_id: rid, kind: "field", field: "probe_agree", value: { v: "same" }, contributor: who } });
    madeContribs.push(...idsOf(r.body));
    if (r.status === 201) accepted++;
  }
  // Count it the way the app does: distinct contributors on one route+field.
  const all = await svc(`/rest/v1/contributions?route_id=eq.${rid}&field=eq.probe_agree&select=contributor`);
  const distinct = new Set((all.body || []).map((r) => r.contributor)).size;
  accepted === 0
    ? ok("invented contributor ids are refused — consensus cannot be manufactured")
    : bad(`ONE ACCOUNT PRODUCED ${distinct} DISTINCT CONTRIBUTORS on one field (${accepted}/3 inserts accepted) — that is the "3 climbers agree" threshold, met alone`);

  // 3. user_reports — a null reporter is DELIBERATE. Forging someone else's is not.
  //
  // NO `Prefer: return=representation` on these two, and the verdict comes from a SERVICE-KEY
  // read rather than the status code. With a return preference, an INSERT also needs SELECT on
  // the row it hands back, and this table's SELECT policy is `reporter = auth.uid()` — so a
  // forged reporter and a null reporter BOTH answer 403/401 while the row lands perfectly. The
  // first version of this probe believed those codes and reported the exact opposite of the
  // truth in both directions: it called the real defect "ok" and called the working
  // harassment path a failure. Judge an INSERT policy by what reaches the table.
  const forgedReason = `${tag}-forged`, anonReason = `${tag}-anon`;
  await rest("/user_reports", { token: A.token, method: "POST",
    body: { reported_id: B.id, reason: forgedReason, status: "open", reporter: B.id } });
  await rest("/user_reports", { method: "POST",
    body: { reported_id: B.id, reason: anonReason, status: "open", reporter_label: "signed out" } });

  const landed = await svc(`/rest/v1/user_reports?reason=like.${tag}*&select=id,reason,reporter`);
  const rows = Array.isArray(landed.body) ? landed.body : [];
  madeReports.push(...rows.map((r) => r.id));
  const forgedRow = rows.find((r) => r.reason === forgedReason);
  const anonRow   = rows.find((r) => r.reason === anonReason);

  !forgedRow
    ? ok("A cannot file a report AS B — no such row reached the table")
    : bad(`A FILED A REPORT AS B — row ${forgedRow.id.slice(0, 8)} is in the table with reporter=${String(forgedRow.reporter).slice(0, 8)}`);

  // The intended case must keep working, or a fix here is worse than the bug.
  anonRow && anonRow.reporter === null
    ? ok("a signed-out report still lands with reporter null — the harassment case lib/db.js documents is intact")
    : bad("a signed-out report did NOT land — that path is deliberate; do not close it");
} finally {
  for (const id of madeContribs) await svc(`/rest/v1/contributions?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
  for (const id of madeReports) await svc(`/rest/v1/user_reports?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
  for (const id of users) {
    await svc(`/rest/v1/contributions?contributor=eq.${id}`, { method: "DELETE" }).catch(() => {});
    await svc(`/rest/v1/profiles?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
    await svc(`/auth/v1/admin/users/${id}`, { method: "DELETE" }).catch(() => {});
  }
  const c = await svc("/rest/v1/contributions?select=id");
  const u = await svc("/rest/v1/user_reports?select=id");
  console.log(`\ncleanup: ${users.length} accounts removed · contributions now ${(c.body || []).length}, user_reports ${(u.body || []).length}`);
}
process.exit(fail ? 1 : 0);

// MEASURED on the live project, before and after 0164:
//
//                                              before        after
//   omitted contributor -> caller's uid        ok            ok      <- the normal path
//   A attributes a contribution to B           201  <-BUG    403
//   one account, 3 invented contributor ids    3/3  <-BUG    refused
//   A files a report as B                      row landed    no row  <- see the note above
//   signed-out report lands, reporter null     ok            ok      <- MUST keep working
//
// The last row is the one to watch when changing anything here. lib/db.js documents that a null
// reporter is deliberate — "someone being harassed must not be blocked from reporting by being
// logged out" — so a fix that pins reporter to auth.uid() unconditionally would close a safety
// path to shut a forgery hole. The rule is null-or-self.
//
// The consensus assertion counts DISTINCT contributors on one route+field, which is how the app
// computes "3 climbers agree". Counting inserts instead would miss the point: three rows from one
// honest climber are not consensus and never were.
//
// A oneoff, not a check:* guard: needs the service key to delete the accounts and rows it creates,
// and writes to auth on the live project. Re-run after any change to the contributions or
// user_reports INSERT policies, or to submitContribution / submitReport in lib/db.js.
