// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node apply_coord_fixes.mjs [corrections.json]
// Patches areas.lat / areas.lng for a small list of verified coordinate corrections.
// These are factual/verified fields — always overrides the existing value (unlike the
// prose gap-fill logic in apply_enrich.mjs). Skips any entry with a null newLat/newLng
// (e.g. "uncertain" verdicts with no single correct point).
// The service_role key is a SECRET (Supabase Dashboard > Project Settings > API > service_role).
// It bypasses RLS — never hardcode it in this file; pass it via env only.
import { readFileSync } from "node:fs";
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = (env.match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim().replace(/\/$/, "");
const SK = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !SK) { console.error("Need VITE_SUPABASE_URL in .env.local and SUPABASE_SERVICE_KEY env"); process.exit(1); }
const H = { apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json" };

const file = process.argv[2] || new URL("./coord_corrections.json", import.meta.url);
const corrections = JSON.parse(readFileSync(file, "utf8"));

async function patch(path, body) {
  const r = await fetch(`${url}/rest/v1/${path}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status;
}

const run = async () => {
  let applied = 0, skipped = 0, errored = 0;
  for (const c of corrections) {
    if (c.newLat == null || c.newLng == null) { console.log(`SKIP ${c.areaId} (${c.areaName || ""}) — no verified correction, left as-is: ${c.note}`); skipped++; continue; }
    try {
      const status = await patch(`areas?id=eq.${c.areaId}`, { lat: c.newLat, lng: c.newLng });
      console.log(`FIXED ${c.areaId} (${c.areaName || ""}): ${c.oldLat},${c.oldLng} -> ${c.newLat},${c.newLng} (${status})`);
      applied++;
    } catch (e) {
      console.error(`!! ${c.areaId}: ${e.message}`);
      errored++;
    }
  }
  console.log(`\n=== applied ${applied}, skipped ${skipped} (uncertain), errors ${errored} ===`);
};
run();
