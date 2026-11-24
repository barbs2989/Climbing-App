// Does every gate a CLIMBER meets on a route edit hold — against the LIVE database? (0308/0309/0382/0505/0530)
//
//   node scripts/oneoff/probe-route-edit-gates.mjs
//
// The climber half of probe-route-quality-control.mjs, written 2026-11-24 because that probe needs a throwaway
// MODERATOR, and production now refuses to promote one (the trigger that guards is_admin holds even against the
// service key, by design). Nothing here needs an admin: two throwaway climbers (V, established; Y, brand new),
// each writing with the anon key + their own JWT, the service key only creating them and READING outcomes
// (RLS answers a refused write with an error OR a 200 + no rows, so every check reads the truth back).
// Every row it makes and both accounts are deleted in `finally`. Run it through the DB slot gate.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const svc = requireServiceKey();
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const bad = (m, d) => { fail++; console.log("  FAIL " + m + (d ? "  -- " + d : "")); };
async function api(p, o, key, jwt) {
  const r = await fetch(SUPABASE_URL + p, { ...o, headers: { apikey: key, Authorization: "Bearer " + (jwt || key), "Content-Type": "application/json", ...((o && o.headers) || {}) } });
  const t = await r.text(); let b = null; try { b = t ? JSON.parse(t) : null; } catch { b = t; }
  return { status: r.status, body: b };
}
const truth = (p) => api(p, { method: "GET" }, svc);
const msg = (r) => (r.body && (r.body.message || r.body.msg)) || JSON.stringify(r.body);
const made = [];
async function mk(tag) {
  const email = `qc-${tag}-${Math.random().toString(36).slice(2, 9)}@climbmatch-qa.invalid`, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "QC " + tag } }) }, svc);
  if (!c.body || !c.body.id) throw new Error("create failed " + c.status);
  made.push(c.body.id);
  const s = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  if (!s.body || !s.body.access_token) throw new Error("sign in failed");
  return { id: c.body.id, jwt: s.body.access_token };
}
const as = (u) => ({
  post: (p, b) => api(p, { method: "POST", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
  patch: (p, b) => api(p, { method: "PATCH", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
  get: (p) => api(p, { method: "GET" }, anonKey(), u.jwt),
  // A wrong argument name answers PGRST202, which would read as "refused": abort instead of passing.
  rpc: async (f, b) => { const r = await api("/rest/v1/rpc/" + f, { method: "POST", body: JSON.stringify(b) }, anonKey(), u.jwt); if (r.body && r.body.code === "PGRST202") throw new Error("RPC signature mismatch: " + f); return r; },
});
const anon = { get: (p) => api(p, { method: "GET" }, anonKey()) };
const edit = (u, r, f, v, extra) => as(u).post("/rest/v1/contributions", { route_id: r, kind: "field", field: f, value: v, contributor: u.id, ...(extra || {}) });
const statusOf = async (id) => ((await truth("/rest/v1/contributions?id=eq." + id + "&select=status,reviewed_by")).body || [])[0] || null;

async function main() {
  console.log("route edit gates — two throwaway climbers, anon key + their own JWT, outcomes read back with the service key\n");
  const V = await mk("v"), Y = await mk("y");
  await api("/rest/v1/profiles?id=eq." + V.id, { method: "PATCH", body: JSON.stringify({ created_at: new Date(Date.now() - 40 * 864e5).toISOString() }) }, svc);
  const R = ((await truth("/rest/v1/routes?discipline=eq.sport&watch_out=is.null&season=not.is.null&grade=not.is.null&lat=not.is.null&select=id,area_id,lat,lng&limit=1")).body || [])[0];
  if (!R) throw new Error("no sport route with an empty watch_out, a season, a grade and a position to test on");
  console.log("route under test: " + R.id);
  const sel = "grade,season,watch_out";
  const before = ((await truth(`/rest/v1/routes?id=eq.${encodeURIComponent(R.id)}&select=${sel}`)).body || [])[0];

  const g = await edit(V, R.id, "grade", "5.14d");
  if (g.status >= 400 && /locked at high confidence/.test(msg(g))) ok("an edit to a HIGH field (the grade) is refused"); else bad("grade lock", g.status + " " + msg(g));

  const e1 = await edit(V, R.id, "watchOut", "QC probe: a loose block at the second bolt.", { status: "approved", reviewed_by: V.id, review_note: "self" });
  const id1 = e1.body && e1.body[0] && e1.body[0].id;
  const s1 = id1 && (await statusOf(id1));
  if (s1 && s1.status === "pending" && !s1.reviewed_by) ok("an edit sent as 'approved' is stored PENDING"); else bad("held", JSON.stringify(s1 || e1.body));
  if (id1) {
    await as(V).patch("/rest/v1/contributions?id=eq." + id1, { status: "approved" });
    if ((await statusOf(id1)).status === "pending") ok("the climber cannot UPDATE their edit to approved"); else bad("self-approve by update");
    const ap = await as(V).rpc("approve_field_contribution", { p_id: id1, p_value: null, p_also: [] });
    if (ap.status >= 400 && (await statusOf(id1)).status === "pending") ok("the climber cannot call approve_field_contribution"); else bad("non-admin approve", ap.status);
    const rj = await as(V).rpc("reject_field_contribution", { p_id: id1, p_reason: "nope nope nope", p_also: [], p_strike: false });
    if (rj.status >= 400) ok("...nor reject_field_contribution"); else bad("non-admin reject", rj.status);
    const wd = await as(V).rpc("withdraw_approval", { p_id: id1, p_reason: "taking back my own edit" });
    if (wd.status >= 400) ok("...nor withdraw_approval (0530)"); else bad("non-admin withdraw", wd.status);
    // 0530: a waiting edit is private to its sender.
    const peekY = await as(Y).get("/rest/v1/contributions?id=eq." + id1 + "&select=id");
    if (Array.isArray(peekY.body) && peekY.body.length === 0) ok("another climber cannot read the waiting edit (0530)"); else bad("pending visible to another climber", JSON.stringify(peekY.body));
    const peekA = await anon.get("/rest/v1/contributions?id=eq." + id1 + "&select=id");
    if (Array.isArray(peekA.body) && peekA.body.length === 0) ok("...nor can a signed-out reader (0530)"); else bad("pending visible signed out", JSON.stringify(peekA.body));
    const own = await as(V).get("/rest/v1/contributions?id=eq." + id1 + "&select=id");
    if (Array.isArray(own.body) && own.body.length === 1) ok("its sender still can"); else bad("sender cannot read own edit");
  }

  const dw = await as(V).patch(`/rest/v1/routes?id=eq.${encodeURIComponent(R.id)}`, { watch_out: "hacked" });
  const after = ((await truth(`/rest/v1/routes?id=eq.${encodeURIComponent(R.id)}&select=${sel}`)).body || [])[0];
  if (JSON.stringify(before) === JSON.stringify(after)) ok("the routes row is unchanged, a direct PATCH included (" + dw.status + ")"); else bad("routes changed", JSON.stringify(after));

  if ((await as(V).rpc("set_contribution_standing", { p_user: V.id, p_status: "ok", p_strikes: 0, p_days: null, p_reason: "self reset please" })).status >= 400) ok("the climber cannot set their own standing"); else bad("self standing");
  if ((await as(V).rpc("set_route_field_confidence", { p_route_id: R.id, p_field: "grade", p_level: null, p_reason: "unlock it for me" })).status >= 400) ok("...nor unlock a field"); else bad("self unlock");
  if ((await as(V).rpc("set_reviewer", { p_user: V.id, p_on: true })).status >= 400) ok("...nor make themselves a reviewer (0530)"); else bad("self reviewer via rpc");
  await as(V).patch("/rest/v1/profiles?id=eq." + V.id, { is_admin: true, is_reviewer: true });
  const pr = ((await truth("/rest/v1/profiles?id=eq." + V.id + "&select=is_admin,is_reviewer")).body || [])[0] || {};
  if (pr.is_admin === false && pr.is_reviewer === false) ok("...nor set is_admin / is_reviewer on their profile"); else bad("self flags", JSON.stringify(pr));

  const np = await as(V).post("/rest/v1/contributions", { area_id: R.area_id, kind: "new_route", value: { name: "QC Probe Route " + Date.now(), grade: "5.9", discipline: "sport" }, contributor: V.id });
  if (np.body && np.body[0]) { if ((await as(V).rpc("approve_new_route", { p_contribution_id: np.body[0].id })).status >= 400) ok("the climber cannot approve their own proposed climb"); else bad("self approve route"); }
  else bad("proposal insert", np.status + " " + msg(np));

  if ((await as(V).rpc("file_route_flag", { p_route_id: R.id, p_field: "season", p_note: "QC probe: the season looks wrong" })).status < 300) ok("the climber can flag a field"); else bad("flag");
  const f3 = await as(V).rpc("file_route_flag", { p_route_id: R.id, p_field: "grade", p_note: "no" });
  if (f3.status >= 400) ok("a 2-character flag note is refused (0530)"); else bad("short flag note accepted");

  // 0530: values are checked when sent.
  for (const [f, v, why] of [["highPointFt", 999999, "a 999,999 ft high point"], ["watchOut", "Call for beta: http://spam.example", "a link in route text"],
    ["grade", "harder than it looks honestly", "a sentence as a grade"], ["waypoints", [{ name: "Far", lat: R.lat + 2, lng: R.lng }], "a pin ~220 km from the climb"]]) {
    const r = await edit(V, R.id, f, v);
    if (r.status >= 400) ok("refused when sent: " + why + " — " + msg(r).slice(0, 70)); else bad("accepted: " + why);
  }
  const good = await edit(V, R.id, "highPointFt", 9000);
  if (good.status < 300) ok("a plausible value still goes in"); else bad("plausible value refused", msg(good));

  let n = 0, refused = null;
  for (let i = 0; i < 7; i++) { const r = await edit(Y, R.id, "proTips", "QC probe tip " + i); if (r.status < 300) n++; else { refused = r; break; } }
  if (n === 5 && refused && /a lot of edits/.test(msg(refused))) ok("a new account gets 5 edits a day; the 6th is refused"); else bad("young cap", n + " " + (refused && msg(refused)));
  if ((await edit(V, R.id, "proTips", "x".repeat(20050))).status >= 400) ok("a value over 20,000 characters is refused"); else bad("size cap");
}
async function destroy() {
  for (const id of made) {
    await api("/rest/v1/contributions?contributor=eq." + id, { method: "DELETE" }, svc);
    await api("/rest/v1/route_flags?reporter=eq." + id, { method: "DELETE" }, svc);
    await api("/rest/v1/user_notices?user_id=eq." + id, { method: "DELETE" }, svc);
    await api("/auth/v1/admin/users/" + id, { method: "DELETE" }, svc);
  }
  const left = await api("/auth/v1/admin/users?per_page=1000", { method: "GET" }, svc);
  const n = ((left.body && left.body.users) || []).filter((u) => made.includes(u.id)).length;
  console.log(n ? `  WARN ${n} test account(s) were not deleted` : "  cleaned up: both test accounts and everything they wrote are gone");
}
try { await main(); } catch (e) { fail++; console.log("  ABORT " + e.message); } finally { await destroy(); console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; }
