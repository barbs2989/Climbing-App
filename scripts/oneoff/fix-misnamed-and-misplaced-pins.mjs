// Two defects the cross-route adjudicator separated, needing OPPOSITE repairs.
//
// A. A PIN IN THE RIGHT PLACE UNDER THE WRONG NAME — rename it, do not move it.
//
//    Three Mount Stuart routes carry a pin called "Lake Ingalls" that sits 594 m from LONGS PASS
//    and 3.1 km from the actual Lake Ingalls, where the three Ingalls Peak routes put it (1 m from
//    the gazetteer). Each of the three describes Longs Pass at length — "gaining roughly 2,000 ft
//    over about 2 miles to Longs Pass (~6,250 ft), the high point of the approach", "stay
//    right/straight at the Longs Pass junction", "climb over Longs Pass and drop into the Ingalls
//    Creek valley" — and NOT ONE of them mentions Lake Ingalls anywhere. The pin's own 6,300 ft
//    matches Longs Pass (the prose gives 6,200-6,400) and not the lake (6,466).
//
//    So the coordinate is right and the label is false. Moving it to the lake would have taken a
//    correct approach waypoint off the route these parties actually walk. The type goes with the
//    name: "Water" was describing a lake that is not there, and `col`/`saddle`/`pass` all
//    normalise to the drawable "Pass".
//
//    NOT MOVED to the gazetteer's Longs Pass either, though it is 594 m off. That would be writing
//    a researched coordinate onto a route with no track to check it against, and the recorded bar
//    for that is a pin landing on the route's own gpx line. Renaming removes the false claim
//    without inventing a position.
//
// B. A PIN WITH THE RIGHT NAME IN THE WRONG PLACE — move it, do not rename it.
//    (ALREADY FIXED by #1518 while this was being written; see the note above MOVES.)
//
//    wa_ptarmigan_traverse's "Cache Col" sits 2,751 m from the gazetteer's Cache Col — where SIX
//    other routes put it, 4 m out — and 539 m from JOHANNESBURG COL, which is on the far side of
//    Cascade Pass and not on this traverse at all. The route's own prose is unambiguous about
//    which it means: "off-trail south to Cache Col crossing on Cache Glacier", "the notch at its
//    head is Cache Col", and the pin's own note reads "Glacier-travel notch south of Cascade Pass;
//    gateway to the traverse proper". That is Cache Col described correctly and pinned in the
//    wrong valley.
//
//    The adjudicator files this under "suspect the NAME" because the pin's stated 6,600 ft is
//    within 400 ft of the ground beneath it (6,952). That scoping is right in general and wrong
//    here, and only the ROUTE'S PROSE separates the two cases — which is exactly why that verdict
//    says the name question "needs the route's own prose".
//
// LEFT ALONE, all for the same reason — the row cannot say which half is wrong:
//    "Spider-Formidable Col"  a climbers' name the gazetteer does not hold; both pins state
//                             elevations the ground half-admits (360 ft and 666 ft out).
//    "Heart Lake"             the Mount Ferry pin is 406 m from Sol Duc Lake and its prose names
//                             BOTH lakes, so nothing in the row picks one.
//    "Kool-Aid Lake"          four clusters inside 2.3 km; the gazetteer's own Kool-Aid Lake is
//                             438 m from one of them, which is this place recorded imprecisely.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

// A: rename in place. `was` is the declared current state and must still hold.
const RENAMES = [
  { id: "wa_mount_stuart_cascadian_couloir", from: "Lake Ingalls", to: "Longs Pass", type: "Pass",
    was: { lat: 47.444, lng: -120.924, type: "Water" } },
  { id: "wa_mount_stuart_north_ridge", from: "Lake Ingalls", to: "Longs Pass", type: "Pass",
    was: { lat: 47.444, lng: -120.924, type: "Water" } },
  { id: "wa_mount_stuart_west_ridge", from: "Lake Ingalls", to: "Longs Pass", type: "Pass",
    was: { lat: 47.444, lng: -120.924, type: "Water" } },
];
// Each route must PROVE it means Longs Pass, in its own words, before its pin is renamed.
const PROSE_MUST_SAY = "Longs Pass";
const PROSE_MUST_NOT_SAY = "Lake Ingalls";

// B: move onto a named donor row. No coordinate is typed.
// ...AND B WAS ALREADY FIXED BY A PARALLEL SESSION WHILE THIS WAS BEING WRITTEN. #1518 ("the
// pin-distance gate generalises") moved that pin onto the six-route cluster, and its elevation is
// now 6,903 to match. The declared-state contract caught it — "pin has moved (now
// 48.4484594,-121.0528892, expected 48.4585,-121.087)" — and refused the WHOLE run rather than
// writing anything, which is the contract doing exactly its job. The case is kept in this header
// because the REASONING is the part worth having: the adjudicator files it under "suspect the
// NAME", and only the route's own prose separates a misnamed pin from a misplaced one.
const MOVES = [];

const num = (v) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) ? n : null; };
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-3;
const D = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const leaves = (v, o = []) => {
  if (typeof v === "string") o.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, o));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, o));
  return o;
};

const IDS = [...new Set([...RENAMES.map((r) => r.id), ...MOVES.flatMap((m) => [m.id, m.donor])])];
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,waypoints,approach,approach_variants,overview,itinerary`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) { console.error(`read ${rows.length} row(s) for ${IDS.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));
const proseOf = (id) => leaves([byId.get(id).approach, byId.get(id).approach_variants, byId.get(id).overview, byId.get(id).itinerary]).join(" ");

const staged = [];
const refusals = [];

for (const e of RENAMES) {
  const row = byId.get(e.id);
  const wps = Array.isArray(row.waypoints) ? row.waypoints : null;
  if (!wps) { refusals.push(`${e.id}: waypoints is not an array`); continue; }
  const hits = wps.map((w, i) => ({ w, i })).filter(({ w }) => String((w || {}).name || "").trim() === e.from);
  if (hits.length !== 1) { refusals.push(`${e.id}: expected exactly 1 pin named "${e.from}", found ${hits.length}`); continue; }
  const { w, i } = hits[0];
  if (!near(num(w.lat), e.was.lat) || !near(num(w.lng), e.was.lng)) {
    refusals.push(`${e.id}: pin has moved (now ${w.lat},${w.lng}, expected ${e.was.lat},${e.was.lng})`); continue;
  }
  if (String(w.type || "") !== e.was.type) { refusals.push(`${e.id}: pin type is "${w.type}", expected "${e.was.type}"`); continue; }
  // THE ROUTE HAS TO SAY IT ITSELF. Without this the rename rests on my reading alone.
  const p = proseOf(e.id);
  if (!p.includes(PROSE_MUST_SAY)) { refusals.push(`${e.id}: prose never says "${PROSE_MUST_SAY}"`); continue; }
  if (p.includes(PROSE_MUST_NOT_SAY)) { refusals.push(`${e.id}: prose DOES mention "${PROSE_MUST_NOT_SAY}" - the rename is not safe`); continue; }
  const next = wps.slice();
  next[i] = Object.assign({}, w, { name: e.to, type: e.type });
  staged.push({ kind: "rename", id: e.id, next, msg: `"${e.from}" -> "${e.to}"   type ${e.was.type} -> ${e.type}   (coordinate unchanged)` });
}

for (const m of MOVES) {
  const row = byId.get(m.id), dRow = byId.get(m.donor);
  const wps = Array.isArray(row.waypoints) ? row.waypoints : null;
  const dwps = Array.isArray(dRow.waypoints) ? dRow.waypoints : null;
  if (!wps || !dwps) { refusals.push(`${m.id}/${m.donor}: waypoints is not an array`); continue; }
  const hits = wps.map((w, i) => ({ w, i })).filter(({ w }) => String((w || {}).name || "").trim() === m.name);
  const dHits = dwps.filter((w) => String((w || {}).name || "").trim() === m.name);
  if (hits.length !== 1) { refusals.push(`${m.id}: expected exactly 1 pin named "${m.name}", found ${hits.length}`); continue; }
  if (dHits.length !== 1) { refusals.push(`${m.donor}: expected exactly 1 donor pin named "${m.name}", found ${dHits.length}`); continue; }
  const { w, i } = hits[0], d = dHits[0];
  if (!near(num(w.lat), m.was.lat) || !near(num(w.lng), m.was.lng)) {
    refusals.push(`${m.id}: pin has moved (now ${w.lat},${w.lng}, expected ${m.was.lat},${m.was.lng})`); continue;
  }
  if (!near(num(d.lat), m.donorWas.lat) || !near(num(d.lng), m.donorWas.lng)) {
    refusals.push(`${m.donor}: donor pin has moved (now ${d.lat},${d.lng}, expected ${m.donorWas.lat},${m.donorWas.lng})`); continue;
  }
  if (!proseOf(m.id).includes(m.proseMustSay)) { refusals.push(`${m.id}: prose never says "${m.proseMustSay}"`); continue; }
  const next = wps.slice();
  next[i] = Object.assign({}, w, { lat: d.lat, lng: d.lng });
  staged.push({ kind: "move", id: m.id, next,
    msg: `"${m.name}"  ${m.was.lat},${m.was.lng} -> ${d.lat},${d.lng}   (${(D(m.was.lat, m.was.lng, num(d.lat), num(d.lng)) / 1000).toFixed(1)} km, off ${m.donor}; name and elevation unchanged)` });
}

if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  "));
  process.exit(1);
}
if (staged.length !== RENAMES.length + MOVES.length) { console.error("REFUSED - staged count does not match the table"); process.exit(1); }

for (const s of staged) console.log(`\n### ${s.id}   [${s.kind}]\n   ${s.msg}`);
console.log(`\n${staged.length} pin(s) on ${new Set(staged.map((s) => s.id)).size} route(s).`);
console.log(`The "Cache Col" move this also carried was landed by #1518 first; the contract refused rather than re-writing it.`);
console.log(`3 further splits left alone: Spider-Formidable Col, Heart Lake, Kool-Aid Lake — the row cannot say which half is wrong.`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

for (const s of staged) await patchRow("routes", s.id, { waypoints: s.next });
console.log(`\nwrote ${staged.length} value(s).`);

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const e of RENAMES) {
  const wps = after.get(e.id).waypoints || [];
  if (wps.some((w) => String((w || {}).name || "").trim() === e.from)) { console.error(`NOT APPLIED: ${e.id} still carries "${e.from}"`); bad++; }
  const got = wps.find((w) => String((w || {}).name || "").trim() === e.to);
  if (!got) { console.error(`NOT APPLIED: ${e.id} has no "${e.to}" pin`); bad++; continue; }
  if (String(got.type) !== e.type) { console.error(`TYPE NOT SET: ${e.id} "${e.to}" is type "${got.type}"`); bad++; }
  // A rename must NOT have moved anything.
  if (!near(num(got.lat), e.was.lat) || !near(num(got.lng), e.was.lng)) { console.error(`MOVED BY MISTAKE: ${e.id} "${e.to}" is now ${got.lat},${got.lng}`); bad++; }
  if (wps.length !== (byId.get(e.id).waypoints || []).length) { console.error(`WAYPOINTS LOST: ${e.id}`); bad++; }
}
for (const m of MOVES) {
  const wps = after.get(m.id).waypoints || [];
  const got = wps.find((w) => String((w || {}).name || "").trim() === m.name);
  if (!got) { console.error(`PIN LOST: ${m.id} "${m.name}"`); bad++; continue; }
  const d = (after.get(m.donor).waypoints || []).find((w) => String((w || {}).name || "").trim() === m.name);
  if (!d || !(D(num(got.lat), num(got.lng), num(d.lat), num(d.lng)) < 1)) { console.error(`NOT APPLIED: ${m.id} "${m.name}" is not on its donor`); bad++; }
  if (wps.length !== (byId.get(m.id).waypoints || []).length) { console.error(`WAYPOINTS LOST: ${m.id}`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: 3 pins renamed in place, 1 moved onto its donor, no route lost a waypoint.`);
process.exit(bad ? 1 : 0);
