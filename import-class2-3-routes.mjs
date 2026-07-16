#!/usr/bin/env node
// import-class2-3-routes.mjs — import Class 2-3 mountaineering/scrambling routes
// Usage: SUPABASE_SERVICE_KEY=... node import-class2-3-routes.mjs

import { readFileSync } from 'node:fs';

const PREFIX = 'wa-class2-3';
const env = readFileSync('.env.local', 'utf8');
let url = (env.match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim().replace(/\/$/, '');
const SK = process.env.SUPABASE_SERVICE_KEY;
const AK = (env.match(/VITE_SUPABASE_ANON_KEY=(.+)/) || [])[1]?.trim();

if (!url || !SK) {
  console.error('Need VITE_SUPABASE_URL in .env.local and SUPABASE_SERVICE_KEY env');
  process.exit(1);
}

const Hs = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' };
const Ha = { apikey: AK, Authorization: 'Bearer ' + AK };

// Load the class 2-3 routes
const data = JSON.parse(readFileSync('.claude/worktrees/photos-topo-waypoints/wa-class2-3-routes.json', 'utf8'));
const routes = data.routes || [];

console.log(`Loading ${routes.length} Class 2-3 mountaineering/scrambling routes from ${PREFIX}`);

// Normalize route data for database insertion
function gradeNum(g, s) {
  if (!g) return null;
  let m;
  if (s === 'class' && (m = g.match(/class\s*(\d)/i))) return parseInt(m[1]);
  if (s === 'class' && (m = g.match(/(\d)\s*(?:rd|th|nd)?\s*class/i))) return parseInt(m[1]);
  if ((m = g.match(/(\d+)\.(\d)/))) return parseFloat(m[0]);
  return null;
}

const ri = v => (v == null ? null : Math.round(v));

function normalizeRoute(r) {
  const sys = r.grade_system || 'class';
  return {
    id: r.id,
    area_id: r.area_id,
    name: r.name,
    discipline: r.discipline || 'scrambling',
    grade: r.grade,
    grade_system: sys,
    grade_num: gradeNum(r.grade, sys) || r.grade_num,
    pitches: r.pitches ? ri(r.pitches) : null,
    sort_order: r.sort_order ?? null,
    length_m: r.length_m ? ri(r.length_m) : null,
    aspect: r.aspect ?? null,
    season: r.season ?? null,
    fa: r.fa ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    gain_ft: r.gain_ft ? ri(r.gain_ft) : null,
    loss_ft: r.loss_ft ? ri(r.loss_ft) : null,
    dist_km: r.dist_km ?? null,
    max_angle: ri(r.max_angle) ?? null,
    commitment: r.commitment ?? null,
    face: r.face ?? null,
    permit: r.permit ?? null,
    comms: r.comms ?? null,
    descent: r.descent ?? null,
    obj_haz: r.obj_haz ?? null,
    waypoints: r.waypoints ?? null,
    gpx: r.gpx ?? null,
    elev_pts: r.elev_pts ?? null,
    overview: r.overview ?? null,
    beta: r.beta ?? null,
    turnaround: r.turnaround ?? null,
    auto_generated: r.auto_generated ?? false,
    source: r.source ?? null,
    alpine_grade: r.alpine_grade ?? null,
    rock_grade: r.rock_grade ?? null,
    ice_grade: r.ice_grade ?? null,
    disciplines: r.disciplines ?? null,
    high_point_ft: ri(r.high_point_ft) ?? null,
    aid_grade: r.aid_grade ?? null,
    gear: r.gear ?? null,
    hazards: r.hazards ?? null,
    approach: r.approach ?? null,
    descent_text: r.descent_text ?? null,
    bail: r.bail ?? null,
    pitch_detail: r.pitch_detail ?? null,
    itinerary: r.itinerary ?? null,
    access: r.access ?? null,
    road: r.road ?? null,
    climate: r.climate ?? null,
    emergency: r.emergency ?? null,
    lists: r.lists ?? null,
    timing: r.timing ?? null,
    detailed_rack: r.detailed_rack ?? null,
    what_to_bring: r.what_to_bring ?? null,
    pro_tips: r.pro_tips ?? null,
    watch_out: Array.isArray(r.watch_out) ? r.watch_out : (r.watch_out ? [r.watch_out] : null),
    pro_needs: r.pro_needs ?? null,
    best_season: r.best_season ?? null
  };
}

const normalized = routes.map(normalizeRoute);

// Batch insert to Supabase
async function up(table, rows, size = 100, extra = '') {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    console.log(`  inserting routes ${i + 1}–${Math.min(i + size, rows.length)}`);
    const r = await fetch(`${url}/rest/v1/${table}${extra}`, {
      method: 'POST',
      headers: { ...Hs, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(batch)
    });
    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(`${table} @${i}: ${r.status} ${errorText.slice(0, 300)}`);
    }
  }
}

// Main import process
(async function() {
  try {
    console.log(`\nImporting ${normalized.length} Class 2-3 routes to Supabase`);
    await up('routes', normalized, 50);
    console.log(`\nSuccess! Imported ${normalized.length} routes.`);
  } catch (e) {
    console.error('Import failed:', e.message);
    process.exit(1);
  }
})();
