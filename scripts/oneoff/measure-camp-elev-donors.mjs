// CORRECTION TO MY OWN SCOPING. measure-missing-camp-elevations.mjs asked whether another BIVY
// entry already knows a camp's height and answered "5 names". It never asked the other store.
//
// Campsite WAYPOINTS carry an elevation on 98% of rows, and the waypoint-repair pass has already
// located named camps from OSM — its own header names Skagit Queen Camp, which sits in the
// research list this script exists to shorten. So the question is not "what must be researched"
// but "what does this database already know under a different key".
//
// Same discipline as the camping memory's own lesson: check the existing files before
// commissioning a peak. This is that, one store over.
//
// A donor must clear three gates, because a NAME IS NOT AN IDENTITY here:
//   1. distinctive name tokens match (generic camp words carry no identity)
//   2. same region (ltree prefix) — two Lena Lakes, two Horseshoe Basins, three Mount Olympuses
//   3. the donated height is plausible for the RECIPIENT route: below its high point.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
const rows = await q("routes?select=id,area_id,high_point_ft,bivy,waypoints&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }
// Waypoint donors come from the WHOLE catalog, not only routes carrying bivy.
const wpRows = await q("routes?select=id,area_id,waypoints&waypoints=not.is.null&limit=1000");
if (!wpRows.length) { console.log("FAIL: read no waypoint rows"); process.exit(1); }

const areaIds = [...new Set([...rows, ...wpRows].map((x) => x.area_id).filter(Boolean))];
const pathOf = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  const ar = await q(`areas?select=id,path&id=in.(${chunk})`);
  for (const a of ar) pathOf.set(a.id, a.path);
}
if (!pathOf.size) { console.log("FAIL: no area paths — every region would collapse into one"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const ft = (b) => (has(b.elev) ? Number(b.elev) : has(b.elevM) ? Number(b.elevM) * 3.28084 : null);
const region = (id) => String(pathOf.get(id) || "").split(".").slice(0, 4).join(".");
const isCamp = (w) => /camp|bivy|bivouac/i.test(String((w && w.type) || ""));

// Lifted from solve-camps.mjs rather than reinvented: a camp word describes a camp without naming
// one, so treating it as distinctive makes every camp match every other camp.
const GENERIC = new Set(["camp", "camps", "campsite", "campground", "bivy", "bivouac", "high", "low",
  "upper", "lower", "the", "and", "near", "above", "below", "toe", "site", "sites", "hiker", "horse",
  "backcountry", "north", "south", "east", "west", "middle", "basin", "ridge", "creek", "lake",
  "lakes", "glacier", "point", "designated", "dispersed", "area", "trail", "trailhead"]);
const norm = (s) => String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const distinctive = (s) => new Set(norm(s).split(" ").filter((t) => t.length > 2 && !GENERIC.has(t)));
// Direction matters: the recipient may carry EXTRA words ("Luna Cirque high camp (near Lousy
// Lake)"); the donor may not carry words the recipient lacks.
function donorFitsLoose(donorName, recipientName) {
  const A = distinctive(donorName), B = distinctive(recipientName);
  if (!A.size) return false;
  for (const t of A) if (!B.has(t)) return false;
  return true;
}
// THE LOOSE GATE ABOVE IS UNSAFE AND IS KEPT ONLY TO MEASURE HOW UNSAFE. It accepted 478 rows,
// and reading them is what shows the number is worthless:
//   "SR 20 climbers' pullouts - the hairpin and the Silver Star Creek pullout" <- "Silver Lake
//   camp" 6,763 ft, matched on the single token `silver`; "Whitehorse Community Park campground,
//   Darrington" (a town park at ~550 ft) <- "Whitehorse Ridge Camp" 4,900 ft; "Luna Cirque floor"
//   <- "Luna Camp" 2,500 ft, which is down on the Big Beaver Trail; and "Whatcom Camp, Brush
//   Creek BELOW Whatcom Pass" <- "Whatcom Pass", where the recipient's own name says it is lower.
// The fault is the GENERIC list: it discards `pass`, `camp`, `lake`, `basin`, `col`, `creek` as
// noise, and those are FEATURE TYPES that discriminate. Whatcom Pass and Whatcom Camp are two
// different places sharing a proper noun. ONE DISTINCTIVE TOKEN IS NOT AN IDENTITY - the same
// lesson this catalog already paid for at the level of whole names, one level finer.
// So the real gate is IDENTITY, not overlap: the two names must normalise to the same string
// once only true noise is removed. Anything looser writes a plausible number, and a plausible
// number is worse than the blank it replaces.
const NOISE = /\b(the|a|an|and|at|on|in|of|for|from|to)\b/g;
const core = (s) => norm(s).replace(NOISE, " ").replace(/\s+/g, " ").trim();
function donorFits(donorName, recipientName) {
  const d = core(donorName), r = core(recipientName);
  if (!d || !r) return false;
  if (d === r) return true;
  // A recipient may append a locator after a comma or dash: "Skagit Queen Camp, Thunder Creek".
  // Its FIRST clause must then be exactly the donor. Nothing else counts.
  const first = core(String(recipientName).split(/[,\u2014\u2013]|\s-\s/)[0]);
  return first === d;
}

// Index every waypoint donor that HAS an elevation.
const donors = [];
for (const row of wpRows) {
  for (const w of arr(row.waypoints)) {
    if (!isCamp(w)) continue;
    const e = ft(w);
    if (e == null || !has(w.name)) continue;
    donors.push({ name: w.name, elev: e, region: region(row.area_id), from: row.id });
  }
}
console.log(`== waypoint donors carrying an elevation: ${donors.length}\n`);

let looseAccepted = 0;
let missing = 0, solved = 0, rejectedRegion = 0, rejectedElev = 0;
const solvedNames = new Map();
for (const row of rows) {
  const reg = region(row.area_id);
  const hp = has(row.high_point_ft) ? Number(row.high_point_ft) : null;
  for (const b of arr(row.bivy)) {
    if (ft(b) != null || !has(b.name)) continue;
    missing++;
    const loose = donors.filter((d) => donorFitsLoose(d.name, b.name));
    if (loose.length) looseAccepted++;
    const named = donors.filter((d) => donorFits(d.name, b.name));
    if (!named.length) continue;
    const sameRegion = named.filter((d) => d.region === reg);
    if (!sameRegion.length) { rejectedRegion++; continue; }
    const plausible = sameRegion.filter((d) => hp == null || d.elev <= hp + 200);
    if (!plausible.length) { rejectedElev++; continue; }
    solved++;
    const key = b.name;
    if (!solvedNames.has(key)) solvedNames.set(key, { elev: plausible[0].elev, from: plausible[0].from, donor: plausible[0].name, rows: 0 });
    solvedNames.get(key).rows++;
  }
}

console.log(`   bivy sites with no elevation      : ${missing}`);
console.log(`   the LOOSE token gate would accept  : ${looseAccepted} row(s)  <- measured, and mostly WRONG (see header)`);
console.log(`   SOLVABLE from a waypoint donor    : ${solved} row(s), ${solvedNames.size} distinct name(s)`);
console.log(`   rejected — donor in another region: ${rejectedRegion}   <- the name-is-not-an-identity gate`);
console.log(`   rejected — height above the peak  : ${rejectedElev}\n`);
if (solvedNames.size) {
  console.log(`   what the catalog already knows (top 30):`);
  [...solvedNames.entries()].sort((a, b) => b[1].rows - a[1].rows).slice(0, 30).forEach(([n, v]) =>
    console.log(`      ${String(v.rows).padStart(3)} row(s)  ${Math.round(v.elev).toString().padStart(6)} ft  "${n.slice(0, 52)}"  <- "${v.donor.slice(0, 34)}" on ${v.from}`));
}
console.log(solved
  ? `\n   -> ${solved} row(s) need no research at all. Re-homing, gated, verifiable in the database.`
  : `\n   -> nothing is answerable from the waypoint store; the research list stands as measured.`);
