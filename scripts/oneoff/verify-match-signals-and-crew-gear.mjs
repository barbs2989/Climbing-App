// VERIFY 0209 AS TWO REAL CLIMBERS: availability + pace persist and reach a partner, and crew gear
// claims reach the crew -- including from a member who JOINED BY REQUEST.
//
// #1908 shipped the app side of 0209 on static guards and a schema read. Neither can see an RLS
// decision: the service role bypasses RLS, and a policy that refuses a write answers 200 with ZERO
// rows, not an error. So every read and write below goes through the anon key plus that climber's
// own JWT. The service key creates the two accounts (scripts/lib/ui-fixture.mjs) and nothing else.
//
// THE CASE THE DEFINER EXISTS FOR, run as a CONTROL first. crew_members' "member updates own
// membership" WITH CHECK requires status <> 'confirmed' OR invited_by = the organiser. A climber who
// asked to join seats themselves with invited_by = self; once the organiser confirms them, that
// policy refuses every update to their own row. The control proves the plain update really is
// refused for that climber (otherwise set_my_crew_gear would be defended against nothing), and the
// next assertion proves the definer gets through.
//
// HAND-RUN, LOCAL ONLY, like check:block-guarantees: it needs the service key to create accounts.
//   node scripts/oneoff/verify-match-signals-and-crew-gear.mjs
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

  // ---------------------------------------------------------------- 1. the profile signals
  console.log("\n— availability, week grid and pace persist (profiles, 0209) —");
  const SIG = { availability: ["weekends", "weekday_pm"], avail_week: ["sat_am", "sun_am", "wed_pm"], hiking_speed_ft_hr: 1200 };
  const put = await a(`profiles?id=eq.${A.id}`, { method: "PATCH", body: JSON.stringify(SIG) });
  ok("A saves availability, week grid and pace on their own row",
    put.status === 200 && Array.isArray(put.json) && put.json.length === 1, `${put.status} ${put.text.slice(0, 200)}`);
  const back = await a(`profiles?id=eq.${A.id}&select=availability,avail_week,hiking_speed_ft_hr`);
  const r0 = (back.json || [])[0] || {};
  ok("...and reads the same values back (what the sign-in hydration reads)",
    same(r0.availability, SIG.availability) && same(r0.avail_week, SIG.avail_week) && r0.hiking_speed_ft_hr === 1200,
    JSON.stringify(r0));

  const badAvail = await a(`profiles?id=eq.${A.id}`, { method: "PATCH", body: JSON.stringify({ availability: ["whenever"] }) });
  ok("an availability value outside the four options is REFUSED", badAvail.status >= 400, `${badAvail.status} ${badAvail.text.slice(0, 160)}`);
  const badPace = await a(`profiles?id=eq.${A.id}`, { method: "PATCH", body: JSON.stringify({ hiking_speed_ft_hr: 50 }) });
  ok("a pace below 100 ft/hr is REFUSED (the app clamps to 100–6000)", badPace.status >= 400, `${badPace.status} ${badPace.text.slice(0, 160)}`);

  const bSees = await b(`profiles?id=eq.${A.id}&select=id,availability,avail_week,hiking_speed_ft_hr`);
  const r1 = (bSees.json || [])[0] || {};
  ok("B reads A's availability and pace — the columns PARTNER_COLS adds for browse and search",
    same(r1.availability, SIG.availability) && r1.hiking_speed_ft_hr === 1200, `${bSees.status} ${JSON.stringify(r1)}`);

  // partners_near: give A a zip and search from its centre as B.
  const zc = await b("zip_centroids?zip=eq.98225&select=zip,lat,lng");
  const z = (zc.json || [])[0];
  if (!z) dead("zip 98225 is not in zip_centroids — the partners_near leg cannot run");
  const setZip = await a("profile_zips", { method: "POST", headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify({ user_id: A.id, zip: "98225" }) });
  if (setZip.status >= 300) dead(`A could not set a zip (${setZip.status}) ${setZip.text.slice(0, 160)}`);
  const near = await rpc(b, "partners_near", { p_lat: z.lat, p_lng: z.lng, p_radius_mi: 25, p_limit: 50 });
  const hit = Array.isArray(near.json) ? near.json.find((r) => r.id === A.id) : null;
  ok("CONTROL — partners_near finds A from A's own zip centre", !!hit, `${near.status} ${near.text.slice(0, 200)}`);
  ok("...and returns A's availability, week grid and pace with the row",
    !!hit && same(hit.availability, SIG.availability) && same(hit.avail_week, SIG.avail_week) && hit.hiking_speed_ft_hr === 1200,
    JSON.stringify(hit));

  // ---------------------------------------------------------------- 2. crew gear
  console.log("\n— crew gear claims reach the crew (set_my_crew_gear, 0209) —");
  const crewId = fx.crew.id;
  const g1 = await rpc(a, "set_my_crew_gear", { p_crew_id: crewId, p_claims: ["Rope", "Stove"], p_extras: ["Stove"] });
  ok("A (organiser, confirmed) records what they are bringing", g1.status < 300, `${g1.status} ${g1.text.slice(0, 200)}`);
  const g2 = await rpc(b, "set_my_crew_gear", { p_crew_id: crewId, p_claims: ["First aid kit"], p_extras: [] });
  ok("B (invited by the organiser, confirmed) records theirs", g2.status < 300, `${g2.status} ${g2.text.slice(0, 200)}`);
  const rows = await b(`crew_members?crew_id=eq.${crewId}&select=user_id,gear_claims,gear_extras`);
  const byU = Object.fromEntries((rows.json || []).map((r) => [r.user_id, r]));
  ok("B sees A's claims and added item — what the crew card unions",
    byU[A.id] && same(byU[A.id].gear_claims, ["Rope", "Stove"]) && same(byU[A.id].gear_extras, ["Stove"]), JSON.stringify(byU[A.id]));
  ok("...and A's call wrote ONLY A's row", byU[B.id] && same(byU[B.id].gear_claims, ["First aid kit"]), JSON.stringify(byU[B.id]));

  // A crew B joins BY REQUEST: B seats themselves pending with invited_by = self; A confirms.
  const mk = await a("crews", { method: "POST", body: JSON.stringify({ created_by: A.id, route_id: "wa_mount_baker_north_ridge" }) });
  if (mk.status >= 300 || !Array.isArray(mk.json) || !mk.json[0]) dead(`A could not create a crew (${mk.status}) ${mk.text.slice(0, 200)}`);
  reqCrewId = mk.json[0].id;
  await a("crew_members", { method: "POST", body: JSON.stringify({ crew_id: reqCrewId, user_id: A.id, status: "confirmed", invited_by: A.id }) });
  const ask = await b("crew_members", { method: "POST", body: JSON.stringify({ crew_id: reqCrewId, user_id: B.id, status: "pending", invited_by: B.id }) });
  if (ask.status >= 300) dead(`B could not ask to join (${ask.status}) ${ask.text.slice(0, 200)}`);
  const conf = await a(`crew_members?crew_id=eq.${reqCrewId}&user_id=eq.${B.id}`, { method: "PATCH", body: JSON.stringify({ status: "confirmed" }) });
  if (conf.status >= 300 || !(conf.json || []).length) dead(`A could not confirm B (${conf.status}) ${conf.text.slice(0, 200)}`);

  const plain = await b(`crew_members?crew_id=eq.${reqCrewId}&user_id=eq.${B.id}`, { method: "PATCH", body: JSON.stringify({ gear_claims: ["Rack"] }) });
  ok("CONTROL — a PLAIN update of their own row is refused for a request-joined member (why the definer exists)",
    plain.status >= 400 || (Array.isArray(plain.json) && plain.json.length === 0), `${plain.status} ${plain.text.slice(0, 200)}`);
  const viaFn = await rpc(b, "set_my_crew_gear", { p_crew_id: reqCrewId, p_claims: ["Rack"], p_extras: ["Rack"] });
  ok("...and set_my_crew_gear gets through for them", viaFn.status < 300, `${viaFn.status} ${viaFn.text.slice(0, 200)}`);
  const seen = await a(`crew_members?crew_id=eq.${reqCrewId}&user_id=eq.${B.id}&select=gear_claims,status,invited_by`);
  const s0 = (seen.json || [])[0] || {};
  ok("...and the organiser sees it, with status and invited_by untouched",
    same(s0.gear_claims, ["Rack"]) && s0.status === "confirmed" && s0.invited_by === B.id, JSON.stringify(s0));

  // Refusals.
  const outsider = await rpc(a, "set_my_crew_gear", { p_crew_id: "00000000-0000-4000-8000-000000000000", p_claims: ["Rope"], p_extras: [] });
  ok("a crew you are not in is REFUSED, not a silent no-op", outsider.status >= 400 && /not in this crew/.test(outsider.text), `${outsider.status} ${outsider.text.slice(0, 160)}`);
  const long = await rpc(a, "set_my_crew_gear", { p_crew_id: crewId, p_claims: ["x".repeat(81)], p_extras: [] });
  ok("an item over 80 characters is REFUSED", long.status >= 400, `${long.status} ${long.text.slice(0, 160)}`);
  const anonCall = await fetch(`${URL}/rest/v1/rpc/set_my_crew_gear`, { method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_crew_id: crewId, p_claims: [], p_extras: [] }) });
  ok("a signed-out caller cannot run it at all", anonCall.status >= 400, String(anonCall.status));
} catch (e) {
  console.error("\n" + (e && e.message || e));
  fail++;
} finally {
  if (reqCrewId) await as(await signIn(A))(`crews?id=eq.${reqCrewId}`, { method: "DELETE" }).catch(() => {});
  const left = await fx.cleanup();
  if (left.length) { console.log(`\nteardown could not remove: ${JSON.stringify(left)}`); fail++; }
  else console.log("\nteardown: both fixture accounts removed");
}

if (ran < 14) { console.error(`only ${ran} assertions ran — this run proved less than it claims`); fail++; }
console.log(fail ? `\n${fail} problem(s).` : `\nok — 0209 behaves as the app assumes (${ran} assertions)`);
process.exit(fail ? 1 : 0);
