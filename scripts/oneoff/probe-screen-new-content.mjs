// Does 0265's FLOOR hold what it should, and only that -- against the LIVE database, real accounts?
//
//   node scripts/oneoff/probe-screen-new-content.mjs
//
// The floor is the term list matched inside the INSERT/UPDATE. (The model half, screen-content, is
// inert until ANTHROPIC_API_KEY and app_settings.screen_hook_url are set; this probe also proves that
// an unwired hook never costs a climber their post.) One term from the seeded list is used, spelled
// out here only in a split form so this file does not itself trip anything that greps for it.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const DOMAIN = "climbmatch-qa.invalid";
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const bad = (m, d) => { fail++; console.log("  FAIL " + m + (d ? "  -- " + d : "")); };
const svc = requireServiceKey();
const TERM = ["fag", "got"].join(""); // a seeded 'hate' term
const TARGET = "probe-0265-route";

async function api(p, opts, key, jwt) {
  const r = await fetch(SUPABASE_URL + p, { ...opts, headers: { apikey: key, Authorization: "Bearer " + (jwt || key), "Content-Type": "application/json", ...((opts && opts.headers) || {}) } });
  const text = await r.text(); let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}
const as = (u) => ({
  get: (p) => api(p, { method: "GET" }, anonKey(), u.jwt),
  post: (p, b) => api(p, { method: "POST", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
  patch: (p, b) => api(p, { method: "PATCH", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
});
const truth = (p) => api(p, { method: "GET" }, svc);
async function createUser(tag, name) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "screen-" + tag + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }) }, svc);
  if (c.status >= 300 || !c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const s = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  return { id: c.body.id, jwt: s.body.access_token, tag };
}
const made = [], rows = { comments: [], messages: [], climb_logs: [] };
async function destroy() {
  for (const u of made) {
    await api("/rest/v1/user_reports?reported_id=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
    await api("/rest/v1/moderation_actions?target_owner=eq." + u.id, { method: "DELETE" }, svc).catch(() => {});
  }
  for (const [t, ids] of Object.entries(rows)) for (const id of ids) await api("/rest/v1/" + t + "?id=eq." + id, { method: "DELETE" }, svc).catch(() => {});
  for (const u of made) await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
}
const comment = async (u, text) => {
  const r = await as(u).post("/rest/v1/comments", { target_id: TARGET, user_id: u.id, text });
  const id = Array.isArray(r.body) && r.body[0] && r.body[0].id;
  if (id) rows.comments.push(id);
  return { r, id };
};
const state = async (t, id) => ((await truth("/rest/v1/" + t + "?select=moderation&id=eq." + id)).body[0] || {}).moderation;
const queued = async (kind, id) => (await truth("/rest/v1/user_reports?select=reporter,reporter_label,reason,snapshot&target_kind=eq." + kind + "&target_id=eq." + id)).body || [];

async function main() {
  console.log("0265 — the screening floor, live; real accounts, anon key + each climber's own JWT" + NL);
  const A = await createUser("a", "Ada Author"), B = await createUser("b", "Bo Reader");
  made.push(A, B);

  // ---- CLIMBING JARGON PASSES
  const j = await comment(A, "That crux will kill you — just send it. The whipper is clean, the choss is death, chop nothing.");
  if (!j.id) throw new Error("CONTROL FAILED: A could not comment (" + j.r.status + ")");
  if ((await state("comments", j.id)) === "visible" && (await as(B).get("/rest/v1/comments?select=id&id=eq." + j.id)).body.length === 1) ok("climbing jargon ('kill you… send it… death… chop') stays visible to others");
  else bad("climbing jargon stays visible", await state("comments", j.id));
  const sp = await comment(A, "Spicy runout on pitch 3, and the Scunthorpe slab is a classic.");
  if ((await state("comments", sp.id)) === "visible") ok("word boundaries hold — 'Spicy' and 'Scunthorpe' are not held");
  else bad("word boundaries hold", await state("comments", sp.id));

  // ---- A TERM IS HELD BEFORE ANYONE SEES IT
  const h = await comment(A, "you are a " + TERM + " and should stop climbing");
  if (!h.id) throw new Error("the floor REFUSED the insert instead of holding it (" + h.r.status + ")");
  if ((await state("comments", h.id)) === "held") ok("a comment with a listed slur lands HELD (the insert still succeeds)");
  else bad("a listed slur lands held", await state("comments", h.id));
  if ((await as(B).get("/rest/v1/comments?select=id&id=eq." + h.id)).body.length === 0) ok("...no other climber can read it");
  else bad("...no other climber can read it");
  const ha = (await as(A).get("/rest/v1/comments?select=moderation&id=eq." + h.id)).body;
  if (ha.length === 1 && ha[0].moderation === "held") ok("...its author still sees it, marked held");
  else bad("...its author sees it marked held", JSON.stringify(ha));
  const q = await queued("comment", h.id);
  if (q.length === 1 && q[0].reporter === null && q[0].reporter_label === "Automatic screening" && /hate/.test(q[0].reason) && (q[0].snapshot || "").includes(TERM))
    ok("...and it is in the review queue, filed by 'Automatic screening' with the text and category");
  else bad("...it is queued for review", JSON.stringify(q));
  const act = (await truth("/rest/v1/moderation_actions?select=action,note&target_id=eq." + h.id)).body || [];
  if (act.some((x) => x.action === "auto_hold")) ok("...and the automatic hold is in the audit log");
  else bad("...the automatic hold is logged", JSON.stringify(act));

  // ---- CASE AND PUNCTUATION
  const caps = await comment(A, "Total " + TERM.toUpperCase() + "!!!");
  if ((await state("comments", caps.id)) === "held") ok("UPPER CASE and trailing punctuation are still caught");
  else bad("case/punctuation still caught", await state("comments", caps.id));

  // ---- AN EDIT IS SCREENED TOO
  const e = await comment(A, "Great day on the rock.");
  await as(A).patch("/rest/v1/comments?id=eq." + e.id, { text: "Great day, you " + TERM, edited: true });
  if ((await state("comments", e.id)) === "held" && (await queued("comment", e.id)).length === 1) ok("posting something benign and EDITING a slur in is held and queued");
  else bad("an edit is screened", await state("comments", e.id));
  await as(A).patch("/rest/v1/comments?id=eq." + j.id, { likes: 0 });
  if ((await state("comments", j.id)) === "visible" && (await queued("comment", j.id)).length === 0) ok("an update that does not change the words does not re-screen or queue");
  else bad("a non-text update does not re-screen", await state("comments", j.id));

  // ---- DMs
  const m = await as(A).post("/rest/v1/messages", { sender_id: A.id, recipient_id: B.id, body: "hey " + TERM });
  const mid = Array.isArray(m.body) && m.body[0] && m.body[0].id;
  if (mid) rows.messages.push(mid);
  if (mid && (await state("messages", mid)) === "held" && (await as(B).get("/rest/v1/messages?select=id&id=eq." + mid)).body.length === 0) ok("a DM with a slur is held — the recipient never receives it");
  else bad("a DM with a slur is held", m.status + " " + (mid && (await state("messages", mid))));

  // ---- PRIVATE TRIP NOTES ARE NOBODY'S BUSINESS -- UNTIL THEY ARE PUBLISHED
  const today = new Date().toISOString().slice(0, 10);
  const lg = await as(A).post("/rest/v1/climb_logs", { user_id: A.id, route_id: "wa_mount_baker_north_ridge", discipline: "mountaineering", date_climbed: today, trip_report_visibility: "private", notes: "private note: my partner is a " + TERM });
  const lid = Array.isArray(lg.body) && lg.body[0] && lg.body[0].id;
  if (!lid) { console.log("  SKIP trip-report cases: could not create a climb log (" + lg.status + " " + JSON.stringify(lg.body).slice(0, 160) + ")"); }
  else {
    rows.climb_logs.push(lid);
    if ((await state("climb_logs", lid)) === "visible" && (await queued("trip_report", lid)).length === 0) ok("a PRIVATE trip report is not screened or queued — no reviewer reads private notes");
    else bad("a private trip report is left alone", await state("climb_logs", lid));
    await as(A).patch("/rest/v1/climb_logs?id=eq." + lid, { trip_report_visibility: "public" });
    if ((await state("climb_logs", lid)) === "held" && (await queued("trip_report", lid)).length === 1) ok("...but the moment it is made PUBLIC it is screened, held and queued");
    else bad("...publishing it screens it", await state("climb_logs", lid));
  }
  console.log(NL + pass + " passed, " + fail + " failed.");
}
try { await main(); } finally { await destroy(); console.log("torn down " + made.length + " account(s) and their rows."); }
process.exitCode = fail ? 1 : 0;
