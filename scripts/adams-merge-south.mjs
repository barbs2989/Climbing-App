// Merge wa_mount_adams_south_spur's unique content into wa_mount_adams_south_climb.
//
// Both rows describe Mount Adams' standard route — south_spur's own overview says "also
// called the South Climb". south_climb survives because its dist_km (19.3) matches the real
// ~12.5 mi round trip where south_spur's 9.2 km is a one-way figure, and because it carries
// a genuine 166-point GPX track against south_spur's 5.
//
// Only fills fields south_climb is missing, and unions the two array fields. Never
// overwrites an existing value, so this can't lose the surviving row's content. Waypoints
// are deliberately NOT merged: south_spur's five were built against its own 5-point track,
// and dropping them onto a different 166-point GPX risks off-track markers.
//
// Non-destructive by design. The DELETEs are handed over separately, not run here.

import { selectAll, patchRow } from './lib/supabase-env.mjs';

const KEEP = "wa_mount_adams_south_climb";
const DROP = "wa_mount_adams_south_spur";

const FILL = ["grade","grade_system","pitches","length_m","fa","max_angle","detailed_rack","crowds",
  "partner_requirements","seasonal_guidance","seasonal_hazards","data_quality","difficulty",
  "alpine_draws","rope_note","corrections","gear_confidence","features"];
const UNION = ["hazards","gear"];

const empty = v => v === null || v === undefined || v === "" ||
  (Array.isArray(v) && !v.length) ||
  (typeof v === "object" && v && !Array.isArray(v) && !Object.keys(v).length);

const rows = await selectAll("routes", "*", `id=in.(${KEEP},${DROP})`);
const keep = rows.find(r => r.id === KEEP), drop = rows.find(r => r.id === DROP);
if (!keep || !drop) throw new Error("one of the two rows is missing — aborting");

const body = {};
for (const k of FILL) if (!empty(drop[k]) && empty(keep[k])) body[k] = drop[k];
for (const k of UNION) {
  const a = keep[k] || [], b = drop[k] || [];
  const merged = [...a, ...b.filter(x => !a.some(y => JSON.stringify(y) === JSON.stringify(x)))];
  if (merged.length > a.length) body[k] = merged;
}

if (!Object.keys(body).length) { console.log("nothing to merge — already done"); process.exit(0); }
console.log("filling on " + KEEP + ":");
for (const k of Object.keys(body)) {
  const v = body[k];
  console.log(`  ${k.padEnd(22)} ${Array.isArray(v) ? `[${v.length}]` : (typeof v === "object" ? "{obj}" : String(v).slice(0, 70))}`);
}

const after = await patchRow("routes", KEEP, body);
const bad = Object.keys(body).filter(k => empty(after[k]));
if (bad.length) throw new Error(`patched but still empty: ${bad.join(", ")}`);
console.log(`\nverified: ${Object.keys(body).length} fields now populated on ${KEEP}`);
console.log(`hazards ${(keep.hazards||[]).length} -> ${(after.hazards||[]).length}, gear ${(keep.gear||[]).length} -> ${(after.gear||[]).length}`);
console.log(`dist_km stays ${after.dist_km}, gpx stays ${(after.gpx||[]).length} points`);
process.exit(0);
