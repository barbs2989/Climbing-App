// Does 0264 suspend, ban, explain and hear an appeal -- against the LIVE database, with real accounts?
//
//   node scripts/oneoff/probe-suspend-ban-and-appeal.mjs
//
// Accounts: V (the climber acted on), F (a friend V talks to) and M, a throwaway MODERATOR promoted
// for the run (prevent_self_admin only lets an admin grant is_admin, so the probe borrows the
// existing admin's identity for that one statement) and demoted + deleted in `finally`.
// Every write under test uses the anon key + that climber's own JWT; the service key creates the
// accounts and READS BACK outcomes, because RLS answers a refused write with 4xx OR a 200 + no rows.
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
  patch: (p, b) => api(p, { method: "PATCH", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
  rpc: (fn, b) => api("/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(b) }, anonKey(), u.jwt),
});
const truth = (p) => api(p, { method: "GET" }, svc);
// GoTrue answers {code: 400, error_code: "user_banned"} -- its `code` is the HTTP status, so the
// named code wins; PostgREST's `code` is the SQLSTATE string.
const code = (r) => (r && r.body && (r.body.error_code || (typeof r.body.code === "string" ? r.body.code : ""))) || "";
const msg = (r) => (r && r.body && (r.body.message || r.body.msg)) || JSON.stringify(r && r.body);

function sql(text) {
  const f = path.join(os.tmpdir(), "probe-0264-" + process.pid + "-" + Math.random().toString(36).slice(2) + ".sql");
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
  const email = "stand-" + tag + "-" + stamp + "@" + DOMAIN;
  const password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }) }, svc);
  if (c.status >= 300 || !c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const u = { id: c.body.id, email, password, tag };
  const s = await signIn(u);
  if (!s.body || !s.body.access_token) throw new Error("sign in " + tag + " failed");
  u.jwt = s.body.access_token; u.refresh = s.body.refresh_token;
  return u;
}

const made = [], cleanup = { promoted: null, comments: [], messages: [] };
async function destroy() {
  for (const u of made) {
    await api("/rest/v1/moderation_actions?target_owner=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    await api("/rest/v1/moderation_actions?actor=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    await api("/rest/v1/user_reports?reported_id=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
  }
  for (const id of cleanup.comments) await api("/rest/v1/comments?id=eq." + id, { method: "DELETE" }, svc).catch(() => {});
  for (const id of cleanup.messages) await api("/rest/v1/messages?id=eq." + id, { method: "DELETE" }, svc).catch(() => {});
  if (cleanup.promoted) { try { setAdmin(cleanup.promoted, false); } catch (e) { console.log("  WARN could not demote the fixture moderator: " + e.message); } }
  for (const u of made) await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
}

async function main() {
  console.log("0264 — suspend, ban, explain, appeal; real accounts, anon key + each climber's own JWT" + NL);
  const V = await createUser("v", "Vic Violator"), F = await createUser("f", "Fay Friend"), M = await createUser("m", "Mo Moderator");
  made.push(V, F, M);

  // ---- CONTROLS: V can post now.
  const c0 = await as(V).post("/rest/v1/comments", { target_id: "probe-0264-route", user_id: V.id, text: "control comment" });
  if (Array.isArray(c0.body) && c0.body[0]) { cleanup.comments.push(c0.body[0].id); ok("CONTROL — an active climber can comment"); }
  else throw new Error("CONTROL FAILED: V could not comment (" + c0.status + " " + msg(c0) + ")");
  const m0 = await as(V).post("/rest/v1/messages", { sender_id: V.id, recipient_id: F.id, body: "control message" });
  if (Array.isArray(m0.body) && m0.body[0]) { cleanup.messages.push(m0.body[0].id); ok("CONTROL — an active climber can message"); }
  else throw new Error("CONTROL FAILED: V could not message (" + m0.status + " " + msg(m0) + ")");

  // ---- ONLY AN ADMIN
  const self = await as(F).rpc("set_account_standing", { p_user: V.id, p_status: "banned", p_reason: "x" });
  if (self.status >= 300 && code(self) === "42501") ok("a climber cannot suspend or ban anyone (42501)");
  else bad("a climber cannot suspend or ban anyone", self.status + " " + msg(self));
  const direct = await as(F).post("/rest/v1/account_standing", { user_id: V.id, status: "banned", reason: "x" });
  const vStand0 = (await truth("/rest/v1/account_standing?select=status&user_id=eq." + V.id)).body;
  if (direct.status >= 300 && Array.isArray(vStand0) && vStand0.length === 0) ok("...nor write account_standing directly");
  else bad("...nor write account_standing directly", direct.status + " " + JSON.stringify(vStand0));
  setAdmin(M.id, true); cleanup.promoted = M.id;
  if (!((await truth("/rest/v1/profiles?select=is_admin&id=eq." + M.id)).body[0] || {}).is_admin) throw new Error("CONTROL FAILED: moderator not promoted");

  // ---- SUSPEND 7 DAYS
  const noReason = await as(M).rpc("set_account_standing", { p_user: V.id, p_status: "suspended", p_days: 7 });
  if (noReason.status >= 300) ok("a suspension without a reason the climber will be shown is refused");
  else bad("a suspension without a reason is refused", noReason.status);
  const sus = await as(M).rpc("set_account_standing", { p_user: V.id, p_status: "suspended", p_days: 7, p_reason: "Harassing other climbers in messages", p_remove_content: true });
  if (sus.status < 300) ok("ClimbMatch Safety suspends the climber for 7 days, removing what they posted");
  else bad("the moderator can suspend", sus.status + " " + msg(sus));
  const st = (await as(V).get("/rest/v1/account_standing?select=status,until,reason&user_id=eq." + V.id)).body;
  if (Array.isArray(st) && st[0] && st[0].status === "suspended" && st[0].reason === "Harassing other climbers in messages" && st[0].until)
    ok("the climber can READ why, and until when (" + String(st[0].until).slice(0, 10) + ")");
  else bad("the climber can read their own standing", JSON.stringify(st));
  const stOther = (await as(F).get("/rest/v1/account_standing?select=status&user_id=eq." + V.id)).body;
  if (Array.isArray(stOther) && stOther.length === 0) ok("...and nobody else can");
  else bad("...and nobody else can", JSON.stringify(stOther));
  const sIn = await signIn(V);
  if (sIn.status === 200) { V.jwt = sIn.body.access_token; ok("a SUSPENDED climber can still sign in — that is how they read the notice and appeal"); }
  else bad("a suspended climber can still sign in", sIn.status + " " + msg(sIn));
  const c1 = await as(V).post("/rest/v1/comments", { target_id: "probe-0264-route", user_id: V.id, text: "while suspended" });
  if (c1.status >= 300) ok("...but cannot comment (" + (code(c1) || c1.status) + ")"); else { bad("a suspended climber cannot comment", c1.status); if (c1.body && c1.body[0]) cleanup.comments.push(c1.body[0].id); }
  const m1 = await as(V).post("/rest/v1/messages", { sender_id: V.id, recipient_id: F.id, body: "while suspended" });
  if (m1.status >= 300) ok("...cannot message"); else { bad("a suspended climber cannot message", m1.status); if (m1.body && m1.body[0]) cleanup.messages.push(m1.body[0].id); }
  const fr = await as(V).post("/rest/v1/connections", { requester: V.id, addressee: F.id });
  if (fr.status >= 300) ok("...cannot send friend requests"); else bad("a suspended climber cannot send friend requests", fr.status);
  const bio = await as(V).patch("/rest/v1/profiles?id=eq." + V.id, { bio: "edited while suspended" });
  const bioNow = (await truth("/rest/v1/profiles?select=bio&id=eq." + V.id)).body[0];
  if (!(bioNow && bioNow.bio === "edited while suspended")) ok("...and cannot rewrite their public profile");
  else bad("a suspended climber cannot rewrite their profile", bio.status);
  const gone = (await truth("/rest/v1/comments?select=moderation&id=eq." + cleanup.comments[0])).body[0];
  const goneMsg = (await truth("/rest/v1/messages?select=moderation&id=eq." + cleanup.messages[0])).body[0];
  if (gone && gone.moderation === "removed" && goneMsg && goneMsg.moderation === "removed") ok("'remove what they posted' took down their earlier comment AND message");
  else bad("remove-content took down earlier posts", JSON.stringify([gone, goneMsg]));
  const fSees = await as(F).get("/rest/v1/messages?select=id&id=eq." + cleanup.messages[0]);
  if (Array.isArray(fSees.body) && fSees.body.length === 0) ok("...so the friend no longer sees the removed message");
  else bad("the friend no longer sees the removed message", JSON.stringify(fSees.body));

  // ---- APPEAL
  const notMine = await as(F).rpc("file_appeal", { p_kind: "comment", p_id: cleanup.comments[0], p_message: "not mine" });
  if (notMine.status >= 300) ok("nobody can appeal content that is not theirs");
  else bad("nobody can appeal content that is not theirs", notMine.status);
  const notRestricted = await as(F).rpc("file_appeal", { p_kind: "account", p_id: "", p_message: "I am fine" });
  if (notRestricted.status >= 300) ok("an account in good standing has nothing to appeal");
  else bad("an account in good standing has nothing to appeal", notRestricted.status);
  const ap = await as(V).rpc("file_appeal", { p_kind: "account", p_id: "", p_message: "It was a misunderstanding with a friend." });
  const apId = typeof ap.body === "string" ? ap.body : null;
  if (apId) ok("the suspended climber files an appeal"); else bad("the suspended climber files an appeal", ap.status + " " + msg(ap));
  const apOther = (await as(F).get("/rest/v1/moderation_appeals?select=id")).body;
  if (Array.isArray(apOther) && apOther.length === 0) ok("...which no other climber can read");
  else bad("...which no other climber can read", JSON.stringify(apOther));
  const decideBad = await as(V).rpc("decide_appeal", { p_appeal: apId, p_decision: "reversed" });
  if (decideBad.status >= 300) ok("a climber cannot decide their own appeal");
  else bad("a climber cannot decide their own appeal", decideBad.status);
  const decided = await as(M).rpc("decide_appeal", { p_appeal: apId, p_decision: "reversed", p_note: "probe" });
  const afterAppeal = (await truth("/rest/v1/account_standing?select=status&user_id=eq." + V.id)).body[0];
  const c2 = await as(V).post("/rest/v1/comments", { target_id: "probe-0264-route", user_id: V.id, text: "after reinstatement" });
  if (c2.body && c2.body[0]) cleanup.comments.push(c2.body[0].id);
  if (decided.status < 300 && afterAppeal && afterAppeal.status === "active" && c2.status < 300) ok("ClimbMatch Safety REVERSES on appeal: the account is active and can post again");
  else bad("a reversed appeal reinstates the account", decided.status + " " + JSON.stringify(afterAppeal) + " " + c2.status);

  // ---- BAN = EJECT
  const ban = await as(M).rpc("set_account_standing", { p_user: V.id, p_status: "banned", p_reason: "Threats against another climber" });
  if (ban.status < 300) ok("ClimbMatch Safety BANS the climber"); else bad("the moderator can ban", ban.status + " " + msg(ban));
  const sBan = await signIn(V);
  if (sBan.status === 400 && code(sBan) === "user_banned") ok("a BANNED climber cannot sign in (user_banned)");
  else bad("a banned climber cannot sign in", sBan.status + " " + msg(sBan));
  const rBan = await api("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: V.refresh }) }, anonKey());
  if (rBan.status >= 400) ok("...nor refresh an old session");
  else bad("a banned climber cannot refresh an old session", rBan.status);
  const c3 = await as(V).post("/rest/v1/comments", { target_id: "probe-0264-route", user_id: V.id, text: "with a still-valid access token" });
  if (c3.status >= 300) ok("...and an access token issued BEFORE the ban cannot post either (the write gate, not just auth)");
  else { bad("a pre-ban access token cannot post", c3.status); if (c3.body && c3.body[0]) cleanup.comments.push(c3.body[0].id); }
  const adminBan = await as(M).rpc("set_account_standing", { p_user: M.id, p_status: "banned", p_reason: "self" });
  if (adminBan.status >= 300) ok("a moderator cannot ban themselves");
  else bad("a moderator cannot ban themselves", adminBan.status);
  const unban = await as(M).rpc("set_account_standing", { p_user: V.id, p_status: "active" });
  const sBack = await signIn(V);
  if (unban.status < 300 && sBack.status === 200) ok("reinstating lifts the ban — the climber can sign in again");
  else bad("reinstating lifts the ban", unban.status + " / sign-in " + sBack.status);
  const log = (await truth("/rest/v1/moderation_actions?select=action&target_owner=eq." + V.id)).body;
  const acts = new Set((log || []).map((x) => x.action));
  if (["suspend", "ban", "reinstate", "remove_all"].every((a) => acts.has(a))) ok("suspend, remove-all, ban and reinstate are all in the audit log");
  else bad("the audit log has every account action", JSON.stringify([...acts]));

  console.log(NL + pass + " passed, " + fail + " failed.");
}

try { await main(); }
finally { await destroy(); console.log("torn down " + made.length + " account(s)."); }
process.exitCode = fail ? 1 : 0;
