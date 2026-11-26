// Does 0539's chat-video privacy hold -- against the LIVE database, with real accounts?
//
//   node scripts/oneoff/probe-chat-videos.mjs
//
// Four throwaway accounts: A and B are friends, C is a stranger to both, D is a stranger who DMs A.
// Every request under test goes through the anon key + that climber's own JWT; the service key only
// creates and deletes the accounts (and the objects they leave).
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const DOMAIN = "climbmatch-qa.invalid";
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const bad = (m, d) => { fail++; console.log("  FAIL " + m + (d ? "  -- " + d : "")); };
const svc = requireServiceKey();
async function api(p, opts, key, jwt) {
  const r = await fetch(SUPABASE_URL + p, { ...opts, headers: { apikey: key, Authorization: "Bearer " + (jwt || key), ...(opts && opts.raw ? {} : { "Content-Type": "application/json" }), ...((opts && opts.headers) || {}) } });
  const text = await r.text(); let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}
const as = (u) => ({
  post: (p, b) => api(p, { method: "POST", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
  patch: (p, b) => api(p, { method: "PATCH", body: JSON.stringify(b), headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
  upload: (path, bytes, type) => api("/storage/v1/object/chat-videos/" + path, { method: "POST", raw: true, body: bytes, headers: { "Content-Type": type } }, anonKey(), u.jwt),
  sign: (path) => api("/storage/v1/object/sign/chat-videos/" + path, { method: "POST", body: JSON.stringify({ expiresIn: 60 }) }, anonKey(), u.jwt),
});
const msg = (r) => (r && r.body && (r.body.message || r.body.msg || r.body.error)) || "";
async function createUser(tag) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "chatvid-" + tag + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Vid " + tag } }) }, svc);
  if (!c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const s = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  return { id: c.body.id, jwt: s.body.access_token, tag };
}
const rowId = (r) => Array.isArray(r.body) && r.body[0] && r.body[0].id;
const made = [], objects = [];
const VIDEO = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50, 0, 0, 0, 0, 109, 112, 52, 50, 105, 115, 111, 109]); // an ftyp box: enough to be stored
const newPath = (u, ext) => u.id + "/" + crypto.randomUUID() + "." + (ext || "mp4");

async function main() {
  console.log("0539 — chat videos, live; real accounts, anon key + each climber's own JWT\n");
  const [A, B, C, D] = await Promise.all(["a", "b", "c", "d"].map(createUser));
  made.push(A, B, C, D);
  const fr = await as(A).post("/rest/v1/connections", { requester: A.id, addressee: B.id });
  const ac = await as(B).patch("/rest/v1/connections?id=eq." + rowId(fr), { status: "accepted" });
  if (!(Array.isArray(ac.body) && ac.body.length === 1)) throw new Error("CONTROL FAILED: A and B could not become friends (" + fr.status + " " + msg(fr) + ")");

  // 1. upload into your own folder; not into somebody else's; not a photo
  const p1 = newPath(A);
  const u1 = await as(A).upload(p1, VIDEO, "video/mp4");
  if (u1.status < 300) { ok("A uploads a video into A's own folder"); objects.push(p1); } else throw new Error("CONTROL FAILED: A's upload " + u1.status + " " + msg(u1));
  const p2 = newPath(B);
  const u2 = await as(A).upload(p2, VIDEO, "video/mp4");
  if (u2.status >= 400) ok("A cannot upload into B's folder (" + u2.status + ")"); else { bad("A cannot upload into B's folder", String(u2.status)); objects.push(p2); }
  const p3 = A.id + "/" + crypto.randomUUID() + ".jpg";
  const u3 = await as(A).upload(p3, VIDEO, "image/jpeg");
  if (u3.status >= 400) ok("the bucket refuses a non-video type (" + u3.status + ")"); else { bad("non-video refused", String(u3.status)); objects.push(p3); }

  // 2. before any message names it, only A can open it
  const s0 = await as(B).sign(p1);
  if (s0.status >= 400 || !(s0.body && s0.body.signedURL)) ok("B cannot open A's video before a message names it"); else bad("B cannot open an unsent video", JSON.stringify(s0.body));
  const sA = await as(A).sign(p1);
  if (sA.body && sA.body.signedURL) ok("A can open A's own video"); else bad("A opens own video", sA.status + " " + msg(sA));

  // 3. a DM to a friend names it: B opens it, C does not
  const m1 = await as(A).post("/rest/v1/messages", { sender_id: A.id, recipient_id: B.id, body: "", video_path: p1 });
  if (rowId(m1)) ok("A sends B (a friend) a video message"); else throw new Error("CONTROL FAILED: the DM " + m1.status + " " + msg(m1));
  const sB = await as(B).sign(p1);
  if (sB.body && sB.body.signedURL) {
    const g = await fetch(SUPABASE_URL + "/storage/v1" + sB.body.signedURL);
    if (g.status === 200) ok("B opens it through a signed URL (200)"); else bad("B's signed URL serves the file", String(g.status));
  } else bad("B can open the video A sent", sB.status + " " + msg(sB));
  const sC = await as(C).sign(p1);
  if (sC.status >= 400 || !(sC.body && sC.body.signedURL)) ok("C, a stranger, cannot open it"); else bad("C cannot open it", JSON.stringify(sC.body));
  const pub = await fetch(SUPABASE_URL + "/storage/v1/object/public/chat-videos/" + p1);
  if (pub.status >= 400) ok("the bucket is not public (" + pub.status + ")"); else bad("bucket is private", String(pub.status));

  // 4. a message may only name a file in the SENDER's folder
  const pB = newPath(B); const uB = await as(B).upload(pB, VIDEO, "video/mp4"); if (uB.status < 300) objects.push(pB);
  const m2 = await as(A).post("/rest/v1/messages", { sender_id: A.id, recipient_id: B.id, body: "", video_path: pB });
  if (!rowId(m2)) ok("A cannot send a message naming B's file — " + msg(m2)); else bad("a message names only the sender's own file");

  // 5. a stranger's DM is words only: D cannot send A a video until A replies
  const pD = newPath(D); const uD = await as(D).upload(pD, VIDEO, "video/mp4"); if (uD.status < 300) objects.push(pD);
  const m3 = await as(D).post("/rest/v1/messages", { sender_id: D.id, recipient_id: A.id, body: "", video_path: pD });
  if (!rowId(m3) && /once you’re friends/.test(msg(m3))) ok("a stranger's video DM is refused — " + msg(m3)); else bad("stranger video refused", m3.status + " " + msg(m3));

  // 6. a sent video cannot be swapped
  const pA2 = newPath(A); const uA2 = await as(A).upload(pA2, VIDEO, "video/mp4"); if (uA2.status < 300) objects.push(pA2);
  const sw = await as(B).patch("/rest/v1/messages?id=eq." + rowId(m1), { video_path: pA2 });
  if (!(Array.isArray(sw.body) && sw.body.length)) ok("a sent message's video cannot be swapped (" + sw.status + ")"); else bad("video swap refused");
}

try { await main(); } catch (e) { bad("probe stopped", e && e.message); } finally {
  if (objects.length) await api("/storage/v1/object/chat-videos", { method: "DELETE", body: JSON.stringify({ prefixes: objects }) }, svc).catch(() => null);
  let stuck = 0; for (const u of made) { const r = await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => ({ status: 0 })); if (r.status >= 300) stuck++; }
  console.log("\n" + pass + " ok, " + fail + " failed" + (stuck ? "; " + stuck + " account(s) not deleted" : ""));
  process.exitCode = fail ? 1 : 0;
}
