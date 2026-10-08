// Does 0260 keep its promises, as FIVE real accounts see it? O owns a group, M moderates it, P is
// a member, X and Y start outside. Every refusal has a control that succeeds, and every UPDATE or
// DELETE is judged on the rows that came back — RLS refuses those by matching nothing, with a 200.
//
//   node scripts/oneoff/verify-group-0260-rules-invites-bans-reports.mjs
//
// Throwaway accounts on the reserved .invalid domain (sweepOrphans() reclaims any a killed run
// leaves); the group and the accounts are deleted in `finally`, and the teardown is re-read.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import { POLICY_VERSION } from "../../lib/policy.js";

const URL = SUPABASE_URL, ANON = anonKey(), SERVICE = requireServiceKey();
let fail = 0;
const ok = (label, cond, detail) => { console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`); if (!cond) fail++; };
const dead = (m) => { throw new Error("nothing was verified: " + m); };
async function admin(p, init = {}) {
  const r = await fetch(`${URL}/auth/v1/${p}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" } });
  return { status: r.status, json: await r.json().catch(() => null) };
}
async function makeUser(tag) {
  const stamp = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `ui-g60${tag}-${stamp}@climbmatch-qa.invalid`, password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const r = await admin("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Probe " + tag, terms_version: POLICY_VERSION } }) });
  if (r.status >= 300 || !r.json || !r.json.id) dead(`could not create ${tag} (${r.status})`);
  const t = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const b = await t.json().catch(() => ({}));
  if (!t.ok || !b.access_token) dead(`could not sign in as ${tag}`);
  return { id: r.json.id, tok: b.access_token };
}
const call = (tok) => async (p, init = {}) => {
  const auth = tok ? { Authorization: `Bearer ${tok}` } : {};
  const r = await fetch(`${URL}/rest/v1/${p}`, { ...init, headers: { apikey: ANON, ...auth, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
  const text = await r.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: r.status, json, text };
};
const rows = (r) => (Array.isArray(r.json) ? r.json : []);
// The service key goes in BOTH headers. Sending it as a bearer beside the ANON apikey returned an
// empty array for every read — which made "X is gone" pass vacuously until a POSITIVE read failed.
const svc = async (p, init = {}) => {
  const r = await fetch(`${URL}/rest/v1/${p}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
  const text = await r.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: r.status, json, text };
};
const rpc = (who, fn, args) => who(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
const okRpc = (r) => r.status === 200 || r.status === 204;

const made = [];
let G = null;
try {
  const O = await makeUser("o"); made.push(O);
  const M = await makeUser("m"); made.push(M);
  const P = await makeUser("p"); made.push(P);
  const X = await makeUser("x"); made.push(X);
  const Y = await makeUser("y"); made.push(Y);
  const o = call(O.tok), m = call(M.tok), p = call(P.tok), x = call(X.tok), y = call(Y.tok);

  G = crypto.randomUUID();
  const mk = await o("groups", { method: "POST", body: JSON.stringify({ id: G, name: "Probe 0260 group", created_by: O.id, policy: "open", visibility: "public" }), headers: { Prefer: "return=minimal" } });
  if (mk.status >= 300) dead(`O could not create the group (${mk.status}) ${mk.text.slice(0, 160)}`);
  for (const [who, u] of [[m, M], [p, P]]) {
    const j = await who("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: u.id }) });
    if (j.status !== 201) dead(`a member could not join the open group (${j.status}) ${j.text.slice(0, 160)}`);
  }
  if (!rows(await o(`group_members?group_id=eq.${G}&user_id=eq.${M.id}`, { method: "PATCH", body: JSON.stringify({ role: "moderator" }) })).length) dead("O could not make M a moderator");

  // ── 1. rules ─────────────────────────────────────────────────────────────────────────────────
  const badRules = await o(`groups?id=eq.${G}`, { method: "PATCH", body: JSON.stringify({ rules: [{ title: "" }] }) });
  ok("a rule with no title is refused by the CHECK", badRules.status >= 400, `${badRules.status}`);
  const setRules = await o(`groups?id=eq.${G}`, { method: "PATCH", body: JSON.stringify({ rules: [{ title: "Helmets on", details: "Always, at every crag." }, { title: "No beta spraying" }] }) });
  ok("the owner sets two rules", rows(setRules).length === 1 && rows(setRules)[0].rules.length === 2, `${setRules.status} ${setRules.text.slice(0, 120)}`);
  const xDirect = await x("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: X.id }) });
  ok("with rules, an open group can no longer be self-joined around them", xDirect.status >= 400, `${xDirect.status}`);
  const xNoAgree = await rpc(x, "join_group", { gid: G });
  ok("join_group without agreeing is refused", xNoAgree.status >= 400 && /agree/i.test(xNoAgree.text), `${xNoAgree.status} ${xNoAgree.text.slice(0, 120)}`);
  const xJoin = await rpc(x, "join_group", { gid: G, agreed_rules: true });
  ok("agreeing joins an open group as active", okRpc(xJoin) && /active/.test(xJoin.text), `${xJoin.status} ${xJoin.text.slice(0, 120)}`);
  const xRow = rows(await x(`group_members?group_id=eq.${G}&user_id=eq.${X.id}&select=status,rules_agreed_at`))[0] || {};
  ok("...and the agreement is recorded on the row", xRow.status === "active" && !!xRow.rules_agreed_at, JSON.stringify(xRow));

  // ── 2. member invites, the block, withdraw, accept-with-rules ────────────────────────────────
  const gp = rows(await o(`groups?id=eq.${G}&select=invite_policy`))[0] || {};
  ok("a new group's invite policy defaults to members", gp.invite_policy === "members", JSON.stringify(gp));
  const pInv = await p("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: Y.id, status: "invited" }) });
  ok("a plain member can invite (policy: members)", pInv.status === 201 && rows(pInv)[0] && rows(pInv)[0].invited_by === P.id, `${pInv.status} ${pInv.text.slice(0, 160)}`);
  ok("the inviter reads the invitation they sent", rows(await p(`group_members?group_id=eq.${G}&user_id=eq.${Y.id}&select=status`)).length === 1);
  ok("another plain member does not", rows(await x(`group_members?group_id=eq.${G}&user_id=eq.${Y.id}&select=status`)).length === 0);
  const yInv = rows(await y(`group_members?group_id=eq.${G}&user_id=eq.${Y.id}&select=status,invited_by`))[0] || {};
  ok("the invitee sees who invited them", yInv.status === "invited" && yInv.invited_by === P.id, JSON.stringify(yInv));
  const yAcceptNoRules = await y(`group_members?group_id=eq.${G}&user_id=eq.${Y.id}&status=eq.invited`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
  ok("accepting without agreeing to the rules is refused", yAcceptNoRules.status >= 400 || rows(yAcceptNoRules).length === 0, `${yAcceptNoRules.status}`);
  const pWithdraw = await p(`group_members?group_id=eq.${G}&user_id=eq.${Y.id}&status=eq.invited`, { method: "DELETE" });
  ok("the inviter withdraws their own invitation", rows(pWithdraw).length === 1, `${pWithdraw.status}`);
  const blk = await y("blocked_users", { method: "POST", body: JSON.stringify({ blocker: Y.id, blocked: P.id }) });
  if (blk.status >= 300) dead(`Y could not block P (${blk.status}) ${blk.text.slice(0, 120)}`);
  const pInvBlocked = await p("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: Y.id, status: "invited" }) });
  ok("nobody can invite a climber who has blocked them", pInvBlocked.status >= 400, `${pInvBlocked.status}`);
  const mInv = await m("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: Y.id, status: "invited" }) });
  ok("...while someone they have not blocked can (control)", mInv.status === 201, `${mInv.status} ${mInv.text.slice(0, 120)}`);
  const yAccept = await y(`group_members?group_id=eq.${G}&user_id=eq.${Y.id}&status=eq.invited`, { method: "PATCH", body: JSON.stringify({ status: "active", rules_agreed_at: new Date().toISOString() }) });
  ok("accepting WITH the agreement works", rows(yAccept).length === 1 && rows(yAccept)[0].status === "active", `${yAccept.status} ${yAccept.text.slice(0, 120)}`);
  await y(`blocked_users?blocker=eq.${Y.id}&blocked=eq.${P.id}`, { method: "DELETE" });
  const modsOnly = await o(`groups?id=eq.${G}`, { method: "PATCH", body: JSON.stringify({ invite_policy: "mods" }) });
  if (!rows(modsOnly).length) dead("O could not set invite_policy");
  const outsider = (await makeUser("z")); made.push(outsider);
  const pInvMods = await p("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: outsider.id, status: "invited" }) });
  ok("with invite_policy 'mods', a plain member cannot invite", pInvMods.status >= 400, `${pInvMods.status}`);
  const mInvMods = await m("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: outsider.id, status: "invited" }) });
  ok("...a moderator still can", mInvMods.status === 201, `${mInvMods.status}`);

  // ── 4/5. topics and saves ────────────────────────────────────────────────────────────────────
  const badTopic = await p("group_posts", { method: "POST", body: JSON.stringify({ group_id: G, author: P.id, body: "x", topic: "memes" }) });
  ok("a topic outside the set is refused", badTopic.status >= 400, `${badTopic.status}`);
  const post = await p("group_posts", { method: "POST", body: JSON.stringify({ group_id: G, author: P.id, body: "Need a partner for Saturday", topic: "partner" }) });
  const pid = rows(post)[0] && rows(post)[0].id;
  ok("a post carries its topic", !!pid && rows(post)[0].topic === "partner", `${post.status} ${post.text.slice(0, 120)}`);
  const pSave = await p("group_post_saves", { method: "POST", body: JSON.stringify({ post_id: pid, user_id: P.id }) });
  ok("a member saves a post", pSave.status === 201, `${pSave.status} ${pSave.text.slice(0, 120)}`);
  ok("...and reads their own save back", rows(await p(`group_post_saves?post_id=eq.${pid}&select=post_id`)).length === 1);
  ok("...which nobody else can read", rows(await m(`group_post_saves?post_id=eq.${pid}&select=post_id`)).length === 0);
  const zSave = await call(outsider.tok)("group_post_saves", { method: "POST", body: JSON.stringify({ post_id: pid, user_id: outsider.id }) });
  ok("an outsider cannot save a post they cannot read", zSave.status >= 400, `${zSave.status}`);

  // ── 3. prefs ────────────────────────────────────────────────────────────────────────────────
  const pPref = await p("group_member_prefs", { method: "POST", body: JSON.stringify({ group_id: G, user_id: P.id, notify: "all", last_seen_at: new Date().toISOString() }), headers: { Prefer: "return=representation,resolution=merge-duplicates" } });
  ok("a member sets their notification level", pPref.status === 201 && rows(pPref)[0] && rows(pPref)[0].notify === "all", `${pPref.status} ${pPref.text.slice(0, 120)}`);
  const pPref2 = await p(`group_member_prefs?group_id=eq.${G}&user_id=eq.${P.id}`, { method: "PATCH", body: JSON.stringify({ notify: "off" }) });
  ok("...and changes it", rows(pPref2).length === 1 && rows(pPref2)[0].notify === "off", `${pPref2.status}`);
  ok("nobody else reads it", rows(await m(`group_member_prefs?group_id=eq.${G}&select=user_id`)).every((r) => r.user_id !== P.id));
  const zPref = await call(outsider.tok)("group_member_prefs", { method: "POST", body: JSON.stringify({ group_id: G, user_id: outsider.id, notify: "all" }) });
  ok("an invitee who has not joined cannot write prefs", zPref.status >= 400, `${zPref.status}`);

  // ── 7. reports to the group's moderators ─────────────────────────────────────────────────────
  const rep = await x("group_reports", { method: "POST", body: JSON.stringify({ group_id: G, target_kind: "post", target_id: pid, reported_user: P.id, reporter: X.id, reason: "Spam", snapshot: "Need a partner for Saturday" }) });
  const rid = rows(rep)[0] && rows(rep)[0].id;
  ok("a member reports a post to the group's moderators", rep.status === 201 && !!rid, `${rep.status} ${rep.text.slice(0, 160)}`);
  ok("the moderator reads it", rows(await m(`group_reports?id=eq.${rid}&select=id`)).length === 1);
  ok("the reported member does not", rows(await p(`group_reports?id=eq.${rid}&select=id`)).length === 0);
  const zRep = await call(outsider.tok)("group_reports", { method: "POST", body: JSON.stringify({ group_id: G, target_kind: "post", target_id: pid, reporter: outsider.id, reason: "Spam" }) });
  ok("a non-member cannot file one", zRep.status >= 400, `${zRep.status}`);
  const pClose = await p(`group_reports?id=eq.${rid}`, { method: "PATCH", body: JSON.stringify({ status: "dismissed" }) });
  ok("a plain member cannot close a report", rows(pClose).length === 0, `${pClose.status}`);
  const mEdit = await m(`group_reports?id=eq.${rid}`, { method: "PATCH", body: JSON.stringify({ reason: "Rewritten" }) });
  ok("a moderator cannot rewrite what was reported", mEdit.status >= 400, `${mEdit.status} ${mEdit.text.slice(0, 100)}`);
  const mClose = await m(`group_reports?id=eq.${rid}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) });
  ok("a moderator resolves it, and the row records who and when", rows(mClose).length === 1 && rows(mClose)[0].resolved_by === M.id && !!rows(mClose)[0].resolved_at, `${mClose.status} ${mClose.text.slice(0, 160)}`);

  // ── 6. decline with a message, approve all ───────────────────────────────────────────────────
  if (!rows(await o(`groups?id=eq.${G}`, { method: "PATCH", body: JSON.stringify({ policy: "approval" }) })).length) dead("O could not require approval");
  const leaveX = await x(`group_members?group_id=eq.${G}&user_id=eq.${X.id}`, { method: "DELETE" });
  if (rows(leaveX).length !== 1) dead("X could not leave");
  const xReq = await rpc(x, "join_group", { gid: G, agreed_rules: true });
  ok("on an approval group, join_group files a request", okRpc(xReq) && /pending/.test(xReq.text), `${xReq.status} ${xReq.text.slice(0, 120)}`);
  const pDecl = await rpc(p, "decline_group_request", { gid: G, who: X.id, message: "nope" });
  ok("a plain member cannot decline", pDecl.status >= 400, `${pDecl.status}`);
  const mDecl = await rpc(m, "decline_group_request", { gid: G, who: X.id, message: "We're full until spring — try again in March." });
  ok("the moderator declines with a message", okRpc(mDecl), `${mDecl.status} ${mDecl.text.slice(0, 120)}`);
  ok("...the request is gone", rows(await m(`group_members?group_id=eq.${G}&user_id=eq.${X.id}&select=status`)).length === 0);
  const xMsg = rows(await x(`group_join_declines?group_id=eq.${G}&select=message`))[0] || {};
  ok("...and the climber reads the message", /March/.test(xMsg.message || ""), JSON.stringify(xMsg));
  ok("...which another member cannot", rows(await p(`group_join_declines?group_id=eq.${G}&select=message`)).length === 0);
  const xAgain = await rpc(x, "join_group", { gid: G, agreed_rules: true });
  ok("asking again works, and clears the old decline", okRpc(xAgain) && rows(await x(`group_join_declines?group_id=eq.${G}&select=message`)).length === 0, `${xAgain.status}`);
  const leaveY = await y(`group_members?group_id=eq.${G}&user_id=eq.${Y.id}`, { method: "DELETE" });
  if (rows(leaveY).length !== 1) dead("Y could not leave");
  if (!okRpc(await rpc(y, "join_group", { gid: G, agreed_rules: true }))) dead("Y could not ask to join");
  const all = await m(`group_members?group_id=eq.${G}&status=eq.pending`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
  ok("approve all: one UPDATE admits every waiting request", rows(all).length === 2, `${all.status} ${all.text.slice(0, 120)}`);

  // ── 7. bans ─────────────────────────────────────────────────────────────────────────────────
  const pBan = await rpc(p, "ban_group_member", { gid: G, who: X.id });
  ok("a plain member cannot ban", pBan.status >= 400, `${pBan.status}`);
  const mBanO = await rpc(m, "ban_group_member", { gid: G, who: O.id });
  ok("nobody bans the owner", mBanO.status >= 400, `${mBanO.status}`);
  if (!rows(await o(`group_members?group_id=eq.${G}&user_id=eq.${Y.id}`, { method: "PATCH", body: JSON.stringify({ role: "moderator" }) })).length) dead("O could not promote Y");
  const mBanY = await rpc(m, "ban_group_member", { gid: G, who: Y.id });
  ok("a moderator cannot ban a fellow moderator", mBanY.status >= 400, `${mBanY.status}`);
  const mBanX = await rpc(m, "ban_group_member", { gid: G, who: X.id, reason: "Spam" });
  ok("a moderator bans a member", okRpc(mBanX), `${mBanX.status} ${mBanX.text.slice(0, 120)}`);
  // Control first: the same service read must SEE a row that exists, or "removed" proves nothing.
  ok("(control) the service read sees a member who is still there", rows(await svc(`group_members?group_id=eq.${G}&user_id=eq.${P.id}&select=status`)).length === 1);
  ok("...who is removed", rows(await svc(`group_members?group_id=eq.${G}&user_id=eq.${X.id}&select=status`)).length === 0);
  ok("...cannot ask to join again", (await rpc(x, "join_group", { gid: G, agreed_rules: true })).status >= 400);
  ok("...cannot be invited", (await o("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: X.id, status: "invited" }) })).status >= 400);
  ok("the ban list is read by managers", rows(await m(`group_bans?group_id=eq.${G}&select=user_id`)).length === 1);
  ok("...and by nobody else", rows(await p(`group_bans?group_id=eq.${G}&select=user_id`)).length === 0 && rows(await x(`group_bans?group_id=eq.${G}&select=user_id`)).length === 0);
  const unban = await rpc(m, "unban_group_member", { gid: G, who: X.id });
  ok("a moderator lifts the ban", okRpc(unban) && rows(await m(`group_bans?group_id=eq.${G}&select=user_id`)).length === 0, `${unban.status}`);
  const oBanY = await rpc(o, "ban_group_member", { gid: G, who: Y.id });
  ok("the owner can ban a moderator", okRpc(oBanY), `${oBanY.status} ${oBanY.text.slice(0, 120)}`);

  // ── 7. ownership ────────────────────────────────────────────────────────────────────────────
  const mTake = await rpc(m, "transfer_group_ownership", { gid: G, new_owner: M.id });
  ok("a moderator cannot take the group", mTake.status >= 400, `${mTake.status}`);
  const zGive = await rpc(o, "transfer_group_ownership", { gid: G, new_owner: outsider.id });
  ok("ownership cannot go to someone who is not a member", zGive.status >= 400, `${zGive.status}`);
  const give = await rpc(o, "transfer_group_ownership", { gid: G, new_owner: M.id });
  ok("the owner hands the group to M", okRpc(give), `${give.status} ${give.text.slice(0, 120)}`);
  const roles = Object.fromEntries(rows(await svc(`group_members?group_id=eq.${G}&user_id=in.(${O.id},${M.id})&select=user_id,role`)).map((r) => [r.user_id, r.role]));
  ok("...M is owner and O a moderator", roles[M.id] === "owner" && roles[O.id] === "moderator", JSON.stringify(roles));
  const oDel = await o(`groups?id=eq.${G}`, { method: "DELETE" });
  ok("the CREATOR, no longer owner, cannot delete the group", rows(oDel).length === 0, `${oDel.status}`);
  const mDel = await m(`groups?id=eq.${G}`, { method: "DELETE" });
  ok("the new owner can", rows(mDel).length === 1, `${mDel.status} ${mDel.text.slice(0, 120)}`);
  if (rows(mDel).length === 1) G = null;
} catch (e) {
  console.error("\nFAIL (" + (e && e.message ? e.message : e) + ")"); fail++;
} finally {
  if (G) await svc(`groups?id=eq.${G}`, { method: "DELETE" }).catch(() => {});
  for (const u of made) await admin(`admin/users/${u.id}`, { method: "DELETE" }).catch(() => {});
  const left = [];
  for (const u of made) { if (rows(await svc(`profiles?id=eq.${u.id}&select=id`)).length) left.push(u.id); }
  if (left.length) { console.log(`\nteardown left ${left.length} account(s)`); fail++; }
}
console.log(fail ? `\n${fail} failure(s).` : "\nok — 0260: rules and agreement, member invites and the block, topics, saves, prefs, group reports, declines with a message, approve-all, bans, ownership.");
process.exit(fail ? 1 : 0);
