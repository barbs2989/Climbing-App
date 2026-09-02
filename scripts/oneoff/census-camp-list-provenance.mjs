// WHERE ELSE DOES THIS CAMP APPEAR, AND ON WHOSE MOUNTAIN?
//
// The census a repair needs, per the rule the Goat Rocks split established: a camp-fit finding is
// a PAIR, so census the camp before removing it. audit:camp-route-fit flags ONE of Mount
// Pilchuck's eight camps and reading the list suggests seven are foreign — but "suggests" is a
// name match, and a name match is not an identity. A first pass matching catalog area names inside
// camp names put "Whitehorse Community Park campground" on a crag literally called "Campground"
// 2,015 km away, and "Bathtub Lakes basin, east of Mount Pilchuck" on a "Lakes Basin" region 469 km
// away — a camp whose own name says it belongs here.
//
// So ask the catalog instead. For every camp on the anchor peak, find every OTHER route carrying a
// camp of that name and report which area it sits on and how far that area is. This uses no
// gazetteer, no geocoding and no typed coordinate: the evidence is the catalog's own filing.
//
// What it does NOT do is pick a winner. Two things it cannot tell apart on its own:
//   - a camp legitimately shared by neighbouring peaks (Boston Basin serves three summits), and
//   - a zone file handing every camp in a corridor to every route in it.
// The discriminator is whether the WHOLE LIST travels together, which is why the list-identity
// section runs second. A shared camp is one row; a shared list is a propagation.
import { SUPABASE_URL, anonKey, headers, selectAll } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const km = (a, b) => {
  const R = 6371, t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const PEAK = process.argv[2] || "Mount Pilchuck";

const areas = await selectAll("areas", "id,name,lat,lng,area_type", "", { pageSize: 1000 });
const areaById = new Map(areas.map((a) => [a.id, a]));
const named = areas.filter((a) => a.name.toLowerCase() === PEAK.toLowerCase());
if (named.length !== 1) {
  console.log(`FAIL CLOSED: ${named.length} areas named ${PEAK} — a name is not an identity.`);
  process.exit(1);
}
const anchor = named[0];

const rows = await selectAll("routes", "id,name,area_id,bivy", "bivy=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes with bivy read"); process.exit(1); }

const mine = rows.filter((r) => r.area_id === anchor.id);
if (!mine.length) { console.log(`FAIL CLOSED: no ${PEAK} route carries a bivy list`); process.exit(1); }

const campNames = (r) => (Array.isArray(r.bivy) ? r.bivy : [])
  .map((s) => (s && s.name) || "").filter(Boolean);

const target = [...new Set(mine.flatMap(campNames))];
console.log(`${anchor.name}  ${anchor.lat.toFixed(4)},${anchor.lng.toFixed(4)}`);
console.log(`${mine.length} route(s) here, ${target.length} distinct camp(s)`);
console.log(`scanned ${rows.length} routes carrying a bivy list catalog-wide\n`);

// ---- section 1: where else does each camp appear? -----------------------------------------
console.log("=== PER CAMP: which OTHER areas carry a camp of this name ===\n");
const verdicts = [];
for (const nm of target) {
  const elsewhere = new Map();          // areaId -> route ids
  for (const r of rows) {
    if (r.area_id === anchor.id) continue;
    if (!campNames(r).includes(nm)) continue;
    if (!elsewhere.has(r.area_id)) elsewhere.set(r.area_id, []);
    elsewhere.get(r.area_id).push(r.id);
  }
  console.log(`  ${nm}`);
  if (!elsewhere.size) {
    console.log("      appears on NO other area — unique to this peak");
    verdicts.push({ nm, homes: [] });
  } else {
    const homes = [];
    for (const [aid, ids] of elsewhere) {
      const a = areaById.get(aid);
      const d = a && a.lat != null && anchor.lat != null ? km(a, anchor) : null;
      homes.push({ area: a, n: ids.length, d });
    }
    homes.sort((x, y) => y.n - x.n);
    for (const h of homes) {
      const nmA = h.area ? h.area.name : "(area not read)";
      const ty = h.area ? h.area.area_type : "?";
      console.log(`      also on ${nmA} (${ty}) x${h.n}` +
        (h.d == null ? "" : ` — ${h.d.toFixed(1)} km away`));
    }
    verdicts.push({ nm, homes });
  }
}

// ---- section 2: does the WHOLE LIST travel? ------------------------------------------------
// A shared CAMP is ordinary. A shared LIST is a propagation, and that is the Goat Rocks
// fingerprint: one identical multi-entry list sitting on routes across several areas.
console.log("\n=== LIST IDENTITY: does this exact set of camps sit elsewhere? ===\n");
const key = (r) => campNames(r).slice().sort().join(" | ");
const myKey = key(mine[0]);
const sameList = rows.filter((r) => key(r) === myKey);
const byArea = new Map();
for (const r of sameList) {
  if (!byArea.has(r.area_id)) byArea.set(r.area_id, []);
  byArea.get(r.area_id).push(r.id);
}
console.log(`the ${target.length}-camp list appears on ${sameList.length} route(s) across ${byArea.size} area(s):`);
for (const [aid, ids] of byArea) {
  const a = areaById.get(aid);
  const d = a && a.lat != null ? km(a, anchor) : null;
  console.log(`   ${a ? a.name : aid} x${ids.length}` + (d == null ? "" : ` — ${d.toFixed(1)} km`));
}
if (byArea.size === 1) {
  console.log("\nONE area holds this list. It is not a propagated zone file, whatever else is wrong with it.");
} else {
  console.log("\nSEVERAL areas hold the IDENTICAL list — the Goat Rocks fingerprint.");
  console.log("Measure each camp against every anchor before removing anything; the contamination may run both ways.");
}
