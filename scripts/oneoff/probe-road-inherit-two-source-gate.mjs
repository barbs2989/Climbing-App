// Which of the 19 road-silent walkers can be filled WITHOUT research, and on what evidence?
//
// A bare sibling copy is not good enough, and this repo says why twice over:
//   - a peak can have TWO GENUINE APPROACHES (Remmel, Carru, Howard, Stuart's North Ridge), so a
//     sibling's road is not automatically this route's road; and
//   - `audit:trailhead-road` section 2 exists because a `road` block SURVIVES the trailhead it
//     described, so the sibling's block may itself name the wrong drainage.
// These 19 carry no trailhead coordinate, so the geometric check that would settle it is
// unavailable. Copying on sibling agreement alone would be manufacturing a record.
//
// THE GATE IS TWO INDEPENDENT SOURCES, the pattern this repo uses everywhere it repairs data:
//   (A) the ROUTE'S OWN prose names a road, and
//   (B) a SIBLING's road block names the same road.
// (A) is evidence about THIS route; (B) supplies the researched block. Neither alone is enough —
// (A) alone gives a road name and no status, (B) alone is the bare copy refused above. Together
// the copy is corroborated by the row itself.
//
// "A DRIVE HAS SEVERAL NAMED LEGS" is the precision trap here, recorded in audit:trailhead-road:
// "Ruth Creek Road (FSR 32)" and "Hannegan Pass Road" are one journey. So roads are compared on
// normalised tokens with the generic vocabulary stripped, never as strings.
//
// Read-only. Reports; writes nothing.
import { selectAll } from "../lib/supabase-env.mjs";

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

const rows = await selectAll("routes",
  "id,name,discipline,road,access,approach_logistics,waypoints,approach,beta,overview,dist_km,gain_ft,area_id",
  "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("read 0 routes — broken scan, not a clean catalog"); process.exit(1); }

const trailheadPin = (r) => (Array.isArray(r.waypoints) ? r.waypoints : []).some((w) => w && /trailhead/i.test(String(w.type || "")));
const walks = (r) => has(r.approach) || trailheadPin(r) || r.dist_km != null || r.gain_ft != null;
const roadSilent = (r) => !has(r.road) && !has(r.approach_logistics);
const targets = rows.filter((r) => walks(r) && roadSilent(r));

const byArea = {};
for (const r of rows) (byArea[r.area_id] = byArea[r.area_id] || []).push(r);

/* Road IDENTIFIERS, not road words. A number-bearing designator (FR 7601, SR-20, I-90, US 2) is
   the durable half of a road's identity and survives every wording variant; a proper-noun name
   ("Icicle", "Eightmile") is the other half. Generic vocabulary is stripped so that "Road" and
   "Forest" cannot make two unrelated roads look related. */
const GENERIC = new Set(["road", "rd", "roads", "creek", "river", "lake", "the", "and", "to", "from", "via", "at", "off",
  "forest", "service", "fs", "national", "park", "trailhead", "th", "highway", "hwy", "route", "pass",
  "north", "south", "east", "west", "upper", "lower", "spur", "access", "mile", "miles", "exit"]);

function roadTokens(text) {
  const out = new Set();
  if (typeof text !== "string") return out;
  /* designators: FR 7601 / FS-7600 / FSR 49 / SR-20 / US 2 / I-90 / Highway 20 */
  const re = /\b(?:FSR|FS|FR|NF|USFS|SR|US|I|Highway|Hwy)[\s-]?(\d{1,4})\b/gi;
  let m; while ((m = re.exec(text))) out.add(`#${m[1]}`);
  /* proper-noun road names: capitalised run immediately before Road/Rd/Highway/Hwy */
  const re2 = /\b((?:[A-Z][a-zA-Z]+[\s-]){1,3})(?:Road|Rd|Highway|Hwy)\b/g;
  while ((m = re2.exec(text))) for (const w of m[1].trim().split(/[\s-]+/)) { const t = w.toLowerCase(); if (!GENERIC.has(t)) out.add(t); }
  return out;
}
const inter = (a, b) => [...a].filter((x) => b.has(x));

const proseOf = (r) => [r.approach, r.beta, r.overview].filter((x) => typeof x === "string").join("\n");
const roadNameOf = (r) => (r.road || {}).name;

const pass = [], fail = [];
for (const t of targets) {
  const mine = roadTokens(proseOf(t));
  const sibs = (byArea[t.area_id] || []).filter((s) => s.id !== t.id && roadNameOf(s));
  const matches = [];
  for (const s of sibs) {
    const st = roadTokens(`${roadNameOf(s)} ${(s.road || {}).driveNote || ""} ${(s.road || {}).status || ""}`);
    const shared = inter(mine, st);
    if (shared.length) matches.push({ s, shared });
  }
  if (mine.size && matches.length) pass.push({ t, mine: [...mine], matches });
  else fail.push({ t, mine: [...mine], sibs: sibs.length, why: !mine.size ? "own prose names no road" : "no sibling names the same road" });
}

console.log(`\n=== two-source gate: own prose names the road AND a sibling's block names it too ===`);
console.log(`${targets.length} road-silent routes that describe a walk\n`);
console.log(`PASS the gate: ${pass.length}`);
for (const p of pass) {
  console.log(`\n  ${p.t.id}   [${p.t.discipline}]`);
  console.log(`     own prose road tokens: ${p.mine.join(", ")}`);
  const uniq = new Map();
  for (const m of p.matches) { const k = roadNameOf(m.s); if (!uniq.has(k)) uniq.set(k, m); }
  for (const [k, m] of [...uniq].slice(0, 3)) console.log(`     sibling ${m.s.id} shares [${m.shared.join(", ")}]  road.name="${k}"`);
  console.log(`     ${p.matches.length} sibling block(s) match on a road identifier`);
}

console.log(`\n\nFAIL the gate: ${fail.length}`);
for (const f of fail) console.log(`  ${f.t.id.padEnd(50)} ${f.why}  (own tokens: ${f.mine.join(",") || "none"}; ${f.sibs} siblings name a road)`);

console.log(`\nNothing was written. (A) is evidence about this route; (B) supplies the researched block.`);
console.log(`Neither alone is enough — a bare sibling copy would manufacture a record these routes`);
console.log(`have no trailhead coordinate to corroborate.`);
