#!/usr/bin/env node
// Writes researched crag PARKING (areas.parking_*, 0251) from per-destination research files, after
// checking each spot mechanically. Usage: node scripts/oneoff/apply-crag-parking.mjs <dir> [--apply]
// <dir>/*.json: [{ area_id, lat, lng, name, confidence: "high"|"medium", basis }]
// A spot is refused unless: the area exists; an OpenStreetMap amenity=parking feature lies within 80 m
// of the coordinate (a lot, not a guess); it is within 4 km of the crag; its name cites no source.
// A lot serves its area and every area beneath it, so it is copied down the subtree. Assignments are
// written shallowest first, so a deeper (more specific) assignment wins. Fill-only by default: an area
// whose parking is already set is left alone. Without --apply it writes the SQL and prints the plan.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const dir = process.argv[2]; const APPLY = process.argv.includes("--apply");
if (!dir) { console.error("usage: apply-crag-parking.mjs <dir> [--apply]"); process.exit(2); }
const key = requireServiceKey();
const q = async (p) => { for (let i = 0; ; i++) { try { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: headers(key) }); if (!r.ok) throw new Error(await r.text()); return await r.json(); } catch (e) { if (i >= 4) throw e; await new Promise((z) => setTimeout(z, 3000 * (i + 1))); } } };
const km = (a, b, c, d) => { const R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
async function lotNear(lat, lng) {
  const ql = `[out:json][timeout:25];nwr(around:80,${lat},${lng})[amenity=parking];out center 3;`;
  for (let i = 0; i < 6; i++) { try { const r = await fetch(OVERPASS[i % 2] + "?data=" + encodeURIComponent(ql), { headers: { "User-Agent": "ClimbMatch-parking-check/1.0" } }); /* no UA = 406 */ if (r.ok) return (await r.json()).elements.map((e) => `${e.type} ${e.id}${e.tags && e.tags.name ? " " + e.tags.name : ""}`); console.error("overpass", r.status, lat, lng, (await r.text()).slice(0, 120)); } catch (e) { console.error("overpass", e.message); } await new Promise((z) => setTimeout(z, 4000 * (i + 1))); }
  throw new Error("overpass unreachable");
}
const SOURCEY = /mountain ?project|\bMP\b|guide ?book|coalition|access fund|openstreetmap|\bOSM\b|according|per |source|website/i;
const items = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).map((x) => ({ ...x, file: f })));
const ok = [], refused = [];
for (const it of items) {
  const why = [];
  const [a] = await q(`areas?select=id,name,path,lat,lng,parking_lat&id=eq.${encodeURIComponent(it.area_id)}`);
  if (!a) why.push("no such area");
  if (!["high", "medium"].includes(it.confidence)) why.push("confidence " + it.confidence);
  if (!(Math.abs(it.lat) <= 90 && Math.abs(it.lng) <= 180) || !String(it.lat).includes(".") || String(it.lat).split(".")[1].length < 4) why.push("bad coordinate");
  if (!it.name || SOURCEY.test(it.name) || it.name.length > 80) why.push("name: " + it.name);
  let d = null; if (a && a.lat != null) { d = km(a.lat, a.lng, it.lat, it.lng); if (d > 4) why.push(`${d.toFixed(1)} km from the crag`); }
  let lots = []; if (!why.length) { await new Promise((z) => setTimeout(z, 1500)); lots = await lotNear(it.lat, it.lng); if (!lots.length) why.push("no mapped parking within 80 m"); }
  (why.length ? refused : ok).push({ ...it, depth: a ? a.path.split(".").length : 0, areaName: a && a.name, km: d, lots, why });
}
ok.sort((x, y) => x.depth - y.depth);
const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";
// Fill-only: what already had parking before THIS run is frozen; within the run, deeper assignments
// overwrite shallower ones because they are written later.
const sql = ["begin;", "create temp table _had_parking on commit drop as select id from public.areas where parking_lat is not null;",
  ...ok.map((it) => `update public.areas set parking_lat=${+it.lat}, parking_lng=${+it.lng}, parking_name=${esc(it.name)} where path <@ (select path from public.areas where id=${esc(it.area_id)}) and id not in (select id from _had_parking);`),
  "commit;"].join("\n");
const out = path.join(dir, "apply.sql"); fs.writeFileSync(out, sql + "\n");
for (const it of ok) console.log(`OK   ${it.confidence.padEnd(6)} ${it.area_id} (${it.areaName}) ← ${it.name} ${it.lat},${it.lng} ${it.km != null ? it.km.toFixed(2) + " km" : ""} [${it.lots[0]}]`);
for (const it of refused) console.log(`SKIP ${it.area_id}: ${it.why.join("; ")}`);
console.log(`${ok.length} accepted, ${refused.length} refused → ${out}`);
if (APPLY && ok.length) { execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", out], { stdio: "inherit" }); console.log("applied — re-read to reconcile"); }
