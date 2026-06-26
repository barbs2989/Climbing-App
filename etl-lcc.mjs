// etl-lcc.mjs — pull Little Cottonwood Canyon from OpenBeta (CC0) into ClimbMatch schema.
// Writes catalog/utah/little_cottonwood_areas.json + little_cottonwood_routes.json.
// Facts only: name, area hierarchy, coords, grade, discipline, trad/sport. No prose/photos/ratings.
import { writeFileSync } from "node:fs";

const API = "https://api.openbeta.io";
const LCC_UUID = "007f1fc1-3268-5660-b397-b7543d332216";

async function gql(query) {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const j = await r.json();
  if (j.errors) throw new Error("GraphQL: " + JSON.stringify(j.errors.map(e => e.message)));
  return j.data;
}
const slug = s => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const usedA = new Set(), usedR = new Set();
const uniq = (base, set) => { let id = base, n = 2; while (set.has(id)) id = base + "_" + n++; set.add(id); return id; };

const areas = [], routes = [];

// 1) ancestor chain: USA(root) > Utah > Wasatch Range > Central Wasatch > LCC
const anc = (await gql(`{ areas(filter:{area_name:{match:"Little Cottonwood Canyon",exactMatch:true}}){ pathTokens ancestors } }`)).areas[0];
const chainType = { 1: "state", 2: "range", 3: "region" }; // pathTokens index -> areaType (0=USA skipped, last=LCC)
let parentId = "usa";
for (let i = 1; i < anc.pathTokens.length - 1; i++) {
  const m = (await gql(`{ area(uuid:"${anc.ancestors[i]}"){ area_name metadata{lat lng} } }`)).area;
  const id = uniq(slug(m.area_name), usedA);
  areas.push({ id, name: m.area_name, areaType: chainType[i] || "region", parentId, lat: m.metadata.lat, lng: m.metadata.lng, region: "Utah" });
  parentId = id;
}

// 2) deep-pull LCC subtree (one nested query, generous depth)
const CLIMB = `climbs{ name type{trad sport bouldering aid tr alpine ice mixed} grades{yds vscale} length boltsCount pitches{pitchNumber} }`;
const af = d => `area_name uuid metadata{lat lng leaf} ${CLIMB}` + (d > 0 ? ` children{ ${af(d - 1)} }` : ``);
const root = (await gql(`{ area(uuid:"${LCC_UUID}"){ ${af(5)} } }`)).area;

let dropped = 0;
function mapClimb(c, mid) {
  const t = c.type || {};
  const discipline = t.bouldering ? "bouldering" : t.ice ? "ice" : t.mixed ? "mixed" : t.alpine ? "alpine" : t.aid ? "aid" : "rock";
  const style = discipline === "rock" ? (t.trad ? "Trad" : t.sport ? "Sport" : null) : null;
  const grade = discipline === "bouldering" ? (c.grades?.vscale || c.grades?.yds) : (c.grades?.yds || c.grades?.vscale);
  if (!grade) { dropped++; return; } // can't keep an ungraded route
  const o = { id: uniq("lcc_" + slug(c.name), usedR), mountainId: mid, name: c.name, grade, discipline };
  if (style) o.style = style;
  o.pitches = (c.pitches && c.pitches.length) ? c.pitches.length : 0;
  o.routeFt = (c.length > 0) ? Math.round(c.length * 3.28084) : null; // OpenBeta length is meters
  o.gainFt = null; o.distKm = null; o.season = null; o.aspect = null;
  o.bolts = (c.boltsCount > 0) ? c.boltsCount : null;
  o.source = "community"; o.verified = false;
  routes.push(o);
}
function walk(n, pid) {
  const id = n.uuid === LCC_UUID ? uniq("little_cottonwood_canyon", usedA) : uniq("lcc_" + slug(n.area_name), usedA);
  const areaType = n.uuid === LCC_UUID ? "canyon" : (n.metadata.leaf ? "crag" : "region");
  areas.push({ id, name: n.area_name, areaType, parentId: pid, lat: n.metadata.lat, lng: n.metadata.lng, region: "Utah" });
  (n.climbs || []).forEach(c => mapClimb(c, id));
  (n.children || []).forEach(ch => walk(ch, id));
}
walk(root, parentId);

writeFileSync("catalog/utah/little_cottonwood_areas.json", JSON.stringify(areas, null, 2));
writeFileSync("catalog/utah/little_cottonwood_routes.json", JSON.stringify(routes, null, 2));
console.log(`areas: ${areas.length} | routes: ${routes.length} | dropped (no grade): ${dropped}`);
