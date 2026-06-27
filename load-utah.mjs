// load-utah.mjs — load the full-Utah catalog into Supabase using the SERVICE-ROLE key.
// The service_role key is a SECRET: Supabase Dashboard > Project Settings > API > service_role.
// It bypasses RLS (the anon key can't write areas/routes). URL is read from .env.local.
//
//   SUPABASE_SERVICE_KEY="<service_role key>" node load-utah.mjs
//
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
if (!url) { try { url = (readFileSync(".env.local", "utf8").match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim(); } catch {} }
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Need VITE_SUPABASE_URL (in .env.local) and SUPABASE_SERVICE_KEY (the service_role secret)."); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const A = JSON.parse(readFileSync("catalog/utah/utah_areas.json", "utf8"));
const R = JSON.parse(readFileSync("catalog/utah/utah_routes.json", "utf8"));

// grade mapping — mirrors supabase/gen-seed-utah.cjs exactly
function gradeSystem(d) { if (d === "bouldering") return "v"; if (["scrambling", "mountaineering", "hiking"].includes(d)) return "class"; if (["trad", "sport", "alpine", "rock"].includes(d)) return "yds"; if (d === "ice") return "wi"; if (d === "mixed") return "m"; if (d === "aid") return "aid"; return null; }
function gradeNum(g, s) { if (!g) return null; let m; if (s === "yds") { m = g.match(/5\.(\d+)([a-d]?)/); return m ? parseInt(m[1]) + ("abcd".indexOf(m[2]) + 1) / 4 : null; } if (s === "v") { m = g.match(/V(\d+)/); return m ? parseInt(m[1]) : null; } if (s === "wi") { m = g.match(/WI(\d+)/); return m ? parseInt(m[1]) : null; } if (s === "m") { m = g.match(/M(\d+)/); return m ? parseInt(m[1]) : null; } if (s === "class") { m = g.match(/Class\s*(\d)/i); return m ? parseInt(m[1]) : null; } if (s === "aid") { m = g.match(/[AC](\d)/); return m ? parseInt(m[1]) : null; } return null; }

// areas: inject the USA root + topological sort (parents before children, for the path trigger)
const areas = [{ id: "usa", name: "United States", parentId: null, areaType: "country", region: "USA", lat: 39.83, lng: -98.58 }, ...A];
const byId = {}; areas.forEach(a => byId[a.id] = a);
const ordered = [], seen = new Set();
function emit(a) { if (seen.has(a.id)) return; if (a.parentId && byId[a.parentId]) emit(byId[a.parentId]); seen.add(a.id); ordered.push(a); }
areas.forEach(emit);

const aRow = a => ({ id: a.id, name: a.name, parent_id: a.parentId, area_type: a.areaType, region: a.region, lat: a.lat, lng: a.lng, source: "openbeta" });
const rRow = r => { const disc = r.discipline === "rock" ? (r.style ? r.style.toLowerCase() : "rock") : r.discipline; const sys = gradeSystem(disc); return { id: r.id, area_id: r.mountainId, name: r.name, discipline: disc, grade: r.grade, grade_system: sys, grade_num: gradeNum(r.grade, sys), pitches: r.pitches, length_m: r.routeFt != null ? Math.round(r.routeFt / 3.28084) : null, aspect: null, season: null, source: "openbeta" }; };

async function chunkInsert(table, rows, size) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).insert(rows.slice(i, i + size));
    if (error) throw new Error(table + " @" + i + ": " + error.message);
    process.stdout.write(`\r  ${table}: ${Math.min(i + size, rows.length)}/${rows.length}   `);
  }
  console.log("");
}

console.log("Resetting routes + areas...");
{ const { error } = await db.from("routes").delete().not("id", "is", null); if (error) throw error; }
{ const { error } = await db.from("areas").delete().not("id", "is", null); if (error) throw error; }
console.log(`Inserting ${ordered.length} areas (topological)...`);
await chunkInsert("areas", ordered.map(aRow), 500);
console.log(`Inserting ${R.length} routes (route_count triggers fire per row — give it a minute)...`);
await chunkInsert("routes", R.map(rRow), 1000);

const ac = (await db.from("areas").select("*", { count: "exact", head: true })).count;
const rc = (await db.from("routes").select("*", { count: "exact", head: true })).count;
const usa = (await db.from("areas").select("route_count").eq("id", "usa").single()).data;
console.log(`\nDONE — areas: ${ac} (expected ${ordered.length}) | routes: ${rc} (expected ${R.length}) | USA rolls up: ${usa?.route_count}`);
