// Does the SHIPPED trackCoverage() fire on real rows, and on how many?
//
// The distribution probe measured raw `waypoints`; the app renders through
// dbRouteToCamel -> normalizeWaypoints, which coerces lat/lng (contributed rows store them as
// STRINGS) and rewrites `type` through the canonical map. `pointOf` requires a real number and
// the pin lookup matches on `type`, so either step could silently make the caveat never fire —
// a populated column and a live reader that never agree, which is the defect class this whole
// file keeps finding. So this calls the real exported function on the real shape.
//
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { trackCoverage, trackCoverageCaveat } from "../../lib/track.js";

const k = anonKey();
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
/* Mirrors normalizeWaypoints' numeric coercion. Deliberately NOT importing lib/db.js — it pulls
   in supabase-js and React Query for no benefit here; the coercion is the only part that matters
   and it is two lines. If normalizeWaypoints gains a step that could hide a pin, this must be
   revisited rather than trusted. */
const norm = (wps) => (Array.isArray(wps) ? wps : []).map((w) => ({ ...w, lat: num(w.lat), lng: num(w.lng) }));

async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,gpx&id=like.wa_*&gpx=not.is.null&waypoints=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }

const approachOnly = [], summitOnly = [], both = [];
for (const r of rows) {
  const cov = trackCoverage(r.gpx, norm(r.waypoints));
  if (!cov) continue;
  (cov.missingApproach && cov.missingSummit ? both : cov.missingApproach ? approachOnly : summitOnly)
    .push({ id: r.id, name: r.name, cov });
}
const total = approachOnly.length + summitOnly.length + both.length;
console.log(`\n=== the shipped trackCoverage(), run on live rows ===`);
console.log(`${rows.length} WA routes with a track and waypoints`);
console.log(`  ${total} will now carry a partial-track caveat`);
console.log(`     walk-in missing only:        ${approachOnly.length}`);
console.log(`     stops short of summit only:  ${summitOnly.length}`);
console.log(`     both ends missing:           ${both.length}`);
if (!total) { console.error(`\nFAIL — the caveat fires on NOTHING. The distribution probe found 63 + 6 on the raw column, so a zero here means the normalized shape is not reaching the reader.`); process.exit(1); }

console.log(`\n--- stops short of the summit (the dangerous half) ---`);
for (const f of summitOnly.concat(both)) console.log(`  ${f.id.padEnd(48)} ${trackCoverageCaveat(f.cov)}`);
console.log(`\n--- walk-in missing (first 12 of ${approachOnly.length}) ---`);
for (const f of approachOnly.slice(0, 12)) console.log(`  ${f.id.padEnd(48)} ${trackCoverageCaveat(f.cov)}`);
