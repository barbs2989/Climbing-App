// Does 0230 keep its promises for group posts, reactions, events, RSVPs and event invites, as two
// REAL accounts see it? The fixture's private group: A owns it (a manager), B is a member.
// Every write is followed by a read; every refusal has a control that succeeds. B LEAVES the
// group at the end, which is the outsider case and the private-group invite case.
//
//   node scripts/oneoff/verify-group-posts-events-rls.mjs
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { createFixture } from "../lib/ui-fixture.mjs";

const URL = SUPABASE_URL, ANON = anonKey();
if (!URL || !ANON) { console.error("FAIL: no Supabase url/anon key — nothing was verified."); process.exit(1); }
let fail = 0;
const ok = (label, cond, detail) => { console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`); if (!cond) fail++; };
const dead = (m) => { throw new Error("nothing was verified: " + m); };
async function signIn(u) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password }) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok || !b.access_token) dead(`could not sign in as ${u.email} (${r.status})`);
  return b.access_token;
}
const as = (tok) => async (p, init = {}) => {
  const r = await fetch(`${URL}/rest/v1/${p}`, { ...init, headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) } });
  const text = await r.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: r.status, json, text };
};
const rows = (r) => (Array.isArray(r.json) ? r.json : []);

const fx = await createFixture((m) => console.log(m));
const A = fx.owner, B = fx.mate, G = fx.group && fx.group.id;
try {
  if (!G) dead("the fixture made no group");
  const a = as(await signIn(A)), b = as(await signIn(B));
  const day = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  // ---------------------------------------------------------------- posts
  const bp = await b("group_posts", { method: "POST", body: JSON.stringify({ group_id: G, author: B.id, body: "probe post by B" }) });
  ok("a member (B) can post", bp.status === 201, `${bp.status} ${bp.text.slice(0, 160)}`);
  const pid = rows(bp)[0] && rows(bp)[0].id;
  if (!pid) dead("B's post id missing");
  ok("...and the owner (A) reads it", rows(await a(`group_posts?id=eq.${pid}&select=id`)).length === 1);
  const forged = await b("group_posts", { method: "POST", body: JSON.stringify({ group_id: G, author: A.id, body: "forged" }) });
  ok("B cannot post as A", forged.status >= 400, `${forged.status}`);

  const bPin = await b(`group_posts?id=eq.${pid}`, { method: "PATCH", body: JSON.stringify({ pinned: true }) });
  ok("a plain member cannot pin, even their own post", bPin.status >= 400, `${bPin.status} ${bPin.text.slice(0, 100)}`);
  const aPin = await a(`group_posts?id=eq.${pid}`, { method: "PATCH", body: JSON.stringify({ pinned: true, pinned_at: new Date().toISOString() }) });
  ok("the owner can pin it", aPin.status === 200 && rows(aPin)[0] && rows(aPin)[0].pinned === true, `${aPin.status} ${aPin.text.slice(0, 100)}`);
  const aEdit = await a(`group_posts?id=eq.${pid}`, { method: "PATCH", body: JSON.stringify({ body: "rewritten by A" }) });
  ok("the owner cannot rewrite B's words", aEdit.status >= 400, `${aEdit.status} ${aEdit.text.slice(0, 100)}`);
  const bEdit = await b(`group_posts?id=eq.${pid}`, { method: "PATCH", body: JSON.stringify({ body: "edited by B", edited: true }) });
  ok("the author can edit their own post", bEdit.status === 200 && rows(bEdit)[0] && rows(bEdit)[0].body === "edited by B", `${bEdit.status} ${bEdit.text.slice(0, 100)}`);

  const react = await b("group_post_reactions", { method: "POST", body: JSON.stringify({ post_id: pid, user_id: B.id, reaction: "fire" }) });
  ok("a member can react", react.status === 201, `${react.status} ${react.text.slice(0, 100)}`);
  ok("...and the owner sees the reaction", rows(await a(`group_post_reactions?post_id=eq.${pid}&select=user_id,reaction`)).some((r) => r.user_id === B.id && r.reaction === "fire"));
  const fakeReact = await b("group_post_reactions", { method: "POST", body: JSON.stringify({ post_id: pid, user_id: A.id, reaction: "fire" }) });
  ok("B cannot react as A", fakeReact.status >= 400, `${fakeReact.status}`);

  // ---------------------------------------------------------------- events
  const bEv = await b("group_events", { method: "POST", body: JSON.stringify({ group_id: G, host: B.id, title: "probe event by B", event_date: day, capacity: 1 }) });
  const gp = rows(await a(`groups?id=eq.${G}&select=event_policy`))[0] || {};
  if ((gp.event_policy || "anyone") === "anyone") ok("with event_policy 'anyone', a member can create an event", bEv.status === 201, `${bEv.status} ${bEv.text.slice(0, 160)}`);
  else ok("with event_policy 'mods', a member cannot create an event", bEv.status >= 400, `${bEv.status}`);
  const setMods = await a(`groups?id=eq.${G}`, { method: "PATCH", body: JSON.stringify({ event_policy: "mods" }) });
  if (setMods.status >= 300) dead(`the owner could not set event_policy (${setMods.status}) ${setMods.text.slice(0, 120)}`);
  const bEv2 = await b("group_events", { method: "POST", body: JSON.stringify({ group_id: G, host: B.id, title: "should be refused", event_date: day }) });
  ok("with event_policy 'mods', a plain member cannot create an event", bEv2.status >= 400, `${bEv2.status}`);
  const aEv = await a("group_events", { method: "POST", body: JSON.stringify({ group_id: G, host: A.id, title: "probe event by A", event_date: day, capacity: 1 }) });
  ok("...while the owner can", aEv.status === 201, `${aEv.status} ${aEv.text.slice(0, 160)}`);
  const eid = rows(aEv)[0] && rows(aEv)[0].id;
  if (!eid) dead("A's event id missing");
  ok("a member reads the event", rows(await b(`group_events?id=eq.${eid}&select=id`)).length === 1);

  const aR = await a("group_event_rsvps", { method: "POST", body: JSON.stringify({ event_id: eid, user_id: A.id }) });
  ok("the host can RSVP", aR.status === 201, `${aR.status} ${aR.text.slice(0, 100)}`);
  const bR = await b("group_event_rsvps", { method: "POST", body: JSON.stringify({ event_id: eid, user_id: B.id }) });
  ok("capacity 1 is enforced: B's RSVP to a full event is refused", bR.status >= 400 && /full/i.test(bR.text), `${bR.status} ${bR.text.slice(0, 100)}`);
  const fakeR = await b("group_event_rsvps", { method: "POST", body: JSON.stringify({ event_id: eid, user_id: A.id }) });
  ok("B cannot RSVP as A", fakeR.status >= 400, `${fakeR.status}`);
  const aUn = await a(`group_event_rsvps?event_id=eq.${eid}&user_id=eq.${A.id}`, { method: "DELETE" });
  ok("the host can withdraw their RSVP", rows(aUn).length === 1, `${aUn.status} ${aUn.text.slice(0, 80)}`);
  const bR2 = await b("group_event_rsvps", { method: "POST", body: JSON.stringify({ event_id: eid, user_id: B.id }) });
  ok("...which frees the seat for B", bR2.status === 201, `${bR2.status} ${bR2.text.slice(0, 100)}`);

  const inv = await a("group_event_invites", { method: "POST", body: JSON.stringify({ event_id: eid, invitee: B.id, invited_by: A.id }) });
  ok("a member can invite a fellow member", inv.status === 201, `${inv.status} ${inv.text.slice(0, 160)}`);
  ok("...and the invitee sees the invite", rows(await b(`group_event_invites?invitee=eq.${B.id}&select=event_id`)).some((r) => r.event_id === eid));
  const selfInv = await a("group_event_invites", { method: "POST", body: JSON.stringify({ event_id: eid, invitee: A.id, invited_by: A.id }) });
  ok("you cannot invite yourself", selfInv.status >= 400, `${selfInv.status}`);

  // ---------------------------------------------------------------- B leaves: the outsider case
  const leave = await b(`group_members?group_id=eq.${G}&user_id=eq.${B.id}`, { method: "DELETE" });
  if (!rows(leave).length) dead(`B could not leave the group (${leave.status}) ${leave.text.slice(0, 120)}`);
  ok("after leaving, B reads no posts", rows(await b(`group_posts?group_id=eq.${G}&select=id`)).length === 0);
  ok("...but still reads the ONE event B was invited to", rows(await b(`group_events?group_id=eq.${G}&select=id`)).map((r) => r.id).join() === eid);
  const bPost2 = await b("group_posts", { method: "POST", body: JSON.stringify({ group_id: G, author: B.id, body: "outsider" }) });
  ok("an outsider cannot post", bPost2.status >= 400, `${bPost2.status}`);
  const delInv = await a(`group_event_invites?event_id=eq.${eid}&invitee=eq.${B.id}`, { method: "DELETE" });
  ok("the sender can withdraw an invite", rows(delInv).length === 1, `${delInv.status}`);
  const reInv = await a("group_event_invites", { method: "POST", body: JSON.stringify({ event_id: eid, invitee: B.id, invited_by: A.id }) });
  ok("in a PRIVATE group, a non-member cannot be invited", reInv.status >= 400, `${reInv.status} ${reInv.text.slice(0, 100)}`);

  const aDel = await a(`group_posts?id=eq.${pid}`, { method: "DELETE" });
  ok("a manager can delete a member's post", rows(aDel).length === 1, `${aDel.status}`);
  const aCancel = await a(`group_events?id=eq.${eid}`, { method: "DELETE" });
  ok("the host can cancel the event", rows(aCancel).length === 1, `${aCancel.status}`);
} catch (e) {
  console.error("\nFAIL (" + (e && e.message ? e.message : e) + ")"); fail++;
} finally {
  const left = await fx.cleanup();
  if (Array.isArray(left) && left.length) { console.log(`\nteardown could not remove: ${JSON.stringify(left)}`); fail++; }
}
console.log(fail ? `\n${fail} failure(s).` : "\nok — posts, reactions, events, RSVPs and invites obey 0230 for members, managers and outsiders.");
process.exit(fail ? 1 : 0);
