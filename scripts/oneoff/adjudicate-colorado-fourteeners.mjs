// Per-peak adjudication for the Colorado 14ers the roster does not hold.
//
// The exact matcher reports "no area with this name" for 19 of the 23 outstanding, but MISSING IS
// A HYPOTHESIS in this catalog, not a finding: the first Colorado pass implied 41 were absent and
// a loose probe showed only 18, which is the difference between migration 0137 and up to 23
// duplicate mountains. A duplicate peak splits a mountain's routes across two rows permanently —
// the shape 0106/0107/0112 each had to repair by hand.
//
// So this probes LOOSELY (a distinctive word, anywhere in a Colorado area name) and PRINTS every
// near miss rather than deciding. Read the output; it hands back candidates.
//
// It also separates the case an absence check cannot see: an area that EXISTS with the exact name
// and holds NO ROUTE. That peak needs a ROUTE, not a peak — creating an area for it would be the
// duplicate. `co_mt_belford` is the known instance; Middle Sister was the same shape in 0138.
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import { CO_14ERS } from "./roster-data.mjs";

const KEY = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const H = headers(KEY);
const get = async (url, tries = 4) => {
  for (let i = 1; i <= tries; i++) {
    try { const r = await fetch(url, { headers: H }); if (r.ok) return JSON.parse(await r.text()); if (i === tries) throw new Error(String(r.status)); }
    catch (e) { if (i === tries) throw e; }
    await new Promise(r => setTimeout(r, 800 * i));
  }
};
await get(`${SUPABASE_URL}/rest/v1/areas?select=id&limit=1`);   // warm the connection

const token = nm => nm.toLowerCase().replace(/[^a-z0-9 ]+/g, " ")
  .replace(/\b(mount|mt|peak|mountain|the|of|point|north|south|east|west|middle)\b/g, " ")
  .trim().split(/\s+/).filter(Boolean)[0] || nm.toLowerCase();
const norm = s => s.toLowerCase().replace(/^mt\.?\s+/, "mount ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// Reported by `WHY=1 node scripts/oneoff/resolve-peak-rosters.mjs` — the roster's own verdict,
// copied rather than re-derived so the two cannot silently disagree about the subject list.
const UNRESOLVED = new Set(["Mount Massive","La Plata Peak","Uncompahgre Peak","Crestone Peak","Mount Lincoln",
  "Castle Peak","Grays Peak","Mount Wilson","Crestone Needle","Mount Yale","Kit Carson Mountain","Maroon Peak",
  "Tabeguache Peak","Mount Eolus","Challenger Point","Sunlight Peak","Mount Lindsey","Mount Sherman",
  "San Luis Peak","Wetterhorn Peak","Sunshine Peak"]);

const rows = [];
for (const e of CO_14ERS) {
  const t = token(e.name);
  const hits = await get(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type,route_count,path&name=ilike.*${encodeURIComponent(t)}*&limit=40`);
  const co = (hits || []).filter(a => String(a.path || "").split(".")[1] === "colorado");
  rows.push({ e, co, unresolved: UNRESOLVED.has(e.name) });
}
// Fails closed: an empty read would report every peak absent and authorise 53 duplicates.
if (!rows.length || rows.every(r => !r.co.length)) { console.error("FAIL: nothing read, or nothing matched at all — refusing to report."); process.exit(1); }

console.log(`\n=== A. exact-name area exists but holds NO ROUTE (needs a ROUTE, not an area) ===`);
let routeless = 0;
for (const { e, co } of rows) {
  for (const a of co.filter(a => norm(a.name) === norm(e.name) && !a.route_count)) {
    console.log(`  ${a.id.padEnd(42)} rc=${a.route_count}  ${a.name}   (roster: ${e.name})`);
    routeless++;
  }
}
if (!routeless) console.log("  (none)");

console.log(`\n=== B. ${UNRESOLVED.size} unresolved, with every Colorado near miss ===`);
console.log(`(a near miss is USUALLY an unrelated crag sharing one word — read before creating)\n`);
let clean = 0;
for (const { e, co, unresolved } of rows) {
  if (!unresolved) continue;
  const exact = co.filter(a => norm(a.name) === norm(e.name));
  console.log(`${e.name} (${e.ft} ft)${exact.length ? "   <-- EXACT NAME MATCH EXISTS" : ""}`);
  if (!co.length) { console.log("    NOTHING in Colorado on that word — safe to create"); clean++; continue; }
  for (const a of co.slice(0, 6)) console.log(`    ${a.id.padEnd(46)} ${a.area_type.padEnd(7)} rc=${String(a.route_count).padStart(4)}  ${a.name}`);
}
console.log(`\n${clean} of ${UNRESOLVED.size} have NOTHING in Colorado on their distinctive word.`);
console.log(`The rest need a human to read the near misses before anything is created.`);
