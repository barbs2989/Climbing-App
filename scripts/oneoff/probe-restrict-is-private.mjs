// Is RESTRICT (0270) private and undetectable -- against the LIVE database, with real accounts?
//
//   node scripts/oneoff/probe-restrict-is-private.mjs
//
// A restricts B. The whole point is that B cannot tell: nothing refuses B, and no read reveals the row.
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
  del: (p) => api(p, { method: "DELETE", headers: { Prefer: "return=representation" } }, anonKey(), u.jwt),
});
async function createUser(tag) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "restrict-" + tag + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const c = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Res " + tag } }) }, svc);
  if (!c.body || !c.body.id) throw new Error("create " + tag + " failed (" + c.status + ")");
  const s = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  return { id: c.body.id, jwt: s.body.access_token, tag };
}
const made = [];
async function main() {
  console.log("0270 — restrict is private; real accounts" + NL);
  const [A, B, C] = await Promise.all(["a", "b", "c"].map(createUser));
  made.push(A, B, C);
  const r = await as(A).post("/rest/v1/restricted_users", { restrictor: A.id, restricted: B.id });
  if (!(Array.isArray(r.body) && r.body[0])) throw new Error("CONTROL FAILED: A could not restrict B (" + r.status + ")");
  ok("A restricts B");
  const aSees = await as(A).get("/rest/v1/restricted_users?select=restricted");
  if (Array.isArray(aSees.body) && aSees.body.length === 1 && aSees.body[0].restricted === B.id) ok("A sees their own restriction");
  else bad("A sees their own restriction", JSON.stringify(aSees.body));
  const bSees = await as(B).get("/rest/v1/restricted_users?select=id");
  if (Array.isArray(bSees.body) && bSees.body.length === 0) ok("B cannot discover they are restricted");
  else bad("B cannot discover they are restricted", JSON.stringify(bSees.body));
  const cSees = await as(C).get("/rest/v1/restricted_users?select=id");
  if (Array.isArray(cSees.body) && cSees.body.length === 0) ok("a third climber cannot read anyone's restrictions");
  else bad("a third climber cannot read restrictions", JSON.stringify(cSees.body));
  const m = await as(B).post("/rest/v1/messages", { sender_id: B.id, recipient_id: A.id, body: "still here" });
  if (Array.isArray(m.body) && m.body[0]) ok("B can still message A — nothing refuses them, so nothing tells them");
  else bad("B can still message A", m.status);
  const fr = await as(B).post("/rest/v1/connections", { requester: B.id, addressee: A.id });
  if (Array.isArray(fr.body) && fr.body[0]) ok("...and still send A a friend request");
  else bad("B can still send a friend request", fr.status);
  const forge = await as(C).post("/rest/v1/restricted_users", { restrictor: A.id, restricted: C.id });
  if (forge.status >= 300) ok("nobody can create a restriction in someone else's name (" + ((forge.body && forge.body.code) || forge.status) + ")");
  else bad("a forged restriction is refused", forge.status);
  const self = await as(A).post("/rest/v1/restricted_users", { restrictor: A.id, restricted: A.id });
  if (self.status >= 300) ok("nobody can restrict themselves"); else bad("self-restrict is refused", self.status);
  const delB = await as(B).del("/rest/v1/restricted_users?restrictor=eq." + A.id);
  const still = (await api("/rest/v1/restricted_users?select=id&restrictor=eq." + A.id, { method: "GET" }, svc)).body;
  if (Array.isArray(still) && still.length === 1) ok("B cannot lift A's restriction"); else bad("B cannot lift A's restriction", JSON.stringify(still));
  const delA = await as(A).del("/rest/v1/restricted_users?restrictor=eq." + A.id + "&restricted=eq." + B.id);
  if (Array.isArray(delA.body) && delA.body.length === 1) ok("A unrestricts B"); else bad("A unrestricts B", delA.status + " " + JSON.stringify(delA.body));
}
try { await main(); }
finally {
  let stuck = 0;
  for (const u of made) { const r = await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => ({ status: 0 })); if (r.status >= 300 || r.status === 0) { stuck++; console.log("  FAIL could not delete fixture " + u.tag + " (" + r.status + ")"); } }
  if (stuck) fail++;
  console.log(NL + pass + " passed, " + fail + " failed; torn down " + (made.length - stuck) + " of " + made.length + " account(s).");
}
process.exitCode = fail ? 1 : 0;
