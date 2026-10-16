#!/usr/bin/env node
// The five Half Moon Crag routes list the CRAG before the TRAILHEAD, and carry a walk-in
// distance their own pins say is impossible.
//
// Each array is: [Topout "Half Moon Crag", Trailhead "Tye Road pullout", Summit "Half Moon Crag"]
// -- so the route reads as though it starts at the crag, and the trailhead is an afterthought.
//
// The crag also stores distMi = 1, while the two pins sit 1.47 mi apart AS THE CROW FLIES. You
// cannot be 1.47 miles from the trailhead having walked 1, so one of the three values is wrong.
// It is not the pins: the crag note records "Confirmed via Mountain Project (exact GPS match to
// this area's registered location)" and the trailhead is the named pullout ~1.4 road-miles from
// US-2. So the DISTANCE is the wrong element.
//
// NOTHING IS INVENTED TO REPLACE IT. The route's own approach gives time and gain and no
// distance -- "about 1,000 feet of elevation gain and 45-60 minutes of hiking" -- so there is no
// sourced figure to rebase onto, and writing a plausible one is the rope-capacity mistake this
// repo already records: replacing "unknown" with a confident wrong number. distMi becomes null,
// which is what the app renders as unknown, and the 45-60min/1,000ft description is already in
// the crag waypoint's own note, so the useful information survives.
//
// WHAT THIS DELIBERATELY DOES NOT TOUCH: the Topout and Summit entries share one coordinate and
// one name. On a crag whose routes are all under 85 ft that is arguably correct -- the note says
// "this single verified coordinate serves" the whole crag -- but whether the array should carry
// both is an editorial call about waypoint vocabulary, not a defect with an obvious repair. A
// duplicate-pin audit will flag it; that is the right place to decide it.
//
// Backs up, asserts area_id per route, writes through patchRow, re-reads and reconciles.
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const IDS = ["wa_asymptotic", "wa_artic_rose", "wa_astroglide", "wa_astral_projection", "wa_half_fast"];
const EXPECT_AREA = "wa_half_moon_crag";

const key = anonKey();
const H = { apikey: key, Authorization: "Bearer " + key };
const R = 6371, tr = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const isTH = (w) => /^trailhead$/i.test(String((w && w.type) || ""));

const read = async () => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,waypoints&id=in.(${IDS.join(",")})`, { headers: H });
  if (!r.ok) throw new Error(`read -> ${r.status}`);
  return r.json();
};

const rows = await read();
if (rows.length !== IDS.length) { console.error(`REFUSING — expected ${IDS.length} routes, got ${rows.length}`); process.exit(1); }

const plan = [];
for (const row of rows) {
  if (row.area_id !== EXPECT_AREA) { console.error(`REFUSING — ${row.id} is under "${row.area_id}", expected "${EXPECT_AREA}"`); process.exit(1); }
  const wps = row.waypoints;
  if (!Array.isArray(wps) || wps.length < 2) { console.error(`REFUSING — ${row.id} has no usable waypoint array`); process.exit(1); }
  const ti = wps.findIndex(isTH);
  if (ti <= 0) { console.log(`skip ${row.id} — trailhead is already first`); continue; }

  // The impossibility must still hold, or this repair is answering a question nobody asked.
  const th = wps[ti];
  let worst = 0;
  for (const p of wps) {
    if (p === th || p.distMi == null) continue;
    const d = hav(th, p); if (d == null) continue;
    const km = Number(p.distMi) * 1.60934; if (!(km > 0)) continue;
    worst = Math.max(worst, d / (km * 1.10));
  }
  if (worst <= 1) { console.log(`skip ${row.id} — distances are no longer impossible from the trailhead`); continue; }

  const moved = [th, ...wps.slice(0, ti), ...wps.slice(ti + 1)]
    .map((w, i) => (i === 0 ? { ...w, distMi: 0 } : (w.distMi == null ? w : { ...w, distMi: null })));
  plan.push({ row, wps, moved, worst });
}
if (!plan.length) { console.log("nothing to do."); process.exit(0); }

for (const { row, wps, moved, worst } of plan) {
  console.log(`\n${row.id} — ${row.name}`);
  console.log(`  before: ${wps.map((w) => `${w.type}(${w.distMi ?? "—"})`).join(" > ")}`);
  console.log(`  after : ${moved.map((w) => `${w.type}(${w.distMi ?? "—"})`).join(" > ")}`);
  console.log(`  worst impossible ratio from the trailhead: ${worst.toFixed(2)}x`);
}

if (!WRITE) { console.log("\nDRY RUN — pass --write to apply."); process.exit(0); }

requireServiceKey();
const backup = `scripts/oneoff/half-moon-crag-waypoints-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify(plan.map((p) => ({ id: p.row.id, area_id: p.row.area_id, waypoints: p.wps })), null, 2));
console.log(`\nbackup: ${backup}`);

for (const { row, moved } of plan) await patchRow("routes", row.id, { waypoints: moved });

const after = await read();
let bad = 0;
for (const row of after) {
  const w = row.waypoints;
  const ok = isTH(w[0]) && Number(w[0].distMi) === 0 && w.slice(1).every((x) => x.distMi == null);
  if (!ok) { console.error(`RECONCILE FAILED — ${row.id}: first=${w[0] && w[0].type}/${w[0] && w[0].distMi}`); bad++; }
}
if (bad) process.exit(1);
console.log(`ok — all ${plan.length} reconciled: trailhead first at 0 mi, impossible distances nulled`);
