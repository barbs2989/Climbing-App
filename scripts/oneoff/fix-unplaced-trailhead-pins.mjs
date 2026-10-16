// Place the Trailhead pins the map cannot draw, WITHOUT inventing a coordinate.
//
// A route stores its trailhead twice — a `waypoints[]` entry and
// `approach_logistics.trailheadLat/Lng`. Where the pin is unplaced and the blob is not, the
// row already holds the answer and the repair is a COPY. That is deliberately the same
// shape as fix-trailhead-disagreements-batch4/5: the script declares a WINNER and moves the
// row's own value, so nothing can be typed in wrong and a repair that would need a third
// coordinate cannot be expressed at all.
//
// RESEARCHED is the narrow exception — a trailhead with no blob to copy from, where the
// coordinate comes from two independent published sources AND the route's own approach prose
// names that trailhead. Each entry records both. Anything not meeting that bar is left
// unplaced on purpose: the route page now says "No coordinate on file" for such a pin, which
// is true, where a guessed pin would be a confident lie on a navigation surface.
//
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const k = anonKey();

const RESEARCHED = {
  wa_emerald_peak_west_route: {
    name: "North Fork Entiat Trailhead",
    lat: 48.01076, lng: -120.57224,
    why: "USFS Okanogan-Wenatchee recreation page and Natural Atlas (48.010763, -120.572241) agree; the row's own approach says 'Entiat River Road ~32.5 miles to Forest Road 5606, then ~3 switchbacking miles to the North Fork Entiat Trailhead (~3,700 ft)', and the pin already carries elev 3700.",
  },
};

const isNum = (v) => v != null && Number.isFinite(Number(v));
const inWA = (la, ln) => Number(la) > 45 && Number(la) < 49.5 && Number(ln) < -116 && Number(ln) > -125;
const isTrailhead = (w) => /trailhead/i.test(String((w && w.type) || ""));
const placed = (w) => isNum(w && w.lat) && isNum(w && w.lng);

async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,approach_logistics&waypoints=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
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

const plan = [];
for (const r of rows) {
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const idx = wps.findIndex((w) => w && isTrailhead(w) && !placed(w));
  if (idx < 0) continue;
  const al = r.approach_logistics || {};
  let src = null, lat = null, lng = null;
  if (isNum(al.trailheadLat) && isNum(al.trailheadLng) && inWA(al.trailheadLat, al.trailheadLng)) {
    src = "approach_logistics (the row's own second copy)"; lat = Number(al.trailheadLat); lng = Number(al.trailheadLng);
  } else if (RESEARCHED[r.id] && RESEARCHED[r.id].name === wps[idx].name) {
    src = "researched: " + RESEARCHED[r.id].why; lat = RESEARCHED[r.id].lat; lng = RESEARCHED[r.id].lng;
  }
  if (lat == null) { plan.push({ id: r.id, wp: wps[idx].name, skip: "no blob coordinate and no researched entry — left unplaced deliberately" }); continue; }
  const next = wps.map((w, i) => (i === idx ? { ...w, lat, lng } : w));
  plan.push({ id: r.id, wp: wps[idx].name, lat, lng, src, next, before: wps.length });
}

console.log(`unplaced trailhead pins found: ${plan.length}\n`);
for (const p of plan) {
  if (p.skip) { console.log(`  SKIP  ${p.id} — "${p.wp}": ${p.skip}`); continue; }
  console.log(`  SET   ${p.id} — "${p.wp}" -> ${p.lat}, ${p.lng}`);
  console.log(`          from ${p.src}`);
}
const writable = plan.filter((p) => !p.skip);
if (!APPLY) { console.log(`\ndry run — ${writable.length} would be written. Pass --apply.`); process.exit(0); }

let done = 0;
for (const p of writable) {
  await patchRow("routes", p.id, { waypoints: p.next });
  const after = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.${p.id}`, { headers: headers(k) })).json())[0];
  const w = (after.waypoints || []).find((x) => x && x.name === p.wp);
  if (!w || Number(w.lat) !== p.lat || Number(w.lng) !== p.lng) { console.error(`VERIFY FAILED ${p.id}`); process.exit(1); }
  if ((after.waypoints || []).length !== p.before) { console.error(`VERIFY FAILED ${p.id} — waypoint count changed ${p.before} -> ${(after.waypoints || []).length}`); process.exit(1); }
  done++;
  console.log(`  verified ${p.id}: "${p.wp}" now at ${w.lat}, ${w.lng} (${(after.waypoints || []).length} waypoints, unchanged)`);
}
console.log(`\n${done} trailhead pin(s) placed and re-read.`);
