// Do 0307–0309 hold, lock, strike, flag and tell -- against the LIVE database, with real accounts?
//
//   node scripts/oneoff/probe-route-quality-control.mjs
//
// Accounts: V (a contributor), Y (a brand-new account, for the young-account cap) and M, a throwaway
// MODERATOR promoted for the run (prevent_self_admin only lets an admin grant is_admin, so the probe
// borrows the existing admin's identity for that one statement) and demoted + deleted in `finally`.
// Every write under test uses the anon key + that climber's own JWT; the service key creates the
// accounts and READS BACK outcomes, because RLS answers a refused write with 4xx OR a 200 + no rows.
//
// The route under test is a real sport route with an EMPTY `watch_out` and a filled `season`. The
// probe approves one edit on it (which writes a route_field_confidence row) and deletes that row and
// every contribution it made in `finally`; it never touches `grade`, so routes itself is not written.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
  rpc: (fn, b) => api("/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(b) }, anonKey(), u.jwt),
});
const truth = (p) => api(p, { method: "GET" }, svc);
const code = (r) => (r && r.body && (r.body.error_code || (typeof r.body.code === "string" ? r.body.code : ""))) || "";
const msg = (r) => (r && r.body && (r.body.message || r.body.msg)) || JSON.stringify(r && r.body);

function sql(text) {
  const f = path.join(os.tmpdir(), "probe-0309-" + process.pid + "-" + Math.random().toString(36).slice(2) + ".sql");
  fs.writeFileSync(f, text);
  try { return execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", f], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  finally { fs.unlinkSync(f); }
}
const setAdmin = (id, on) => sql(
  "do $$ declare a uuid; begin select id into a from profiles where is_admin and id <> '" + id + "' limit 1; " +
  "perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); " +
  "update profiles set is_admin = " + (on ? "true" : "false") + " where id = '" + id + "'; end $$;");

async function signIn(u) {
  return api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: u.email, password: u.password }) }, anonKey());
}
async function createUser(tag, name) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "qc-" + tag + "-" + stamp + "@" + DOMAIN;
  const password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }) }, svc);
  if (c.status >= 300 || !c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const u = { id: c.body.id, email, password, tag };
  const s = await signIn(u);
  if (!s.body || !s.body.access_token) throw new Error("sign in " + tag + " failed");
  u.jwt = s.body.access_token;
  return u;
}

const made = [], cleanup = { promoted: null, route: null, fields: [] };
async function destroy() {
  for (const u of made) {
    await api("/rest/v1/contributions?contributor=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    await api("/rest/v1/route_flags?reporter=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    await api("/rest/v1/moderation_actions?target_owner=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    await api("/rest/v1/moderation_actions?actor=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
  }
  if (cleanup.route) for (const f of cleanup.fields) {
    await api("/rest/v1/route_field_confidence?route_id=eq." + encodeURIComponent(cleanup.route) + "&field=eq." + f, { method: "DELETE" }, svc).catch(() => {});
  }
  if (cleanup.promoted) { try { setAdmin(cleanup.promoted, false); } catch (e) { console.log("  WARN could not demote the fixture moderator: " + e.message); } }
  for (const u of made) await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
}

const edit = (u, routeId, field, value) => as(u).post("/rest/v1/contributions", { route_id: routeId, kind: "field", field, value, contributor: u.id });
const firstId = (r) => (Array.isArray(r.body) && r.body[0] && r.body[0].id) || null;
async function rowOf(id) { const r = await truth("/rest/v1/contributions?id=eq." + id + "&select=status,review_note,applied_value"); return (r.body && r.body[0]) || null; }
async function standingOf(u) { const r = await truth("/rest/v1/contribution_standing?user_id=eq." + u.id + "&select=status,strikes,until"); return (r.body && r.body[0]) || null; }
async function noticesOf(u) { const r = await truth("/rest/v1/user_notices?user_id=eq." + u.id + "&select=kind,title,body&order=created_at.asc"); return r.body || []; }
async function levelOf(u, routeId, field) { const r = await as(u).rpc("route_field_level", { p_route_id: routeId, p_field: field }); return r.body; }

async function main() {
  console.log("0307–0309 — held edits, confidence locks, strikes, flags, notices; real accounts, anon key + each climber's own JWT" + NL);
  const V = await createUser("v", "Val Contributor"), Y = await createUser("y", "Yan Newcomer"), M = await createUser("m", "Mo Moderator");
  made.push(V, Y, M);
  // V is an ESTABLISHED account (cap 20/day); Y stays brand new (cap 5/day).
  await api("/rest/v1/profiles?id=eq." + V.id, { method: "PATCH", body: JSON.stringify({ created_at: new Date(Date.now() - 40 * 86400000).toISOString() }) }, svc);
  setAdmin(M.id, true); cleanup.promoted = M.id;

  const rq = await truth("/rest/v1/routes?discipline=eq.sport&watch_out=is.null&season=not.is.null&grade=not.is.null&select=id,name&limit=1");
  const R = rq.body && rq.body[0] && rq.body[0].id;
  if (!R) throw new Error("no sport route with an empty watch_out and a filled season to test on");
  cleanup.route = R; cleanup.fields = ["watchOut", "season", "approach", "beta"];
  console.log("  route under test: " + R + NL);

  // ---- 1. The computed levels.
  const map = await as(V).rpc("route_field_confidence_map", { p_route_id: R });
  const m = map.body || {};
  if (m.name === "high" && m.grade === "high") ok("name and a sport grade compute HIGH"); else bad("identity/grade level", JSON.stringify({ name: m.name, grade: m.grade }));
  if (m.watchOut === "low") ok("an EMPTY field computes LOW"); else bad("empty field level", String(m.watchOut));
  if (m.season === "medium") ok("a filled, unverified field computes MEDIUM"); else bad("filled field level", String(m.season));

  // ---- 2. A HIGH field is refused at the insert; a LOW one is held pending.
  const g = await edit(V, R, "grade", "5.9");
  if (g.status >= 400 && code(g) === "P0001" && /locked at high confidence/.test(msg(g))) ok("an edit to a HIGH field is REFUSED with the climber's sentence");
  else bad("high-field lock", g.status + " " + msg(g));
  const e1 = await edit(V, R, "watchOut", "Loose block at the top of pitch 1");
  const e1id = firstId(e1);
  if (e1id && (await rowOf(e1id)).status === "pending") ok("an edit to an EMPTY field is accepted and HELD (pending), not applied"); else bad("held edit", e1.status + " " + msg(e1));
  if ((await levelOf(V, R, "watchOut")) === "low") ok("...and the field stays LOW while it waits"); else bad("level while pending");

  // ---- 3. Approval: applied value, HIGH, notice, and the field is now locked for everyone.
  const ap = await as(M).rpc("approve_field_contribution", { p_id: e1id, p_value: "Loose block at the top of pitch 1 — tested 2026", p_also: [] });
  if (ap.status < 300) ok("the moderator approves, with an edited value"); else bad("approve", ap.status + " " + msg(ap));
  const r1 = await rowOf(e1id);
  if (r1 && r1.status === "approved" && /tested 2026/.test(String(r1.applied_value))) ok("the row is approved and carries the applied value"); else bad("approved row", JSON.stringify(r1));
  if ((await levelOf(V, R, "watchOut")) === "high") ok("the approved field is HIGH"); else bad("level after approve");
  const e2 = await edit(V, R, "watchOut", "something else");
  if (e2.status >= 400 && /locked at high confidence/.test(msg(e2))) ok("...and a second edit to it is refused"); else bad("post-approval lock", e2.status + " " + msg(e2));
  const nonAdminApprove = await as(V).rpc("approve_field_contribution", { p_id: e1id, p_value: null, p_also: [] });
  if (nonAdminApprove.status >= 400) ok("a climber cannot call approve"); else bad("non-admin approve went through");

  // ---- 4. Rejection is a strike: 1 -> warned, 3 -> restricted (edits refused, flags allowed).
  const ids = [];
  for (const [f, v] of [["season", "Oct–Apr"], ["approach", "Park at the lower lot."], ["beta", "Stay left at the bulge."]]) {
    const r = await edit(V, R, f, v); const id = firstId(r); if (!id) throw new Error("edit " + f + " failed: " + r.status + " " + msg(r)); ids.push(id);
  }
  const shortReason = await as(M).rpc("reject_field_contribution", { p_id: ids[0], p_reason: "no", p_also: [], p_strike: true });
  if (shortReason.status >= 400) ok("a rejection needs a real reason"); else bad("short reason accepted");
  for (let i = 0; i < 3; i++) {
    const rj = await as(M).rpc("reject_field_contribution", { p_id: ids[i], p_reason: "Does not match the guidebook or the climbers who logged it", p_also: [], p_strike: true });
    if (rj.status >= 300) bad("reject #" + (i + 1), rj.status + " " + msg(rj));
    const st = await standingOf(V);
    if (i === 0 && st && st.status === "warned" && st.strikes === 1) ok("strike 1 -> warned");
    if (i === 2 && st && st.status === "restricted" && st.strikes === 3 && st.until) ok("strike 3 -> restricted, with an until-date");
  }
  const rr = await rowOf(ids[0]);
  if (rr && rr.status === "rejected" && /guidebook/.test(rr.review_note || "")) ok("the rejected row carries the reason"); else bad("rejected row", JSON.stringify(rr));
  const e3 = await edit(V, R, "season", "Nov–Mar");
  if (e3.status >= 400 && (code(e3) === "42501" || e3.status === 403)) ok("a RESTRICTED contributor's edit is refused by the policy"); else bad("restricted edit", e3.status + " " + msg(e3));
  const fl = await as(V).rpc("file_route_flag", { p_route_id: R, p_field: "season", p_note: "This window is wrong — it bakes in July" });
  if (fl.status < 300 && fl.body) ok("...but they can still FLAG a field"); else bad("flag while restricted", fl.status + " " + msg(fl));
  if ((await levelOf(V, R, "season")) === "low") ok("an open flag drops a MEDIUM field to LOW"); else bad("flagged level");
  if ((await levelOf(V, R, "name")) === "high") ok("...and a flag never lowers a HIGH field"); else bad("flag vs high");
  const rs = await as(M).rpc("resolve_route_flag", { p_id: fl.body, p_status: "fixed", p_note: "Updated the window" });
  if (rs.status < 300 && (await levelOf(V, R, "season")) === "medium") ok("resolving the flag restores the computed level"); else bad("resolve flag", rs.status + " " + msg(rs));

  // ---- 5. Ban at 5, then an appeal that reverses it.
  const sc = await as(M).rpc("set_contribution_standing", { p_user: V.id, p_status: "warned", p_strikes: 4, p_days: null, p_reason: "probe: set to four strikes" });
  if (sc.status < 300) ok("the moderator can set standing by hand"); else bad("set standing", sc.status + " " + msg(sc));
  const e5 = await edit(V, R, "beta", "Clip the second bolt from the ledge"); const e5id = firstId(e5);
  if (!e5id) bad("edit after reset", e5.status + " " + msg(e5));
  else {
    await as(M).rpc("reject_field_contribution", { p_id: e5id, p_reason: "Contradicts three logged climbs", p_also: [], p_strike: true });
    const st = await standingOf(V);
    if (st && st.status === "banned" && st.strikes === 5) ok("strike 5 -> banned from contributing"); else bad("ban", JSON.stringify(st));
    const fl2 = await as(V).rpc("file_route_flag", { p_route_id: R, p_field: "beta", p_note: "flag while banned" });
    if (fl2.status >= 400) ok("a BANNED contributor cannot flag"); else bad("banned flag went through");
    const apl = await as(V).rpc("file_appeal", { p_kind: "contributing", p_id: "", p_message: "I was correcting a typo; please look again" });
    if (apl.status < 300 && apl.body) ok("...and can appeal (kind 'contributing')"); else bad("appeal", apl.status + " " + msg(apl));
    const dec = await as(M).rpc("decide_appeal", { p_appeal: apl.body, p_decision: "reversed", p_note: "ok" });
    const st2 = await standingOf(V);
    if (dec.status < 300 && st2 && st2.status === "ok" && st2.strikes === 0) ok("a reversed appeal resets the standing"); else bad("appeal reversal", dec.status + " " + JSON.stringify(st2));
    const e6 = await edit(V, R, "beta", "Clip the second bolt from the ledge, then step right");
    if (firstId(e6)) ok("...and they can edit again"); else bad("edit after reinstatement", e6.status + " " + msg(e6));
  }

  // ---- 6. Notices reached V; V can read only their own.
  const ns = await noticesOf(V); const kinds = ns.map((n) => n.kind);
  for (const k of ["contribution_approved", "contribution_rejected", "contribution_warning", "contribution_restricted", "contribution_banned", "contribution_reinstated", "flag_resolved"]) {
    if (kinds.includes(k)) ok("notice: " + k); else bad("notice missing: " + k);
  }
  const rejN = ns.find((n) => n.kind === "contribution_rejected");
  if (rejN && /guidebook/.test(rejN.body || "")) ok("the rejection notice carries the reason"); else bad("rejection notice body");
  const own = await as(V).get("/rest/v1/user_notices?select=id"); const theirs = await as(Y).get("/rest/v1/user_notices?select=id");
  if (Array.isArray(own.body) && own.body.length >= 7 && Array.isArray(theirs.body) && theirs.body.length === 0) ok("notices are readable by their owner only"); else bad("notice RLS");

  // ---- 7. The young-account cap: 5 a day.
  let yOk = 0, yRefused = null;
  for (let i = 0; i < 6; i++) {
    const r = await edit(Y, R, "approach", "Attempt " + i + " from the new account");
    if (firstId(r)) yOk++; else { yRefused = r; break; }
  }
  if (yOk === 5 && yRefused && /suggested a lot of edits/.test(msg(yRefused))) ok("a 7-day-old account gets 5 edits a day, the 6th is refused with the climber's sentence"); else bad("young cap", yOk + " accepted; " + (yRefused ? msg(yRefused) : "no refusal"));

  console.log(NL + "  " + pass + " passed, " + fail + " failed");
}

try { await main(); } catch (e) { fail++; console.log("  ABORT " + e.message); } finally { await destroy(); }
process.exit(fail ? 1 : 0);
