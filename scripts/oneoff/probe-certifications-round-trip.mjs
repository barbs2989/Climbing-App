/* CAN A REAL CLIMBER ACTUALLY KEEP THEIR CERTIFICATIONS? (0181)
 *
 * The columns existing proves nothing about whether a climber can write them: an RLS policy is
 * evaluated as the CALLING role, and the service key bypasses RLS entirely, so a service-key
 * probe reports success either way -- 0095's own header records exactly that trap.
 *
 * So this creates a throwaway account with the service key, then does every read and write under
 * THAT ACCOUNT'S OWN JWT with the anon key, which is the question. It writes what saveEdit now
 * sends, reads it back the way getProfile does, and clears it the way removing your last
 * certification does.
 *
 *   node scripts/oneoff/probe-certifications-round-trip.mjs
 */
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const SERVICE = requireServiceKey();
const ANON = anonKey();
const DOMAIN = "climbmatch-qa.invalid";

let bad = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL  " + m); };

const j = async (r) => { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } };

let uid = null;
try {
  // ---- create a throwaway account (service key -- account creation only)
  const stamp = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `ui-certs-${stamp}@${DOMAIN}`;
  const password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const mk = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Certs Probe", terms_version: "2026-08-19" } }),
  });
  const user = await j(mk);
  if (!user || !user.id) { console.log("  FAIL  could not create the fixture account: " + JSON.stringify(user).slice(0, 300)); process.exit(1); }
  uid = user.id;
  ok(`fixture account created (${uid.slice(0, 8)}…)`);

  // ---- sign in AS THEM. Everything below uses this JWT, never the service key.
  const tok = await j(await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
  if (!tok || !tok.access_token) { console.log("  FAIL  could not sign in as the fixture account"); process.exit(1); }
  const H = { apikey: ANON, Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" };
  ok("signed in as that account with the ANON key — RLS is live for everything below");

  const CERTS = ["Belay certified", "AIARE 1", "WFR"];
  const SKILLS = ["Sport lead", "Gym-to-crag transition"];

  // ---- 1. THE WRITE saveEdit NOW SENDS.
  const w = await fetch(`${SUPABASE_URL}/profiles?id=eq.${uid}`.replace("/profiles", "/rest/v1/profiles"), {
    method: "PATCH", headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ certifications: CERTS, skills: SKILLS }),
  });
  const wrote = await j(w);
  if (w.status === 200 && Array.isArray(wrote) && wrote.length === 1) ok(`the climber's OWN update was accepted (${w.status}, 1 row)`);
  else fail(`the update returned ${w.status} with ${Array.isArray(wrote) ? wrote.length : "?"} row(s) — RLS refused, or matched nothing: ${JSON.stringify(wrote).slice(0, 200)}`);

  // ---- 2. READ IT BACK the way getProfile does (select *), as them.
  const back = await j(await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=*`, { headers: H }));
  const row = Array.isArray(back) ? back[0] : null;
  if (!row) fail("could not read the row back");
  else {
    if (JSON.stringify(row.certifications) === JSON.stringify(CERTS)) ok(`certifications survived the round trip: ${JSON.stringify(row.certifications)}`);
    else fail(`certifications came back as ${JSON.stringify(row.certifications)}, expected ${JSON.stringify(CERTS)}`);
    if (JSON.stringify(row.skills) === JSON.stringify(SKILLS)) ok(`skills survived the round trip: ${JSON.stringify(row.skills)}`);
    else fail(`skills came back as ${JSON.stringify(row.skills)}, expected ${JSON.stringify(SKILLS)}`);
  }

  // ---- 3. REMOVING YOUR LAST CERTIFICATION MUST STICK. This is why saveEdit sends `||[]`
  // rather than omitting the key: an omitted key leaves the stored value standing, so the
  // deletion would be silently ignored and the cert would reappear on the next load.
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
    method: "PATCH", headers: H, body: JSON.stringify({ certifications: [], skills: [] }),
  });
  const cleared = await j(await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=certifications,skills`, { headers: H }));
  const c0 = Array.isArray(cleared) ? cleared[0] : null;
  if (c0 && Array.isArray(c0.certifications) && c0.certifications.length === 0) ok("clearing the last certification sticks (empty array stored, not ignored)");
  else fail(`clearing did not stick: ${JSON.stringify(c0)}`);

  // ---- 4. A DEFAULT WOULD HAVE BEEN A CLAIM. An untouched account must read NULL, not [] --
  // "nobody has been asked" rather than "this climber has none".
  const mk2 = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: `ui-certs2-${stamp}@${DOMAIN}`, password, email_confirm: true, user_metadata: { name: "Certs Probe 2", terms_version: "2026-08-19" } }),
  });
  const u2 = await j(mk2);
  if (u2 && u2.id) {
    const fresh = await j(await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u2.id}&select=certifications,skills`, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    }));
    const f0 = Array.isArray(fresh) ? fresh[0] : null;
    if (f0 && f0.certifications === null && f0.skills === null) ok("a brand-new account reads NULL on both — no default was invented for it");
    else fail(`a new account reads ${JSON.stringify(f0)} — expected null/null`);
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u2.id}`, { method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  }
} finally {
  if (uid) {
    const d = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
    console.log(`  teardown: removed the fixture account (${d.status})`);
  }
}

console.log("");
console.log(bad ? `${bad} problem(s) across ${ran} assertions.` : `ok — a real climber's certifications and skills survive a reload (${ran} assertions)`);
process.exit(bad ? 1 : 0);
