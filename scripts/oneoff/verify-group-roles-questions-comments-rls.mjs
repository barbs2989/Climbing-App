// Does 0256 keep its promises, as FOUR real accounts see it? O owns a group, M is its moderator,
// P is a plain member, X is an outsider who asks to join. Every refusal has a control that
// succeeds, and every write is read back — RLS refuses an UPDATE/DELETE by matching zero rows, so
// a 200 is not evidence of anything.
//
//   node scripts/oneoff/verify-group-roles-questions-comments-rls.mjs
//
// Creates its own throwaway accounts on the reserved .invalid domain (sweepOrphans() reclaims any
// a killed run leaves) and deletes them, and the group, in `finally`.
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
  const email = `ui-grp${tag}-${stamp}@climbmatch-qa.invalid`, password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
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
const svc = async (p, init = {}) => {
  const r = await fetch(`${URL}/rest/v1/${p}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
  const text = await r.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: r.status, json, text };
};

const made = [];
let G = null;
try {
  const O = await makeUser("o"); made.push(O);
  const M = await makeUser("m"); made.push(M);
  const P = await makeUser("p"); made.push(P);
  const X = await makeUser("x"); made.push(X);
  const o = call(O.tok), m = call(M.tok), p = call(P.tok), x = call(X.tok), anon = call(null);

  // ── setup: an OPEN public group, M and P walk in ─────────────────────────────────────────────
  const gid = crypto.randomUUID();
  const mk = await o("groups", { method: "POST", body: JSON.stringify({ id: gid, name: "Probe 0256 group", created_by: O.id, policy: "open", visibility: "public" }), headers: { Prefer: "return=minimal" } });
  if (mk.status >= 300) dead(`O could not create the group (${mk.status}) ${mk.text.slice(0, 160)}`);
  G = gid;
  for (const [who, u] of [[m, M], [p, P]]) {
    const j = await who("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: u.id }) });
    if (j.status !== 201) dead(`a member could not join the open group (${j.status}) ${j.text.slice(0, 160)}`);
  }

  // ── 1. roles ─────────────────────────────────────────────────────────────────────────────────
  const promM = await o(`group_members?group_id=eq.${G}&user_id=eq.${M.id}`, { method: "PATCH", body: JSON.stringify({ role: "moderator" }) });
  ok("the owner can make M a moderator", rows(promM).length === 1 && rows(promM)[0].role === "moderator", `${promM.status} ${promM.text.slice(0, 120)}`);
  const mPromP = await m(`group_members?group_id=eq.${G}&user_id=eq.${P.id}`, { method: "PATCH", body: JSON.stringify({ role: "moderator" }) });
  ok("a MODERATOR cannot promote a member (owner only)", rows(mPromP).length === 0, `${mPromP.status} ${mPromP.text.slice(0, 120)}`);
  const promP = await o(`group_members?group_id=eq.${G}&user_id=eq.${P.id}`, { method: "PATCH", body: JSON.stringify({ role: "moderator" }) });
  ok("...the owner can (P made a moderator, as the next case's subject)", rows(promP).length === 1, `${promP.status}`);
  const mDemP = await m(`group_members?group_id=eq.${G}&user_id=eq.${P.id}`, { method: "PATCH", body: JSON.stringify({ role: "member" }) });
  ok("a moderator cannot demote a fellow moderator", rows(mDemP).length === 0, `${mDemP.status}`);
  const mRemP = await m(`group_members?group_id=eq.${G}&user_id=eq.${P.id}`, { method: "DELETE" });
  ok("a moderator cannot REMOVE a fellow moderator", rows(mRemP).length === 0, `${mRemP.status}`);
  const demP = await o(`group_members?group_id=eq.${G}&user_id=eq.${P.id}`, { method: "PATCH", body: JSON.stringify({ role: "member" }) });
  ok("the owner can demote P back to member", rows(demP).length === 1 && rows(demP)[0].role === "member", `${demP.status}`);
  const pRemM = await p(`group_members?group_id=eq.${G}&user_id=eq.${M.id}`, { method: "DELETE" });
  ok("a plain member cannot remove anyone", rows(pRemM).length === 0, `${pRemM.status}`);
  const mRemP2 = await m(`group_members?group_id=eq.${G}&user_id=eq.${P.id}`, { method: "DELETE" });
  ok("a moderator CAN remove a plain member", rows(mRemP2).length === 1, `${mRemP2.status} ${mRemP2.text.slice(0, 120)}`);
  const pBack = await p("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: P.id }) });
  if (pBack.status !== 201) dead(`P could not rejoin (${pBack.status})`);
  const oLeave = await o(`group_members?group_id=eq.${G}&user_id=eq.${O.id}`, { method: "DELETE" });
  ok("the owner cannot 'leave' and orphan the group", rows(oLeave).length === 0, `${oLeave.status}`);
  const mInvX = await m("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: X.id, status: "invited" }) });
  ok("a moderator can invite (control for the next case)", mInvX.status === 201, `${mInvX.status} ${mInvX.text.slice(0, 120)}`);
  const xSees = rows(await x(`group_members?group_id=eq.${G}&user_id=eq.${X.id}&select=status`));
  ok("the invitee sees their own invitation", xSees.length === 1 && xSees[0].status === "invited");

  // ── 2. roster privacy ────────────────────────────────────────────────────────────────────────
  const pSeesInv = rows(await p(`group_members?group_id=eq.${G}&user_id=eq.${X.id}&select=status`));
  ok("a plain member cannot see who was INVITED", pSeesInv.length === 0, JSON.stringify(pSeesInv));
  const anonSeesInv = rows(await anon(`group_members?group_id=eq.${G}&select=user_id,status`));
  ok("signed-out, a public group's roster lists ACTIVE rows only", anonSeesInv.length === 3 && anonSeesInv.every((r) => r.status === "active"), JSON.stringify(anonSeesInv.map((r) => r.status)));
  const mSeesInv = rows(await m(`group_members?group_id=eq.${G}&user_id=eq.${X.id}&select=status`));
  ok("a moderator sees the invitation they act on", mSeesInv.length === 1, JSON.stringify(mSeesInv));
  const undoInv = await m(`group_members?group_id=eq.${G}&user_id=eq.${X.id}&status=eq.invited`, { method: "DELETE" });
  if (rows(undoInv).length !== 1) dead(`the moderator could not withdraw the invite (${undoInv.status})`);

  // ── 3. membership questions ──────────────────────────────────────────────────────────────────
  const QS = [
    { prompt: "Highest grade you lead?", type: "choice", options: ["5.8", "5.10", "5.12"], required: true },
    { prompt: "Why do you want to join?", type: "text", required: false },
  ];
  const badQ = await o(`groups?id=eq.${G}`, { method: "PATCH", body: JSON.stringify({ join_questions: [{ prompt: "One option", type: "choice", options: ["only"] }] }) });
  ok("a malformed questionnaire is refused by the CHECK", badQ.status >= 400 && /join_questions/.test(badQ.text), `${badQ.status} ${badQ.text.slice(0, 120)}`);
  const setQ = await m(`groups?id=eq.${G}`, { method: "PATCH", body: JSON.stringify({ policy: "approval", join_questions: QS }) });
  ok("a MODERATOR can set approval + questions", rows(setQ).length === 1 && rows(setQ)[0].join_questions.length === 2, `${setQ.status} ${setQ.text.slice(0, 160)}`);
  const xDirect = await x("group_members", { method: "POST", body: JSON.stringify({ group_id: G, user_id: X.id, status: "pending" }) });
  ok("with questions set, a pending row cannot be self-written around them", xDirect.status >= 400, `${xDirect.status}`);
  const rpc = (who, answers) => who("rpc/request_to_join_group", { method: "POST", body: JSON.stringify({ gid: G, answers }) });
  const missing = await rpc(x, ["", "hi"]);
  ok("a missing REQUIRED answer is refused", missing.status >= 400 && /Please answer/.test(missing.text), `${missing.status} ${missing.text.slice(0, 120)}`);
  const offList = await rpc(x, ["5.15", ""]);
  ok("a choice that is not one of the options is refused", offList.status >= 400 && /listed answers/.test(offList.text), `${offList.status} ${offList.text.slice(0, 120)}`);
  const good = await rpc(x, ["5.10", "Weekend trad partner"]);
  ok("a complete request goes through", good.status === 204 || good.status === 200, `${good.status} ${good.text.slice(0, 160)}`);
  const again = await rpc(x, ["5.10", ""]);
  ok("a second request is refused, not duplicated", again.status >= 400, `${again.status}`);
  const xAns = rows(await x(`group_join_answers?group_id=eq.${G}&user_id=eq.${X.id}&select=answers`));
  ok("the asker reads their own answers, as a snapshot of the prompt", xAns.length === 1 && xAns[0].answers[0].prompt === QS[0].prompt && xAns[0].answers[0].answer === "5.10", JSON.stringify(xAns));
  ok("a plain member CANNOT read the answers", rows(await p(`group_join_answers?group_id=eq.${G}&select=user_id`)).length === 0);
  ok("signed-out cannot read the answers", rows(await anon(`group_join_answers?group_id=eq.${G}&select=user_id`)).length === 0);
  ok("the moderator reads the answers", rows(await m(`group_join_answers?group_id=eq.${G}&select=user_id`)).length === 1);
  ok("a plain member cannot see the PENDING request", rows(await p(`group_members?group_id=eq.${G}&status=eq.pending&select=user_id`)).length === 0);
  ok("the moderator sees it", rows(await m(`group_members?group_id=eq.${G}&status=eq.pending&select=user_id`)).length === 1);
  const pAppr = await p(`group_members?group_id=eq.${G}&user_id=eq.${X.id}&status=eq.pending`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
  ok("a plain member cannot approve", rows(pAppr).length === 0, `${pAppr.status}`);
  const mAppr = await m(`group_members?group_id=eq.${G}&user_id=eq.${X.id}&status=eq.pending`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
  ok("the moderator approves X", rows(mAppr).length === 1 && rows(mAppr)[0].status === "active", `${mAppr.status} ${mAppr.text.slice(0, 120)}`);
  ok("...and the answers stay readable to the moderator", rows(await m(`group_join_answers?group_id=eq.${G}&user_id=eq.${X.id}&select=user_id`)).length === 1);

  // ── 4. comments on a group post ──────────────────────────────────────────────────────────────
  const post = await p("group_posts", { method: "POST", body: JSON.stringify({ group_id: G, author: P.id, body: "probe post" }) });
  const pid = rows(post)[0] && rows(post)[0].id;
  if (!pid) dead(`P could not post (${post.status}) ${post.text.slice(0, 120)}`);
  const T = "gp_" + pid;
  const pc = await p("comments", { method: "POST", body: JSON.stringify({ target_id: T, user_id: P.id, text: "member comment" }) });
  const cid = rows(pc)[0] && rows(pc)[0].id;
  ok("a member can comment on a group post", pc.status === 201 && !!cid, `${pc.status} ${pc.text.slice(0, 120)}`);
  ok("...and X (now a member) reads it", rows(await x(`comments?target_id=eq.${T}&select=id`)).length === 1);
  const remX = await m(`group_members?group_id=eq.${G}&user_id=eq.${X.id}`, { method: "DELETE" });
  ok("the moderator removes X again", rows(remX).length === 1, `${remX.status}`);
  const ansGone = rows(await svc(`group_join_answers?group_id=eq.${G}&user_id=eq.${X.id}&select=user_id`));
  ok("removing the membership took the answers with it (service-key read)", ansGone.length === 0, JSON.stringify(ansGone));
  ok("an OUTSIDER cannot read a group post's comments", rows(await x(`comments?target_id=eq.${T}&select=id`)).length === 0);
  ok("signed-out cannot read them either", rows(await anon(`comments?target_id=eq.${T}&select=id`)).length === 0);
  const xc = await x("comments", { method: "POST", body: JSON.stringify({ target_id: T, user_id: X.id, text: "outsider comment" }) });
  ok("an outsider cannot comment into the group's thread", xc.status >= 400, `${xc.status}`);
  const nonGp = rows(await anon(`comments?target_id=not.like.gp_*&select=id&limit=1`));
  ok("comments on every other target are still public (signed-out read)", nonGp.length === 1, JSON.stringify(nonGp));
  const rc = (who) => who("rpc/remove_group_comment", { method: "POST", body: JSON.stringify({ cid }) });
  const xRm = await rc(x);
  ok("an outsider cannot take the comment down", xRm.status >= 400, `${xRm.status}`);
  const pRm = await rc(p);
  ok("a plain member cannot use the moderator's door, even on their own comment", pRm.status >= 400, `${pRm.status} ${pRm.text.slice(0, 120)}`);
  const mRm = await rc(m);
  ok("the moderator takes it down", mRm.status === 204 || mRm.status === 200, `${mRm.status} ${mRm.text.slice(0, 120)}`);
  const after = rows(await o(`comments?id=eq.${cid}&select=deleted,text`));
  ok("...as a tombstone (deleted, text emptied)", after.length === 1 && after[0].deleted === true && after[0].text === "", JSON.stringify(after));

  // ── private: hidden from outsiders, no request door ──────────────────────────────────────────
  const priv = await o(`groups?id=eq.${G}`, { method: "PATCH", body: JSON.stringify({ visibility: "private" }) });
  ok("the owner makes it private", rows(priv).length === 1, `${priv.status}`);
  ok("an outsider cannot find the private group", rows(await x(`groups?id=eq.${G}&select=id`)).length === 0);
  ok("...nor read its roster", rows(await x(`group_members?group_id=eq.${G}&select=user_id`)).length === 0);
  ok("...signed-out either", rows(await anon(`groups?id=eq.${G}&select=id`)).length === 0);
  const privReq = await rpc(x, ["5.10", ""]);
  ok("...and cannot ask to join it (invite only)", privReq.status >= 400 && /invite only/i.test(privReq.text), `${privReq.status} ${privReq.text.slice(0, 120)}`);
  ok("a member still reads it", rows(await p(`groups?id=eq.${G}&select=id`)).length === 1);

  // ── createGroupRow / deleteGroupRow, the way lib/db.js now calls them ────────────────────────
  // A private group created PRIVATE, with a client-minted id and no RETURNING (the only way the
  // insert passes RLS), and deleted with RETURNING, which the app uses to tell a refusal from a
  // delete.
  const pid2 = crypto.randomUUID();
  const mkPriv = await o("groups", { method: "POST", body: JSON.stringify({ id: pid2, name: "Probe 0256 private", created_by: O.id, visibility: "private" }), headers: { Prefer: "return=minimal" } });
  ok("a group can be created PRIVATE directly (no RETURNING)", mkPriv.status === 201, `${mkPriv.status} ${mkPriv.text.slice(0, 160)}`);
  const withRet = await o("groups", { method: "POST", body: JSON.stringify({ id: crypto.randomUUID(), name: "Probe 0256 private 2", created_by: O.id, visibility: "private" }) });
  ok("...while the same insert WITH RETURNING is refused (why the app mints the id)", withRet.status >= 400, `${withRet.status}`);
  ok("its owner reads it", rows(await o(`groups?id=eq.${pid2}&select=id,visibility`)).length === 1);
  ok("an outsider never sees it", rows(await x(`groups?id=eq.${pid2}&select=id`)).length === 0);
  const xDel = await x(`groups?id=eq.${pid2}`, { method: "DELETE" });
  ok("an outsider cannot delete it", rows(xDel).length === 0, `${xDel.status}`);
  const oDel = await o(`groups?id=eq.${pid2}`, { method: "DELETE" });
  ok("the owner deletes it, and RETURNING comes back with the row", rows(oDel).length === 1, `${oDel.status} ${oDel.text.slice(0, 120)}`);
  ok("...and it is gone (service-key read)", rows(await svc(`groups?id=eq.${pid2}&select=id`)).length === 0);
  const mDelG = await m(`groups?id=eq.${G}`, { method: "DELETE" });
  ok("a moderator cannot delete the group (owner only)", rows(mDelG).length === 0, `${mDelG.status}`);
} catch (e) {
  console.error("\nFAIL (" + (e && e.message ? e.message : e) + ")"); fail++;
} finally {
  if (G) await svc(`groups?id=eq.${G}`, { method: "DELETE" }).catch(() => {});
  for (const u of made) await admin(`admin/users/${u.id}`, { method: "DELETE" }).catch(() => {});
  const leftG = G ? rows(await svc(`groups?id=eq.${G}&select=id`)) : [];
  const leftU = [];
  for (const u of made) { if (rows(await svc(`profiles?id=eq.${u.id}&select=id`)).length) leftU.push(u.id); }
  if (leftG.length || leftU.length) { console.log(`\nteardown left: group ${leftG.length}, accounts ${leftU.length}`); fail++; }
}
console.log(fail ? `\n${fail} failure(s).` : "\nok — 0256: owner-only roles, moderators remove members only, roster privacy, membership questions, members-only group comments.");
process.exit(fail ? 1 : 0);
