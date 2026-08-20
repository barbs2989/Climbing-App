// Can the two-source gate be satisfied by a TRAILHEAD name instead of a road name?
//
// The gate as applied required the route's own prose to name a ROAD. But "Start at the Stuart Lake
// Trailhead" identifies which access a route uses just as precisely as "FR 7601" does — and on a
// peak with two trailheads it is arguably the sharper evidence, because the trailhead is the thing
// that actually differs. A route can describe its whole approach without ever naming the tarmac.
//
// So: for each remaining road-silent walker, does its own prose name a trailhead that a SIBLING's
// road block also names? If so the donor is picked by the row itself, exactly as before.
//
// PRECISION RULE, learned the expensive way in audit:trailhead-road: compare on the DISTINCTIVE
// tokens of the trailhead name, never on the phrase. "Stuart Lake Trailhead" and "Stuart Lake /
// Colchuck Lake Trailhead" are one place; "Trailhead" alone is in every one of them.
//
// Read-only. Reports candidates for reading — it does not widen the applied gate by itself.
import { selectAll } from "../lib/supabase-env.mjs";

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

const rows = await selectAll("routes",
  "id,name,discipline,area_id,road,approach_logistics,waypoints,approach,beta,overview,dist_km,gain_ft",
  "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("read 0 routes — broken scan"); process.exit(1); }

const trailheadPin = (r) => (Array.isArray(r.waypoints) ? r.waypoints : []).some((w) => w && /trailhead/i.test(String(w.type || "")));
const walks = (r) => has(r.approach) || trailheadPin(r) || r.dist_km != null || r.gain_ft != null;
const roadSilent = (r) => !has(r.road) && !has(r.approach_logistics);
const targets = rows.filter((r) => walks(r) && roadSilent(r));

const byArea = {};
for (const r of rows) (byArea[r.area_id] = byArea[r.area_id] || []).push(r);

/* Words that appear in every trailhead name and therefore identify none of them. Without this the
   bare word "Trailhead" matches every donor and the gate becomes vacuous — the failure mode this
   repo records as "a too-narrow proxy", here in its too-WIDE form. */
const GENERIC = new Set(["trailhead", "trail", "th", "road", "rd", "the", "and", "to", "from", "at", "of", "or",
  "creek", "river", "lake", "pass", "peak", "mountain", "mount", "mt", "camp", "campground", "basin",
  "north", "south", "east", "west", "upper", "lower", "old", "new", "forest", "service", "national", "park",
  "area", "access", "point", "start", "parking", "lot", "via", "off", "near", "main"]);

/* A capitalised run immediately before "Trailhead"/"TH" is a trailhead name. */
function trailheadTokens(text) {
  const out = new Set();
  if (typeof text !== "string") return out;
  const re = /\b((?:[A-Z][a-zA-Z']+[\s\/-]){1,4})(?:Trailhead|TH\b)/g;
  let m;
  while ((m = re.exec(text))) {
    for (const w of m[1].trim().split(/[\s\/-]+/)) {
      const t = w.toLowerCase().replace(/[^a-z']/g, "");
      if (t && !GENERIC.has(t)) out.add(t);
    }
  }
  return out;
}
const proseOf = (r) => [r.approach, r.beta, r.overview].filter((x) => typeof x === "string").join("\n");
const donorText = (s) => { const d = s.road || {}; return [d.name, d.driveNote, d.status].filter((x) => typeof x === "string").join(" "); };

let converted = 0;
console.log(`\n=== can a TRAILHEAD name satisfy the two-source gate? ===`);
console.log(`${targets.length} road-silent routes that describe a walk\n`);

for (const t of targets) {
  const mine = trailheadTokens(proseOf(t));
  const sibs = (byArea[t.area_id] || []).filter((s) => s.id !== t.id && (s.road || {}).name);
  const matches = [];
  for (const s of sibs) {
    const st = trailheadTokens(donorText(s));
    const shared = [...mine].filter((x) => st.has(x));
    if (shared.length) matches.push({ s, shared });
  }
  if (!mine.size) { console.log(`  ${t.id.padEnd(50)} own prose names no trailhead`); continue; }
  if (!matches.length) { console.log(`  ${t.id.padEnd(50)} names [${[...mine].join(",")}] — no sibling block names it (${sibs.length} donors)`); continue; }
  converted++;
  const uniq = new Map();
  for (const m of matches) { const k = (m.s.road || {}).name; if (!uniq.has(k)) uniq.set(k, m); }
  console.log(`\n  CANDIDATE ${t.id}   [${t.discipline}]`);
  console.log(`     own prose trailhead tokens: ${[...mine].join(", ")}`);
  for (const [k, m] of [...uniq].slice(0, 4)) console.log(`     donor ${m.s.id} shares [${m.shared.join(",")}]  road.name="${String(k).slice(0, 90)}"`);
  console.log(`     ${uniq.size} DISTINCT donor block(s) — more than one means the peak offers more than one drive, so read before copying`);
}

console.log(`\n${converted} of ${targets.length} would newly pass a trailhead-name gate.`);
console.log(`Candidates for READING, not a licence to copy: a single shared token is weaker evidence`);
console.log(`than a road designator, and a peak with two trailheads still needs the row to pick one.`);
