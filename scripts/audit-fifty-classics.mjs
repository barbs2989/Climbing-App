// Which of the Fifty Classic Climbs of North America does the catalog hold, and which of
// those are tagged so the Challenges list can find them?
//
// Read-only by default. --write tags the matches it is confident about and re-reads them
// afterwards to reconcile, because a PostgREST 200 is not evidence anything changed.
//
// ---------------------------------------------------------------------------------------
// Matching goes through the AREA TREE, not the route id and not the area name alone.
// ---------------------------------------------------------------------------------------
// ~91% of route ids here are minted from the route NAME and are not peak-scoped, so
// "North Ridge" identifies no mountain (CLAUDE.md, "Route identity"). But matching on the
// area's own name is not enough either, and the first version of this script under-reported
// because of it:
//
//   Salathé Wall     lives on "2. Southwest Face", whose path is
//                    …ca_yosemite_valley.ca_valley_north_side.ca_b_el_capitan.ca_2_southwest_face
//   Ellingwood Ledges lives on "Crestones, The", not on a "Crestone Needle" area
//   Durrance Route    lives on "Durrance Approach", a child of wy_devils_tower
//
// All three were reported "not in the catalog" while sitting in it. Yosemite's areas carry
// ordinal prefixes ("2.", "B.", "M."), formations are grouped plurally, and the real climb
// often hangs off a CHILD of the peak. So: resolve the peak to one or more areas, expand to
// every descendant via the ltree `path`, and look for the route anywhere in that subtree.
//
// A route found this way still has to pass the region check below — a name match that crosses
// states is a collision, not a find.
import { SUPABASE_URL, headers, anonKey, requireServiceKey, patchRow } from "./lib/supabase-env.mjs";
import { FIFTY_CLASSICS, routeInList } from "../lib/lists.js";

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const VERBOSE = argv.includes("--verbose");
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

async function q(path) {
  for (let a = 0; a < 4; a++) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`${path} -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 700 * (a + 1)));
  }
}

const norm = s => String(s || "").toLowerCase()
  .replace(/[àáâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[íìîï]/g, "i")
  .replace(/[óòôö]/g, "o").replace(/[úùûü]/g, "u")
  .replace(/[^a-z0-9]+/g, " ").trim();

// "2. Southwest Face" / "M. Sentinel Rock" / "B. El Capitan" — Yosemite's guidebook ordering
// leaks into the area names. Also "Crestones, The" -> "the crestones".
function areaName(s) {
  let t = String(s || "").replace(/^\s*[0-9]{1,2}\s*[.)]\s*/, "").replace(/^\s*[A-Z]\s*[.)]\s*/, "");
  t = t.replace(/^(.*),\s*(the|a)\s*$/i, "$2 $1");
  return t;
}
// Drop the words that carry no identity, then singularise, so "Crestones" meets "Crestone"
// and "Mount Temple" meets "Temple".
const STOP = /\b(mount|mt|the|peak|mountain|spire|tower|dome|rock|group|massif|formation)\b/g;
// Trailing "s" only. Stripping "es" turns "Crestones" into `creston`, which then fails to meet
// "Crestone" from "Crestone Needle" — and Ellingwood Ledges was reported absent from a catalog
// that holds it, for exactly that reason.
const stem = w => w.replace(/s$/, "");
const peakKey = s => norm(areaName(s)).replace(STOP, " ").split(/\s+/).filter(Boolean).map(stem).join(" ").trim();
// "direct" is NOT a stopword. It is a meaningful qualifier in a route name — Devils Thumb
// has both an "East Ridge (via Southeast face)" and a "Direct East Ridge", and stripping the
// word made the direct variation an exact match for the book's plain "East Ridge" and let it
// win. The book names the direct line explicitly when it means one (#27 Direct Exum Ridge).
// `spire` is dropped here for the same reason peakKey drops it: the book writes the formation
// into the route name ("Lost Arrow Spire Tip") where the catalog does not ("Lost Arrow Tip").
// Without this the only candidate left was "Lost Arrow Spire Direct" — a different line, which
// an earlier run of this script duly tagged. 0131 corrects that tag.
const routeKey = s => norm(s).replace(/\b(route|the|complete|standard|spire)\b/g, " ").split(/\s+/).filter(Boolean).join(" ").trim();

// Every US route id in this catalog is prefixed with its two-letter state. So a Canadian entry
// matching a US-prefixed id is a name collision, not a find — that is how "Mount Temple"
// (Alberta) attached itself to "Minerva's Temple" in New Mexico. Both directions are checked.
const REGION_PREFIX = {
  Alaska: "ak", Washington: "wa", Wyoming: "wy", Colorado: "co",
  Utah: "ut", California: "ca", "New Mexico": "nm",
  // Canadian provinces use their own two-letter codes for the same reason the states do, and
  // none of them collide with a US prefix. `ca_` was the wrong choice for Canada — it is
  // California here, and 0131 moves those rows off it. Matching positively rather than by
  // "not a US prefix" is what makes that mistake impossible to repeat silently.
  "British Columbia": "bc", Alberta: "ab", Yukon: "yt", "Northwest Territories": "nt",
};
const US_PREFIX = /^(a[klrz]|c[aot]|de|fl|ga|hi|i[adln]|k[sy]|la|m[adeinost]|n[cdehjmvy]|o[hkr]|pa|ri|s[cd]|t[nx]|ut|v[at]|w[aivy])_/;
const regionOk = (routeId, region) => {
  const id = String(routeId).toLowerCase();
  const want = REGION_PREFIX[region];
  if (!want) return !US_PREFIX.test(id);
  return id.startsWith(want + "_");
};

// The whole area tree, once. 47k rows is one paginated read and makes the subtree expansion
// below a local operation; `path` is ltree, which PostgREST cannot LIKE, so it has to be
// filtered here anyway (the same note audit-waypoints records).
process.stderr.write("loading areas…\n");
const areas = [];
for (let after = ""; ;) {
  const page = await q(`areas?select=id,name,path,area_type&order=id.asc&limit=1000${after ? `&id=gt.${encodeURIComponent(after)}` : ""}`);
  if (!page.length) break;
  areas.push(...page);
  after = page[page.length - 1].id;
  if (page.length < 1000) break;
}
process.stderr.write(`  ${areas.length} areas\n`);
const segsOf = a => String(a.path || "").split(".");

const found = [], missing = [], ambiguous = [], wrongRegion = [];

for (const c of FIFTY_CLASSICS) {
  const pk = peakKey(c.peak);
  if (!pk) { missing.push({ ...c, why: "peak name normalises to nothing" }); continue; }
  // Areas whose own name IS the peak. Subset as well as equality, because the catalog groups
  // formations plurally: Ellingwood Ledges sits on "Crestones, The", which normalises to
  // `crestone` while the book says "Crestone Needle" -> `crestone needle`. Equality alone
  // reported that one absent while it was in the catalog. A shared token must be ≥4 chars so
  // this cannot marry two formations on "the" or "east".
  const pkTok = pk.split(" ").filter(Boolean);
  const peakAreas = areas.filter(a => {
    const ak = peakKey(a.name);
    if (!ak) return false;
    if (ak === pk || ak.split(" ").join("") === pk.split(" ").join("")) return true;
    const akTok = ak.split(" ").filter(Boolean);
    // Anchored on the LEADING token and at most one token apart. A bare token-subset test is
    // far too loose: "Needle Rock" is a subset of "Crestone Needle" on the word "needle" and
    // is a different formation in a different range. This admits "Crestones, The" -> "Crestone
    // Needle" and refuses that.
    if (akTok[0] !== pkTok[0]) return false;
    if (Math.abs(akTok.length - pkTok.length) > 1) return false;
    const sub = akTok.every(t => pkTok.includes(t)) || pkTok.every(t => akTok.includes(t));
    return sub && pkTok[0].length >= 4;
  }).filter(a => regionOk(a.id, c.region));
  if (!peakAreas.length) { missing.push({ ...c, why: "no area for this formation" }); continue; }
  // …plus every area beneath them.
  const peakIds = new Set(peakAreas.map(a => a.id));
  const subtree = areas.filter(a => peakIds.has(a.id) || segsOf(a).some(s => peakIds.has(s)));

  let cands = [];
  const want = routeKey(c.route);
  for (const a of subtree.slice(0, 60)) {
    const rs = await q(`routes?select=id,name,area_id,lists,classic&area_id=eq.${encodeURIComponent(a.id)}&limit=1000`);
    for (const r of rs) {
      const rk = routeKey(r.name);
      if (!rk || !want) continue;
      if (!(rk === want || rk.includes(want) || want.includes(rk))) continue;
      if (!regionOk(r.id, c.region)) { wrongRegion.push(`#${c.n} ${c.peak} · ${c.route} ~ ${r.id}`); continue; }
      cands.push({ r, a });
    }
  }
  if (!cands.length) {
    missing.push({ ...c, why: `formation present (${peakAreas.map(a => a.name).slice(0, 2).join(", ")}; ${subtree.length} area(s) in subtree) but no route matching "${c.route}"` });
    continue;
  }
  // A generic feature name ("North Face", "East Ridge") recurs on every formation in a
  // range, so allowing the whole subtree matches a NEIGHBOUR. Half Dome's entry attached
  // itself to "Direct Northwest Face" on Porcelain Wall — a child of ca_d_half_dome but a
  // different wall — and Fairview Dome's to "The North Face" on Leaning Towers. A distinctive
  // name (The Nose, Durrance, D1, Traveler Buttress) is safe anywhere in the subtree; a
  // generic one has to be on the formation itself.
  const GENERIC = /^(north|south|east|west|northeast|northwest|southeast|southwest)?\s*(face|ridge|buttress|arete|couloir|slab|gully|rib|wall)$/;
  if (GENERIC.test(want)) cands = cands.filter(x => peakIds.has(x.a.id));
  if (!cands.length) {
    missing.push({ ...c, why: `formation present (${peakAreas.map(a => a.name).slice(0, 2).join(", ")}) but no route named "${c.route}" ON it — a generic feature name is only accepted on the formation itself, not a neighbour in its subtree` });
    continue;
  }
  // Tie-break only: an "Alt. Start" or a named variation is not the line the book lists.
  // Applied as a preference, never as an exclusion — if a variation is the ONLY candidate it
  // still gets reported rather than silently dropped.
  // A "Direct" counts as a variation only when the book did NOT ask for the direct line.
  const wantsDirect = /\bdirect\b/i.test(c.route);
  const VARIATION = wantsDirect ? /\balt\b|\balternate\b|\bvariation\b|\bvar\.?\b/i
                                : /\balt\b|\balternate\b|\bvariation\b|\bvar\.?\b|\bdirect\b/i;
  if (cands.length > 1 && cands.some(x => !VARIATION.test(x.r.name))) cands = cands.filter(x => !VARIATION.test(x.r.name));
  const exact = cands.filter(x => routeKey(x.r.name) === want);
  const pick = exact.length === 1 ? exact[0] : (cands.length === 1 ? cands[0] : null);
  if (!pick) { ambiguous.push({ ...c, cands: cands.map(x => `${x.r.id} (${x.a.name}: ${x.r.name})`) }); continue; }
  found.push({ ...c, id: pick.r.id, area: pick.a.name, routeName: pick.r.name,
    tagged: routeInList(pick.r, "fifty"), classic: pick.r.classic === true, lists: pick.r.lists });
}

console.log("\n=== Fifty Classic Climbs of North America — catalog coverage ===");
console.log(`in the catalog: ${found.length} of 50`);
console.log(`  already tagged for the Challenges list: ${found.filter(f => f.tagged).length}`);
console.log(`ambiguous (needs a human): ${ambiguous.length}`);
console.log(`not in the catalog: ${missing.length}`);
console.log(`rejected as wrong-region name collisions: ${wrongRegion.length}`);

console.log("\n-- found --");
found.forEach(f => console.log(` #${String(f.n).padStart(2)} ${f.peak} · ${f.route}\n      ${f.id} (${f.area}: ${f.routeName})${f.tagged ? "  [tagged]" : "  [UNTAGGED]"}`));
if (ambiguous.length) {
  console.log("\n-- ambiguous, not written --");
  ambiguous.forEach(a => console.log(` #${a.n} ${a.peak} · ${a.route}\n      ${a.cands.slice(0, 6).join("\n      ")}`));
}
console.log("\n-- not in the catalog --");
missing.forEach(m => console.log(` #${String(m.n).padStart(2)} ${m.peak} · ${m.route} (${m.region})\n      ${m.why}`));
if (VERBOSE && wrongRegion.length) { console.log("\n-- rejected: right name, wrong region --"); wrongRegion.forEach(w => console.log("  " + w)); }

if (!WRITE) { console.log("\n(read-only; pass --write to tag the found routes)"); process.exit(0); }

const todo = found.filter(f => !f.tagged || !f.classic);
console.log(`\nwriting ${todo.length} route(s)…`);
for (const f of todo) {
  const cur = Array.isArray(f.lists) ? f.lists.slice() : (f.lists ? [f.lists] : []);
  if (!cur.some(x => String(x).toLowerCase() === "fifty_classics")) cur.push("fifty_classics");
  await patchRow("routes", f.id, { lists: cur, classic: true });
  console.log(`  ${f.id} <- ${JSON.stringify(cur)}`);
}
let ok = 0;
for (const f of todo) {
  const back = await q(`routes?select=id,lists,classic&id=eq.${encodeURIComponent(f.id)}`);
  const r = back[0];
  if (r && r.classic === true && routeInList(r, "fifty")) ok++;
  else console.error(`  RECONCILE FAILED: ${f.id} -> ${JSON.stringify(r)}`);
}
console.log(`reconciled ${ok}/${todo.length}`);
process.exit(ok === todo.length ? 0 : 1);
