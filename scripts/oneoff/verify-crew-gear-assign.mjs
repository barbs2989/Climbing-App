// VERIFY 0286 + 0287 AS TWO REAL CLIMBERS: a crewmate can mark you as bringing an item, and your own
// next tap does not erase it.
//
// THE BUG 0287 EXISTS FOR, run as a CONTROL first. 0209's set_my_crew_gear REPLACES your whole claim
// list with what your screen holds. Once 0286 let a crewmate write your row, a screen loaded before
// that write sent a list without it -- the assignment vanished with a 200. The control reproduces that
// through the old function; the next assertions prove the per-item path the app now uses keeps it.
//
// Every read and write goes through the anon key plus that climber's own JWT (an RLS decision is
// invisible to the service role). The service key creates the two accounts and nothing else.
//
// HAND-RUN, LOCAL ONLY, after 0287 is applied:
//   node scripts/oneoff/verify-crew-gear-assign.mjs
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { createFixture } from "../lib/ui-fixture.mjs";

const URL = SUPABASE_URL;
const ANON = anonKey();
if (!URL || !ANON) { console.error("FAIL: no Supabase url/anon key — nothing was verified."); process.exit(1); }

let fail = 0, ran = 0;
const ok = (label, cond, detail) => {
  ran++;
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
      apikey: ANON, Authorization: `Bearer ${token}`,
      "Content-Type": "application/json", Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: r.status, json, text };
};
const rpc = (c, fn, args) => c(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
const same = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

console.log("creating two real accounts (service key is used HERE and nowhere else)…");
const fx = await createFixture((m) => console.log(m));
const A = fx.owner, B = fx.mate;
let reqCrewId = null;

try {
  const a = as(await signIn(A)), b = as(await signIn(B));
  const crewId = fx.crew.id;
  const row = async (c, crew, uid) => ((await c(`crew_members?crew_id=eq.${crew}&user_id=eq.${uid}&select=gear_claims,gear_extras,status`)).json || [])[0] || {};
  const assign = (c, crew, uid, item, on) => rpc(c, "assign_crew_gear", { p_crew_id: crew, p_user_id: uid, p_item: item, p_on: on });

  console.log("\n— the clobber 0287 removes —");
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: [], p_extras: [] });
  const s1 = await assign(a, crewId, B.id, "Rope", true);
  ok("A marks B as bringing the rope (0286)", s1.status < 300, `${s1.status} ${s1.text.slice(0, 200)}`);
  ok("...and B's row holds it", same((await row(b, crewId, B.id)).gear_claims, ["Rope"]));
  // B's screen loaded before A's write: it holds no claims, and B taps "I'll bring it" on Stove.
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: ["Stove"], p_extras: [] });
  ok("CONTROL — the OLD whole-list write erases A's assignment (the bug)", same((await row(b, crewId, B.id)).gear_claims, ["Stove"]));

  await assign(a, crewId, B.id, "Rope", true);
  const s2 = await assign(b, crewId, B.id, "Fuel", true);
  ok("B claims an item for themselves through assign_crew_gear (what the app now sends)", s2.status < 300, `${s2.status} ${s2.text.slice(0, 200)}`);
  ok("...and A's assignment SURVIVES it", same((await row(b, crewId, B.id)).gear_claims, ["Stove", "Rope", "Fuel"]), JSON.stringify(await row(b, crewId, B.id)));
  const s3 = await rpc(b, "set_my_crew_gear_extras", { p_crew_id: crewId, p_extras: ["Fuel"] });
  ok("B records an item they added (set_my_crew_gear_extras)", s3.status < 300, `${s3.status} ${s3.text.slice(0, 200)}`);
  const r3 = await row(a, crewId, B.id);
  ok("...which writes the extras and leaves every claim alone", same(r3.gear_extras, ["Fuel"]) && same(r3.gear_claims, ["Stove", "Rope", "Fuel"]), JSON.stringify(r3));
  const s4 = await assign(b, crewId, B.id, "Stove", false);
  ok("B clears their own claim on one item", s4.status < 300 && same((await row(a, crewId, B.id)).gear_claims, ["Rope", "Fuel"]), `${s4.status} ${s4.text.slice(0, 160)}`);
  const s5 = await assign(a, crewId, B.id, "Rope", true);
  ok("assigning an item twice is a no-op, not an error or a duplicate", s5.status < 300 && same((await row(a, crewId, B.id)).gear_claims, ["Rope", "Fuel"]), `${s5.status} ${s5.text.slice(0, 160)}`);

  console.log("\n— the cap raises (0287), not a silent 200 —");
  const hundred = Array.from({ length: 100 }, (_, i) => "Item " + i);
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: hundred, p_extras: [] });
  const cap = await assign(a, crewId, B.id, "One too many", true);
  ok("a 101st claim is REFUSED", cap.status >= 400 && /too many/.test(cap.text), `${cap.status} ${cap.text.slice(0, 160)}`);
  const capSame = await assign(a, crewId, B.id, "Item 7", true);
  ok("...but re-claiming one already held at the cap is still a no-op", capSame.status < 300, `${capSame.status} ${capSame.text.slice(0, 160)}`);
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: [], p_extras: [] });

  console.log("\n— a PENDING member (asked to join, not yet confirmed) —");
  const mk = await a("crews", { method: "POST", body: JSON.stringify({ created_by: A.id, route_id: "wa_mount_baker_north_ridge" }) });
  if (mk.status >= 300 || !Array.isArray(mk.json) || !mk.json[0]) dead(`A could not create a crew (${mk.status}) ${mk.text.slice(0, 200)}`);
  reqCrewId = mk.json[0].id;
  await a("crew_members", { method: "POST", body: JSON.stringify({ crew_id: reqCrewId, user_id: A.id, status: "confirmed", invited_by: A.id }) });
  const ask = await b("crew_members", { method: "POST", body: JSON.stringify({ crew_id: reqCrewId, user_id: B.id, status: "pending", invited_by: B.id }) });
  if (ask.status >= 300) dead(`B could not ask to join (${ask.status}) ${ask.text.slice(0, 200)}`);
  const p1 = await assign(b, reqCrewId, B.id, "Rack", true);
  ok("a pending member may claim for THEMSELVES (as set_my_crew_gear always let them)", p1.status < 300, `${p1.status} ${p1.text.slice(0, 200)}`);
  const p2 = await assign(b, reqCrewId, A.id, "Rope", true);
  ok("...but may NOT assign the organiser", p2.status >= 400 && /not in this crew/.test(p2.text), `${p2.status} ${p2.text.slice(0, 160)}`);
  ok("...and the organiser's row is untouched", !(await row(a, reqCrewId, A.id)).gear_claims?.includes("Rope"));
  const p3 = await assign(a, reqCrewId, B.id, "Stove", true);
  ok("the confirmed organiser may assign the pending member", p3.status < 300 && same((await row(a, reqCrewId, B.id)).gear_claims, ["Rack", "Stove"]), `${p3.status} ${p3.text.slice(0, 160)}`);

  console.log("\n— refusals —");
  const outsider = await assign(a, "00000000-0000-4000-8000-000000000000", B.id, "Rope", true);
  ok("a crew you are not in is REFUSED", outsider.status >= 400 && /not in this crew/.test(outsider.text), `${outsider.status} ${outsider.text.slice(0, 160)}`);
  const stranger = await assign(a, crewId, "00000000-0000-4000-8000-000000000001", "Rope", true);
  ok("a climber who is not in the crew cannot be assigned", stranger.status >= 400 && /not in this crew/.test(stranger.text), `${stranger.status} ${stranger.text.slice(0, 160)}`);
  const long = await assign(a, crewId, B.id, "x".repeat(81), true);
  // Match the function's OWN message: a missing function is a 404 too, and once passed this vacuously.
  ok("an item over 80 characters is REFUSED", long.status >= 400 && /1-80 characters/.test(long.text), `${long.status} ${long.text.slice(0, 160)}`);
  const longEx = await rpc(b, "set_my_crew_gear_extras", { p_crew_id: crewId, p_extras: ["x".repeat(81)] });
  ok("...by the extras write too", longEx.status >= 400 && /1-80 characters/.test(longEx.text), `${longEx.status} ${longEx.text.slice(0, 160)}`);
  for (const fn of ["assign_crew_gear", "set_my_crew_gear_extras"]) {
    const anonCall = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify(fn === "assign_crew_gear" ? { p_crew_id: crewId, p_user_id: B.id, p_item: "Rope", p_on: true } : { p_crew_id: crewId, p_extras: [] }) });
    const anonText = await anonCall.text();
    // PGRST202 is "no such function": a refusal of nothing, so it does not count.
    ok(`a signed-out caller cannot run ${fn}`, anonCall.status >= 400 && !/PGRST202/.test(anonText), `${anonCall.status} ${anonText.slice(0, 160)}`);
  }
} catch (e) {
  console.error("\n" + (e && e.message || e));
  fail++;
} finally {
  if (reqCrewId) await as(await signIn(A))(`crews?id=eq.${reqCrewId}`, { method: "DELETE" }).catch(() => {});
  const left = await fx.cleanup();
  if (left.length) { console.log(`\nteardown could not remove: ${JSON.stringify(left)}`); fail++; }
  else console.log("\nteardown: both fixture accounts removed");
}

if (ran < 21) { console.error(`only ${ran} assertions ran — this run proved less than it claims`); fail++; }
console.log(fail ? `\n${fail} problem(s).` : `\nok — 0286 + 0287 behave as the app assumes (${ran} assertions)`);
process.exit(fail ? 1 : 0);
