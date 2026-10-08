// Do 0267's friend-request limits hold -- against the LIVE database, with real accounts?
//
//   node scripts/oneoff/probe-friend-request-limits.mjs
//
// Every request under test goes through the anon key + that climber's own JWT. The service key
// creates accounts, reads back, and -- for the two cases that would otherwise take a week or three
// months -- seeds connection_events / a back-dated pending row directly.
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
  const email = "limits-" + tag + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Lim " + tag } }) }, svc);
  if (!c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const s = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  return { id: c.body.id, jwt: s.body.access_token, tag };
}
const request = (a, b) => as(a).post("/rest/v1/connections", { requester: a.id, addressee: b.id });
const rowId = (r) => Array.isArray(r.body) && r.body[0] && r.body[0].id;
async function befriend(a, b) {
  const r = await request(a, b); const id = rowId(r);
  if (!id) throw new Error("CONTROL FAILED: " + a.tag + "->" + b.tag + " (" + r.status + " " + msg(r) + ")");
  const u = await as(b).patch("/rest/v1/connections?id=eq." + id, { status: "accepted" });
  if (!(Array.isArray(u.body) && u.body.length === 1)) throw new Error("CONTROL FAILED: " + b.tag + " accepting");
}
const made = [];

async function main() {
  console.log("0267 — friend-request limits, live; real accounts, anon key + each climber's own JWT" + NL);
  const [A, B, C, D, E, F, G, H] = await Promise.all(["a", "b", "c", "d", "e", "f", "g", "h"].map(createUser));
  made.push(A, B, C, D, E, F, G, H);

  // ---- 1. WITHDRAW, THEN ASK AGAIN AT ONCE
  const r1 = await request(A, B);
  if (!rowId(r1)) throw new Error("CONTROL FAILED: A->B (" + r1.status + ")");
  await as(A).del("/rest/v1/connections?id=eq." + rowId(r1));
  const r1b = await request(A, B);
  if (r1b.status >= 300 && /recently/.test(msg(r1b))) ok("withdrawing and re-asking at once is refused — " + msg(r1b));
  else bad("withdraw + re-ask is refused", r1b.status + " " + msg(r1b));
  const r1c = await request(B, A);
  if (rowId(r1c)) { ok("...but the OTHER climber may still ask (the cooldown is on the one who asked)"); await as(B).del("/rest/v1/connections?id=eq." + rowId(r1c)); }
  else bad("the other climber may still ask", r1c.status + " " + msg(r1c));

  // ---- 2. DECLINE: quiet, final for 21 days for the asker, free for the decliner
  const r2 = await request(C, D);
  await as(D).patch("/rest/v1/connections?id=eq." + rowId(r2), { status: "declined" });
  await as(C).del("/rest/v1/connections?id=eq." + rowId(r2));
  const r2b = await request(C, D);
  if (r2b.status >= 300 && /recently/.test(msg(r2b))) ok("after a DECLINE the asker cannot withdraw-and-re-ask — the loop is closed");
  else bad("decline + withdraw + re-ask is refused", r2b.status + " " + msg(r2b));
  const r2c = await request(D, C);
  const dc = rowId(r2c);
  if (dc) ok("...while the DECLINER can change their mind and ask at any time");
  else bad("the decliner can ask", r2c.status + " " + msg(r2c));
  if (dc) { const acc = await as(C).patch("/rest/v1/connections?id=eq." + dc, { status: "accepted" }); if (!(acc.body && acc.body.length)) throw new Error("CONTROL FAILED: C accepting D"); }

  // ---- 3. WHO MAY ASK YOU
  await as(D).patch("/rest/v1/profiles?id=eq." + D.id, { requests_from: "nobody" });
  const r3 = await request(A, D);
  if (r3.status >= 300 && /isn’t accepting/.test(msg(r3))) ok("'nobody' refuses every request — " + msg(r3));
  else bad("'nobody' refuses requests", r3.status + " " + msg(r3));
  await as(D).patch("/rest/v1/profiles?id=eq." + D.id, { requests_from: "friends_of_friends" });
  const r3b = await request(A, D);
  if (r3b.status >= 300 && /friends of their friends/.test(msg(r3b))) ok("'friends of friends' refuses a stranger");
  else bad("'friends of friends' refuses a stranger", r3b.status + " " + msg(r3b));
  await befriend(A, C); // now A - C - D
  const r3c = await request(A, D);
  if (rowId(r3c)) ok("...and admits someone you share a friend with");
  else bad("'friends of friends' admits a friend of a friend", r3c.status + " " + msg(r3c));
  const fakePref = await as(D).patch("/rest/v1/profiles?id=eq." + D.id, { requests_from: "anyone at all" });
  if (fakePref.status >= 300) ok("an unknown setting value is refused by the database"); else bad("an unknown setting is refused", fakePref.status);

  // ---- 4. A STRANGER'S DM IS WORDS ONLY
  const img = "https://example.invalid/x.jpg";
  const m1 = await as(E).post("/rest/v1/messages", { sender_id: E.id, recipient_id: F.id, body: "hi", image_url: img });
  if (m1.status >= 300 && /Photos can be sent/.test(msg(m1))) ok("a stranger cannot send a PHOTO in a first message — " + msg(m1));
  else bad("a stranger cannot send a photo", m1.status + " " + msg(m1));
  const m2 = await as(E).post("/rest/v1/messages", { sender_id: E.id, recipient_id: F.id, body: "hi, want to climb Saturday?" });
  if (rowId(m2)) ok("...but can send words"); else bad("a stranger can send text", m2.status + " " + msg(m2));
  await as(F).post("/rest/v1/messages", { sender_id: F.id, recipient_id: E.id, body: "sure" });
  const m3 = await as(E).post("/rest/v1/messages", { sender_id: E.id, recipient_id: F.id, body: "topo", image_url: img });
  if (rowId(m3)) ok("...and a photo once the recipient has written back"); else bad("a photo after a reply", m3.status + " " + msg(m3));

  // ---- 5. THE WEEKLY CAP (seeded: 50 requests "this week")
  const seed = Array.from({ length: 50 }, () => ({ requester: G.id, addressee: H.id, kind: "requested" }));
  const s5 = await api("/rest/v1/connection_events", { method: "POST", body: JSON.stringify(seed) }, svc);
  if (s5.status >= 300) throw new Error("could not seed connection_events (" + s5.status + " " + msg(s5) + ")");
  const r5 = await request(G, E);
  if (r5.status >= 300 && /a lot of friend requests/.test(msg(r5))) ok("the 51st request in a week is refused — " + msg(r5));
  else bad("the weekly cap holds", r5.status + " " + msg(r5));
  const ev = await as(G).get("/rest/v1/connection_events?select=id&limit=1");
  if (Array.isArray(ev.body) && ev.body.length === 0) ok("a climber cannot read the request history the limits use");
  else bad("connection_events is unreadable to clients", JSON.stringify(ev.body).slice(0, 120));

  // ---- 6. AN ABANDONED REQUEST EXPIRES (seeded: pending, 100 days old)
  const old = new Date(Date.now() - 100 * 86400000).toISOString();
  const s6 = await api("/rest/v1/connections", { method: "POST", body: JSON.stringify({ requester: H.id, addressee: F.id, status: "pending", created_at: old }), headers: { Prefer: "return=representation" } }, svc);
  if (!rowId(s6)) throw new Error("could not seed an old pending row (" + s6.status + " " + msg(s6) + ")");
  const r6 = await request(F, H);
  if (rowId(r6)) ok("a 100-day-old pending request is cleared, and the other climber can ask fresh");
  else bad("an expired request is cleared", r6.status + " " + msg(r6));
  const r6b = await request(H, F);
  if (r6b.status >= 300 && !/recently/.test(msg(r6b))) ok("...and clearing it started no cooldown against its sender (refused only as a duplicate)");
  else bad("expiry starts no cooldown", r6b.status + " " + msg(r6b));

  // ---- 7. PEOPLE YOU MAY KNOW
  await befriend(C, H); // A - C - H : H is a friend of A's friend
  const p1 = await as(A).rpc("people_you_may_know", { p_limit: 20 });
  const ids = Array.isArray(p1.body) ? p1.body.map((x) => x.id) : [];
  if (ids.includes(H.id)) ok("people-you-may-know suggests a real friend-of-a-friend");
  else bad("PYMK suggests a friend of a friend", JSON.stringify(p1.body).slice(0, 200));
  if (!ids.includes(C.id) && !ids.includes(A.id) && !ids.includes(D.id)) ok("...never yourself, a friend, or someone you have a pending request with");
  else bad("PYMK excludes self, friends and pending", JSON.stringify(ids));
  await as(H).post("/rest/v1/blocked_users", { blocker: H.id, blocked: A.id });
  const p2 = await as(A).rpc("people_you_may_know", { p_limit: 20 });
  if (Array.isArray(p2.body) && !p2.body.some((x) => x.id === H.id)) ok("...and never someone who blocked you");
  else bad("PYMK excludes a blocker", JSON.stringify(p2.body).slice(0, 200));
  const anon = await api("/rest/v1/rpc/people_you_may_know", { method: "POST", body: "{}" }, anonKey());
  if (anon.status >= 300) ok("a signed-out caller gets no suggestions (" + anon.status + ")"); else bad("signed-out PYMK refused", anon.status);

  console.log(NL + pass + " passed, " + fail + " failed.");
}
// A failed account delete is a FINDING, not noise: the first run of this probe left four accounts behind
// because 0267's event logger broke deleting any account with a pending request.
try { await main(); } finally { let stuck = 0; for (const u of made) { const r = await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => ({ status: 0 })); if (r.status >= 300 || r.status === 0) { stuck++; console.log("  FAIL could not delete fixture " + u.tag + " (" + r.status + " " + msg(r) + ")"); } } if (stuck) fail++; console.log("torn down " + (made.length - stuck) + " of " + made.length + " account(s)."); }
process.exitCode = fail ? 1 : 0;
