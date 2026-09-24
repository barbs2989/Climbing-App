// Prove 0189's privacy contract with REAL accounts, under RLS, on each climber's own JWT.
//
// The service key bypasses RLS entirely, so a service-key probe reports success whatever the
// policies say -- 0095's own header records that trap. The service key here CREATES and DELETES
// the throwaway accounts and nothing else; every read and write under test goes through the anon
// key plus that climber's own session, exactly as the app does it.
//
// What must hold:
//   * a zip is readable by its owner and by NOBODY else, and nobody can write another's zip;
//   * an unknown zip is refused rather than stored unplaceable;
//   * partners_near refuses a signed-out caller;
//   * it returns listed climbers within the radius, nearest first, and never the caller, an
//     unlisted climber, or one outside the radius;
//   * it returns NO zip and NO coordinate -- only a distance rounded up to a multiple of 5;
//   * the 10-mile radius FLOOR holds (it is what limits walking a circle around somebody);
//   * a climber who has blocked the caller is not returned.
//
// Accounts live on the reserved .invalid domain and are deleted in a finally, and the run then
// COUNTS what is left rather than trusting the deletes.
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const DOMAIN = "climbmatch-qa.invalid";
let pass = 0, fail = 0;
const ok = (l) => { pass++; console.log("  ok   " + l); };
const bad = (l, d) => { fail++; console.log("  FAIL " + l + (d ? "  -- " + d : "")); };
const check = (cond, l, d) => (cond ? ok(l) : bad(l, d));
const svc = requireServiceKey();

async function api(path, opts, key, jwt) {
  const r = await fetch(SUPABASE_URL + path, {
    ...opts,
    headers: { apikey: key, Authorization: "Bearer " + (jwt || key), "Content-Type": "application/json", ...((opts && opts.headers) || {}) },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}
const made = [];
async function createUser(tag) {
  const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 8);
  const email = "near-" + tag + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const { status, body } = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "QA Fixture " + tag } }) }, svc);
  if (status >= 300 || !body || !body.id) throw new Error("create " + tag + " failed (" + status + ")");
  const u = { id: body.id, tag, email, password };
  made.push(u);
  const t = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  if (!t.body || !t.body.access_token) throw new Error("sign in " + tag + " failed (" + t.status + ")");
  u.jwt = t.body.access_token;
  return u;
}
const as = (u, path, opts) => api(path, opts || {}, anonKey(), u && u.jwt);
async function setZip(u, zip) {
  return as(u, "/rest/v1/profile_zips?select=zip", { method: "POST", headers: { Prefer: "return=representation,resolution=merge-duplicates" }, body: JSON.stringify({ user_id: u.id, zip }) });
}
async function list(u) {
  const r = await as(u, "/rest/v1/profiles?id=eq." + u.id + "&select=id,discoverable", { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ discoverable: true }) });
  if (!Array.isArray(r.body) || r.body.length !== 1) throw new Error("listing " + u.tag + " failed (" + r.status + ")");
}
const near = (u, lat, lng, mi) => as(u, "/rest/v1/rpc/partners_near", { method: "POST", body: JSON.stringify({ p_lat: lat, p_lng: lng, p_radius_mi: mi, p_limit: 50 }) });
const ids = (r) => (Array.isArray(r.body) ? r.body.map((x) => x.id) : []);

async function main() {
  console.log("partners_near (0189) — five real accounts, anon key + each climber's own JWT\n");
  const cen = await api("/rest/v1/zip_centroids?zip=in.(98101,98052,99201)&select=zip,lat,lng", {}, anonKey());
  const C0 = Object.fromEntries((cen.body || []).map((r) => [r.zip, r]));
  if (!C0["98101"] || !C0["98052"] || !C0["99201"]) throw new Error("zip_centroids is not loaded — run scripts/oneoff/load-zip-centroids.mjs");
  ok("zip centroids are readable to a signed-out client (public Census data)");

  const A = await createUser("searcher"), B = await createUser("seattle"), C = await createUser("redmond"), D = await createUser("spokane"), E = await createUser("unlisted");
  const zips = [[A, "98101"], [B, "98101"], [C, "98052"], [D, "99201"], [E, "98101"]];
  for (const [u, z] of zips) { const r = await setZip(u, z); if (r.status >= 300) throw new Error("zip for " + u.tag + " refused (" + r.status + "): " + JSON.stringify(r.body)); }
  for (const u of [A, B, C, D]) await list(u);

  // ---- the zip is the owner's alone
  const own = await as(B, "/rest/v1/profile_zips?user_id=eq." + B.id + "&select=zip");
  check(Array.isArray(own.body) && own.body.length === 1 && own.body[0].zip === "98101", "an owner reads their own zip");
  const peek = await as(A, "/rest/v1/profile_zips?user_id=eq." + B.id + "&select=zip");
  check(Array.isArray(peek.body) && peek.body.length === 0, "another climber reads NOTHING of it", JSON.stringify(peek.body));
  const all = await as(A, "/rest/v1/profile_zips?select=user_id");
  check(Array.isArray(all.body) && all.body.every((r) => r.user_id === A.id), "a table-wide read returns only the caller's own row", JSON.stringify(all.body));
  const forge = await as(A, "/rest/v1/profile_zips", { method: "POST", body: JSON.stringify({ user_id: C.id, zip: "10001" }) });
  check(forge.status >= 400, "a climber cannot write somebody else's zip", "status " + forge.status);
  const unknown = await setZip(E, "00000");
  check(unknown.status >= 400 && unknown.body && unknown.body.code === "23503", "an unknown zip is refused by the foreign key (23503)", JSON.stringify(unknown.body));

  // ---- the search function
  const signedOut = await api("/rest/v1/rpc/partners_near", { method: "POST", body: JSON.stringify({ p_lat: 47.6, p_lng: -122.3, p_radius_mi: 50 }) }, anonKey());
  check(signedOut.status >= 400, "a signed-out caller is refused", "status " + signedOut.status);

  const s = C0["98101"];
  const r25 = await near(A, s.lat, s.lng, 25), got = ids(r25);
  check(r25.status < 300, "the search runs for a signed-in caller", JSON.stringify(r25.body));
  check(got.includes(B.id), "a listed climber in the same zip is returned");
  check(got.includes(C.id), "a listed climber a few miles away (Redmond) is returned");
  check(!got.includes(D.id), "a listed climber ~230 mi away (Spokane) is NOT returned within 25 mi");
  check(!got.includes(E.id), "an UNLISTED climber is never returned, even in the same zip");
  check(!got.includes(A.id), "the caller is never returned to themselves");
  const rows = Array.isArray(r25.body) ? r25.body.filter((x) => [B.id, C.id].includes(x.id)) : [];
  check(rows.length === 2 && rows.every((x) => !("zip" in x) && !("lat" in x) && !("lng" in x) && !("miles" in x)), "no zip, coordinate or exact distance is returned", JSON.stringify(rows.map((x) => Object.keys(x))));
  check(rows.every((x) => Number.isInteger(x.dist_mi) && x.dist_mi % 5 === 0 && x.dist_mi >= 5), "every distance is rounded up to a multiple of 5", JSON.stringify(rows.map((x) => x.dist_mi)));
  const bRow = rows.find((x) => x.id === B.id), cRow = rows.find((x) => x.id === C.id);
  check(bRow && bRow.dist_mi === 5, "same-zip distance reads as the 5-mile floor, not 0", bRow && bRow.dist_mi);
  check(bRow && cRow && got.indexOf(B.id) < got.indexOf(C.id), "results are nearest first");

  const r250 = await near(A, s.lat, s.lng, 250);
  check(ids(r250).includes(D.id), "a wider radius (250 mi) reaches Spokane — the radius really is what excluded it");

  // ---- the 10-mile floor. An origin ~4.8 mi north of B's centroid with a 1-mile radius: a
  // function honouring the 1 would return nobody; the floor widens it to 10 and B appears.
  const floor = await near(A, s.lat + 0.07, s.lng, 1);
  check(ids(floor).includes(B.id), "the 10-mile radius FLOOR holds (a 1-mile search is widened)", JSON.stringify(ids(floor)));

  // ---- a block hides the blocker from the blocked
  const blk = await as(B, "/rest/v1/blocked_users", { method: "POST", body: JSON.stringify({ blocker: B.id, blocked: A.id }) });
  if (blk.status >= 300) bad("B can block A", JSON.stringify(blk.body));
  const afterBlock = await near(A, s.lat, s.lng, 25);
  check(!ids(afterBlock).includes(B.id) && ids(afterBlock).includes(C.id), "a climber who blocked the caller is no longer returned (and others still are)", JSON.stringify(ids(afterBlock)));
}

try {
  await main();
} catch (e) {
  bad("probe crashed", e && e.message);
} finally {
  for (const u of made) await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc).catch(() => {});
  if (made.length) {
    const left = await api("/rest/v1/profile_zips?user_id=in.(" + made.map((u) => u.id).join(",") + ")&select=user_id", {}, svc);
    check(Array.isArray(left.body) && left.body.length === 0, "teardown: no fixture zip survives (deleted accounts cascade)", JSON.stringify(left.body));
  }
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exitCode = fail ? 1 : 0;
}
