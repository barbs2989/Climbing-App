// load-utah.mjs — load the full-Utah catalog into Supabase via the PostgREST REST API.
// Uses fetch directly (supabase-js pulls in realtime/WebSocket, which Node < 22 lacks).
// The service_role key is a SECRET: Supabase Dashboard > Project Settings > API > service_role.
// It bypasses RLS (the anon key can't write areas/routes). URL is read from .env.local.
//
//   SUPABASE_SERVICE_KEY="<service_role key>" node load-utah.mjs
//
import { readFileSync } from "node:fs";

let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
if (!url) { try { url = (readFileSync(".env.local", "utf8").match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim(); } catch {} }
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Need VITE_SUPABASE_URL (in .env.local) and SUPABASE_SERVICE_KEY (the service_role secret)."); process.exit(1); }
url = url.replace(/\/$/, "");
const H = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };

const A = JSON.parse(readFileSync("catalog/utah/utah_areas.json", "utf8"));
const R = JSON.parse(readFileSync("catalog/utah/utah_routes.json", "utf8"));

function gradeSystem(d) { if (d === "bouldering") return "v"; if (["scrambling", "mountaineering", "hiking"].includes(d)) return "class"; if (["trad", "sport", "alpine", "rock"].includes(d)) return "yds"; if (d === "ice") return "wi"; if (d === "mixed") return "m"; if (d === "aid") return "aid"; return null; }
function gradeNum(g, s) { if (!g) return null; let m; if (s === "yds") { m = g.match(/5\.(\d+)([a-d]?)/); return m ? parseInt(m[1]) + ("abcd".indexOf(m[2]) + 1) / 4 : null; } if (s === "v") { m = g.match(/V(\d+)/); return m ? parseInt(m[1]) : null; } if (s === "wi") { m = g.match(/WI(\d+)/); return m ? parseInt(m[1]) : null; } if (s === "m") { m = g.match(/M(\d+)/); return m ? parseInt(m[1]) : null; } if (s === "class") { m = g.match(/Class\s*(\d)/i); return m ? parseInt(m[1]) : null; } if (s === "aid") { m = g.match(/[AC](\d)/); return m ? parseInt(m[1]) : null; } return null; }

// areas: inject USA root + topological sort (parents before children, for the path trigger)
const areas = [{ id: "usa", name: "United States", parentId: null, areaType: "country", region: "USA", lat: 39.83, lng: -98.58 }, ...A];
const byId = {}; areas.forEach(a => byId[a.id] = a);
const ordered = [], seen = new Set();
function emit(a) { if (seen.has(a.id)) return; if (a.parentId && byId[a.parentId]) emit(byId[a.parentId]); seen.add(a.id); ordered.push(a); }
areas.forEach(emit);

const aRow = a => ({ id: a.id, name: a.name, parent_id: a.parentId, area_type: a.areaType, region: a.region, lat: a.lat, lng: a.lng, source: "openbeta" });
const rRow = r => { const disc = r.discipline === "rock" ? (r.style ? r.style.toLowerCase() : "rock") : r.discipline; const sys = gradeSystem(disc); return { id: r.id, area_id: r.mountainId, name: r.name, discipline: disc, grade: r.grade, grade_system: sys, grade_num: gradeNum(r.grade, sys), pitches: r.pitches, length_m: r.routeFt != null ? Math.round(r.routeFt / 3.28084) : null, aspect: null, season: null, source: "openbeta" }; };

async function del(table) {
  const r = await fetch(`${url}/rest/v1/${table}?id=not.is.null`, { method: "DELETE", headers: H });
  if (!r.ok && r.status !== 404) throw new Error("delete " + table + ": " + r.status + " " + (await r.text()).slice(0, 300));
}
async function ins(table, rows, size) {
  for (let i = 0; i < rows.length; i += size) {
    const r = await fetch(`${url}/rest/v1/${table}`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(rows.slice(i, i + size)) });
    if (!r.ok) throw new Error(table + " @" + i + ": " + r.status + " " + (await r.text()).slice(0, 400));
    process.stdout.write(`\r  ${table}: ${Math.min(i + size, rows.length)}/${rows.length}   `);
  }
  console.log("");
}
async function count(table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=id`, { method: "HEAD", headers: { ...H, Prefer: "count=exact" } });
  const cr = r.headers.get("content-range"); return cr ? cr.split("/")[1] : "?";
}

console.log("Resetting routes + areas...");
await del("routes"); await del("areas");
console.log(`Inserting ${ordered.length} areas (topological)...`);
await ins("areas", ordered.map(aRow), 500);
console.log(`Inserting ${R.length} routes (route_count triggers fire per row — give it a minute)...`);
await ins("routes", R.map(rRow), 1000);

const ac = await count("areas"), rc = await count("routes");
const usa = await (await fetch(`${url}/rest/v1/areas?id=eq.usa&select=route_count`, { headers: H })).json();
console.log(`\nDONE — areas: ${ac} (expected ${ordered.length}) | routes: ${rc} (expected ${R.length}) | USA rolls up: ${usa[0]?.route_count}`);
