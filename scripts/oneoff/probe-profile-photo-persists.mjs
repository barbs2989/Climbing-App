// A profile photo has to SURVIVE the tab that added it.
//
// Both profile-photo controls stored `URL.createObjectURL(file)` — an in-memory handle scoped
// to the tab that created it. The avatar PERSISTED it: measured on the live project,
// `profiles.avatar` held `blob:https://barbs2989.github.io/b1ac7240-…`, which resolves to
// nothing for the owner after a reload and to nothing for anyone else, always. The strip had it
// worse: no `photos` column existed (0173 adds one), so the value went to React state under a
// "Photo added ✓" toast and reached nobody.
//
// This walks the repaired path against LIVE storage — upload a real byte stream, read the URL
// back over plain HTTP as another climber's browser would, and write it to the column — because
// each of those three steps can fail while the two either side of it look fine.
//
//   node scripts/oneoff/probe-profile-photo-persists.mjs

import { requireServiceKey, SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const url = SUPABASE_URL, key = requireServiceKey();
const H = { apikey: key, Authorization: "Bearer " + key };
let bad = 0;
const fail = m => { console.log("  FAIL  " + m); bad++; };
const ok = m => console.log("  ok    " + m);

// ── 0. the column exists and cannot be null ──────────────────────────────────────────────
const cols = await (await fetch(url + "/rest/v1/profiles?select=*&limit=1", { headers: H })).json();
const shape = Object.keys(cols[0] || {});
if (!shape.includes("photos")) { console.log("FAIL — profiles has no `photos` column; 0173 has not been applied"); process.exit(1); }
ok("profiles.photos exists");

// ── 1. no blob: URL is left in the catalog ───────────────────────────────────────────────
const rows = await (await fetch(url + "/rest/v1/profiles?select=id,name,avatar,photos", { headers: H })).json();
const blobbed = rows.filter(r => typeof r.avatar === "string" && r.avatar.startsWith("blob:"));
const blobbedPhotos = rows.filter(r => (r.photos || []).some(p => typeof p === "string" && p.startsWith("blob:")));
if (blobbed.length) fail(blobbed.length + " profile(s) still store a blob: avatar — it resolves to nothing for everyone: "
  + blobbed.map(r => r.name || r.id).join(", "));
else ok("no profile stores a blob: avatar");
if (blobbedPhotos.length) fail(blobbedPhotos.length + " profile(s) store a blob: photo in the strip");
else ok("no profile stores a blob: strip photo");

// ── 2. an upload round-trips, and the URL is readable WITHOUT credentials ────────────────
// A 1x1 PNG, so this costs a few hundred bytes of the bucket rather than a real photo.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const probePath = "probe-profile-photo/" + Date.now() + "-pixel.png";
const up = await fetch(url + "/storage/v1/object/topo-photos/" + probePath, {
  method: "POST", headers: { ...H, "Content-Type": "image/png" }, body: PNG,
});
if (!up.ok) { fail("upload to topo-photos failed — " + up.status + " " + (await up.text()).slice(0, 160)); }
else {
  ok("uploaded a file to the topo-photos bucket");
  const publicUrl = url + "/storage/v1/object/public/topo-photos/" + probePath;
  // no apikey, no Authorization — exactly what another climber's <img> sends
  const back = await fetch(publicUrl);
  if (!back.ok) fail("the public URL is not readable without credentials (" + back.status + ") — another climber would see a broken image");
  else {
    const bytes = Buffer.from(await back.arrayBuffer());
    if (bytes.length !== PNG.length) fail("read back " + bytes.length + " bytes, uploaded " + PNG.length);
    else ok("the public URL returns the same bytes to an anonymous reader (" + bytes.length + " B)");
  }
  await fetch(url + "/storage/v1/object/topo-photos/" + probePath, { method: "DELETE", headers: H });
  ok("probe file removed");
}

// ── 3. the column round-trips an array ───────────────────────────────────────────────────
const me = rows.find(r => (r.name || "") === "Nate Barber") || rows[0];
if (!me) fail("no profile to test the column against");
else {
  const before = me.photos || [];
  const test = ["https://example.invalid/probe-" + Date.now() + ".jpg"];
  const w = await fetch(url + "/rest/v1/profiles?id=eq." + me.id, {
    method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ photos: test }),
  });
  const wrote = await w.json();
  if (!w.ok || !wrote.length) fail("PATCH profiles.photos matched nothing — " + w.status);
  else if (JSON.stringify(wrote[0].photos) !== JSON.stringify(test)) fail("column did not round-trip: " + JSON.stringify(wrote[0].photos));
  else ok("profiles.photos round-trips an array");
  // put it back exactly as it was — this is the user's own live row
  const r = await fetch(url + "/rest/v1/profiles?id=eq." + me.id, {
    method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ photos: before }),
  });
  const restored = await r.json();
  if (!r.ok || !restored.length || JSON.stringify(restored[0].photos) !== JSON.stringify(before)) {
    fail("COULD NOT RESTORE " + me.id + ".photos to " + JSON.stringify(before) + " — fix by hand");
  } else ok("restored the row to " + JSON.stringify(before));
}

console.log("\n" + (bad ? bad + " failure(s)" : "ok — a profile photo uploads, is readable by anyone, and persists in the column"));
process.exit(bad ? 1 : 0);
