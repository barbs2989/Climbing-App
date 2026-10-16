// Does 0272 hold -- trip reports readable by EVERYONE unless the climber changes that on their profile --
// against the LIVE database, with real accounts?
//
//   node scripts/oneoff/probe-trip-reports-default.mjs
//
// A writes reports WITHOUT naming a visibility (what any writer that forgets the field does) and the
// database fills it from A's profile. F is A's friend, S is a stranger. Every read under test uses the anon
// key + that climber's JWT; the service key only creates the accounts and reads back.
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
});
const msg = (r) => (r && r.body && (r.body.message || r.body.msg)) || "";
async function createUser(tag) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "tripdefault-" + tag + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Def " + tag } }) }, svc);
  if (!c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const s = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  return { id: c.body.id, jwt: s.body.access_token, tag };
}
const made = [];
const ROUTE = "wa_mount_baker_north_ridge";
const today = new Date().toISOString().slice(0, 10);
const sees = async (u, id) => { const r = u ? await as(u).get("/rest/v1/climb_logs?select=id&id=eq." + id) : await api("/rest/v1/climb_logs?select=id&id=eq." + id, { method: "GET" }, anonKey()); return Array.isArray(r.body) && r.body.length === 1; };
const stored = async (id) => { const r = await api("/rest/v1/climb_logs?select=trip_report_visibility&id=eq." + id, { method: "GET" }, svc); return Array.isArray(r.body) && r.body[0] ? r.body[0].trip_report_visibility : "(missing)"; };
const writeLog = async (u, extra) => {
  const r = await as(u).post("/rest/v1/climb_logs", { user_id: u.id, route_id: ROUTE, discipline: "mountaineering", date_climbed: today, stars: 4, cond_tags: ["probe-trip-default"], ...(extra || {}) });
  const id = Array.isArray(r.body) && r.body[0] && r.body[0].id;
  if (!id) throw new Error(u.tag + " could not write a report (" + r.status + " " + msg(r) + ")");
  return id;
};
const setDefault = (u, v) => as(u).patch("/rest/v1/profiles?id=eq." + u.id, { trip_reports_default: v });

async function main() {
  console.log("0272 — trip reports default to everyone, unless the profile says otherwise; real accounts" + NL);
  const [A, F, S] = await Promise.all(["a", "f", "s"].map(createUser));
  made.push(A, F, S);
  const req = await as(A).post("/rest/v1/connections", { requester: A.id, addressee: F.id });
  const cid = Array.isArray(req.body) && req.body[0] && req.body[0].id;
  const acc = cid && await as(F).patch("/rest/v1/connections?id=eq." + cid, { status: "accepted" });
  if (!(acc && Array.isArray(acc.body) && acc.body.length === 1)) throw new Error("CONTROL FAILED: A and F could not become friends");

  const prof = await as(A).get("/rest/v1/profiles?select=trip_reports_default&id=eq." + A.id);
  if (Array.isArray(prof.body) && prof.body[0] && prof.body[0].trip_reports_default === "public") ok("a brand-new climber's setting is Everyone");
  else bad("a new climber's setting is Everyone", JSON.stringify(prof.body));

  const l1 = await writeLog(A);
  const v1 = await stored(l1);
  if (v1 === "public") ok("a report written without a visibility is stored as Everyone (it used to be 'crew', readable by nobody)");
  else bad("an unnamed visibility defaults to Everyone", v1);
  const mod1 = (await api("/rest/v1/climb_logs?select=moderation&id=eq." + l1, { method: "GET" }, svc)).body;
  if (await sees(S, l1)) ok("...and a stranger can read it"); else bad("a stranger can read the default report", "moderation " + JSON.stringify(mod1));
  if (await sees(null, l1)) ok("...and so can a signed-out visitor"); else bad("a signed-out visitor can read the default report", "moderation " + JSON.stringify(mod1));

  // 0273: 0269's policy named a function signed-out visitors may not EXECUTE, so every signed-out read 401'd.
  const cons = await api("/rest/v1/rpc/get_trip_reports_for_consensus", { method: "POST", body: JSON.stringify({ p_route_id: ROUTE }) }, anonKey());
  if (cons.status === 200 && Array.isArray(cons.body) && cons.body.some((r) => r.id === l1)) ok("a signed-out visitor gets the route's conditions, this report included (0273)");
  else bad("a signed-out visitor gets the route's conditions", cons.status + " " + msg(cons));
  const probeAF = await api("/rest/v1/rpc/are_friends", { method: "POST", body: JSON.stringify({ a: A.id, b: F.id }) }, anonKey(), S.jwt);
  if (probeAF.status >= 300) ok("a signed-in stranger cannot ask whether two OTHER climbers are friends (" + probeAF.status + ")");
  else bad("are_friends is not callable on other people", probeAF.status + " " + JSON.stringify(probeAF.body));
  const mineF = await api("/rest/v1/rpc/is_my_friend", { method: "POST", body: JSON.stringify({ p_other: A.id }) }, anonKey(), F.jwt);
  const mineS = await api("/rest/v1/rpc/is_my_friend", { method: "POST", body: JSON.stringify({ p_other: A.id }) }, anonKey(), S.jwt);
  const mineAnon = await api("/rest/v1/rpc/is_my_friend", { method: "POST", body: JSON.stringify({ p_other: A.id }) }, anonKey());
  if (mineF.body === true && mineS.body === false && mineAnon.body === false) ok("is_my_friend answers only about the caller: friend true, stranger false, signed-out false");
  else bad("is_my_friend answers only about the caller", [mineF.body, mineS.body, mineAnon.status + ":" + JSON.stringify(mineAnon.body)].join(" / "));

  const sp = await setDefault(A, "private");
  if (Array.isArray(sp.body) && sp.body.length === 1) ok("A changes their profile to Just me"); else bad("A changes their default", sp.status + " " + msg(sp));
  const l2 = await writeLog(A);
  if ((await stored(l2)) === "private" && !(await sees(S, l2)) && !(await sees(F, l2)) && await sees(A, l2)) ok("a new report then follows it: only A can read it");
  else bad("a new report follows Just me", await stored(l2));

  await setDefault(A, "friends");
  const l3 = await writeLog(A);
  if ((await stored(l3)) === "friends" && await sees(F, l3) && !(await sees(S, l3))) ok("with My friends: the friend reads the new report, the stranger does not");
  else bad("a new report follows My friends", await stored(l3));

  const l4 = await writeLog(A, { trip_report_visibility: "public" });
  if ((await stored(l4)) === "public" && await sees(S, l4)) ok("a visibility picked on the report itself still wins over the profile setting");
  else bad("an explicit visibility wins", await stored(l4));

  const badv = await setDefault(A, "crew");
  if (badv.status >= 300) ok("the profile setting refuses anything but Everyone / My friends / Just me (" + ((badv.body && badv.body.code) || badv.status) + ")");
  else bad("an unknown default is refused", badv.status);

  await as(S).patch("/rest/v1/profiles?id=eq." + A.id, { trip_reports_default: "public" });
  const after = await api("/rest/v1/profiles?select=trip_reports_default&id=eq." + A.id, { method: "GET" }, svc);
  if (Array.isArray(after.body) && after.body[0] && after.body[0].trip_reports_default === "friends") ok("nobody else can change A's setting");
  else bad("nobody else can change A's setting", JSON.stringify(after.body));

  // Settings' "apply to my earlier reports" is this exact request (setAllMyTripReportVisibility).
  await as(S).patch("/rest/v1/climb_logs?user_id=eq." + A.id + "&trip_report_visibility=neq.private", { trip_report_visibility: "private" });
  if ((await stored(l1)) === "public") ok("nobody else can rewrite A's earlier reports"); else bad("a stranger cannot rewrite A's reports", await stored(l1));
  const bulk = await as(A).patch("/rest/v1/climb_logs?user_id=eq." + A.id + "&trip_report_visibility=neq.private", { trip_report_visibility: "private" });
  const n = Array.isArray(bulk.body) ? bulk.body.length : -1;
  const allPrivate = (await Promise.all([l1, l2, l3, l4].map(stored))).every((v) => v === "private");
  if (n === 3 && allPrivate && !(await sees(S, l1)) && !(await sees(F, l3))) ok("A applies Just me to all earlier reports: 3 changed, nobody else can read any of them");
  else bad("A applies a setting to earlier reports", "changed " + n + ", all private " + allPrivate);
}
try { await main(); }
finally {
  let stuck = 0;
  for (const u of made) {
    const r = await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => ({ status: 0 }));
    if (r.status >= 300 || r.status === 0) { stuck++; console.log("  FAIL could not delete fixture " + u.tag + " (" + r.status + ")"); }
  }
  if (stuck) fail++;
  console.log(NL + pass + " passed, " + fail + " failed; torn down " + (made.length - stuck) + " of " + made.length + " account(s).");
}
process.exitCode = fail ? 1 : 0;
