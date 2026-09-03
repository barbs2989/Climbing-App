// ONE CAMP, TWO ELEVATIONS — CAN THE GROUND PICK? Measured per camp, and the answer differs.
//
// fill-camp-elevations-from-unanimous-siblings.mjs refused five camps because their donor rows
// disagree, and printing them surfaced the real defect: the SAME camp is stored at two heights
// depending which route you open. Camp Schurman is 9,440 ft on some routes and 9,460 on others.
// Every spread sits INSIDE solve-camp-elevations' 400 ft cross-check tolerance, so the solver would
// have copied either one silently.
//
// The method that settled Skagit Queen is the source this needs: the DEM under the camp's OWN
// waypoint pin, which descends from neither stored value. Three checks before believing it, each
// one a mistake this catalog has already paid for:
//   1. THE PIN MUST BE REAL — AND SEPARATELY, ACCURATE. ~346 coordinates here are interpolated
//      along an approach chord, and ground under a computed pin is ground under a place nobody
//      chose; a long decimal tail is the fingerprint. BUT NOT-COMPUTED IS NOT THE SAME AS
//      NOT-MISPLACED, and this script's first version conflated them. Sahale Glacier Camp's pin
//      has a clean 4-decimal tail, is not on any chord, and sits 458 m from the gazetteer's
//      "Sahale Glacier Camp, Sahale Arm Trail" — downhill, on ground of 7,376 ft where the real
//      camp stands on 7,612. Believing that ground would have "settled" the split at 7,400 ft and
//      moved the row FURTHER from the truth, with a measurement to justify it.
//      So the pin must also be CORROBORATED: a gazetteer feature of the same name within 250 m.
//      That is what made Skagit Queen decidable — its feature was SEVEN METRES away.
//   2. THE SPREAD MUST EXCEED WHAT THE DEM CAN RESOLVE. Camp Schurman's two values are 20 ft
//      apart; 3DEP is a 10 m grid over glacier and rock. Asking it to choose between 9,440 and
//      9,460 is asking a question finer than the instrument, and an answer would be noise wearing
//      a verdict's clothes. Those are a CONSISTENCY problem, not an accuracy one.
//   3. THE GROUND MUST ADMIT ONE AND REFUSE THE OTHER. If it sits between them, or outside both,
//      it has not chosen and the split stands.
//
// REPORT-ONLY. A camp elevation renders on the Planner tab and this catalog's standing rule is that
// a wrong number is worse than a blank — but note the asymmetry here: these rows are not blank, so
// leaving them means shipping a known contradiction. That is why the verdicts are printed per camp
// rather than aggregated.
import { selectAll } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

// A pin may only speak for a camp when an independent record puts that camp where the pin is.
// 250 m is generous for a hand-placed camp marker and far tighter than the 458 m that produced a
// confident wrong answer.
const PIN_CORROB_M = 250;
const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const gazetteer = async (name) => {
  const u = "https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=us&q=" +
    encodeURIComponent(name);
  try {
    const r = await fetch(u, { headers: { "User-Agent": "climbing-app-camp-elev-check" } });
    if (!r.ok) return null;
    const j = await r.json();
    return j.map((f) => ({ lat: Number(f.lat), lng: Number(f.lon), name: f.display_name }));
  } catch { return null; }
};

// The DEM cannot separate values closer than this. 3DEP is a 10 m grid; on the steep ground these
// camps sit on, a horizontal metre is a vertical one. 60 ft is deliberately generous: the cost of
// declining is a split that stays, and the cost of choosing wrongly is a false number on screen.
const DEM_FLOOR_FT = 60;

const CAMPS = [
  "Camp Schurman", "Sahale Glacier Camp", "Thumb Rock",
  "Boston Basin high camp", "Whatcom Camp",
];

const rows = await selectAll("routes", "id,area_id,bivy,waypoints", "bivy=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

const CAMPWORDS = /\b(camp|campsite|camps|bivouac|bivy|bivies|site|sites|high)\b/gi;
const ident = (s) => s.toLowerCase().split(/[,—–(]/)[0].replace(CAMPWORDS, " ").replace(/\s+/g, " ").trim();
const dp = (n) => { const s = String(n); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };

let checked = 0;
for (const camp of CAMPS) {
  const target = ident(camp);
  console.log(`\n=== ${camp}`);

  // the stored values, from the bivy store
  const stored = new Map();
  for (const r of rows) for (const b of (r.bivy || [])) {
    if (!b || !b.name || ident(b.name) !== target) continue;
    if (b.elev == null) continue;
    const v = Number(b.elev);
    if (!stored.has(v)) stored.set(v, []);
    stored.get(v).push(r.id);
  }
  if (stored.size < 2) { console.log(`   fewer than 2 stored values now (${[...stored.keys()].join("/")}) — re-derive`); continue; }
  const vals = [...stored.keys()].sort((a, b) => a - b);
  console.log(`   stored: ${vals.map((v) => `${v} ft x${stored.get(v).length}`).join("   ")}`);
  const spread = vals[vals.length - 1] - vals[0];

  if (spread < DEM_FLOOR_FT) {
    console.log(`   SPREAD ${spread} ft IS BELOW WHAT THE DEM CAN RESOLVE (${DEM_FLOOR_FT} ft).`);
    console.log("   Not an accuracy question — the two records describe one place at different");
    console.log("   rounding. This is a CONSISTENCY defect and the ground cannot settle it.");
    continue;
  }

  // the third record: a waypoint pin of the same place
  const pins = [];
  for (const r of rows) for (const w of (r.waypoints || [])) {
    if (!w || !w.name || ident(w.name) !== target) continue;
    const lat = Number(w.lat), lng = Number(w.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
    pins.push({ routeId: r.id, name: w.name, lat, lng, elev: w.elev == null ? null : Number(w.elev) });
  }
  if (!pins.length) { console.log("   no placed waypoint of this name — no third record, split stands"); continue; }

  for (const p of pins.slice(0, 3)) {
    const fabricated = dp(p.lat) > 8 || dp(p.lng) > 8;
    let g = null;
    try { g = Math.round(await elevationAt(p.lat, p.lng)); } catch (e) { console.log(`   DEM error: ${e.message}`); continue; }
    checked++;
    console.log(`   pin on ${p.routeId}  ${p.lat},${p.lng}  decimals ${dp(p.lat)}/${dp(p.lng)}` +
      (fabricated ? "  COMPUTED-LOOKING" : ""));
    console.log(`      states ${p.elev ?? "—"} ft;  GROUND ${g} ft`);
    if (fabricated) {
      console.log("      -> REFUSED: a long decimal tail is the fingerprint of an interpolated pin,");
      console.log("         and ground under a computed pin is ground under a place nobody chose.");
      continue;
    }
    // NOT-COMPUTED IS NOT NOT-MISPLACED. Require an independent record of the same camp near the
    // pin before believing the ground under it — see the header.
    const feats = await gazetteer(camp);
    await new Promise((s) => setTimeout(s, 1100));
    if (feats == null) { console.log("      -> gazetteer unreachable — NOT the same as uncorroborated"); continue; }
    const near = feats.map((f) => ({ ...f, d: metres(p, f) })).sort((a, b) => a.d - b.d)[0];
    if (!near) { console.log("      -> no gazetteer feature of this name; the pin is uncorroborated"); continue; }
    if (near.d > PIN_CORROB_M) {
      const fg = Math.round(await elevationAt(near.lat, near.lng));
      console.log(`      -> REFUSED: the pin is ${Math.round(near.d)} m from "${near.name.slice(0, 46)}",`);
      console.log(`         which stands on ${fg} ft. The pin is MISPLACED, so the ground under it is`);
      console.log("         ground under somewhere else. A clean decimal tail says the pin was not");
      console.log("         COMPUTED; it says nothing about whether it is in the right place.");
      continue;
    }
    console.log(`      corroborated: gazetteer feature ${Math.round(near.d)} m away`);
    const admits = vals.filter((v) => Math.abs(g - v) <= DEM_FLOOR_FT);
    const refuses = vals.filter((v) => Math.abs(g - v) > DEM_FLOOR_FT);
    if (admits.length === 1 && refuses.length) {
      console.log(`      -> THE GROUND ADMITS ${admits[0]} ft AND REFUSES ${refuses.join("/")} ft.`);
    } else if (!admits.length) {
      console.log(`      -> refuses BOTH (${vals.join("/")} ft). The ground disagrees with the whole row;`);
      console.log("         that is a different finding and not this one.");
    } else {
      console.log(`      -> admits ${admits.join("/")} ft — it has NOT chosen. Split stands.`);
    }
  }
}

if (!checked) { console.log("\nFAIL CLOSED: no pin was measured — this settled nothing."); process.exit(1); }
console.log(`\n${checked} pin(s) measured. REPORT-ONLY: read each verdict before writing anything.`);
console.log("A spread below the DEM floor is a CONSISTENCY defect — pick one and use it everywhere,");
console.log("but that is a choice about the record, not a measurement of the mountain.");
