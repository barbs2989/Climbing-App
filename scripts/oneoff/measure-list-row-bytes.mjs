#!/usr/bin/env node
// run: node --experimental-websocket scripts/oneoff/measure-list-row-bytes.mjs
// MEASURE what the Climbs tab's route list downloads versus what it reads (backlog item
// "select('*') on routes for list rows", architecture review 2026-10-07). For each probed area:
// JSON bytes of the full ROUTE_AREA_EMBED rows the list fetches today, bytes of the columns the
// list actually renders (RouteRow + SummitBriefing + the core climb row), and which columns carry
// the difference. Read-only, anon key.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
// lib/offline.js imports browser storage, so the embed is copied here; keep it in step with ROUTE_AREA_EMBED.
const ROUTE_AREA_EMBED = "*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,approach,approach_min,rock,rock_basis,aspect,parking_lat,parking_lng,parking_name,parent:parent_id(name))";

const supabase = createClient(SUPABASE_URL, anonKey());
const LIST_COLS = ["id", "name", "area_id", "discipline", "stars", "sort_order", "grade", "grade_system", "rock_grade", "ice_grade", "alpine_grade", "commitment", "gain_ft", "high_point_ft", "dist_km", "outing_shape", "itinerary"];
const bytes = (v) => Buffer.byteLength(JSON.stringify(v));

async function area(id) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("routes").select(ROUTE_AREA_EMBED).eq("area_id", id).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const full = bytes(rows);
  const thin = bytes(rows.map((r) => Object.fromEntries(LIST_COLS.map((k) => [k, r[k]]))));
  const embed = bytes(rows.map((r) => r.areas));
  const per = {};
  for (const r of rows) for (const k of Object.keys(r)) per[k] = (per[k] || 0) + (r[k] == null ? 4 : bytes(r[k]));
  const top = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, b]) => `${k} ${(b / 1024).toFixed(1)}K`).join(", ");
  return { id, n: rows.length, fullK: +(full / 1024).toFixed(1), thinK: +(thin / 1024).toFixed(1), embedK: +(embed / 1024).toFixed(1), perRowFull: Math.round(full / Math.max(1, rows.length)), perRowThin: Math.round(thin / Math.max(1, rows.length)), top };
}

// The largest direct fan-out (bouldering, bare), the marquee alpine peak (enriched), and a crag.
const probes = ["tn_stone_fort_bouldering_climbs"];
const { data: baker } = await supabase.from("areas").select("id,route_count").eq("name", "Mount Baker").eq("area_type", "peak").order("route_count", { ascending: false }).limit(1);
if (baker && baker[0]) probes.push(baker[0].id);
const { data: enriched } = await supabase.from("routes").select("area_id").not("gpx", "is", null).limit(1000);
const byArea = {};
for (const r of enriched || []) byArea[r.area_id] = (byArea[r.area_id] || 0) + 1;
const topEnriched = Object.entries(byArea).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
for (const id of topEnriched) if (!probes.includes(id)) probes.push(id);

for (const id of probes) {
  const r = await area(id);
  console.log(`${r.id}: ${r.n} rows — full ${r.fullK} KB (${r.perRowFull} B/row), list-columns ${r.thinK} KB (${r.perRowThin} B/row), area embed ${r.embedK} KB. Heaviest: ${r.top}`);
}

// The typical case: 40 areas with 10–60 routes, spread through the catalog by id order.
const { data: areas, error } = await supabase.from("areas").select("id").gte("route_count", 10).lte("route_count", 60).order("id").range(2000, 2039);
if (error) throw error;
let full = 0, thin = 0, n = 0;
for (const a of areas) { const r = await area(a.id); full += r.fullK; thin += r.thinK; n += r.n; }
console.log(`typical (40 areas, ${n} rows): full ${full.toFixed(0)} KB, list-columns ${thin.toFixed(0)} KB — ${Math.round(full * 1024 / Math.max(1, n))} vs ${Math.round(thin * 1024 / Math.max(1, n))} B/row`);
