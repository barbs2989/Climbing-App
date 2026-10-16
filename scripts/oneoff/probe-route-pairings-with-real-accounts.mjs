// "Pairs well with" (0223), put to the DATABASE with two real accounts rather than read off the policy.
//
// A pairing is a `contributions` row of kind 'pair'. The route page reads it from BOTH ends — rows
// filed on this route, and rows whose value->>'with' names it — and lets its author take it back.
// What this proves, with the anon key and each climber's own JWT (the service key only creates and
// removes the two accounts):
//
//   1. a signed-in climber can file a pairing, and it reads back from BOTH routes
//   2. a pairing cannot be filed in someone else's name (contributor is pinned to auth.uid())
//   3. a second climber cannot delete it — RLS refuses by matching zero rows, so the row must survive
//   4. its author can delete it
//   5. a signed-out insert is refused
//   6. the shape check refuses a self-pairing, and the unique index a duplicate
//   7. route_logged_with answers a signed-out caller (it reads only what that caller may see)
//
// Run: node scripts/oneoff/probe-route-pairings-with-real-accounts.mjs
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { createFixture } from "../lib/ui-fixture.mjs";

const URL = SUPABASE_URL;
const ANON = anonKey();
if (!URL || !ANON) { console.error("FAIL: no Supabase url/anon key — nothing was verified."); process.exit(1); }

let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`);
  if (!cond) fail++;
};
const dead = (m) => { throw new Error("nothing was verified: " + m); };

async function signIn(user) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.access_token) dead(`could not sign in as ${user.email} (${r.status})`);
  return body.access_token;
}
const as = (token) => async (path, init = {}) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON, Authorization: `Bearer ${token || ANON}`,
      "Content-Type": "application/json", Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: r.status, json, text };
};

const anon = as(null);
const pick = await anon("routes?select=id,name&area_id=like.wa_*&order=id&limit=2");
if (!Array.isArray(pick.json) || pick.json.length < 2) dead(`could not read two routes (${pick.status})`);
const [X, Y] = pick.json;

console.log("creating two real accounts (service key is used HERE and nowhere else)…");
const fx = await createFixture((m) => console.log(m));
const A = fx.owner, B = fx.mate;
const made = [];

try {
  const a = as(await signIn(A)), b = as(await signIn(B));
  console.log(`  A = ${A.email}\n  B = ${B.email}\n  pairing ${X.id}  <->  ${Y.id}\n`);

  const ins = await a("contributions", { method: "POST", body: JSON.stringify({
    route_id: X.id, kind: "pair", contributor: A.id, value: { with: Y.id, withName: Y.name, note: "probe" } }) });
  const row = Array.isArray(ins.json) && ins.json[0];
  ok("1. A files a pairing", ins.status === 201 && !!row, `${ins.status} ${ins.text.slice(0, 200)}`);
  if (!row) dead("the pairing was not filed, so nothing below can run");
  made.push(row.id);

  const fromX = await b(`contributions?select=id&kind=eq.pair&route_id=eq.${X.id}&id=eq.${row.id}`);
  const fromY = await b(`contributions?select=id&kind=eq.pair&value->>with=eq.${Y.id}&id=eq.${row.id}`);
  ok("1. ...and B reads it from the route it was filed on", fromX.json && fromX.json.length === 1, fromX.text.slice(0, 160));
  ok("1. ...and from the OTHER route (the value->>with read the page uses)", fromY.json && fromY.json.length === 1, fromY.text.slice(0, 160));

  const forge = await b("contributions", { method: "POST", body: JSON.stringify({
    route_id: Y.id, kind: "pair", contributor: A.id, value: { with: X.id } }) });
  ok("2. B cannot file a pairing in A's name", forge.status >= 400, `${forge.status} ${forge.text.slice(0, 160)}`);
  if (forge.status < 300 && Array.isArray(forge.json) && forge.json[0]) made.push(forge.json[0].id);

  const bDel = await b(`contributions?id=eq.${row.id}`, { method: "DELETE" });
  const still = await anon(`contributions?select=id&id=eq.${row.id}`);
  ok("3. B's delete of A's pairing matches nothing", Array.isArray(bDel.json) && bDel.json.length === 0, `${bDel.status} ${bDel.text.slice(0, 160)}`);
  ok("3. ...and the row survives", still.json && still.json.length === 1, still.text.slice(0, 160));

  const self = await a("contributions", { method: "POST", body: JSON.stringify({
    route_id: X.id, kind: "pair", contributor: A.id, value: { with: X.id } }) });
  ok("6. a pairing of a route with itself is refused", self.status >= 400, `${self.status} ${self.text.slice(0, 160)}`);
  const dup = await a("contributions", { method: "POST", body: JSON.stringify({
    route_id: X.id, kind: "pair", contributor: A.id, value: { with: Y.id } }) });
  ok("6. the same climber cannot file the same pairing twice", dup.status === 409, `${dup.status} ${dup.text.slice(0, 160)}`);
  if (dup.status < 300 && Array.isArray(dup.json) && dup.json[0]) made.push(dup.json[0].id);

  const aDel = await a(`contributions?id=eq.${row.id}`, { method: "DELETE" });
  ok("4. A deletes their own pairing", Array.isArray(aDel.json) && aDel.json.length === 1, `${aDel.status} ${aDel.text.slice(0, 160)}`);
  if (Array.isArray(aDel.json) && aDel.json.length === 1) made.splice(made.indexOf(row.id), 1);

  const anonIns = await anon("contributions", { method: "POST", body: JSON.stringify({
    route_id: X.id, kind: "pair", value: { with: Y.id } }) });
  ok("5. a signed-out insert is refused", anonIns.status >= 400, `${anonIns.status} ${anonIns.text.slice(0, 160)}`);

  const lw = await anon("rpc/route_logged_with", { method: "POST", body: JSON.stringify({ p_route_id: X.id }) });
  ok("7. route_logged_with answers a signed-out caller", lw.status === 200 && Array.isArray(lw.json), `${lw.status} ${lw.text.slice(0, 160)}`);
} catch (e) {
  console.error("\nFAIL (" + (e && e.message ? e.message : e) + ")");
  fail++;
} finally {
  for (const id of made) {
    try { const t = await signIn(A); await as(t)(`contributions?id=eq.${id}`, { method: "DELETE" }); } catch {}
  }
  const left = await fx.cleanup();
  if (Array.isArray(left) && left.length) { console.log(`\nteardown could not remove: ${JSON.stringify(left)}`); fail++; }
}

console.log(fail ? `\n${fail} failure(s).` : "\nroute pairings: every guarantee holds with two real accounts.");
process.exit(fail ? 1 : 0);
