// Does 0260 do what it says, against the LIVE database, with real accounts?
//
//   node scripts/oneoff/probe-reports-reach-the-content.mjs
//
// Five accounts: A (author), B (recipient / reporter), C and D (more reporters) and M, a throwaway
// MODERATOR. M is promoted for the run by impersonating the existing admin inside one SQL session
// (prevent_self_admin only lets an admin grant is_admin) and demoted + deleted in `finally`.
//
// Every write under test goes through the anon key plus that climber's own JWT; the service key
// creates accounts and READS BACK outcomes, because RLS answers a refused PATCH with 200 and no rows.
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
  const r = await fetch(SUPABASE_URL + p, {
    ...opts,
    headers: { apikey: key, Authorization: "Bearer " + (jwt || key), "Content-Type": "application/json", ...((opts && opts.headers) || {}) },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}
const as = (u) => ({ get: (p) => api(p, { method: "GET" }, anonKey(), u.jwt),
  post: (p, b, h) => api(p, { method: "POST", body: JSON.stringify(b), headers: h }, anonKey(), u.jwt),
  patch: (p, b) => api(p, { method: "PATCH", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
  rpc: (fn, b) => api("/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(b) }, anonKey(), u.jwt) });
const truth = (p) => api(p, { method: "GET" }, svc);
const code = (r) => (r && r.body && r.body.code) || "";
const msg = (r) => (r && r.body && (r.body.message || r.body.msg)) || JSON.stringify(r && r.body);

function sql(text) {
  const f = path.join(os.tmpdir(), "probe-0260-" + process.pid + "-" + Math.random().toString(36).slice(2) + ".sql");
  fs.writeFileSync(f, text);
  try { return execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", f], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  finally { fs.unlinkSync(f); }
}
// Grant or revoke is_admin on a FIXTURE account, acting as the existing admin for this one statement.
const setAdmin = (id, on) => sql(
  "do $$ declare a uuid; begin select id into a from profiles where is_admin and id <> '" + id + "' limit 1; " +
  "perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); " +
  "update profiles set is_admin = " + (on ? "true" : "false") + " where id = '" + id + "'; end $$;");

async function createUser(tag, name) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "mod-" + tag + "-" + stamp + "@" + DOMAIN;
  const password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }) }, svc);
  if (c.status >= 300 || !c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const s = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  if (!s.body || !s.body.access_token) throw new Error("sign in " + tag + " failed");
  return { id: c.body.id, jwt: s.body.access_token, tag, name };
}

const made = [], cleanup = { messages: [], comments: [], reports: [], promoted: null };
async function destroy() {
  for (const id of cleanup.reports) await api("/rest/v1/user_reports?id=eq." + id, { method: "DELETE" }, svc).catch(() => {});
  for (const u of made) {
    await api("/rest/v1/user_reports?reporter=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    await api("/rest/v1/user_reports?reported_id=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    await api("/rest/v1/moderation_actions?target_owner=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    await api("/rest/v1/moderation_actions?actor=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
  }
  for (const id of cleanup.comments) await api("/rest/v1/comments?id=eq." + id, { method: "DELETE" }, svc).catch(() => {});
  for (const id of cleanup.messages) await api("/rest/v1/messages?id=eq." + id, { method: "DELETE" }, svc).catch(() => {});
  if (cleanup.promoted) { try { setAdmin(cleanup.promoted, false); } catch (e) { console.log("  WARN could not demote the fixture moderator: " + e.message); } }
  for (const u of made) await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
}

async function main() {
  console.log("0260 — reports reach the content; five real accounts, anon key + each climber's own JWT" + NL);
  const A = await createUser("a", "Ada Author"), B = await createUser("b", "Bo Reporter"),
        C = await createUser("c", "Cy Reporter"), D = await createUser("d", "Di Reporter"), M = await createUser("m", "Mo Moderator");
  made.push(A, B, C, D, M);

  // ---- 1. A SENT MESSAGE CANNOT BE REWRITTEN (the WITH CHECK-less UPDATE policy)
  const sent = await as(A).post("/rest/v1/messages", { sender_id: A.id, recipient_id: B.id, body: "meet at the trailhead at 6" }, { Prefer: "return=representation" });
  const mid = Array.isArray(sent.body) && sent.body[0] && sent.body[0].id;
  if (!mid) throw new Error("CONTROL FAILED: A could not message B (" + sent.status + " " + msg(sent) + ")");
  cleanup.messages.push(mid);
  const markRead = await as(B).patch("/rest/v1/messages?id=eq." + mid, { read: true });
  if (markRead.status < 300 && Array.isArray(markRead.body) && markRead.body.length === 1) ok("CONTROL — the recipient can still mark a message read");
  else bad("CONTROL — the recipient can still mark a message read", markRead.status + " " + msg(markRead));
  await as(B).patch("/rest/v1/messages?id=eq." + mid, { body: "you owe me $500" });
  let row = (await truth("/rest/v1/messages?select=body,moderation&id=eq." + mid)).body[0];
  if (row && row.body === "meet at the trailhead at 6") ok("the RECIPIENT cannot rewrite what the sender said");
  else bad("the RECIPIENT cannot rewrite what the sender said", JSON.stringify(row));

  // ---- 2. NOBODY SETS `moderation` BY WRITING THE ROW
  await as(B).patch("/rest/v1/messages?id=eq." + mid, { moderation: "removed" });
  row = (await truth("/rest/v1/messages?select=moderation&id=eq." + mid)).body[0];
  if (row && row.moderation === "visible") ok("a client cannot take a message down by PATCHing `moderation`");
  else bad("a client cannot take a message down by PATCHing `moderation`", JSON.stringify(row));
  const preHidden = await as(A).post("/rest/v1/comments", { target_id: "probe-0260-route", user_id: A.id, text: "pre-hidden?", moderation: "removed" }, { Prefer: "return=representation" });
  const phid = Array.isArray(preHidden.body) && preHidden.body[0] && preHidden.body[0].id;
  if (phid) cleanup.comments.push(phid);
  row = phid && (await truth("/rest/v1/comments?select=moderation&id=eq." + phid)).body[0];
  if (row && row.moderation === "visible") ok("a row INSERTED as 'removed' lands 'visible' — the column is not the client's");
  else bad("a row inserted as 'removed' lands 'visible'", preHidden.status + " " + JSON.stringify(row || preHidden.body));

  // ---- 3. REPORT A DM: the snapshot is copied server-side
  const rep = await as(B).rpc("report_content", { p_kind: "message", p_id: mid, p_reason: "Harassment or bullying", p_detail: "probe" });
  const rid = typeof rep.body === "string" ? rep.body : null;
  if (rid) { cleanup.reports.push(rid); ok("the recipient can report a DM (report " + rid.slice(0, 8) + ")"); }
  else bad("the recipient can report a DM", rep.status + " " + msg(rep));
  const r1 = rid && (await truth("/rest/v1/user_reports?select=reported_id,target_kind,target_id,snapshot,status,reporter&id=eq." + rid)).body[0];
  if (r1 && r1.snapshot === "meet at the trailhead at 6" && r1.reported_id === A.id && r1.target_kind === "message" && r1.reporter === B.id)
    ok("...and the report carries the message AS SENT, the sender as the reported climber, and the reporter");
  else bad("...the report carries the message as sent", JSON.stringify(r1));
  // ---- 3b. THE REVIEWER ALERT (notify-safety-report): only the report's own reporter can trigger it,
  // once. Until RESEND_API_KEY is set it answers sent:false/not_configured -- and must say so.
  const fn = (u, b) => api("/functions/v1/notify-safety-report", { method: "POST", body: JSON.stringify(b) }, anonKey(), u && u.jwt);
  const alertOther = await fn(C, { reportId: rid });
  if (alertOther.status === 403) ok("someone else cannot make the reviewer alert fire for a report that is not theirs (403)");
  else bad("someone else cannot trigger the alert", alertOther.status + " " + JSON.stringify(alertOther.body));
  const alertOwn = await fn(B, { reportId: rid });
  const ab = alertOwn.body || {};
  if (alertOwn.status === 200 && (ab.sent === true || ab.reason === "not_configured" || ab.reason === "already_alerted")) ok("the reporter's own alert call is accepted (" + (ab.sent ? "email SENT" : "not sent: " + ab.reason) + ")");
  else bad("the reporter's own alert call is accepted", alertOwn.status + " " + JSON.stringify(ab));
  const alertAgain = await fn(B, { reportId: rid });
  if ((alertAgain.body || {}).reason === "already_alerted") ok("...and a report alerts at most once");
  else bad("...a report alerts at most once", JSON.stringify(alertAgain.body));
  const again = await as(B).rpc("report_content", { p_kind: "message", p_id: mid, p_reason: "Spam or scam" });
  const dup = (await truth("/rest/v1/user_reports?select=id,reason&reporter=eq." + B.id + "&target_id=eq." + mid)).body;
  if (again.status < 300 && Array.isArray(dup) && dup.length === 1 && dup[0].reason === "Spam or scam") ok("reporting the same thing twice updates the one report rather than adding a row");
  else bad("reporting the same thing twice updates the one report", JSON.stringify(dup));

  // ---- 4. THE SNAPSHOT CANNOT BE FORGED, AND YOU CANNOT REPORT WHAT YOU CANNOT SEE
  const forged = await as(B).post("/rest/v1/user_reports", { reporter: B.id, reported_id: A.id, reason: "x", status: "open", target_kind: "message", target_id: mid, snapshot: "A said something awful" });
  if (forged.status >= 300) ok("a client cannot write its own `snapshot` into a report (" + (code(forged) || forged.status) + ")");
  else bad("a client cannot write its own `snapshot` into a report", forged.status);
  const outsider = await as(C).rpc("report_content", { p_kind: "message", p_id: mid, p_reason: "Spam or scam" });
  if (outsider.status >= 300 && code(outsider) === "P0002") ok("a climber outside the conversation cannot report (or read) the DM — 'not available'");
  else bad("a climber outside the conversation cannot report the DM", outsider.status + " " + msg(outsider));
  const own = await as(A).rpc("report_content", { p_kind: "message", p_id: mid, p_reason: "Other" });
  if (own.status >= 300) ok("nobody can report their own content");
  else bad("nobody can report their own content", own.status);
  const anon = await api("/rest/v1/rpc/report_content", { method: "POST", body: JSON.stringify({ p_kind: "message", p_id: mid, p_reason: "Other" }) }, anonKey());
  if (anon.status >= 300) ok("a signed-out caller cannot file a content report (" + anon.status + ")");
  else bad("a signed-out caller cannot file a content report", anon.status);

  // ---- 5. THREE REPORTERS HOLD A COMMENT; ITS AUTHOR STILL SEES IT, NOBODY ELSE DOES
  const cm = await as(A).post("/rest/v1/comments", { target_id: "probe-0260-route", user_id: A.id, text: "this beta is a lie, idiots" }, { Prefer: "return=representation" });
  const cid = Array.isArray(cm.body) && cm.body[0] && cm.body[0].id;
  if (!cid) throw new Error("CONTROL FAILED: A could not comment (" + cm.status + " " + msg(cm) + ")");
  cleanup.comments.push(cid);
  let seenB = await as(B).get("/rest/v1/comments?select=id&id=eq." + cid);
  if (Array.isArray(seenB.body) && seenB.body.length === 1) ok("CONTROL — another climber reads a visible comment");
  else bad("CONTROL — another climber reads a visible comment", JSON.stringify(seenB.body));
  for (const [i, u] of [B, C].entries()) {
    const rr = await as(u).rpc("report_content", { p_kind: "comment", p_id: cid, p_reason: "Harassment or bullying" });
    if (typeof rr.body === "string") cleanup.reports.push(rr.body); else bad("reporter " + (i + 1) + " could not report the comment", msg(rr));
  }
  row = (await truth("/rest/v1/comments?select=moderation&id=eq." + cid)).body[0];
  if (row && row.moderation === "visible") ok("TWO reports do not hide anything — one or two accounts cannot take content down");
  else bad("two reports do not hide anything", JSON.stringify(row));
  const r3 = await as(D).rpc("report_content", { p_kind: "comment", p_id: cid, p_reason: "Hate or discrimination" });
  if (typeof r3.body === "string") cleanup.reports.push(r3.body);
  row = (await truth("/rest/v1/comments?select=moderation&id=eq." + cid)).body[0];
  if (row && row.moderation === "held") ok("the THIRD different reporter HOLDS it");
  else bad("the third different reporter holds it", JSON.stringify(row));
  seenB = await as(B).get("/rest/v1/comments?select=id&id=eq." + cid);
  const seenA = await as(A).get("/rest/v1/comments?select=id,moderation&id=eq." + cid);
  if (Array.isArray(seenB.body) && seenB.body.length === 0) ok("...held content is hidden from other climbers");
  else bad("...held content is hidden from other climbers", JSON.stringify(seenB.body));
  if (Array.isArray(seenA.body) && seenA.body.length === 1 && seenA.body[0].moderation === "held") ok("...but its AUTHOR still sees it, marked held (so they can be told, and appeal)");
  else bad("...its author still sees it, marked held", JSON.stringify(seenA.body));
  const auto = (await truth("/rest/v1/moderation_actions?select=action&target_id=eq." + cid)).body;
  if (Array.isArray(auto) && auto.some((x) => x.action === "auto_hold")) ok("...and the automatic hold is in the audit log");
  else bad("...the automatic hold is in the audit log", JSON.stringify(auto));

  // ---- 6. ONLY CLIMBMATCH SAFETY ACTS, AND ONLY THROUGH THE AUDITED FUNCTION
  const notAdmin = await as(B).rpc("moderate_content", { p_kind: "comment", p_id: cid, p_action: "restore" });
  if (notAdmin.status >= 300 && code(notAdmin) === "42501") ok("a non-admin cannot remove or restore content (42501)");
  else bad("a non-admin cannot remove or restore content", notAdmin.status + " " + msg(notAdmin));
  setAdmin(M.id, true); cleanup.promoted = M.id;
  const promoted = (await truth("/rest/v1/profiles?select=is_admin&id=eq." + M.id)).body[0];
  if (!(promoted && promoted.is_admin)) throw new Error("CONTROL FAILED: the fixture moderator was not promoted");
  const direct = await as(M).patch("/rest/v1/comments?id=eq." + cid, { moderation: "visible" });
  row = (await truth("/rest/v1/comments?select=moderation&id=eq." + cid)).body[0];
  if (row && row.moderation === "held") ok("even an ADMIN cannot change moderation by writing the row — the audit log is the only door");
  else bad("even an admin cannot change moderation by writing the row", direct.status + " " + JSON.stringify(row));
  const restore = await as(M).rpc("moderate_content", { p_kind: "comment", p_id: cid, p_action: "restore", p_note: "probe restore" });
  row = (await truth("/rest/v1/comments?select=moderation&id=eq." + cid)).body[0];
  seenB = await as(B).get("/rest/v1/comments?select=id&id=eq." + cid);
  if (restore.status < 300 && row && row.moderation === "visible" && seenB.body.length === 1) ok("the moderator RESTORES it, and other climbers see it again");
  else bad("the moderator restores it", restore.status + " " + msg(restore) + " " + JSON.stringify(row));
  let open = (await truth("/rest/v1/user_reports?select=status&target_id=eq." + cid)).body;
  if (Array.isArray(open) && open.length === 3 && open.every((x) => x.status === "dismissed")) ok("...and a restore closes all three reports as dismissed");
  else bad("...a restore closes all three reports as dismissed", JSON.stringify(open));
  const rem = await as(M).rpc("moderate_content", { p_kind: "message", p_id: mid, p_action: "remove", p_report: rid, p_note: "probe remove" });
  row = (await truth("/rest/v1/messages?select=moderation&id=eq." + mid)).body[0];
  const seenRecipient = await as(B).get("/rest/v1/messages?select=id&id=eq." + mid);
  const seenSender = await as(A).get("/rest/v1/messages?select=id,moderation&id=eq." + mid);
  if (rem.status < 300 && row && row.moderation === "removed") ok("the moderator REMOVES the reported DM");
  else bad("the moderator removes the reported DM", rem.status + " " + msg(rem));
  if (seenRecipient.body.length === 0 && seenSender.body.length === 1 && seenSender.body[0].moderation === "removed") ok("...the recipient no longer sees it; the sender sees it marked removed");
  else bad("...recipient no longer sees it; sender sees it marked removed", JSON.stringify([seenRecipient.body, seenSender.body]));
  const closed = (await truth("/rest/v1/user_reports?select=status,reviewed_by&id=eq." + rid)).body[0];
  if (closed && closed.status === "actioned" && closed.reviewed_by === M.id) ok("...and the report is closed as actioned, by that moderator");
  else bad("...the report is closed as actioned", JSON.stringify(closed));
  const log = (await truth("/rest/v1/moderation_actions?select=action,actor,note&target_id=eq." + mid)).body;
  if (Array.isArray(log) && log.some((x) => x.action === "remove" && x.actor === M.id && x.note === "probe remove")) ok("...and the removal is in the audit log with who did it and why");
  else bad("...the removal is in the audit log", JSON.stringify(log));
  const logRead = await as(B).get("/rest/v1/moderation_actions?select=id");
  if (Array.isArray(logRead.body) && logRead.body.length === 0) ok("a climber cannot read the moderation log");
  else bad("a climber cannot read the moderation log", JSON.stringify(logRead.body));

  console.log(NL + pass + " passed, " + fail + " failed.");
}

try { await main(); }
finally {
  await destroy();
  const left = await truth("/rest/v1/user_reports?select=id&or=(" + made.map((u) => "reporter.eq." + u.id).join(",") + ")");
  console.log("torn down " + made.length + " account(s); probe reports left behind: " + (Array.isArray(left.body) ? left.body.length : "UNKNOWN"));
}
process.exitCode = fail ? 1 : 0;
