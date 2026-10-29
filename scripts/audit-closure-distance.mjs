#!/usr/bin/env node
// Does a route's DISTANCE include the road walk its own text says the climber now has to do?
//
// Owner note, 2026-10-29, on Three Fingers South Peak via Lookout: "Description said road was
// washed out so it adds extra miles but that isn't reflected in the technical stats distance".
// The row's approach, road block and both approach cards all said FR 41 is closed at the Canyon
// Creek bridge, about eight miles below the trailhead — and the Distance tile, read from the
// itinerary's day miles, measured the trail from the old trailhead only, half the real trip.
//
// So this asks, of every route whose own prose says a road is washed out, gated or closed and the
// walk is longer for it: what number does the Distance tile print, and does any stored number
// (the stats, or the most-used approach card) carry the extra miles? It CANNOT answer whether the
// closure is still in force — that is a question about the world, and `audit:expiring-closures`
// already records why a mechanical answer is wrong. It lists, per route:
//   - the closure sentence the route's own text states, and the extra miles it names, if any;
//   - the one-way distance the Distance tile shows (lib/outing.js effDistKm, the tile's reader);
//   - whether the most-used approach card carries its own distance.
// A row is FLAGGED when the text names extra miles and no stored distance is at least the trail
// distance plus that many miles. Everything else with a closure sentence is PRINTED as context,
// because "a road is gated in winter" does not change a summer distance.
//
// REPORT-ONLY. A flag is a route to research, never a number to write: the closure may have been
// repaired, the stored distance may already start at the gate, and the extra miles named in prose
// are an enrichment pass's figure, not a measurement. Read-only, anon key; not a build gate (a
// property of the database, not the checkout — same reasoning as audit:expiring-closures).
//
//   npm run audit:closure-distance                 every state
//   npm run audit:closure-distance -- --state wa   one state prefix
//   npm run audit:closure-distance -- --json       machine-readable
//   npm run audit:closure-distance -- --selftest   the classifier on fixed strings, no DB
import { selectAll } from "./lib/supabase-env.mjs";
import { effDistKm, effDistIsWholeTrip } from "../lib/outing.js";

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf("--" + n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null; };
const STATE = flag("state");
const JSON_OUT = args.includes("--json");
const say = (...a) => { if (!JSON_OUT) console.log(...a); };

// A road that is OUT, not one that is slow. "Rough road", "high clearance" and "4WD" lengthen the
// drive, not the walk, and are left out deliberately.
const CLOSURE = /wash(?:ed)?[- ]?out|closed to (?:all )?(?:vehicles|motor|cars|traffic)|gated (?:at|below|closed)|gate (?:is )?closed|road (?:is )?(?:now )?closed|closed (?:at|past|beyond|below) (?:the |a |mile|mp)|road[- ]walk|between the closure|walk or bike|bike (?:the|up the|in on the) road|undriv/i;
// The added walk the text names: "adds roughly nine miles", "an extra 3.5 mi", "8 miles of road".
const NUM = "(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const EXTRA = [
  new RegExp(`add(?:s|ing)?\\s+(?:roughly |about |around |approximately |an extra |another |~)?${NUM}(?:\\s*[-–]\\s*${NUM})?\\s*(?:extra |more |additional )?(?:miles?|mi\\b)`, "i"),
  new RegExp(`(?:extra|additional|another)\\s+(?:roughly |about |~)?${NUM}(?:\\s*[-–]\\s*${NUM})?\\s*(?:miles?|mi\\b)`, "i"),
  new RegExp(`(?:roughly |about |around |~)?${NUM}(?:\\s*[-–]\\s*${NUM})?\\s*(?:more )?(?:miles?|mi\\b)\\s+(?:each way )?of (?:closed |gravel |forest |old )?road`, "i"),
];
const toN = s => (s == null ? null : WORDS[String(s).toLowerCase()] ?? Number(s));
export function extraMiles(t) {
  for (const re of EXTRA) {
    const m = String(t).match(re);
    if (m) { const a = toN(m[1]); const b = toN(m[2]); const v = b != null ? Math.max(a, b) : a; if (v > 0 && v < 40) return { mi: v, roundTrip: /round[- ]trip|total/i.test(String(t).slice(m.index, m.index + m[0].length + 30)) }; }
  }
  return null;
}
// Sentences that carry a closure, from every prose field that renders on the route page.
function texts(r) {
  const out = [];
  const add = (where, v) => { if (typeof v === "string" && v.trim()) out.push([where, v]); };
  add("approach", r.approach);
  for (const [k, v] of Object.entries(r.road || {})) add("road." + k, v);
  for (const [k, v] of Object.entries(r.access || {})) add("access." + k, v);
  (Array.isArray(r.approach_variants) ? r.approach_variants : []).forEach((v, i) => { if (v) { add(`approach_variants[${i}].notes`, v.notes); add(`approach_variants[${i}].season`, v.season); } });
  (Array.isArray(r.waypoints) ? r.waypoints : []).forEach((w, i) => { if (w && /trailhead|parking|gate/i.test(w.type || "")) { add(`waypoints[${i}].directions`, w.directions); add(`waypoints[${i}].note`, w.note); } });
  const hits = [];
  for (const [where, v] of out) for (const s of v.split(/(?<=[.;!?])\s+|\n+/)) if (CLOSURE.test(s)) hits.push({ where, s: s.trim(), extra: extraMiles(s) });
  return hits;
}

if (args.includes("--selftest")) {
  const cases = [
    ["The Canyon Creek bridge on this road has washed out, which adds roughly nine miles each way of road walking", 9],
    ["closed at the gate, adding an extra 3.5 mi of walking", 3.5],
    ["leaving roughly 8-9 miles of road between the closure and the trailhead", 9],
    ["High-clearance vehicle recommended", null],
  ];
  let bad = 0;
  for (const [t, want] of cases) { const got = CLOSURE.test(t) ? (extraMiles(t) || {}).mi ?? null : null; if (got !== want) { bad++; console.log(`FAIL ${JSON.stringify(t)} -> ${got}, want ${want}`); } }
  console.log(bad ? `${bad} selftest case(s) failed` : `selftest: ${cases.length} cases pass`);
  process.exit(bad ? 1 : 0);
}

const sel = "id,name,area_id,discipline,dist_km,gain_ft,outing_shape,itinerary,approach,road,access,approach_variants,waypoints";
const rows = await selectAll("routes", sel, `${STATE ? `id=like.${STATE}_*&` : ""}or=(approach.not.is.null,road.not.is.null,approach_variants.not.is.null)`, { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. A broken query, not a clean catalog."); process.exit(1); }

const found = [];
for (const r of rows) {
  const hits = texts(r);
  if (!hits.length) continue;
  const camel = { distKm: r.dist_km, outingShape: r.outing_shape, itinerary: r.itinerary };
  const km = effDistKm(camel);
  const tileMi = km != null && km > 0 ? +(km / 1.60934).toFixed(1) : null;
  const whole = effDistIsWholeTrip(camel);
  const vars = Array.isArray(r.approach_variants) ? r.approach_variants.filter(Boolean) : [];
  const prim = vars.find(v => v.primary === true) || vars[0] || null;
  const extra = hits.map(h => h.extra).filter(Boolean).reduce((a, b) => (!a || b.mi > a.mi ? b : a), null);
  const oneWayExtra = extra ? (extra.roundTrip ? extra.mi / 2 : extra.mi) : null;
  // The Distance tile shows the round trip on a there-and-back route; compare one way to one way.
  const tileOneWay = tileMi == null ? null : whole ? tileMi / 2 : tileMi;
  const primMi = prim && prim.distMi != null ? Number(prim.distMi) : null;
  const flagged = oneWayExtra != null && (tileOneWay == null || tileOneWay < oneWayExtra + 1) && (primMi == null || primMi < oneWayExtra + 1);
  found.push({ id: r.id, name: r.name, discipline: r.discipline, tileMi, whole, gainFt: r.gain_ft, primaryCard: prim ? prim.name : null, primaryCardMi: primMi, extraMiOneWay: oneWayExtra, flagged, hits: hits.slice(0, 4) });
}
found.sort((a, b) => (b.flagged - a.flagged) || a.id.localeCompare(b.id));
if (JSON_OUT) { process.stdout.write(JSON.stringify(found, null, 1)); process.exitCode = 0; }
else {
  const fl = found.filter(f => f.flagged);
  say(`Read ${rows.length} routes with approach/road prose. ${found.length} state a road closure; ${fl.length} name extra miles that no stored distance carries.\n`);
  for (const f of fl) {
    say(`FLAG ${f.id} — ${f.name}`);
    say(`     tile: ${f.tileMi == null ? "no distance" : f.tileMi + " mi" + (f.whole ? " whole outing" : " one way")} · gain ${f.gainFt ?? "—"} ft · most-used card: ${f.primaryCard || "none"}${f.primaryCardMi != null ? " (" + f.primaryCardMi + " mi)" : ""} · text adds ~${f.extraMiOneWay} mi one way`);
    for (const h of f.hits.filter(h => h.extra).slice(0, 2)) say(`     ${h.where}: ${h.s.slice(0, 220)}`);
  }
  say(`\n${found.length - fl.length} more state a closure without naming extra miles (--json lists them).`);
}
