/* DOES THE SERVER ACTUALLY REFUSE A CLIMBER WHO IS NOT AT THE BASE? (0188)
 *
 * The client samples GPS and refuses a weak fix before it calls anything, but a client check is
 * advice: a crafted request skips it. check_in_at_route_base() is the only write path and is meant
 * to re-apply the rules — this probe asks whether it does, as a REAL account, under RLS.
 *
 * The service key creates the throwaway account and nothing else. Every call under test uses the
 * anon key plus that climber's own JWT; a service-key probe would bypass RLS and report success
 * either way (0095's header records the trap).
 *
 * Fixtures are real catalog rows, and each case asserts the REASON, never just ok:false — a
 * function refusing everything passes every "must refuse" case, so the ACCEPT cases are the
 * non-vacuity half.
 *
 *   node scripts/oneoff/probe-base-checkin-rules-live.mjs
 */
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const SERVICE = requireServiceKey();
const ANON = anonKey();
const DOMAIN = "climbmatch-qa.invalid";

// A crag: its routes' base pins sit on the crag coordinate (measured, see 0188's header).
const CRAG = { id: "wa_corridor_traverse", lat: 47.84033, lng: -117.75534 };
// A peak whose route carries a Trailhead pin 1.5 km from the peak coordinate — inside the 5 km
// peak radius, so ONLY the trailhead rule can refuse a fix taken there.
const PEAK = { id: "wa_news_nw_corner", lat: 48.512935, lng: -120.655465, th: { lat: 48.5191, lng: -120.6742 } };

let bad = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL  " + m); };
const j = async (r) => { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } };
// Move a point `m` metres north.
const north = (p, m) => ({ lat: p.lat + m / 111320, lng: p.lng });
const now = () => new Date().toISOString();

let uid = null;
try {
  const stamp = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `ui-basecheckin-${stamp}@${DOMAIN}`;
  const password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const user = await j(await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Base Probe", terms_version: "2026-08-19" } }),
  }));
  if (!user || !user.id) { console.log("  FAIL  could not create the fixture account: " + JSON.stringify(user).slice(0, 300)); process.exit(1); }
  uid = user.id;
  const tok = await j(await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  }));
  if (!tok || !tok.access_token) { console.log("  FAIL  could not sign in as the fixture account"); process.exit(1); }
  const H = { apikey: ANON, Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" };
  const HA = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };

  const checkIn = async (route, p, acc = 8, fixedAt = now(), headers = H) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_in_at_route_base`, {
      method: "POST", headers,
      body: JSON.stringify({ p_route_id: route, p_lat: p.lat, p_lng: p.lng, p_accuracy_m: acc, p_samples: 4, p_fixed_at: fixedAt }),
    });
    return { status: r.status, body: await j(r) };
  };
  const expect = (label, res, reason) => {
    const b = res.body || {};
    if (reason === "ok" ? b.ok === true : b.ok === false && b.reason === reason) ok(`${label} → ${reason}${b.distance_m != null ? " (" + b.distance_m + " m)" : ""}`);
    else fail(`${label}: expected ${reason}, got HTTP ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
  };

  // ---- 0. signed out cannot check in at all
  const anonTry = await checkIn(CRAG.id, CRAG, 8, now(), HA);
  if (anonTry.status >= 400) ok(`signed-out call refused (HTTP ${anonTry.status})`);
  else fail("a signed-out call was accepted: " + JSON.stringify(anonTry.body));

  // ---- 1. ACCEPT: standing at the crag (non-vacuity — a function refusing everything fails here)
  expect("at the crag, 8 m accuracy", await checkIn(CRAG.id, north(CRAG, 40)), "ok");
  // ---- 2. too far: 2 km from the crag
  const far = await checkIn(CRAG.id, north(CRAG, 2000));
  expect("2 km from the crag", far, "too_far");
  if (far.body && far.body.radius_m === 500) ok("the refusal states the crag radius (500 m)"); else fail("radius_m was " + JSON.stringify(far.body && far.body.radius_m));
  // ---- 3. a fix too vague to place anyone at a cliff
  expect("120 m accuracy", await checkIn(CRAG.id, CRAG, 120), "accuracy");
  // ---- 4. a fix older than the queue allows, and one from the future
  expect("10-day-old fix", await checkIn(CRAG.id, CRAG, 8, new Date(Date.now() - 10 * 864e5).toISOString()), "stale");
  expect("fix from tomorrow", await checkIn(CRAG.id, CRAG, 8, new Date(Date.now() + 864e5).toISOString()), "stale");
  // ---- 5. at the trailhead, inside the peak's radius
  expect("at the trailhead 1.5 km below the peak", await checkIn(PEAK.id, PEAK.th, 8, new Date(Date.now() + 1000).toISOString()), "trailhead");
  // ---- 6. impossible travel: the crag check-in is "now"; the peak is ~220 km away, 60 s later
  expect("220 km in a minute", await checkIn(PEAK.id, north(PEAK, 300), 8, new Date(Date.now() + 60000).toISOString()), "travel");
  // ...and the same place two days later is fine (non-vacuity for the travel rule)
  expect("the same peak point, 2 days on", await checkIn(PEAK.id, north(PEAK, 300), 8, new Date(Date.now() - 2 * 864e5 + 60000).toISOString()), "ok");

  // ---- 7. the table has NO insert policy — the function is the only write path
  const direct = await fetch(`${SUPABASE_URL}/rest/v1/route_base_checkins`, {
    method: "POST", headers: H,
    body: JSON.stringify({ route_id: CRAG.id, user_id: uid, lat: 0, lng: 0, accuracy_m: 5, samples: 1, fixed_at: now() }),
  });
  if (direct.status >= 400) ok(`a direct INSERT into the table is refused (HTTP ${direct.status})`);
  else fail("a direct INSERT succeeded — the checks can be bypassed");

  // ---- 8. the read: unattributed, and "mine" only for me
  const read = async (headers) => j(await fetch(`${SUPABASE_URL}/rest/v1/rpc/route_base_checkin_points`, { method: "POST", headers, body: JSON.stringify({ p_route_id: CRAG.id }) }));
  const mineRows = await read(H);
  if (Array.isArray(mineRows) && mineRows.length === 1 && mineRows[0].mine === true) ok("my check-in reads back, flagged mine");
  else fail("read as me: " + JSON.stringify(mineRows).slice(0, 200));
  if (Array.isArray(mineRows) && mineRows[0] && !("user_id" in mineRows[0]) && !("updated_at" in mineRows[0])) ok("the read carries no identity and no time");
  else fail("the read leaks identity or time: " + JSON.stringify(mineRows).slice(0, 200));
  const anonRows = await read(HA);
  if (Array.isArray(anonRows) && anonRows.length === 1 && anonRows[0].mine !== true) ok("a signed-out reader sees the point, not as theirs");
  else fail("read as anon: " + JSON.stringify(anonRows).slice(0, 200));

  // ---- 9. withdraw: delete own
  const del = await fetch(`${SUPABASE_URL}/rest/v1/route_base_checkins?route_id=eq.${CRAG.id}&user_id=eq.${uid}`, { method: "DELETE", headers: { ...H, Prefer: "return=representation" } });
  const delRows = await j(del);
  if (Array.isArray(delRows) && delRows.length === 1) ok("a climber can withdraw their own check-in");
  else fail("withdraw: HTTP " + del.status + " " + JSON.stringify(delRows).slice(0, 200));
  const after = await read(H);
  if (Array.isArray(after) && after.length === 0) ok("...and it is gone from the read"); else fail("after withdraw: " + JSON.stringify(after));
} finally {
  if (uid) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
    console.log(r.ok ? "  (fixture account deleted; its check-ins cascade)" : "  WARNING: fixture account NOT deleted: " + uid);
  }
}
console.log(`\n${ran - bad}/${ran} passed`);
if (ran < 15) { console.log("FAIL: fewer assertions ran than written — this run proved less than it claims"); process.exit(1); }
process.exit(bad ? 1 : 0);
