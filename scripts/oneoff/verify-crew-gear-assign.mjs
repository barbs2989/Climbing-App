// VERIFY 0286 + 0287 + 0289 + 0290 AS TWO REAL CLIMBERS: a crewmate can mark you as bringing an item,
// your own next tap does not erase it, and (0290) only a confirmed member can be put down for an item,
// only for an item that is on the crew's list.
//
// THE BUG 0287 EXISTS FOR, run as a CONTROL first. 0209's set_my_crew_gear REPLACES your whole claim
// list with what your screen holds. Once 0286 let a crewmate write your row, a screen loaded before
// that write sent a list without it -- the assignment vanished with a 200. The control reproduces that
// through the old function; the next assertions prove the per-item path the app now uses keeps it.
//
// Every read and write goes through the anon key plus that climber's own JWT (an RLS decision is
// invisible to the service role). The service key creates the two accounts and nothing else.
//
// HAND-RUN, LOCAL ONLY, after 0290 is applied (against 0289 the 0290 assertions fail, and say so):
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
  // 0290: a claim needs its item on the crew's list, so A lists what this section claims.
  for (const it of ["Rope", "Stove", "Fuel"]) await rpc(a, "add_crew_gear_item", { p_crew_id: crewId, p_item: it });
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
  await rpc(a, "add_crew_gear_item", { p_crew_id: crewId, p_item: "One too many" });
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: hundred, p_extras: [] });
  const cap = await assign(a, crewId, B.id, "One too many", true);
  ok("a 101st claim is REFUSED", cap.status >= 400 && /too many/.test(cap.text), `${cap.status} ${cap.text.slice(0, 160)}`);
  const capSame = await assign(a, crewId, B.id, "Item 7", true);
  ok("...but re-claiming one already held at the cap is still a no-op", capSame.status < 300, `${capSame.status} ${capSame.text.slice(0, 160)}`);

  console.log("\n— a claim needs its item on the list (0290) —");
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: [], p_extras: [] });
  const unl = await assign(a, crewId, B.id, "Kayak", true);
  ok("claiming an item NOT on the crew's list is REFUSED", unl.status >= 400 && /not on this crew's gear list/.test(unl.text) && same((await row(a, crewId, B.id)).gear_claims, []), `${unl.status} ${unl.text.slice(0, 160)}`);
  const unlCaps = await assign(a, crewId, B.id, "ROPE", true);
  ok("...a listed item in other capitals is still on the list", unlCaps.status < 300 && same((await row(a, crewId, B.id)).gear_claims, ["ROPE"]), `${unlCaps.status} ${unlCaps.text.slice(0, 160)}`);
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: ["Kayak"], p_extras: [] });
  const unlOff = await assign(a, crewId, B.id, "Kayak", false);
  ok("...and a claim on an unlisted item can still be CLEARED", unlOff.status < 300 && same((await row(a, crewId, B.id)).gear_claims, []), `${unlOff.status} ${unlOff.text.slice(0, 160)}`);
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: [], p_extras: [] });

  console.log("\n— one item whatever its capitals (0289) —");
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: ["rope"], p_extras: [] });
  const c1 = await assign(a, crewId, B.id, "Rope", true);
  ok('claiming "Rope" for a member who holds "rope" is a no-op, not a second claim', c1.status < 300 && same((await row(a, crewId, B.id)).gear_claims, ["rope"]), `${c1.status} ${JSON.stringify(await row(a, crewId, B.id))}`);
  const c2 = await assign(a, crewId, B.id, "ROPE", false);
  ok('clearing "ROPE" clears the stored "rope"', c2.status < 300 && same((await row(a, crewId, B.id)).gear_claims, []), `${c2.status} ${JSON.stringify(await row(a, crewId, B.id))}`);

  console.log("\n— adding and removing items, one at a time (0289) —");
  await rpc(a, "set_my_crew_gear", { p_crew_id: crewId, p_claims: [], p_extras: [] });
  await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: [], p_extras: [] });
  const add1 = await rpc(a, "add_crew_gear_item", { p_crew_id: crewId, p_item: "Stove" });
  ok("A adds an item to the list", add1.status < 300 && same((await row(a, crewId, A.id)).gear_extras, ["Stove"]), `${add1.status} ${add1.text.slice(0, 160)}`);
  const add2 = await rpc(a, "add_crew_gear_item", { p_crew_id: crewId, p_item: "stove" });
  ok("...adding it again in other capitals is a no-op", add2.status < 300 && same((await row(a, crewId, A.id)).gear_extras, ["Stove"]), `${add2.status} ${JSON.stringify(await row(a, crewId, A.id))}`);
  const rmNot = await rpc(b, "remove_crew_gear_item", { p_crew_id: crewId, p_item: "Stove" });
  ok("B, who did not add it, cannot remove it", rmNot.status >= 400 && /only a climber who added/.test(rmNot.text) && same((await row(a, crewId, A.id)).gear_extras, ["Stove"]), `${rmNot.status} ${rmNot.text.slice(0, 160)}`);
  // B adds the same item too (a second copy), and both are claimed.
  await rpc(b, "add_crew_gear_item", { p_crew_id: crewId, p_item: "STOVE" });
  await assign(a, crewId, A.id, "Stove", true);
  await assign(a, crewId, B.id, "stove", true);
  const rm = await rpc(a, "remove_crew_gear_item", { p_crew_id: crewId, p_item: "stove" });
  ok("A removes the item", rm.status < 300, `${rm.status} ${rm.text.slice(0, 160)}`);
  const ra = await row(a, crewId, A.id), rb = await row(a, crewId, B.id);
  ok("...and it leaves A's list and A's claims", same(ra.gear_extras, []) && same(ra.gear_claims, []), JSON.stringify(ra));
  ok("...AND B's copy and B's claim -- so it cannot come back", same(rb.gear_extras, []) && same(rb.gear_claims, []), JSON.stringify(rb));

  console.log("\n— a PENDING member (asked to join, not yet confirmed) —");
  const mk = await a("crews", { method: "POST", body: JSON.stringify({ created_by: A.id, route_id: "wa_mount_baker_north_ridge" }) });
  if (mk.status >= 300 || !Array.isArray(mk.json) || !mk.json[0]) dead(`A could not create a crew (${mk.status}) ${mk.text.slice(0, 200)}`);
  reqCrewId = mk.json[0].id;
  await a("crew_members", { method: "POST", body: JSON.stringify({ crew_id: reqCrewId, user_id: A.id, status: "confirmed", invited_by: A.id }) });
  const ask = await b("crew_members", { method: "POST", body: JSON.stringify({ crew_id: reqCrewId, user_id: B.id, status: "pending", invited_by: B.id }) });
  if (ask.status >= 300) dead(`B could not ask to join (${ask.status}) ${ask.text.slice(0, 200)}`);
  // A pending member may add to the list (0289); 0290 needs the items listed before they are claimed.
  await rpc(b, "add_crew_gear_item", { p_crew_id: reqCrewId, p_item: "Rack" });
  await rpc(a, "add_crew_gear_item", { p_crew_id: reqCrewId, p_item: "Stove" });
  const p1 = await assign(b, reqCrewId, B.id, "Rack", true);
  ok("a pending member may claim for THEMSELVES (as set_my_crew_gear always let them)", p1.status < 300, `${p1.status} ${p1.text.slice(0, 200)}`);
  const p2 = await assign(b, reqCrewId, A.id, "Rope", true);
  ok("...but may NOT assign the organiser", p2.status >= 400 && /not in this crew/.test(p2.text), `${p2.status} ${p2.text.slice(0, 160)}`);
  ok("...and the organiser's row is untouched", !(await row(a, reqCrewId, A.id)).gear_claims?.includes("Rope"));
  const p3 = await assign(a, reqCrewId, B.id, "Stove", true);
  // 0290 turned this around: before it, the organiser could put a climber they had not let in down for gear.
  ok("the organiser may NOT put a pending requester down for gear (0290)", p3.status >= 400 && /not been confirmed/.test(p3.text) && same((await row(a, reqCrewId, B.id)).gear_claims, ["Rack"]), `${p3.status} ${p3.text.slice(0, 160)}`);

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
  const longAdd = await rpc(a, "add_crew_gear_item", { p_crew_id: crewId, p_item: "x".repeat(81) });
  ok("...and by add_crew_gear_item", longAdd.status >= 400 && /1-80 characters/.test(longAdd.text), `${longAdd.status} ${longAdd.text.slice(0, 160)}`);
  const outsiderAdd = await rpc(a, "add_crew_gear_item", { p_crew_id: "00000000-0000-4000-8000-000000000000", p_item: "Rope" });
  ok("adding to a crew you are not in is REFUSED", outsiderAdd.status >= 400 && /not in this crew/.test(outsiderAdd.text), `${outsiderAdd.status} ${outsiderAdd.text.slice(0, 160)}`);
  const ANON_ARGS = {
    assign_crew_gear: { p_crew_id: crewId, p_user_id: B.id, p_item: "Rope", p_on: true },
    set_my_crew_gear_extras: { p_crew_id: crewId, p_extras: [] },
    add_crew_gear_item: { p_crew_id: crewId, p_item: "Rope" },
    remove_crew_gear_item: { p_crew_id: crewId, p_item: "Rope" },
  };
  for (const fn of Object.keys(ANON_ARGS)) {
    const anonCall = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify(ANON_ARGS[fn]) });
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

if (ran < 36) { console.error(`only ${ran} assertions ran — this run proved less than it claims`); fail++; }
console.log(fail ? `\n${fail} problem(s).` : `\nok — 0286, 0287, 0289 and 0290 behave as the app assumes (${ran} assertions)`);
process.exit(fail ? 1 : 0);
