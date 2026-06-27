// etl-utah.mjs — bulk-pull the ENTIRE state of Utah from OpenBeta (CC0) into ClimbMatch schema.
// Recursive chunked walk (CHUNK levels per fetch, recurse where deeper) so it handles any tree
// depth/size. Facts only: name, hierarchy, coords, grade, discipline, trad/sport, pitches, bolts.
// No prose/photos/ratings. Writes catalog/utah/utah_areas.json + utah_routes.json (supersedes LCC).
import { writeFileSync } from "node:fs";

const API = "https://api.openbeta.io";
const UTAH_UUID = "ee1d37e7-dc41-5c26-a358-5d51af01f499";
const CHUNK = 4;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function gql(query, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const j = await r.json();
      if (j.errors) throw new Error("GraphQL: " + JSON.stringify(j.errors.map(e => e.message)));
      return j.data;
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(900 * (i + 1));
    }
  }
}
const slug = s => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const usedA = new Set(), usedR = new Set();
const uniq = (base, set) => { let id = base, n = 2; while (set.has(id)) id = base + "_" + n++; set.add(id); return id; };

const areas = [], routes = [];
let dropped = 0, fetches = 0;

function mapClimb(c, mid) {
  const t = c.type || {};
  const discipline = t.bouldering ? "bouldering" : t.ice ? "ice" : t.mixed ? "mixed" : t.alpine ? "alpine" : t.aid ? "aid" : "rock";
  const style = discipline === "rock" ? (t.trad ? "Trad" : t.sport ? "Sport" : null) : null;
  const grade = discipline === "bouldering" ? (c.grades?.vscale || c.grades?.yds) : (c.grades?.yds || c.grades?.vscale);
  if (!grade) { dropped++; return; }
  const o = { id: uniq("ut_" + slug(c.name), usedR), mountainId: mid, name: c.name, grade, discipline };
  if (style) o.style = style;
  o.pitches = (c.pitches && c.pitches.length) ? c.pitches.length : 0;
  o.routeFt = (c.length > 0) ? Math.round(c.length * 3.28084) : null;
  o.gainFt = null; o.distKm = null; o.season = null; o.aspect = null;
  o.bolts = (c.boltsCount > 0) ? c.boltsCount : null;
  o.source = "community"; o.verified = false;
  routes.push(o);
}

const CLIMB = `climbs{ name type{trad sport bouldering aid tr alpine ice mixed} grades{yds vscale} length boltsCount pitches{pitchNumber} }`;
const af = d => `area_name uuid metadata{lat lng leaf} ${CLIMB} ` + (d > 0 ? `children{ ${af(d - 1)} }` : `children{ uuid }`);

async function walkArea(uuid, parentId) {
  fetches++;
  await sleep(120);
  const root = (await gql(`{ area(uuid:"${uuid}"){ ${af(CHUNK)} } }`)).area;
  if (!root) return;
  async function proc(n, pid, level) {
    const id = uniq(slug(n.area_name), usedA);
    areas.push({ id, name: n.area_name, areaType: n.metadata?.leaf ? "crag" : "region", parentId: pid, lat: n.metadata?.lat ?? null, lng: n.metadata?.lng ?? null, region: "Utah" });
    (n.climbs || []).forEach(c => mapClimb(c, id));
    const kids = n.children || [];
    if (level < CHUNK) {
      for (const ch of kids) await proc(ch, id, level + 1);
    } else {
      for (const ch of kids) await walkArea(ch.uuid, id); // overflow: deeper subtree, fresh fetch
    }
  }
  await proc(root, parentId, 0);
}

// root chain: USA > Utah(state)
const utMeta = (await gql(`{ area(uuid:"${UTAH_UUID}"){ area_name metadata{lat lng} } }`)).area;
const utId = uniq("utah", usedA);
areas.push({ id: utId, name: utMeta.area_name, areaType: "state", parentId: "usa", lat: utMeta.metadata.lat, lng: utMeta.metadata.lng, region: "Utah" });

const top = (await gql(`{ area(uuid:"${UTAH_UUID}"){ children{ uuid area_name } } }`)).area;
console.log(`Walking Utah (${top.children.length} regions)...`);
for (const region of top.children) {
  const before = routes.length;
  await walkArea(region.uuid, utId);
  console.log(`  ${region.area_name}: +${routes.length - before} routes (total ${routes.length}, ${areas.length} areas)`);
}

writeFileSync("catalog/utah/utah_areas.json", JSON.stringify(areas, null, 2));
writeFileSync("catalog/utah/utah_routes.json", JSON.stringify(routes, null, 2));
console.log(`\nDONE — areas: ${areas.length} | routes: ${routes.length} | dropped (no grade): ${dropped} | fetches: ${fetches}`);
