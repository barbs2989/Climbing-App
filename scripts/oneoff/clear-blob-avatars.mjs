// Clear avatars that are `blob:` URLs.
//
// `URL.createObjectURL(file)` returns a handle into the memory of the tab that made it. The Edit
// profile screen stored that value and `saveEdit` PATCHed it straight into `profiles.avatar`, so
// the column ended up holding e.g.
//
//     blob:https://barbs2989.github.io/b1ac7240-94cd-45e4-86d6-a1ff66076c68
//
// which resolves to nothing for the owner once the tab closes, and to nothing for every other
// climber from the moment it was written. The upload path is fixed (uploadProfilePhoto), but a
// fix to the writer does not repair a value already stored.
//
// NOTHING IS LOST BY CLEARING IT. A blob: URL carries no image — it is a pointer into a process
// that has long since exited, so there is no file to recover and no better value to substitute.
// Null is what the column means when a climber has not set a photo, and `Av` falls back to the
// placeholder rather than rendering a broken image. The owner can re-upload, and now it sticks.
//
// Declared-state: every row is re-read and its exact current value re-asserted before the write,
// so a row somebody has since repaired is skipped rather than blanked.
//
//   node scripts/oneoff/clear-blob-avatars.mjs [--dry]

import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const url = SUPABASE_URL, key = requireServiceKey();
const H = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
const dry = process.argv.includes("--dry");

const rows = await (await fetch(url + "/rest/v1/profiles?select=id,name,avatar", { headers: H })).json();
if (!Array.isArray(rows)) { console.log("read failed: " + JSON.stringify(rows).slice(0, 200)); process.exit(1); }
if (!rows.length) { console.log("read 0 profiles — refusing to conclude anything"); process.exit(1); }

const bad = rows.filter(r => typeof r.avatar === "string" && r.avatar.startsWith("blob:"));
console.log("profiles: " + rows.length + ", holding a blob: avatar: " + bad.length);
if (!bad.length) { console.log("nothing to do."); process.exit(0); }

for (const r of bad) {
  console.log("   " + (r.name || r.id) + "  " + r.avatar);
  if (dry) continue;
  // re-assert the exact value, so a row repaired since the read above is left alone
  const res = await fetch(url + "/rest/v1/profiles?id=eq." + r.id + "&avatar=eq." + encodeURIComponent(r.avatar), {
    method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify({ avatar: null }),
  });
  const out = await res.json();
  if (!res.ok || !out.length) { console.log("      NOT CLEARED — " + res.status + " " + JSON.stringify(out).slice(0, 160)); continue; }
  if (out[0].avatar !== null) { console.log("      still set to " + JSON.stringify(out[0].avatar)); continue; }
  console.log("      cleared -> null (the placeholder avatar now renders)");
}

if (dry) { console.log("\n--dry: nothing written."); process.exit(0); }

const after = await (await fetch(url + "/rest/v1/profiles?select=id,avatar", { headers: H })).json();
const left = after.filter(r => typeof r.avatar === "string" && r.avatar.startsWith("blob:"));
console.log("\n" + (left.length ? left.length + " still holding a blob: avatar" : "ok — no profile stores a blob: avatar"));
process.exit(left.length ? 1 : 0);
