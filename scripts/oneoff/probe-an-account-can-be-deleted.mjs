// Does in-app account deletion (0266 + the delete-account edge function) actually delete — live?
//
//   node scripts/oneoff/probe-an-account-can-be-deleted.mjs
//
// U is a climber with a footprint in every place that used to block a delete or be left behind: an
// uploaded photo FILE, a crew they organised (crews.created_by was ON DELETE NO ACTION), a comment, a
// contribution row (text contributor, no FK), and a DM to O. U deletes their own account with their own
// JWT; then the service key reads back every one of those places. O is the control: still there.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const DOMAIN = "climbmatch-qa.invalid";
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const bad = (m, d) => { fail++; console.log("  FAIL " + m + (d ? "  -- " + d : "")); };
const svc = requireServiceKey();
async function api(p, opts, key, jwt) {
  const r = await fetch(SUPABASE_URL + p, { ...opts, headers: { apikey: key, Authorization: "Bearer " + (jwt || key), ...((opts && opts.headers) || {}) } });
  const text = await r.text(); let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}
const J = { "Content-Type": "application/json" };
async function createUser(tag) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "delete-" + tag + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", headers: J, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Del " + tag } }) }, svc);
  if (!c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const s = await api("/auth/v1/token?grant_type=password", { method: "POST", headers: J, body: JSON.stringify({ email, password }) }, anonKey());
  return { id: c.body.id, jwt: s.body.access_token };
}
// A 1x1 PNG, so the bucket's image-only MIME rule accepts it.
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const made = [];

async function main() {
  console.log("delete-account — live, one climber deletes themselves; the service key reads back" + NL);
  const U = await createUser("u"), O = await createUser("o");
  made.push(U, O);
  const path = U.id + "/probe-" + Date.now() + ".png";
  const up = await api("/storage/v1/object/topo-photos/" + path, { method: "POST", headers: { "Content-Type": "image/png" }, body: PNG }, anonKey(), U.jwt);
  if (up.status >= 300) throw new Error("CONTROL FAILED: U could not upload a photo (" + up.status + " " + JSON.stringify(up.body) + ")");
  const crew = await api("/rest/v1/crews", { method: "POST", headers: { ...J, Prefer: "return=representation" }, body: JSON.stringify({ created_by: U.id, route_id: "wa_mount_baker_north_ridge" }) }, anonKey(), U.jwt);
  const crewId = Array.isArray(crew.body) && crew.body[0] && crew.body[0].id;
  if (!crewId) console.log("  note: could not create a crew (" + crew.status + " " + JSON.stringify(crew.body).slice(0, 140) + ") — the crews.created_by case is not exercised");
  const cm = await api("/rest/v1/comments", { method: "POST", headers: { ...J, Prefer: "return=representation" }, body: JSON.stringify({ target_id: "probe-delete-route", user_id: U.id, text: "delete me" }) }, anonKey(), U.jwt);
  const ctr = await api("/rest/v1/contributions", { method: "POST", headers: { ...J, Prefer: "return=representation" }, body: JSON.stringify({ route_id: "wa_mount_baker_north_ridge", contributor: U.id, kind: "photo", field: "photo", value: { url: SUPABASE_URL + "/storage/v1/object/public/topo-photos/" + path } }) }, anonKey(), U.jwt);
  // A PENDING FRIEND REQUEST: 0267 first shipped a logger that made exactly this account undeletable.
  const fr = await api("/rest/v1/connections", { method: "POST", headers: J, body: JSON.stringify({ requester: U.id, addressee: O.id }) }, anonKey(), U.jwt);
  if (fr.status >= 300) throw new Error("CONTROL FAILED: U could not send O a friend request (" + fr.status + ")");
  const dm = await api("/rest/v1/messages", { method: "POST", headers: { ...J, Prefer: "return=representation" }, body: JSON.stringify({ sender_id: U.id, recipient_id: O.id, body: "bye" }) }, anonKey(), U.jwt);
  const cmId = Array.isArray(cm.body) && cm.body[0] && cm.body[0].id, dmId = Array.isArray(dm.body) && dm.body[0] && dm.body[0].id;
  const ctrOk = Array.isArray(ctr.body) && ctr.body[0];
  if (!cmId || !dmId) throw new Error("CONTROL FAILED: comment " + cm.status + " / message " + dm.status);
  if (!ctrOk) console.log("  note: could not write a contribution (" + ctr.status + " " + JSON.stringify(ctr.body).slice(0, 140) + ")");

  // ---- REFUSALS
  const anonDel = await api("/functions/v1/delete-account", { method: "POST", headers: J, body: JSON.stringify({ confirm: "DELETE" }) }, anonKey());
  if (anonDel.status === 401) ok("a signed-out call deletes nothing (401)"); else bad("a signed-out call is refused", anonDel.status);
  const noConfirm = await api("/functions/v1/delete-account", { method: "POST", headers: J, body: JSON.stringify({}) }, anonKey(), U.jwt);
  if (noConfirm.status === 400) ok("a call without the explicit confirmation deletes nothing (400)"); else bad("an unconfirmed call is refused", noConfirm.status);

  // ---- DELETE
  const del = await api("/functions/v1/delete-account", { method: "POST", headers: J, body: JSON.stringify({ confirm: "DELETE" }) }, anonKey(), U.jwt);
  if (del.status === 200 && del.body && del.body.deleted) ok("U deletes their own account (" + del.body.files + " file(s) removed)");
  else { bad("U deletes their own account", del.status + " " + JSON.stringify(del.body)); return; }

  // ---- READ BACK
  const au = await api("/auth/v1/admin/users/" + U.id, { method: "GET" }, svc);
  if (au.status === 404) ok("the auth user is gone"); else bad("the auth user is gone", au.status);
  const pr = await api("/rest/v1/profiles?select=id&id=eq." + U.id, { method: "GET" }, svc);
  if (Array.isArray(pr.body) && pr.body.length === 0) ok("the profile is gone"); else bad("the profile is gone", JSON.stringify(pr.body));
  const ls = await api("/storage/v1/object/list/topo-photos", { method: "POST", headers: J, body: JSON.stringify({ prefix: U.id, limit: 100 }) }, svc);
  if (Array.isArray(ls.body) && ls.body.length === 0) ok("the uploaded photo FILE is gone from storage, not just its row"); else bad("the uploaded file is gone", JSON.stringify(ls.body).slice(0, 200));
  const pub = await fetch(SUPABASE_URL + "/storage/v1/object/public/topo-photos/" + path);
  if (pub.status >= 400) ok("...and its public URL no longer serves it (" + pub.status + ")"); else bad("the public URL no longer serves it", pub.status);
  if (crewId) {
    const cr = await api("/rest/v1/crews?select=id&id=eq." + crewId, { method: "GET" }, svc);
    if (Array.isArray(cr.body) && cr.body.length === 0) ok("the crew they organised is gone (used to BLOCK the delete)"); else bad("the crew they organised is gone", JSON.stringify(cr.body));
  }
  const c2 = await api("/rest/v1/comments?select=id&id=eq." + cmId, { method: "GET" }, svc);
  if (Array.isArray(c2.body) && c2.body.length === 0) ok("their comment is gone"); else bad("their comment is gone", JSON.stringify(c2.body));
  if (ctrOk) {
    const k2 = await api("/rest/v1/contributions?select=id&contributor=eq." + U.id, { method: "GET" }, svc);
    if (Array.isArray(k2.body) && k2.body.length === 0) ok("their contributions are gone (text contributor — nothing would have cascaded)"); else bad("their contributions are gone", JSON.stringify(k2.body));
  }
  const m2 = await api("/rest/v1/messages?select=id&id=eq." + dmId, { method: "GET" }, svc);
  if (Array.isArray(m2.body) && m2.body.length === 0) ok("the DM they sent is gone"); else bad("the DM they sent is gone", JSON.stringify(m2.body));
  const o2 = await api("/rest/v1/profiles?select=id&id=eq." + O.id, { method: "GET" }, svc);
  if (Array.isArray(o2.body) && o2.body.length === 1) ok("CONTROL — the other climber is untouched"); else bad("the other climber is untouched", JSON.stringify(o2.body));
  console.log(NL + pass + " passed, " + fail + " failed.");
}
try { await main(); } finally { for (const u of made) await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {}); console.log("cleanup done."); }
process.exitCode = fail ? 1 : 0;
