// IS THIS CAMP PLAUSIBLY USABLE FOR THIS ROUTE?  (audit:camp-route-fit)
//
// audit:camp-elevations surfaced this as a side effect and could not answer it: wa_ellation, a
// 5,000 ft route on Mamie Peak, is offered "Ruth Mountain summit camp" at 7,100 ft — a real camp,
// with a correct elevation, on a different mountain 7.2 km away. A zone file handed every camp in
// a corridor to every route in it. The elevations are right; the PAIRING is noise.
//
// PRECISION WAS MEASURED BEFORE THIS WAS PROMOTED, because audit:area-parents shipped 41 findings
// of which 12 were real and this repo records that as the standard. Of 5,070 (route, camp) pairs,
// 315 name a different distinctive peak, and only 6 clear both dials. Of those, the route's own
// prose never mentions the named peak in 5 — so the finding carries its own corroboration.
// REPORT-ONLY. The repair is a judgement per row (does this route keep this camp?), and a shared
// corridor camp is CORRECT, so this must never become a sweep.
//
// THIS UNDER-REPORTS ITS OWN CLASS, AND THE WIDER VERSION WAS MEASURED AND REJECTED.
// Reading the repair context for the 6 findings showed the problem is larger than the 6:
// Mount Pilchuck (5,324 ft) carries EIGHT camps and SEVEN belong to other mountains — Three
// Fingers (the Lookout, Tin Can Gap, Goat Flats, Saddle Lake), Whitehorse (x2) and Big Four.
// Only "Bathtub Lakes basin, east of Mount Pilchuck" is actually its own. This audit caught
// exactly ONE of those seven, because it requires the camp to name a distinctive UNIQUE PEAK and
// "Tin Can Gap", "Goat Flats" and "Saddle Lake" name no peak at all.
//
// The obvious widening — drop the peak requirement and flag any camp whose name the route's own
// prose never mentions — was built and measured (measure-foreign-camp-lists.mjs) and is NOT
// shipped. Across 765 routes the ratio is smooth across every bucket with a median near 40-50%:
// a route not mentioning most of its camps is NORMAL, so >=75% is not an outlier, it is 130
// routes. The worst hit had 603 characters of prose — thin, not defective.
//
// So the prose test is CORROBORATION ON TOP OF a geometric signal, not a detector on its own.
// That is why it is folded in per-finding here rather than used to select findings. Closing the
// rest of this class needs a signal that says which TRAILHEAD a camp serves, which the catalog
// does not record.
//
// WHY THE OBVIOUS SIGNAL IS TOO WEAK ON ITS OWN. "The camp names a different peak" describes
// almost every correct camp in the catalog: Boston Basin serves Boston, Forbidden and Sahale, and
// a shared camp is the entire point of a zone file. Elevation alone is no better — a traverse camp
// on a neighbouring higher summit is correct ("South Twin Sister summit bivies" serves four lower
// Sisters because it IS the range high point).
//
// What separates Ellation from Twin Sisters is DISTANCE AND MAGNITUDE together:
//     South Twin Sister  ->  North Twin Sister     288 ft higher, same massif, adjacent
//     Ruth Mountain      ->  Mamie Peak          2,100 ft higher, 7.2 km away
//
// Camps carry no coordinates (4 of 5,083), but a camp that NAMES a peak inherits that peak's
// coordinate from the catalog's own `areas` table — so the distance is measurable without
// inventing anything.
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};

const rows = await q("routes?select=id,name,area_id,high_point_ft,bivy,overview,approach,beta,climbing_route,approach_logistics&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read no routes carrying bivy"); process.exit(1); }
// Every PEAK the catalog knows, as a name -> coordinate index. Peaks only: a camp named after a
// creek or a lake tells us nothing about which summit it serves.
const peaks = await q("areas?select=id,name,lat,lng,area_type&area_type=eq.peak&limit=1000");
if (!peaks.length) { console.log("FAIL: read no peak areas — every camp would look unnamed"); process.exit(1); }
const areaIds = [...new Set(rows.map((x) => x.area_id).filter(Boolean))];
const areaOf = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  for (const a of await q(`areas?select=id,name,lat,lng&id=in.(${chunk})`)) areaOf.set(a.id, a);
}

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const ftOf = (b) => (has(b.elev) ? Number(b.elev) : has(b.elevM) ? Number(b.elevM) * 3.28084 : null);
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

// A peak name is only usable as a signal if it is DISTINCTIVE. "Middle Peak", "North Peak" and
// "The Tower" exist many times over, so matching them tells us nothing about which one is meant —
// the "a name is not an identity" rule, which this whole area of the catalog keeps re-teaching.
const nameCount = new Map();
for (const p of peaks) nameCount.set(norm(p.name), (nameCount.get(norm(p.name)) || 0) + 1);
const GENERIC_PEAK = /^(the |mount |mt )?(north|south|east|west|middle|centre|center|little|big|upper|lower|first|second|third)?\s*(peak|tower|spire|point|mountain|summit|dome|butte)$/;
const usable = peaks.filter((p) => has(p.lat) && has(p.lng)
  && nameCount.get(norm(p.name)) === 1
  && norm(p.name).split(" ").length >= 2
  && !GENERIC_PEAK.test(norm(p.name)));
console.log(`${peaks.length} peak areas; ${usable.length} have a distinctive, unique, located name usable as a signal\n`);

let pairs = 0, named = 0;
const cands = [];
for (const r of rows) {
  const area = areaOf.get(r.area_id);
  if (!area || !has(area.lat)) continue;
  const hp = has(r.high_point_ft) ? Number(r.high_point_ft) : null;
  for (const b of arr(r.bivy)) {
    if (!has(b.name)) continue;
    pairs++;
    const n = norm(b.name);
    // Which distinctive peak, if any, does this camp NAME?
    const hit = usable.find((p) => n.includes(norm(p.name)) && p.id !== r.area_id);
    if (!hit) continue;
    named++;
    const d = km(area, hit);
    const e = ftOf(b);
    const above = hp != null && e != null ? e - hp : null;
    // THE ROUTE'S OWN PROSE IS A THIRD RECORD, and folding it in here rather than leaving it to
    // a separate script is what turns a geometric hypothesis into evidence. If the route names
    // the peak its camp names, parties really do stage there and the pairing is deliberate. If it
    // never mentions it, NOTHING in the row connects the route to that place — the camp arrived
    // from a zone file. Measured on the first run: 7 of 8 candidates were silent.
    // The camp entry itself is excluded, because it IS the thing under suspicion.
    const leaves = [];
    const walk = (v) => {
      if (typeof v === "string") leaves.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(r.overview); walk(r.approach); walk(r.beta); walk(r.climbing_route); walk(r.approach_logistics);
    const prose = leaves.join("  ").toLowerCase();
    const key = norm(hit.name).replace(/\s+(peaks?|mountain)$/, "");
    const mentioned = prose.includes(norm(hit.name)) || (key.length > 3 && prose.includes(key));
    cands.push({ route: r.id, routeName: r.name, areaName: area.name, hp, camp: b.name, elev: e, peak: hit.name, d, above, mentioned, proseLen: prose.length });
  }
}

console.log(`${pairs} (route, camp) pairs; ${named} name a DIFFERENT distinctive peak\n`);

// Two dials, reported at several settings, because the honest question is where the signal
// actually separates — not what threshold produces a wanted answer. Fitting a threshold to the
// case that prompted the detector proves nothing.
console.log(`-- HOW MANY SURVIVE EACH COMBINATION (route peak -> named peak distance, camp above route high point)\n`);
console.log(`        ${[0, 500, 1000, 2000].map((a) => `>${a}ft`.padStart(8)).join("")}`);
for (const dk of [2, 5, 10, 20]) {
  const row = [0, 500, 1000, 2000].map((af) =>
    String(cands.filter((c) => c.d > dk && c.above != null && c.above > af).length).padStart(8)).join("");
  console.log(`   >${String(dk).padStart(2)}km${row}`);
}

const strong = cands.filter((c) => c.d > 5 && c.above != null && c.above > 500).sort((a, b) => b.d - a.d);
console.log(`\n-- CANDIDATES at >5 km AND >500 ft above the route's high point: ${strong.length}`);
console.log(`   READ THESE. A camp shared across a corridor is CORRECT; this is a hypothesis list.\n`);
const silent = strong.filter((c) => !c.mentioned);
console.log(`   of those, the route's own prose NEVER mentions the named peak: ${silent.length}/${strong.length}\n`);
strong.slice(0, 25).forEach((c) => {
  console.log(`   ${c.mentioned ? "prose mentions it " : "PROSE IS SILENT   "}${c.d.toFixed(1).padStart(5)} km  +${String(Math.round(c.above)).padStart(4)} ft   ${c.route}`);
  console.log(`             "${String(c.camp).slice(0, 52)}" ${c.elev} ft  names ${c.peak}`);
  console.log(`             route is on ${c.areaName} (${c.hp} ft), ${c.proseLen} chars of prose`);
});

// The near-miss population, so the threshold can be judged rather than trusted.
const near = cands.filter((c) => c.d > 5 && c.above != null && c.above > 0 && c.above <= 500);
console.log(`\n-- JUST BELOW the elevation dial (>5 km, 0-500 ft above): ${near.length}`);
near.slice(0, 8).forEach((c) => console.log(`   ${c.mentioned ? "mentions " : "SILENT   "}${c.d.toFixed(1)} km  +${Math.round(c.above)} ft  ${c.route}  "${String(c.camp).slice(0, 40)}" names ${c.peak}`));
console.log(`\nREPORT-ONLY, and a SILENT row is not proof: a route may simply have thin prose.`);
console.log(`But a camp 15 km away, ABOVE the summit, that the route never mentions has no`);
console.log(`evidence for it anywhere in the row. Read each one before removing anything.`);
if (!cands.length) { console.log("\nFAIL: no camp names any distinctive peak — the name index broke"); process.exit(1); }
