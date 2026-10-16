// Three pin problems that surfaced when recorded GPS tracks landed on WA routes (#1875, #1889).
// Each was put to the GROUND (USGS 3DEP via scripts/lib/terrain.mjs, self-test passing) before anything moved.
//
// 1. Enchantment Peak — NO CHANGE, and that is the finding. The Enchantment Enchainment's recording tops out
//    321 m NE of the catalog coordinate, on a point that is also a local maximum. A 50 m grid over the whole
//    massif (361/361 readings, refined at 10 m) puts the highest ground 88 m from the CATALOG coordinate and
//    391 m from the recorded point. The catalog is right; the runner tagged a lower NE bump. The Enchainment
//    therefore stays WITHOUT an Enchantment Peak pin — the line does not reach the summit, so no pin on it may
//    claim to.
//
// 2. Gardner Mountain — West Ridge / Saddle Traverse: two COMPUTED pins (the >8-decimal tell) repaired.
//    - "Connecting saddle (~7,900 ft)" sat 589 m EAST of the summit on a slope at 8,550 ft (3/8 of its ring
//      higher) — not a saddle, not 7,900 ft. The route's own descent text puts the saddle SW of the summit,
//      "below Point 8487", on the way to North Gardner. The recording crosses exactly one col there: ground
//      8,131 ft, with the ground rising both ways (profile 8883 … 8134 … 8450 … 8945). Moved there; the wrong
//      height leaves its name.
//    - "Scree/talus crux slope" (claims 7,600 ft) sat on ground at 7,934 ft, 947 m off the recorded ascent. The
//      route's beta puts the scree between the ~7,100 ft basin and the summit plateau; the recorded ascent
//      comes up that slope from due south (bearing ~195°) and crosses 7,600 ft on it. Moved to that point.
//
// 3. Ptarmigan Traverse — the ONLY "Summit" pin was Dome Peak, a side summit the traverse does not require
//    (the recording ends at Downey Creek, 3.1 km from it). As a Summit it made the route page say the line
//    never reaches the summit. Retyped to Landmark, with a note saying what it is. Coordinate untouched.
//
//   node scripts/oneoff/fix-pins-found-by-recorded-tracks.mjs           # dry run
//   node scripts/oneoff/fix-pins-found-by-recorded-tracks.mjs --write   # write + rollback + re-read
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };

const EDITS = {
  wa_gardner_mountain_west_ridge: [
    { done: w => w.name === "Connecting saddle below Point 8,487" && w.distMi == null,
      match: w => w.name === "Connecting saddle (~7,900 ft)" && w.lat === 48.505854166666666,
      set: { name: "Connecting saddle below Point 8,487", lat: 48.50704, lng: -120.50029, elev: 8131, distMi: null } },   // off the ascent line, so no along-route distance can be claimed; the old 11.5 mi would make crux->saddle an impossible 0.3 mi leg for a 0.6 mi straight line
    { done: w => w.name === "Scree/talus crux slope" && w.lat === 48.50085,
      match: w => w.name === "Scree/talus crux slope" && w.lat === 48.50528666666667,
      set: { lat: 48.50085, lng: -120.49167, elev: 7600 } },   // the recorded point where the ascent crosses 7,600 ft (ground 7,590)
  ],
  // 4. Mount Rainier — Emmons–Winthrop: its trailhead and Glacier Basin pins contradict the route's OWN approach
  //    text ("From White River Campground (4,400 ft)… 3.5 miles… to Glacier Basin Campground (5,935 ft)"). The
  //    trailhead pin sat 1.4 km from White River, where Curtis Ridge's and Liberty Ridge's pins agree to 58-95 m
  //    with a recorded Camp Schurman track; "Glacier Basin Camp" sat 100 m from that trailhead pin claiming
  //    6,800 ft. The trailhead takes the White River pin Curtis Ridge already carries (58 m from the
  //    recording's start); Glacier Basin takes the recorded point where the track reaches it (3.2 mi,
  //    5,922-5,945 ft recorded — the route's own 5,935 ft).
  wa_mount_rainier_emmons_glacier: [
    { done: w => /trailhead/i.test(w.type || "") && w.lat === 46.9022,
      match: w => w.name === "Glacier Basin Parking Area" && w.lat === 46.9141,
      set: { name: "White River Campground (Glacier Basin Trailhead)", lat: 46.9022, lng: -121.6442, elev: 4400 } },
    { done: w => w.name === "Glacier Basin Camp Site Area" && w.lat === 46.88902,
      match: w => w.name === "Glacier Basin Camp Site Area" && w.lat === 46.915,
      set: { lat: 46.88902, lng: -121.70025, elev: 5935 } },
  ],
  wa_ptarmigan_traverse: [
    { done: w => w.name === "Dome Peak" && w.type === "Landmark",
      match: w => w.name === "Dome Peak" && /summit/i.test(w.type || ""),
      set: { type: "Landmark", note: "Optional side summit near the traverse's south end; the traverse itself does not cross it." } },
  ],
};

const rows = await get(`routes?select=id,waypoints&id=in.(${Object.keys(EDITS).join(",")})`);
const plan = [];
for (const r of rows) {
  const wps = (r.waypoints || []).map(w => ({ ...w }));
  for (const e of EDITS[r.id]) {
    if (e.done && wps.filter(e.done).length === 1 && !wps.some(e.match)) { console.log(`  ${r.id}: already applied — skip`); continue; }
    const hits = wps.filter(e.match);
    if (hits.length !== 1) { console.error(`REFUSING: ${r.id} — ${hits.length} pins match (expected exactly 1). Already applied, or the row changed.`); process.exit(1); }
    console.log(`  ${r.id}: "${hits[0].name}" ${JSON.stringify({ type: hits[0].type, lat: hits[0].lat, lng: hits[0].lng, elev: hits[0].elev })} -> ${JSON.stringify(e.set)}`);
    Object.assign(hits[0], e.set);
  }
  plan.push({ id: r.id, before: r.waypoints, after: wps });
}
if (plan.length !== Object.keys(EDITS).length) { console.error("REFUSING: a route was not found"); process.exit(1); }
const changed = plan.filter(p => JSON.stringify(p.before) !== JSON.stringify(p.after));
if (!WRITE) { console.log(`Dry run: ${changed.length} route(s) would change. Re-run with --write.`); process.exit(0); }

// Rollback is APPENDED per run, so a second run never overwrites the first run's before-state.
const rbUrl = new URL("../rollback-pins-found-by-recorded-tracks.json", import.meta.url);
const rb = fs.existsSync(rbUrl) ? JSON.parse(fs.readFileSync(rbUrl)) : { runs: [] };
if (!rb.runs) rb.runs = [{ at: rb.at, rows: rb.rows }];
rb.runs.push({ at: new Date().toISOString(), rows: changed.map(p => ({ id: p.id, before: { waypoints: p.before } })) });
fs.writeFileSync(rbUrl, JSON.stringify({ runs: rb.runs }, null, 1));
for (const p of changed) await patchRow("routes", p.id, { waypoints: p.after });
const back = await get(`routes?select=id,waypoints&id=in.(${plan.map(p => p.id).join(",")})`);
// jsonb does not keep key order, so compare with keys sorted — a raw stringify reported 1/2 on a write that fully landed.
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(y => [y, x[y]])) : x);
const bad = changed.filter(p => canon(back.find(b => b.id === p.id)?.waypoints) !== canon(p.after));
console.log(`re-read: ${changed.length - bad.length}/${changed.length} landed`);
if (bad.length) process.exit(1);
