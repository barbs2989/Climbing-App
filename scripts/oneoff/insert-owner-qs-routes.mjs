// Insert the routes the WA owner-question research (2026-11-04) found missing from the catalog.
// Owner, 2026-11-05: "do what you recommend based on online research".
//
//   node scripts/oneoff/insert-owner-qs-routes.mjs research-data/gpx-any-source-wa-2026-11-04/owner-qs-new-routes.json [--write]
//
// As insert-wa-fkt-gap-climbs.mjs: refuse if the id exists, if a same-named route is on the area, if
// catalog_find_route names a same-name hit on THIS area, or if the area is not a leaf. Pins: a Trailhead only
// where the research confirmed it on an official or mapped page (already in the row), or copied from a route
// already on this peak (`copyTrailhead`: a name fragment); the Summit copied from a route already on this peak
// (`copySummit`) — never manufactured. No track: the route map line is a recorded track or nothing.
// grade_num comes from the one parser; route_count and name_search are maintained by triggers.
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { SUPABASE_URL, headers, requireServiceKey } = await import(pathToFileURL(path.join(REPO, "scripts/lib/supabase-env.mjs")).href);
const { gradeNumFrom } = await import(pathToFileURL(path.join(REPO, "lib/grade.js")).href);

const WRITE = process.argv.includes("--write");
const rows = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const k = requireServiceKey();
const pause = ms => new Promise(r => setTimeout(r, ms));
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const rpc = async (fn, body) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: headers(k, { "Content-Type": "application/json" }), body: JSON.stringify(body) }); if (!r.ok) throw new Error(`${fn} -> ${r.status}`); return r.json(); };
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const problems = [], ready = [];
for (const src of rows) {
  const r = { ...src }; const copyTh = r.copyTrailhead, copySm = r.copySummit; delete r.copyTrailhead; delete r.copySummit;
  if ((await get(`routes?select=id&id=eq.${r.id}`)).length) { problems.push(`${r.id}: id exists`); continue; }
  const [area] = await get(`areas?select=id,name&id=eq.${r.area_id}`);
  if (!area) { problems.push(`${r.id}: area ${r.area_id} missing`); continue; }
  if ((await get(`areas?select=id&parent_id=eq.${r.area_id}&limit=1`)).length) { problems.push(`${r.id}: ${r.area_id} is not a leaf`); continue; }
  const sibs = await get(`routes?select=id,name,waypoints&area_id=eq.${r.area_id}`);
  const clash = sibs.find(s => norm(s.name) === norm(r.name));
  if (clash) { problems.push(`${r.id}: "${clash.name}" already on ${r.area_id} as ${clash.id}`); continue; }
  const hits = (await rpc("catalog_find_route", { p_name: r.name, p_area_id: r.area_id })).filter(h => h.km != null && h.km < 0.5);
  if (hits.length) { problems.push(`${r.id}: catalog_find_route names ${hits.map(h => `${h.route_id} (${h.km} km)`).join(", ")} — read it first`); continue; }
  const wps = [...(r.waypoints || [])];
  if (copyTh) {
    const all = await get(`routes?select=id,waypoints&area_id=like.${r.area_id.split("_")[0]}_*&waypoints=not.is.null&limit=2000&name=not.is.null&or=(area_id.eq.${r.area_id})`);
    const th = all.flatMap(s => s.waypoints || []).find(w => /trailhead/i.test(w.type || "") && w.lat != null && new RegExp(copyTh, "i").test(w.name || ""));
    if (th) wps.unshift({ type: "Trailhead", name: th.name, lat: th.lat, lng: th.lng, ...(th.elev != null ? { elev: th.elev } : {}) });
  }
  if (copySm) {
    const sm = sibs.flatMap(s => s.waypoints || []).find(w => /summit/i.test(w.type || "") && w.lat != null);
    if (sm) wps.push({ type: "Summit", name: sm.name, lat: sm.lat, lng: sm.lng, ...(sm.elev != null ? { elev: sm.elev } : {}) });
  }
  r.waypoints = wps;
  if (r.grade) { const n = gradeNumFrom(r.grade, r.grade_system); r.grade_num = Number.isFinite(n) ? n : null; }
  console.log(`  ${r.id} -> ${area.name} (${sibs.length} routes: ${sibs.map(s => s.name).join(" | ").slice(0, 120)}); pins: ${wps.map(w => w.type).join(", ") || "none"}`);
  ready.push(r);
  await pause(600);
}
if (problems.length) console.log("\nREFUSED:\n  " + problems.join("\n  "));
console.log(`\n${ready.length} ready, ${problems.length} refused`);
if (!WRITE) process.exit(0);

let landed = 0;
for (const r of ready) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes`, { method: "POST", headers: headers(k, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify([r]) });
  const t = await res.text();
  if (!res.ok) { console.log(`INSERT ${r.id} FAILED ${res.status} ${t.slice(0, 300)}`); continue; }
  const [b] = await get(`routes?select=id,area_id,name,discipline,grade,waypoints&id=eq.${r.id}`);
  const ok = b && b.area_id === r.area_id && b.name === r.name && (b.waypoints || []).length === r.waypoints.length;
  console.log(`${ok ? "landed" : "NOT LANDED"} ${r.id}: ${b?.discipline} ${b?.grade}`);
  if (ok) landed++;
  await pause(1000);
}
console.log(`inserted ${landed}/${ready.length}`);
