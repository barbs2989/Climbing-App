// Which of the Fifty Classic Climbs of North America does the catalog actually hold, and
// which of those are tagged so the Challenges screen can find them?
//
// Two separate questions, and both were unanswered. The catalog holds five of the fifty
// tagged "fifty_classics" (all in Washington), while the Challenges screen looks them up as
// "fifty" — so the list rendered 0 of 50 with the data present. lib/lists.js reconciles the
// naming; this measures the coverage underneath it.
//
// Read-only by default. --write tags the matches it is confident about, and re-reads them
// afterwards to reconcile, because a PostgREST 200 is not evidence anything changed.
//
// Matching goes through the AREA name, never the route id: ~91% of route ids in this catalog
// are minted from the route name and are not peak-scoped, so "North Ridge" identifies no
// mountain at all (CLAUDE.md, "Route identity"). A candidate must match on both the peak and
// the route, and anything ambiguous is reported rather than written.
import { SUPABASE_URL, headers, anonKey, requireServiceKey, patchRow } from "./lib/supabase-env.mjs";
import { FIFTY_CLASSICS, routeInList } from "../lib/lists.js";

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
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
// "Mount"/"Mt", "The", possessives — noise when comparing a guidebook name to a catalog name.
const peakKey = s => norm(s).replace(/\b(mount|mt|the|peak|mountain|spire|tower|dome|rock)\b/g, " ").replace(/\s+/g, " ").trim();
const routeKey = s => norm(s).replace(/\b(route|the|direct|complete|standard)\b/g, " ").replace(/\s+/g, " ").trim();

// A name match alone crosses regions, and the first run proved it: "Mount Temple" (Alberta)
// matched "Minerva's Temple" in New Mexico, and "Half Dome" matched "Gertch's Half Brother".
// That is the contamination fingerprint CLAUDE.md describes, so the region has to be checked
// as well as the name. Route ids carry a state prefix; Canadian entries have no expected
// prefix, so they are accepted only when nothing else disputes them and reported as such.
const REGION_PREFIX = {
  "Alaska": "ak", "Washington": "wa", "Wyoming": "wy", "Colorado": "co",
  "Utah": "ut", "California": "ca", "New Mexico": "nm",
};
// Every US route id in this catalog is prefixed with its two-letter state. So a Canadian
// entry matching a US-prefixed id is a name collision, not a find — that is how "Mount
// Temple" (Alberta) attached itself to "Minerva's Temple" in New Mexico. Requiring a positive
// prefix match for US entries and rejecting one for Canadian entries covers both directions.
const US_PREFIX = /^(a[klrz]|c[aot]|de|fl|ga|hi|i[adln]|k[sy]|la|m[adeinost]|n[cdehjmvy]|o[hkr]|pa|ri|s[cd]|t[nx]|ut|v[at]|w[aivy])_/;
const regionOk = (routeId, region) => {
  const id = String(routeId).toLowerCase();
  const want = REGION_PREFIX[region];
  if (!want) return !US_PREFIX.test(id); // Canada/Yukon: must NOT be a US-prefixed route
  return id.startsWith(want + "_");
};

const found = [], missing = [], ambiguous = [], wrongRegion = [];

for (const c of FIFTY_CLASSICS) {
  const pk = peakKey(c.peak);
  // Search areas by the most distinctive word in the peak name.
  const word = pk.split(" ").filter(Boolean).sort((a, b) => b.length - a.length)[0] || pk;
  const areas = await q(`areas?select=id,name,region,path&name=ilike.*${encodeURIComponent(word)}*&limit=200`);
  const areaHits = areas.filter(a => {
    const ak = peakKey(a.name);
    return ak === pk || ak.includes(pk) || pk.includes(ak);
  });
  if (!areaHits.length) { missing.push({ ...c, why: "no matching area" }); continue; }

  let cands = [];
  for (const a of areaHits.slice(0, 20)) {
    const rs = await q(`routes?select=id,name,area_id,lists,classic&area_id=eq.${encodeURIComponent(a.id)}&limit=1000`);
    for (const r of rs) {
      const rk = routeKey(r.name), want = routeKey(c.route);
      if (!rk || !want) continue;
      if (!(rk === want || rk.includes(want) || want.includes(rk))) continue;
      if (!regionOk(r.id, c.region)) { wrongRegion.push(`#${c.n} ${c.peak} · ${c.route} (${c.region}) ~ ${r.id} (${a.name}: ${r.name})`); continue; }
      cands.push({ r, a });
    }
  }
  if (!cands.length) { missing.push({ ...c, why: `area present (${areaHits[0].name}) but no matching route` }); continue; }
  // Prefer an exact route-name match when several lines on the peak share a prefix.
  const exact = cands.filter(x => routeKey(x.r.name) === routeKey(c.route));
  const pick = exact.length === 1 ? exact[0] : (cands.length === 1 ? cands[0] : null);
  if (!pick) { ambiguous.push({ ...c, cands: cands.map(x => `${x.r.id} (${x.a.name}: ${x.r.name})`) }); continue; }
  found.push({ ...c, id: pick.r.id, area: pick.a.name, routeName: pick.r.name,
    tagged: routeInList(pick.r, "fifty"), classic: pick.r.classic === true, lists: pick.r.lists });
}

console.log("\n=== Fifty Classic Climbs of North America — catalog coverage ===");
console.log(`in the catalog: ${found.length} of 50`);
console.log(`  already tagged for the Challenges list: ${found.filter(f => f.tagged).length}`);
console.log(`  flagged classic=true: ${found.filter(f => f.classic).length}`);
console.log(`ambiguous (needs a human): ${ambiguous.length}`);
console.log(`not in the catalog: ${missing.length}`);
console.log(`rejected as wrong-region name collisions: ${wrongRegion.length}`);

console.log("\n-- found --");
found.forEach(f => console.log(` #${String(f.n).padStart(2)} ${f.peak} · ${f.route}\n      ${f.id} (${f.area}: ${f.routeName})${f.tagged ? "  [tagged]" : "  [UNTAGGED]"}`));
if (ambiguous.length) {
  console.log("\n-- ambiguous, not written --");
  ambiguous.forEach(a => console.log(` #${a.n} ${a.peak} · ${a.route}\n      ${a.cands.join("\n      ")}`));
}
if (wrongRegion.length) { console.log("\n-- rejected: right name, wrong region --"); wrongRegion.forEach(w => console.log("  " + w)); }
console.log("\n-- not in the catalog --");
missing.forEach(m => console.log(` #${String(m.n).padStart(2)} ${m.peak} · ${m.route} (${m.region}) — ${m.why}`));

if (!WRITE) { console.log("\n(read-only; pass --write to tag the found routes)"); process.exit(0); }

const todo = found.filter(f => !f.tagged || !f.classic);
console.log(`\nwriting ${todo.length} route(s)…`);
for (const f of todo) {
  const cur = Array.isArray(f.lists) ? f.lists.slice() : (f.lists ? [f.lists] : []);
  if (!cur.some(x => String(x).toLowerCase() === "fifty_classics")) cur.push("fifty_classics");
  await patchRow("routes", f.id, { lists: cur, classic: true });
  console.log(`  ${f.id} <- ${JSON.stringify(cur)}`);
}
// Re-read and reconcile: a 200 is not evidence the data changed (CLAUDE.md).
let ok = 0;
for (const f of todo) {
  const back = await q(`routes?select=id,lists,classic&id=eq.${encodeURIComponent(f.id)}`);
  const r = back[0];
  if (r && r.classic === true && routeInList(r, "fifty")) ok++;
  else console.error(`  RECONCILE FAILED: ${f.id} -> ${JSON.stringify(r)}`);
}
console.log(`reconciled ${ok}/${todo.length}`);
process.exit(ok === todo.length ? 0 : 1);
