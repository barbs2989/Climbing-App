#!/usr/bin/env node
// Builds the OFFLINE STATE FILES the app downloads instead of paging Supabase per climber.
//
// Why: a state download used to page `areas` + `routes` (+ corrections and trip reports) out of
// the database for EVERY climber who pinned the state. Washington alone measured 14,456 routes,
// ~60 MB of JSON and ~37 s, and its first page hit the anon role's 3 s statement timeout. At scale
// that is N climbers x the whole catalog against the database. Built once a night instead, and
// served from GitHub Pages next to the app, the database does the work once and the bandwidth is
// not Supabase egress at all.
//
// Output (into --out, default dist/states):
//   index.json                 { v, generatedAt, states: { [name]: { id, path, areaCount, routeCount, parts: [{ file, routes, bytes }] } } }
//   <stateId>-<n>.json.gz      one PART per <=PART_ROUTES routes: { v, state, generatedAt, part, areas?, routes, contribs, reports, people }
// Part 0 carries the state's areas. Parts keep a phone from parsing one 60 MB string at once.
//
// PUBLIC DATA ONLY, read with the ANON key: areas, routes, non-photo contributions, trip reports
// that RLS shows to anyone (public), and reporters' public profile fields. Crew-only reports are
// NOT in the file — the app's live path still fetches those for the climber who may see them.
//
// Rows are stored RAW (snake_case, exactly as PostgREST returns them), the same shape
// lib/offline.js writes from the live path, so the readers need no second shape.
//
// Usage: node scripts/build-state-snapshots.mjs [--out dist/states] [--states "Washington,Delaware"]
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const argOf = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const OUT = argOf("--out") || "dist/states";
const ONLY = argOf("--states") ? new Set(argOf("--states").split(",").map((s) => s.trim()).filter(Boolean)) : null;
const PAGE = 500, PART_ROUTES = 2000, REPORTS_PER_ROUTE = 5;
// Keep in step with TRIP_REPORT_COLS (+ the 0121 columns) in lib/db.js: the offline reader serves
// these rows to the same screen.
const REPORT_COLS = "id, route_id, user_id, stars, cond_tags, date_climbed, discipline, tick_type, notes, photos, beta, gear_beta, outcome_reasons, outcome_note, approach_minutes, climb_minutes, descent_minutes, car_to_car_minutes, snow_condition, freezing_level_ft, water_level, bug_pressure, trail_condition, party_size, protection_quality, anchor_quality, crowd_level, fa_ascent, developed, sun_vote, sun_note, itinerary, created_at, temp_f, snow_depth, seepage, mud, road_note, rappel_count, rappel_longest_m, rappel_rope";

const KEY = anonKey();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Same retry rule as lib/offline.js: only the 57014 statement timeout is a cold-start effect worth
// retrying; anything else is a real answer. CI is not a phone, so it waits longer between tries.
async function get(url, init) {
  let last = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { ...(init || {}), headers: headers(KEY, { "Content-Type": "application/json", ...((init && init.headers) || {}) }) });
    const text = await res.text();
    if (res.ok) return JSON.parse(text);
    last = new Error(`${res.status} ${text.slice(0, 200)} <- ${url.replace(SUPABASE_URL, "").slice(0, 160)}`);
    const transient = /57014|statement timeout/.test(text) || res.status === 502 || res.status === 503 || res.status === 504;
    if (!transient) throw last;
    await sleep(2000 * Math.pow(2, attempt));
  }
  throw last;
}
const rest = (q) => `${SUPABASE_URL}/rest/v1/${q}`;

async function keyset(build) {
  const out = []; let last = "";
  for (;;) {
    const rows = await get(build(last));
    out.push(...rows);
    if (rows.length < PAGE) return out;
    last = rows[rows.length - 1].id;
  }
}

async function buildState(st) {
  const p = encodeURIComponent(st.path);
  const areas = await keyset((last) => rest(`areas?select=*&path=cd.${p}&order=id${last ? `&id=gt.${encodeURIComponent(last)}` : ""}&limit=${PAGE}`));
  const parts = []; let cur = null; let last = "";
  const reporters = new Set();
  const newPart = () => { cur = { routes: [], contribs: [], reports: [] }; parts.push(cur); };
  newPart();
  for (;;) {
    const page = await get(rest(`routes?select=*,areas!inner(path)&areas.path=cd.${p}&order=id${last ? `&id=gt.${encodeURIComponent(last)}` : ""}&limit=${PAGE}`));
    if (!page.length) break;
    if (cur.routes.length >= PART_ROUTES) newPart();
    const rows = page.map(({ areas: _drop, ...r }) => r);
    const from = rows[0].id, to = rows[rows.length - 1].id;
    const inPage = new Set(rows.map((r) => r.id));
    // The id window spans other states too (ids sort across states) — keep only this page's rows.
    const contribs = (await keysetAfter((after) => rest(`contributions?select=*&route_id=gte.${encodeURIComponent(from)}&route_id=lte.${encodeURIComponent(to)}&kind=neq.photo&order=id${after ? `&id=gt.${after}` : ""}&limit=1000`)))
      .filter((c) => inPage.has(c.route_id));
    const reports = await keysetAfter((after) => rest(`rpc/state_trip_reports?select=${encodeURIComponent(REPORT_COLS)}&order=id${after ? `&id=gt.${after}` : ""}&limit=1000`),
      { method: "POST", body: JSON.stringify({ p_state: st.id, p_from: from, p_to: to, p_per_route: REPORTS_PER_ROUTE }) });
    reports.forEach((r) => { if (r.user_id) reporters.add(r.user_id); });
    cur.routes.push(...rows); cur.contribs.push(...contribs); cur.reports.push(...reports);
    last = to;
    if (page.length < PAGE) break;
  }
  const people = [];
  const ids = [...reporters];
  for (let i = 0; i < ids.length; i += 100) {
    people.push(...await get(rest(`profiles?select=id,name,avatar,show_name,username&id=in.(${ids.slice(i, i + 100).join(",")})`)));
  }
  return { areas, parts, people };
}
async function keysetAfter(build, init) {
  const out = []; let after = null;
  for (;;) {
    const rows = await get(build(after), init);
    out.push(...rows);
    if (rows.length < 1000) return out;
    after = rows[rows.length - 1].id;
  }
}

const generatedAt = Date.now();
fs.mkdirSync(OUT, { recursive: true });
const states = (await get(rest(`areas?select=id,name,path,route_count&area_type=eq.state&order=name`)))
  .filter((s) => s.path && (s.route_count || 0) > 0 && (!ONLY || ONLY.has(s.name)));
const index = { v: 1, generatedAt, states: {} };
let total = 0;
for (const st of states) {
  const t0 = Date.now();
  const { areas, parts, people } = await buildState(st);
  const entry = { id: st.id, path: st.path, areaCount: areas.length, routeCount: 0, parts: [] };
  parts.forEach((part, n) => {
    if (!part.routes.length && n > 0) return;
    // Reporter names travel with every part that cites them, so any part read alone can name its reporters.
    const cited = new Set(part.reports.map((r) => r.user_id));
    const body = { v: 1, state: { id: st.id, name: st.name, path: st.path }, generatedAt, part: n, ...(n === 0 ? { areas } : {}), routes: part.routes, contribs: part.contribs, reports: part.reports, people: people.filter((x) => cited.has(x.id)) };
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(body)), { level: 9 });
    const file = `${st.id}-${n}.json.gz`;
    fs.writeFileSync(path.join(OUT, file), gz);
    entry.parts.push({ file, routes: part.routes.length, bytes: gz.length });
    entry.routeCount += part.routes.length;
    total += gz.length;
  });
  index.states[st.name] = entry;
  const mb = entry.parts.reduce((s, x) => s + x.bytes, 0) / 1e6;
  console.log(`${st.name.padEnd(16)} ${String(entry.routeCount).padStart(6)} routes ${String(areas.length).padStart(5)} areas  ${mb.toFixed(2)} MB gz in ${entry.parts.length} part(s)  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index));
console.log(`total ${(total / 1e6).toFixed(1)} MB across ${Object.keys(index.states).length} state(s) -> ${OUT}`);
