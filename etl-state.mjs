// etl-state.mjs — bulk-pull ANY US state from OpenBeta (CC0) into ClimbMatch schema.
// Usage:  node etl-state.mjs "Washington" wa
//   arg1 = exact OpenBeta area_name of the state;  arg2 = id prefix (wa, co, nv, …)
// Recursive chunked walk (handles any depth/size). IDs are state-prefixed so states never collide.
// Writes catalog/<prefix>/<prefix>_areas.json + <prefix>_routes.json.
import { writeFileSync, mkdirSync } from "node:fs";

const STATE = process.argv[2], PREFIX = process.argv[3];
if (!STATE || !PREFIX) { console.error('Usage: node etl-state.mjs "<State Name>" <prefix>'); process.exit(1); }

const API = "https://api.openbeta.io";
const CHUNK = 4;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function gql(query, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const txt = await r.text();
      let j; try { j = JSON.parse(txt); } catch { throw new Error("non-JSON response (HTTP " + r.status + ")"); }
      if (j.errors) throw new Error("GraphQL: " + JSON.stringify(j.errors.map(e => e.message)));
      return j.data;
    } catch (e) { if (i === tries - 1) throw e; await sleep(1200 * (i + 1)); }
  }
}
const slug = s => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const usedA = new Set(), usedR = new Set();
const uniq = (base, set) => { let id = base, n = 2; while (set.has(id)) id = base + "_" + n++; set.add(id); return id; };
const areas = [], routes = []; let dropped = 0, fetches = 0;

function mapClimb(c, mid) {
  const t = c.type || {};
  const discipline = t.bouldering ? "bouldering" : t.ice ? "ice" : t.mixed ? "mixed" : t.alpine ? "alpine" : t.aid ? "aid" : "rock";
  const style = discipline === "rock" ? (t.trad ? "Trad" : t.sport ? "Sport" : null) : null;
  const grade = discipline === "bouldering" ? (c.grades?.vscale || c.grades?.yds) : (c.grades?.yds || c.grades?.vscale);
  if (!grade) { dropped++; return; }
  const o = { id: uniq(PREFIX + "_" + slug(c.name), usedR), mountainId: mid, name: c.name, grade, discipline };
  if (style) o.style = style;
  o.pitches = (c.pitches && c.pitches.length) ? c.pitches.length : 0;
  o.routeFt = (c.length > 0) ? Math.round(c.length * 3.28084) : null;
  o.gainFt = null; o.distKm = null; o.season = null; o.aspect = null;
  o.bolts = (c.boltsCount > 0) ? c.boltsCount : null;
  o.disciplines=(function(){var d=[];if(t.trad)d.push("trad");if(t.sport)d.push("sport");if(t.bouldering)d.push("bouldering");if(t.alpine)d.push("alpine");if(t.ice)d.push("ice");if(t.mixed)d.push("mixed");if(t.aid)d.push("aid");if(t.tr)d.push("tr");return d.length?d:[discipline];})(); o.fa = c.fa || null; o.verified = false;
  routes.push(o);
}

const CLIMB = `climbs{ name fa type{trad sport bouldering aid tr alpine ice mixed} grades{yds vscale} length boltsCount pitches{pitchNumber} }`;
const af = d => `area_name uuid metadata{lat lng leaf} ${CLIMB} ` + (d > 0 ? `children{ ${af(d - 1)} }` : `children{ uuid }`);

async function walkArea(uuid, parentId) {
  fetches++; await sleep(120);
  const root = (await gql(`{ area(uuid:"${uuid}"){ ${af(CHUNK)} } }`)).area;
  if (!root) return;
  async function proc(n, pid, level) {
    const id = uniq(PREFIX + "_" + slug(n.area_name), usedA);
    areas.push({ id, name: n.area_name, areaType: (n.children && n.children.length) ? "region" : "crag", parentId: pid, lat: n.metadata?.lat ?? null, lng: n.metadata?.lng ?? null, region: STATE });
    (function(){var ks=n.children||[],cs=n.climbs||[];if(!cs.length)return;var cid=id;if(ks.length){cid=uniq(id+"_climbs",usedA);areas.push({id:cid,name:n.area_name,areaType:"crag",parentId:id,lat:n.metadata?.lat??null,lng:n.metadata?.lng??null,region:STATE});}cs.forEach(function(c){mapClimb(c,cid);});})();
    const kids = n.children || [];
    if (level < CHUNK) { for (const ch of kids) await proc(ch, id, level + 1); }
    else { for (const ch of kids) await walkArea(ch.uuid, id); }
  }
  await proc(root, parentId, 0);
}

// find the state's UUID (the match with children = the real state node)
const found = (await gql(`{ areas(filter:{area_name:{match:"${STATE}",exactMatch:true}}){ uuid area_name metadata{lat lng} children{ uuid } } }`)).areas;
const st = found.filter(a => a.children && a.children.length).sort((a, b) => b.children.length - a.children.length)[0] || found[0];
if (!st) { console.error("State not found in OpenBeta: " + STATE); process.exit(1); }
const stId = uniq(slug(STATE), usedA);
areas.push({ id: stId, name: STATE, areaType: "state", parentId: "usa", lat: st.metadata.lat, lng: st.metadata.lng, region: STATE });

const top = (await gql(`{ area(uuid:"${st.uuid}"){ children{ uuid area_name } } }`)).area;
console.log(`Walking ${STATE} (${top.children.length} regions)...`);
for (const region of top.children) {
  const before = routes.length;
  await walkArea(region.uuid, stId);
  console.log(`  ${region.area_name}: +${routes.length - before} (total ${routes.length}, ${areas.length} areas)`);
}

mkdirSync("catalog/" + PREFIX, { recursive: true });
writeFileSync(`catalog/${PREFIX}/${PREFIX}_areas.json`, JSON.stringify(areas, null, 2));
writeFileSync(`catalog/${PREFIX}/${PREFIX}_routes.json`, JSON.stringify(routes, null, 2));
console.log(`\nDONE ${STATE} — areas: ${areas.length} | routes: ${routes.length} | dropped (no grade): ${dropped} | fetches: ${fetches}`);
