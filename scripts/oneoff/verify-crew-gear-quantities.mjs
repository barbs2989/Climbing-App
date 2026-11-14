// VERIFY 0328 AS TWO REAL CLIMBERS: an item on the crew's gear list can carry how many the crew wants,
// each bringer how many they bring, and removing the item clears both, so a re-added item starts clean.
// Every read and write goes through the anon key plus that climber's own JWT; the service key creates
// the two accounts (createFixture) and nothing else.
//
// HAND-RUN, LOCAL ONLY, after 0328 is applied:
//   node scripts/oneoff/verify-crew-gear-quantities.mjs
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
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) },
  });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { status: r.status, json, text };
};
const rpc = (c, fn, args) => c(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });

console.log("creating two real accounts (service key is used HERE and nowhere else)…");
const fx = await createFixture((m) => console.log(m));
const A = fx.owner, B = fx.mate;

try {
  const a = as(await signIn(A)), b = as(await signIn(B));
  const crewId = fx.crew.id;
  const row = async (c, uid) => ((await c(`crew_members?crew_id=eq.${crewId}&user_id=eq.${uid}&select=gear_claims,gear_extras,gear_counts,gear_wanted`)).json || [])[0] || {};

  const add = await rpc(a, "add_crew_gear_item", { p_crew_id: crewId, p_item: "Quickdraws" });
  ok("A adds Quickdraws", add.status < 300, add.text.slice(0, 160));
  const w = await rpc(b, "set_crew_gear_wanted", { p_crew_id: crewId, p_item: "quickdraws", p_count: 12 });
  ok("B (confirmed) sets 12 wanted, in other capitals", w.status < 300, w.text.slice(0, 160));
  ok("...stored on A's row, the row that added it", (await row(a, A.id)).gear_wanted?.quickdraws === 12, JSON.stringify(await row(a, A.id)));

  await rpc(a, "assign_crew_gear", { p_crew_id: crewId, p_user_id: A.id, p_item: "Quickdraws", p_on: true });
  await rpc(a, "assign_crew_gear", { p_crew_id: crewId, p_user_id: B.id, p_item: "Quickdraws", p_on: true });
  const c1 = await rpc(a, "set_crew_gear_count", { p_crew_id: crewId, p_user_id: A.id, p_item: "Quickdraws", p_count: 6 });
  const c2 = await rpc(a, "set_crew_gear_count", { p_crew_id: crewId, p_user_id: B.id, p_item: "Quickdraws", p_count: 6 });
  ok("A sets their own count to 6, and B's to 6 — two climbers share one item", c1.status < 300 && c2.status < 300, c1.text + c2.text);
  ok("...both counts are stored", (await row(a, A.id)).gear_counts?.quickdraws === 6 && (await row(b, B.id)).gear_counts?.quickdraws === 6);
  const one = await rpc(b, "set_crew_gear_count", { p_crew_id: crewId, p_user_id: B.id, p_item: "Quickdraws", p_count: 1 });
  ok("a count of one clears the key (one is the default)", one.status < 300 && !("quickdraws" in ((await row(b, B.id)).gear_counts || {})), one.text.slice(0, 160));

  const big = await rpc(a, "set_crew_gear_count", { p_crew_id: crewId, p_user_id: A.id, p_item: "Quickdraws", p_count: 1000 });
  ok("a count over 999 is REFUSED", big.status >= 400 && /0-999/.test(big.text), `${big.status} ${big.text.slice(0, 160)}`);
  const off = await rpc(a, "set_crew_gear_count", { p_crew_id: crewId, p_user_id: A.id, p_item: "Not listed", p_count: 3 });
  ok("a count on an item not on the list is REFUSED", off.status >= 400 && /not on this crew/.test(off.text), `${off.status} ${off.text.slice(0, 160)}`);
  const offW = await rpc(a, "set_crew_gear_wanted", { p_crew_id: crewId, p_item: "Not listed", p_count: 3 });
  ok("...and so is a wanted number", offW.status >= 400 && /not on this crew/.test(offW.text), `${offW.status} ${offW.text.slice(0, 160)}`);
  const outsider = await rpc(a, "set_crew_gear_wanted", { p_crew_id: "00000000-0000-4000-8000-000000000000", p_item: "Quickdraws", p_count: 3 });
  ok("a crew you are not in is REFUSED", outsider.status >= 400 && /not in this crew/.test(outsider.text), `${outsider.status} ${outsider.text.slice(0, 160)}`);

  const rm = await rpc(a, "remove_crew_gear_item", { p_crew_id: crewId, p_item: "QUICKDRAWS" });
  ok("A removes the item", rm.status < 300, rm.text.slice(0, 160));
  const ra = await row(a, A.id);
  ok("...its wanted number and A's count go with it", !("quickdraws" in (ra.gear_wanted || {})) && !("quickdraws" in (ra.gear_counts || {})), JSON.stringify(ra));

  for (const [fn, args] of [["set_crew_gear_count", { p_crew_id: crewId, p_user_id: B.id, p_item: "Rope", p_count: 2 }], ["set_crew_gear_wanted", { p_crew_id: crewId, p_item: "Rope", p_count: 2 }]]) {
    const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const t = await r.text();
    ok(`a signed-out caller cannot run ${fn}`, r.status >= 400 && !/PGRST202/.test(t), `${r.status} ${t.slice(0, 160)}`);
  }
} catch (e) {
  console.error("\n" + (e && e.message || e));
  fail++;
} finally {
  const left = await fx.cleanup();
  if (left.length) { console.log(`\nteardown could not remove: ${JSON.stringify(left)}`); fail++; }
  else console.log("\nteardown: both fixture accounts removed");
}

if (ran < 14) { console.error(`only ${ran} assertions ran — this run proved less than it claims`); fail++; }
console.log(fail ? `\n${fail} problem(s).` : `\nok — 0328 behaves as the app assumes (${ran} assertions)`);
process.exit(fail ? 1 : 0);
