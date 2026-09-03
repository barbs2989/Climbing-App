// Does another climber actually SEE your photo strip, and does the opt-out actually hide it?
//
// 0173 gave the strip a column; it was still owner-only, because every query that builds
// another climber's object selects a thin column list. 0174 adds `photos_public` and the app
// fetches the viewed climber's row on demand.
//
// Two halves, and both need proving against the live database rather than the source:
//   1. the READ another climber's browser performs — the ANON key, which is what the app ships
//      — returns the photos and the flag;
//   2. the app's own gate (`photos_public===false` hides, anything else shows) produces the
//      right answer for all three states, including the one an older row gives.
//
//   node scripts/oneoff/probe-profile-photos-visible-to-others.mjs

import { requireServiceKey, SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const url = SUPABASE_URL, svc = requireServiceKey(), anon = anonKey();
const SVC = { apikey: svc, Authorization: "Bearer " + svc, "Content-Type": "application/json" };
const ANON = { apikey: anon, Authorization: "Bearer " + anon };
let bad = 0;
const fail = m => { console.log("  FAIL  " + m); bad++; };
const ok = m => console.log("  ok    " + m);

const rows = await (await fetch(url + "/rest/v1/profiles?select=id,name,photos,photos_public", { headers: SVC })).json();
if (!Array.isArray(rows) || !rows.length) { console.log("read 0 profiles — refusing to conclude anything"); process.exit(1); }
const me = rows.find(r => (r.name || "") === "Nate Barber") || rows[0];
console.log("testing against " + (me.name || me.id));
const before = { photos: me.photos || [], photos_public: me.photos_public };

// ── 1. can an ANON reader — which is what every other climber's browser is — see them? ────
const probe = ["https://example.invalid/probe-strip-" + Date.now() + ".jpg"];
await fetch(url + "/rest/v1/profiles?id=eq." + me.id, {
  method: "PATCH", headers: SVC, body: JSON.stringify({ photos: probe, photos_public: true }),
});
const seen = await (await fetch(url + "/rest/v1/profiles?select=id,photos,photos_public&id=eq." + me.id, { headers: ANON })).json();
if (!Array.isArray(seen) || !seen.length) fail("an anon reader cannot read this profile at all");
else if (JSON.stringify(seen[0].photos) !== JSON.stringify(probe)) fail("anon read did not return the photos: " + JSON.stringify(seen[0].photos));
else ok("an anon reader (another climber's browser) receives the photos array");
if (seen.length && seen[0].photos_public !== true) fail("anon read did not return photos_public");
else if (seen.length) ok("...and the visibility flag alongside it");

// ── 2. the app's gate, over all three states it can meet ─────────────────────────────────
// lifted from ClimbMatch.jsx: hide only on an explicit false, so a row that has not loaded —
// or an older row from before 0174 — shows rather than hiding one the owner never hid.
const gate = d => (!d ? null : d.photos_public === false ? null : (d.photos && d.photos.length ? d.photos : null));
const cases = [
  ["opted in (true)", { photos: probe, photos_public: true }, true],
  ["opted OUT (false)", { photos: probe, photos_public: false }, false],
  ["flag absent (a pre-0174 row)", { photos: probe }, true],
  ["public but no photos", { photos: [], photos_public: true }, false],
  ["row not loaded yet", null, false],
];
for (const [label, d, shouldShow] of cases) {
  const got = !!gate(d);
  if (got === shouldShow) ok("gate: " + label + " -> " + (got ? "shown" : "hidden"));
  else fail("gate: " + label + " -> " + (got ? "shown" : "hidden") + ", expected " + (shouldShow ? "shown" : "hidden"));
}

// ── 3. the opt-out round-trips through the column ────────────────────────────────────────
const off = await (await fetch(url + "/rest/v1/profiles?id=eq." + me.id, {
  method: "PATCH", headers: { ...SVC, Prefer: "return=representation" }, body: JSON.stringify({ photos_public: false }),
})).json();
if (!off.length || off[0].photos_public !== false) fail("could not store photos_public=false");
else ok("photos_public round-trips false");

// ── restore, and prove it ────────────────────────────────────────────────────────────────
const back = await (await fetch(url + "/rest/v1/profiles?id=eq." + me.id, {
  method: "PATCH", headers: { ...SVC, Prefer: "return=representation" }, body: JSON.stringify(before),
})).json();
if (!back.length || JSON.stringify(back[0].photos) !== JSON.stringify(before.photos) || back[0].photos_public !== before.photos_public) {
  fail("COULD NOT RESTORE " + me.id + " to " + JSON.stringify(before) + " — fix by hand");
} else ok("restored the row to " + JSON.stringify(before));

console.log("\n" + (bad ? bad + " failure(s)" : "ok — another climber receives the photos, and the opt-out hides the strip"));
process.exit(bad ? 1 : 0);
