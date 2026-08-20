// wa_phantom_peak_south_route stores its trailhead twice and the two disagree by 4.7 km. Every
// other case in audit:trailhead-agreement was settled by the route's own waypoint chain; this one
// was recorded as unresolved because the chain appeared to match NEITHER record.
//
// Reading the row settles it, and the answer is that the chain matches BOTH — because the route
// genuinely has two approaches and its waypoints are a mix of them. Its own approach text says so
// in as many words: "There are two real approach options … Option one, the Luna Creek approach:
// from Ross Lake Resort … to the Big Beaver trailhead … to Luna Camp … Option two … Hannegan
// Trailhead (3,100 ft) → Ruth Creek Trail → Chilliwack River Trail … Whatcom Pass … Perfect Pass
// to a base camp on the Crooked Thumb Glacier moraine."
// Its seven waypoints carry Luna Camp and the Luna Creek bushwhack from option one, and the
// Crooked Thumb moraine camp and the southwest-buttress saddle from option two. That is correct
// data for a peak with two approaches — the case CLAUDE.md says not to sweep.
//
// What is NOT correct is the third name. `approach_logistics.trailhead` says "Nooksack Cirque
// Trailhead (Trail #750)", which appears NOWHERE in the route's own prose and sits up a different
// drainage entirely — its nearest named areas are Shuksan Crag and Pan Dome Falls. The waypoint
// pin, by contrast, is "Hannegan Pass Trailhead (end of Ruth Creek Rd / FR-32)", named verbatim in
// the approach text.
//
// So the repair DECLARES A WINNER AND COPIES IT — it never types a coordinate. The pin is copied
// into the blob, so nothing can be invented and a fix needing a third coordinate cannot be
// expressed at all. That is the same structural safety the trailhead batches used.
//
// ONE CONSEQUENCE TO RECORD, because it will otherwise be misread later: after this write the
// route's two trailhead records agree BY CONSTRUCTION, so audit:trailhead-agreement will report
// Phantom Peak at 0 m — and that agreement is NOT evidence. It is one claim counted twice, the
// shape [[do-not-create-a-trailhead-pin-from-the-logistics-copy]] warns about.
// This repair is still sound, and the distinction is the same one that note draws: it does not
// MANUFACTURE a second record where none existed, it corrects a record already shown to be wrong
// against an INDEPENDENT third source — the route's own approach prose, which names Hannegan and
// never names Nooksack Cirque. The evidence came before the copy, not from it.
//
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_phantom_peak_south_route";
/* The winner must be named in the route's own approach text; the loser must not be. Both are
   asserted below rather than asserted here in a comment. */
const WINNER_RE = /hannegan/i;
const LOSER_RE = /nooksack cirque/i;

const k = anonKey();
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const R = 6371000, toR = (d) => (d * Math.PI) / 180;
function hvM(a, b) {
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const SEL = "id,name,approach,waypoints,approach_logistics";
const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=eq.${ID}`, { headers: headers(k) })).json())[0];
if (!r) { console.error("route not found — refusing"); process.exit(1); }

const approach = String(r.approach || "");
const bl = r.approach_logistics || {};
const pin = (r.waypoints || []).find((w) => w && /trailhead/i.test(String(w.type)) && num(w.lat) != null);

let bad = 0;
if (!pin) { console.error("no placed Trailhead waypoint to copy from — refusing"); bad++; }
if (!WINNER_RE.test(approach)) { console.error(`the approach text does not name the winner (${WINNER_RE}) — refusing`); bad++; }
if (pin && !WINNER_RE.test(String(pin.name))) { console.error(`the waypoint pin "${pin.name}" is not the winner — refusing`); bad++; }
if (LOSER_RE.test(approach)) { console.error(`the approach text DOES name "${LOSER_RE}" — the blob may be a third genuine approach, refusing`); bad++; }
if (!LOSER_RE.test(String(bl.trailhead || ""))) { console.error(`the blob no longer names the loser (it says "${bl.trailhead}") — already repaired or changed, refusing`); bad++; }
if (bad) process.exit(1);

const was = { trailhead: bl.trailhead, lat: bl.trailheadLat, lng: bl.trailheadLng };
const apart = (was.lat != null) ? hvM({ lat: num(was.lat), lng: num(was.lng) }, { lat: num(pin.lat), lng: num(pin.lng) }) : null;

console.log(`\n### ${r.id} — ${r.name}`);
console.log(`  the approach text names "Hannegan" and never names "Nooksack Cirque" — checked, not assumed`);
console.log(`  losing blob : ${was.trailhead}   ${was.lat},${was.lng}`);
console.log(`  winning pin : ${String(pin.name).slice(0, 80)}   ${pin.lat},${pin.lng}`);
if (apart != null) console.log(`  they are ${(apart / 1000).toFixed(1)} km apart`);

/* Copy the pin's own values. No coordinate is typed anywhere in this file. */
const next = { ...bl, trailhead: String(pin.name), trailheadLat: num(pin.lat), trailheadLng: num(pin.lng) };
if (!APPLY) { console.log(`\ndry run — would set approach_logistics.trailhead/Lat/Lng from the route's own waypoint pin. Pass --apply to write.`); process.exit(0); }

await patchRow("routes", ID, { approach_logistics: next });

const back = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=eq.${ID}`, { headers: headers(k) })).json())[0];
const b2 = back.approach_logistics || {};
let v = 0;
if (num(b2.trailheadLat) !== num(pin.lat) || num(b2.trailheadLng) !== num(pin.lng)) { console.error(`VERIFY FAILED: blob is ${b2.trailheadLat},${b2.trailheadLng}`); v++; }
if (!WINNER_RE.test(String(b2.trailhead || ""))) { console.error(`VERIFY FAILED: blob name is "${b2.trailhead}"`); v++; }
if (JSON.stringify(back.waypoints) !== JSON.stringify(r.waypoints)) { console.error(`VERIFY FAILED: the waypoints changed — this script must never touch them`); v++; }
/* Every other key of the blob must survive: this is a targeted correction, not a replacement. */
for (const key of Object.keys(bl)) {
  if (["trailhead", "trailheadLat", "trailheadLng"].includes(key)) continue;
  if (JSON.stringify(b2[key]) !== JSON.stringify(bl[key])) { console.error(`VERIFY FAILED: approach_logistics.${key} changed`); v++; }
}
if (v) process.exit(1);
console.log(`\nverified: the blob now agrees with the route's own trailhead pin; waypoints and every other logistics key unchanged.`);
