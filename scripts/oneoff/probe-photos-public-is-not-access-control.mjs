// Is "Your photos are hidden from other climbers" true?
//
// 0174 adds `profiles.photos_public` and is explicit in its own header that the column is
// SURFACING ONLY, not access control: `profiles` is publicly readable by policy (0009 `using
// (true)`, narrowed by 0095 only to hide blocked users), so the `photos` array is readable by
// anyone holding the anon key whatever the toggle says. The migration even says the scope is
// "worth stating in the settings copy too, so nobody reads the toggle as a promise the schema
// cannot keep."
//
// The settings copy reads: "Your photos are hidden from other climbers."
//
// This asks the database, with the ANON key — the key that ships in the bundle — whether that is
// true. It is the same question the packet's F10 asks of PRIVACY_CONTROLS_LIVE, on a surface that
// did not exist when the packet was last verified.
//
// READ-ONLY. It writes nothing and creates no account.
import { SUPABASE_URL, anonKey, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const anon = anonKey();
const svc = requireServiceKey();

async function get(url, key) {
  const r = await fetch(url, { headers: headers(key) });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}

// 1. What does the column look like, and does anything populate `photos`?
const all = await get(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,photos,photos_public`, svc);
if (all.status !== 200 || !Array.isArray(all.body)) {
  console.error("FAIL — could not read profiles with the service key:", all.status, JSON.stringify(all.body).slice(0, 200));
  process.exit(1);
}
const rows = all.body;
const withPhotos = rows.filter((r) => Array.isArray(r.photos) && r.photos.length);
console.log(`profiles: ${rows.length}   carrying photos: ${withPhotos.length}`);
console.log(`photos_public=true: ${rows.filter((r) => r.photos_public === true).length}   false: ${rows.filter((r) => r.photos_public === false).length}   null/absent: ${rows.filter((r) => r.photos_public == null).length}`);
if (!rows.length) { console.error("FAIL — 0 profiles; every verdict below would be vacuous."); process.exit(1); }

// 2. THE DECISIVE QUESTION: can the anon key — the key in the shipped bundle — read `photos`?
const anonRead = await get(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,photos,photos_public&limit=50`, anon);
console.log(`\nanon SELECT profiles(photos): HTTP ${anonRead.status}`);
if (anonRead.status !== 200 || !Array.isArray(anonRead.body)) {
  console.log("  the anon key CANNOT read the column — the copy would then be defensible.");
  console.log("  " + JSON.stringify(anonRead.body).slice(0, 300));
  process.exit(0);
}
console.log(`  anon sees ${anonRead.body.length} profile row(s), and the \`photos\` column is present in the response.`);

const anonWithPhotos = anonRead.body.filter((r) => Array.isArray(r.photos) && r.photos.length);
const anonHidden = anonRead.body.filter((r) => r.photos_public === false && Array.isArray(r.photos) && r.photos.length);

console.log(`  of those, ${anonWithPhotos.length} carry photos anon can read.`);
console.log(`  of those, ${anonHidden.length} are marked photos_public = FALSE and STILL readable.\n`);

if (anonHidden.length) {
  console.log('VERDICT: "Your photos are hidden from other climbers" is FALSE for those rows.');
  console.log("         The toggle changes what the app DRAWS, not what the database SERVES.");
} else if (anonWithPhotos.length) {
  console.log("VERDICT: no row currently sets photos_public=false AND carries photos, so the lie is");
  console.log("         LATENT rather than live — but anon demonstrably reads the column, so the");
  console.log("         moment a climber turns the toggle off their photos stay served.");
} else {
  console.log("VERDICT: anon reads the column but no profile carries photos yet, so this is a claim");
  console.log("         about a surface with no data. The copy is still stronger than the schema.");
}
console.log("\nThis is the packet's F10 shape on a surface that did not exist at the last verification:");
console.log("a control whose copy promises protection the backend does not enforce. 0174's own header");
console.log("says the scope is surfacing only and asks for the settings copy to say so.");
