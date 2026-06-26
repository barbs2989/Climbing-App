// Generates supabase/seed-lcc.sql from the OpenBeta LCC catalog files.
// Maps catalog -> Phase-0 schema (areas + routes). Run: node supabase/gen-seed-lcc.cjs
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const A = JSON.parse(fs.readFileSync(path.join(root, "catalog/utah/little_cottonwood_areas.json"), "utf8"));
const R = JSON.parse(fs.readFileSync(path.join(root, "catalog/utah/little_cottonwood_routes.json"), "utf8"));

const q = v => v == null ? "null" : "'" + String(v).replace(/'/g, "''") + "'";
const num = v => (v == null || isNaN(v)) ? "null" : String(v);

// mirrors the app's grade logic (from gen-seed.cjs)
function gradeSystem(disc) {
  if (disc === "bouldering") return "v";
  if (["scrambling", "mountaineering", "hiking"].includes(disc)) return "class";
  if (["trad", "sport", "alpine", "rock"].includes(disc)) return "yds";
  if (disc === "ice") return "wi";
  if (disc === "mixed") return "m";
  if (disc === "aid") return "aid";
  return null;
}
function gradeNum(g, sys) {
  if (!g) return null;
  if (sys === "yds") { const m = g.match(/5\.(\d+)([a-d]?)/); return m ? parseInt(m[1]) + ("abcd".indexOf(m[2]) + 1) / 4 : null; }
  if (sys === "v") { const m = g.match(/V(\d+)/); return m ? parseInt(m[1]) : null; }
  if (sys === "wi") { const m = g.match(/WI(\d+)/); return m ? parseInt(m[1]) : null; }
  if (sys === "m") { const m = g.match(/M(\d+)/); return m ? parseInt(m[1]) : null; }
  if (sys === "class") { const m = g.match(/Class\s*(\d)/i); return m ? parseInt(m[1]) : null; }
  if (sys === "aid") { const m = g.match(/[AC](\d)/); return m ? parseInt(m[1]) : null; }
  return null;
}

// inject a USA root so utah's parent_id resolves for the path trigger
const areas = [{ id: "usa", name: "United States", parentId: null, areaType: "country", region: "USA", lat: 39.83, lng: -98.58 }, ...A];

// topological order: parents before children (path trigger needs the parent first)
const byId = {}; areas.forEach(a => byId[a.id] = a);
const ordered = [], seen = new Set();
function emit(a) {
  if (seen.has(a.id)) return;
  if (a.parentId && byId[a.parentId] && !seen.has(a.parentId)) emit(byId[a.parentId]);
  seen.add(a.id); ordered.push(a);
}
areas.forEach(emit);

let sql = `-- ClimbMatch — Little Cottonwood Canyon seed (OpenBeta, CC0)\n-- ${ordered.length} areas, ${R.length} routes. Facts only; route_count + path are set by triggers.\nbegin;\n\n`;
for (const a of ordered) {
  sql += `insert into areas(id,name,parent_id,area_type,region,lat,lng,source) values (${q(a.id)},${q(a.name)},${q(a.parentId)},${q(a.areaType)},${q(a.region)},${num(a.lat)},${num(a.lng)},'openbeta');\n`;
}
sql += `\n`;
for (const r of R) {
  // preserve trad/sport in the discipline column (matches the app's catOf convention)
  const disc = r.discipline === "rock" ? (r.style ? r.style.toLowerCase() : "rock") : r.discipline;
  const sys = gradeSystem(disc);
  const lenM = r.routeFt != null ? Math.round(r.routeFt / 3.28084) : null;
  sql += `insert into routes(id,area_id,name,discipline,grade,grade_system,grade_num,pitches,length_m,aspect,season,source) values (${q(r.id)},${q(r.mountainId)},${q(r.name)},${q(disc)},${q(r.grade)},${q(sys)},${num(gradeNum(r.grade, sys))},${num(r.pitches)},${num(lenM)},${q(r.aspect)},${q(r.season)},'openbeta');\n`;
}
sql += `\ncommit;\n`;

fs.writeFileSync(path.join(__dirname, "seed-lcc.sql"), sql);
console.log(`wrote supabase/seed-lcc.sql: ${ordered.length} areas, ${R.length} routes`);
