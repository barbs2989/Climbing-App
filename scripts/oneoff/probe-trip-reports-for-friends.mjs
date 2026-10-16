// Does 0269's "My friends" trip-report tier hold -- against the LIVE database, with real accounts?
//
//   node scripts/oneoff/probe-trip-reports-for-friends.mjs
//
// A writes a friends-only report. F is A's friend (request + accept, the app's own path), S is a stranger.
// Every read under test uses the anon key + that climber's JWT; the service key creates and reads back.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const DOMAIN = "climbmatch-qa.invalid";
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const bad = (m, d) => { fail++; console.log("  FAIL " + m + (d ? "  -- " + d : "")); };
const svc = requireServiceKey();
async function api(p, opts, key, jwt) {
  const r = await fetch(SUPABASE_URL + p, { ...opts, headers: { apikey: key, Authorization: "Bearer " + (jwt || key), "Content-Type": "application/json", ...((opts && opts.headers) || {}) } });
  const text = await r.text(); let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}
const as = (u) => ({
  get: (p) => api(p, { method: "GET" }, anonKey(), u.jwt),
  post: (p, b) => api(p, { method: "POST", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
  patch: (p, b) => api(p, { method: "PATCH", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
  del: (p) => api(p, { method: "DELETE" }, anonKey(), u.jwt),
  rpc: (fn, b) => api("/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(b || {}) }, anonKey(), u.jwt),
});
const msg = (r) => (r && r.body && (r.body.message || r.body.msg)) || "";
async function createUser(tag) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "friendvis-" + tag + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Vis " + tag } }) }, svc);
  if (!c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const s = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  return { id: c.body.id, jwt: s.body.access_token, tag };
}
const made = [];
const ROUTE = "wa_mount_baker_north_ridge";
const sees = async (u, id) => { const r = u ? await as(u).get("/rest/v1/climb_logs?select=id&id=eq." + id) : await api("/rest/v1/climb_logs?select=id&id=eq." + id, { method: "GET" }, anonKey()); return Array.isArray(r.body) && r.body.length === 1; };

async function main() {
  console.log("0269 — friends-only trip reports, live; real accounts" + NL);
  const [A, F, S] = await Promise.all(["a", "f", "s"].map(createUser));
  made.push(A, F, S);
  const req = await as(A).post("/rest/v1/connections", { requester: A.id, addressee: F.id });
  const cid = Array.isArray(req.body) && req.body[0] && req.body[0].id;
  const acc = cid && await as(F).patch("/rest/v1/connections?id=eq." + cid, { status: "accepted" });
  if (!(acc && Array.isArray(acc.body) && acc.body.length === 1)) throw new Error("CONTROL FAILED: A and F could not become friends");
  const today = new Date().toISOString().slice(0, 10);
  const lg = await as(A).post("/rest/v1/climb_logs", { user_id: A.id, route_id: ROUTE, discipline: "mountaineering", date_climbed: today, trip_report_visibility: "friends", stars: 4, cond_tags: ["probe-friends-tier"], notes: "friends-only beta: the bergschrund is open" });
  const lid = Array.isArray(lg.body) && lg.body[0] && lg.body[0].id;
  if (!lid) throw new Error("A could not write a FRIENDS report (" + lg.status + " " + msg(lg) + ")");
  ok("the database accepts 'friends' as a visibility");

  if (await sees(A, lid)) ok("the author reads their own report"); else bad("the author reads their own report");
  if (await sees(F, lid)) ok("a FRIEND reads it"); else bad("a friend reads it");
  if (!(await sees(S, lid))) ok("a STRANGER does not"); else bad("a stranger does not");
  if (!(await sees(null, lid))) ok("a signed-out visitor does not"); else bad("a signed-out visitor does not");

  const consF = await as(F).rpc("get_trip_reports_for_consensus", { p_route_id: ROUTE });
  const consS = await as(S).rpc("get_trip_reports_for_consensus", { p_route_id: ROUTE });
  const inF = Array.isArray(consF.body) && consF.body.some((r) => r.id === lid), inS = Array.isArray(consS.body) && consS.body.some((r) => r.id === lid);
  if (inF && !inS) ok("it feeds the route's conditions for a friend, and not for a stranger");
  else bad("conditions consensus honours the tier", "friend " + inF + " / stranger " + inS + " (" + consF.status + "/" + consS.status + ")");

  const repS = await as(S).rpc("report_content", { p_kind: "trip_report", p_id: lid, p_reason: "Spam or scam" });
  if (repS.status >= 300) ok("a stranger cannot report (or read) it"); else bad("a stranger cannot report it", repS.status);
  const repF = await as(F).rpc("report_content", { p_kind: "trip_report", p_id: lid, p_reason: "Spam or scam" });
  if (typeof repF.body === "string") ok("a friend who can read it can report it"); else bad("a friend can report it", repF.status + " " + msg(repF));

  const bad1 = await as(A).post("/rest/v1/climb_logs", { user_id: A.id, route_id: ROUTE, discipline: "mountaineering", date_climbed: today, trip_report_visibility: "followers" });
  if (bad1.status >= 300) ok("an unknown visibility is still refused"); else bad("an unknown visibility is refused", bad1.status);

  await as(F).del("/rest/v1/connections?id=eq." + cid);
  if (!(await sees(F, lid))) ok("after UNFRIENDING, the former friend can no longer read it");
  else bad("unfriending revokes the friend's read");
}
try { await main(); }
finally {
  let stuck = 0;
  for (const u of made) {
    await api("/rest/v1/user_reports?reported_id=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    const r = await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => ({ status: 0 }));
    if (r.status >= 300 || r.status === 0) { stuck++; console.log("  FAIL could not delete fixture " + u.tag + " (" + r.status + ")"); }
  }
  if (stuck) fail++;
  console.log(NL + pass + " passed, " + fail + " failed; torn down " + (made.length - stuck) + " of " + made.length + " account(s).");
}
process.exitCode = fail ? 1 : 0;
