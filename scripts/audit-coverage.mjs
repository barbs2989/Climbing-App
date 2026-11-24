// audit:coverage — how much of the catalog is FILLED and how much is BACKED BY EVIDENCE, by state, region and
// discipline; and which climbing areas to work next, the most-used first.
//
//   npm run audit:coverage                               # every state; writes audits/coverage/<date>.json
//   npm run audit:coverage -- --state washington         # one state (slug = the state's area id)
//   npm run audit:coverage -- --compare audits/coverage/2026-11-23.json   # what moved since that snapshot
//   npm run audit:coverage -- --top 40 --out file.json   # longer priority list / another output path
//   npm run audit:coverage -- --selftest                 # the rules (scripts/lib/coverage.mjs), no DB
//
// What it measures, per route and per dimension (coordinates, trailhead pin, approach, descent, protection, pitch
// count, pitch-by-pitch, rappels, grade, length, gain, GPS track, season, access, hazards, overview):
//   relevant  the route's page draws it (lib/fieldScope.js decides, per discipline — a boulder needs no rappels)
//   stored    a value is there (or the crag's own parking / walk-in / season fills it, as the page shows it)
//   sourced   + a research-ledger row with evidence (route_field_evidence) — the most a PARAGRAPH can reach
//   locked    + a locked ledger row or an owner-approved edit — verified, never re-researched
// Priority of an AREA (the outermost crag or peak above the route: the destination a climber picks) is
// Σ usageWeight × gap over its routes; both are defined, and self-tested, in scripts/lib/coverage.mjs.
//
// READ-ONLY. One `supabase db query --linked --read-only` per state (the flags are computed in SQL, so the 300k
// rows' prose never crosses the wire), paced, and it STOPS if a state takes longer than SLOW_MS: take the DB slot
// first (~/dev/db-throttle/dbslot.mjs acquire <name>) when other sessions may be using production.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { NPX, NPX_PRE } from "./lib/npx.mjs";
import { BITS, DIMENSIONS, catOfRow, destinationOf, relevantDims, ledgerTiers, tierOf, usageWeight, gapOf, selftest } from "./lib/coverage.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const PACE_MS = 1500, SLOW_MS = 90000;

if (args.includes("--selftest")) {
  const fails = selftest();
  if (fails.length) { console.error("FAIL: audit:coverage self-test\n  " + fails.join("\n  ")); process.exit(1); }
  console.log(`OK: audit:coverage self-test (${DIMENSIONS.length} dimensions)`);
  process.exit(0);
}

const TMP = process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, "tmp") : os.tmpdir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function query(sql, label) {
  const f = path.join(TMP, `coverage-${process.pid}.sql`);
  fs.writeFileSync(f, sql);
  const t0 = Date.now();
  let raw;
  try {
    raw = execFileSync(NPX, [...NPX_PRE, "supabase", "db", "query", "--linked", "--read-only", "-f", f],
      { encoding: "utf8", timeout: 300000, maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    console.error(`FAIL: ${label}: could not read the live catalog — ${String(e.message).split("\n")[0].slice(0, 300)}`);
    console.error("      A fresh worktree is not linked: copy supabase/.temp from the main checkout (docs/codebase/supabase-scripts.md).");
    console.error("      Nothing was measured. Not a pass.");
    process.exit(1);
  }
  const ms = Date.now() - t0;
  const at = raw.indexOf("{");
  const outer = JSON.parse(raw.slice(at));
  const row = (outer.rows || [])[0];
  if (!row) { console.error(`FAIL: ${label}: no row came back`); process.exit(1); }
  return { j: row.j, ms };
}

// "Filled": a value that renders. ::text covers text, jsonb and arrays alike ('{}' is an empty array).
const filled = (x) => `(${x} is not null and btrim(${x}::text) not in ('', 'null', '[]', '{}', '""'))`;
const PRESENCE_SQL = {
  coords: "r.lat is not null and r.lng is not null",
  // trailheadPoint() (ClimbMatchCore.jsx): a Trailhead pin, a pin NAMED like one, or approach_logistics' point.
  trailhead_pin: `exists (select 1 from jsonb_array_elements(case when jsonb_typeof(r.waypoints) = 'array' then r.waypoints else '[]'::jsonb end) w
      where (lower(coalesce(w->>'type', '')) = 'trailhead' or coalesce(w->>'name', w->>'label', '') ~* '(trail\\s*head|parking|\\mth\\M)')
        and nullif(w->>'lat', '') is not null and nullif(w->>'lng', '') is not null)
    or (nullif(r.approach_logistics->>'trailheadLat', '') is not null and nullif(r.approach_logistics->>'trailheadLng', '') is not null)`,
  approach: `${filled("r.approach")} or ${filled("r.approach_variants")}`,
  descent: `${filled("r.descent_text")} or ${filled("r.descent")}`,
  protection: `${filled("r.rack_items")} or ${filled("r.rack")} or ${filled("r.detailed_rack")} or ${filled("r.pro_needs")}
    or r.bolts is not null or ${filled("r.prot_rating")} or r.alpine_draws is not null or r.pads is not null
    or ${filled("r.gear")} or ${filled("r.anchor")} or ${filled("r.sling_rack")}`,
  pitches: "r.pitches is not null",
  pitch_detail: filled("r.pitch_detail"),
  rappels: `${filled("r.rappel_detail")} or ${filled("r.rappels")}`,
  grade: filled("r.grade"),
  length: "r.length_m is not null",
  gain: "r.gain_ft is not null",
  track: filled("r.gpx"),
  season: filled("r.season"),
  access: `${filled("r.access")} or ${filled("r.road")} or ${filled("r.permit")}`,
  hazards: `${filled("r.hazards")} or ${filled("r.obj_haz")}`,
  overview: `${filled("r.overview")} or ${filled("r.description")}`,
};
const BITS_SQL = BITS.map((b, i) => `(case when ${PRESENCE_SQL[b]} then ${1 << i} else 0 end)`).join("\n   + ");
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

const stateExpr = (id) => `json_build_object(
 'areas', (select coalesce(json_agg(json_build_array(a.id, a.parent_id, a.area_type, a.name, nlevel(a.path),
     a.parking_lat is not null and a.parking_lng is not null, ${filled("a.approach")} or ${filled("a.walkin_gpx")}, ${filled("a.season_months")},
     a.lat is not null and a.lng is not null and not coalesce(a.coords_approx, false))), '[]')
   from areas a where a.path <@ (select path from areas where id = ${lit(id)})),
 'routes', (select coalesce(json_agg(json_build_array(r.id, r.area_id, r.discipline, r.grade, r.rock_grade, r.alpine_grade, r.pitches,
     r.classic, r.classic_score, r.guide_stars, r.stars, coalesce(cardinality(r.lists), 0) > 0,
     ${BITS_SQL})), '[]')
   from routes r join areas a on a.id = r.area_id where a.path <@ (select path from areas where id = ${lit(id)})))`;
/* Several states per query: each `supabase db query` costs ~5 s of CLI start-up whatever it reads, so 61
   one-state calls overran 10 minutes (measured 2026-11-23). States are packed up to BATCH_ROUTES routes. */
const BATCH_ROUTES = 20000;
const batchSql = (ids) => `select json_build_object(${ids.map((id) => `${lit(id)}, ${stateExpr(id)}`).join(",\n")}) j;`;

const GLOBAL_SQL = `select json_build_object(
 'states', (select json_agg(json_build_array(a.id, a.name, a.path::text,
     (select count(*) from routes r join areas b on b.id = r.area_id where b.path <@ a.path)) order by a.path) from areas a where nlevel(a.path) = 2),
 'ledger', (select coalesce(json_agg(json_build_array(e.route_id, e.field, e.level, jsonb_array_length(e.evidence))), '[]') from route_field_evidence e),
 'owner', (select coalesce(json_agg(json_build_array(c.route_id, f.column_name)), '[]')
   from route_field_confidence c join contribution_fields f on f.form_key = c.field
  where c.set_by is not null and c.level = 'high' and f.column_name is not null),
 'views', (select coalesce(json_agg(json_build_array(route_id, n)), '[]') from
   (select route_id, count(*) n from route_views where day > current_date - 90 group by 1) v),
 'climbers', (select coalesce(json_agg(json_build_array(route_id, n)), '[]') from
   (select route_id, count(distinct user_id) n from climb_logs where moderation = 'visible' and tick_type is distinct from 'Conditions' group by 1) l),
 'objectives', (select coalesce(json_agg(json_build_array(route_id, n)), '[]') from
   (select route_id, count(distinct user_id) n from objectives group by 1) o)
) j;`;

// ── aggregation ──────────────────────────────────────────────────────────────────────────────────────────
const newAgg = () => ({ routes: 0, weight: 0, priority: 0, dims: Object.fromEntries(DIMENSIONS.map((d) => [d.key, [0, 0, 0, 0]])) });
function add(agg, tiers, w, gap) {
  agg.routes++; agg.weight += w; agg.priority += w * gap;
  for (const [k, t] of Object.entries(tiers)) {
    const a = agg.dims[k]; a[0]++; if (t >= 1) a[1]++; if (t >= 2) a[2]++; if (t >= 3) a[3]++;
  }
}
const pct = (n, d) => (d ? (100 * n) / d : 0);
/** Relevant-slot totals of an agg: [relevant, stored, sourced, locked]. */
const slots = (agg) => Object.values(agg.dims).reduce((s, a) => s.map((v, i) => v + a[i]), [0, 0, 0, 0]);

async function main() {
  const onlyState = opt("--state", null);
  const top = Number(opt("--top", 25));
  const date = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the machine's own day, not UTC's
  // The baseline is read FIRST, and a snapshot never lands on it: run twice in one day, the dated name IS the
  // baseline's, and writing before reading compared the new snapshot with itself and destroyed the old one.
  const cmp = opt("--compare", null);
  const prev = cmp ? JSON.parse(fs.readFileSync(path.resolve(ROOT, cmp), "utf8")) : null;
  let outPath = path.resolve(ROOT, opt("--out", `audits/coverage/${onlyState ? onlyState + "-" : ""}${date}.json`));
  // A snapshot is a record: the default name never REPLACES one already on disk (measured 2026-11-24: a third run
  // that day overwrote the committed post-batch snapshot, because only the --compare file was protected). An
  // explicit --out is the caller's choice and is honoured, unless it is the file being compared against.
  const hm = () => new Date().toTimeString().slice(0, 8).replace(/:/g, "");
  if ((!opt("--out", null) && fs.existsSync(outPath)) || (cmp && path.resolve(ROOT, cmp) === outPath)) {
    outPath = outPath.replace(/\.json$/, `-${hm()}.json`);
  }

  const g = query(GLOBAL_SQL, "global").j;
  const ledgerBy = new Map(), ownerBy = new Map(), use = new Map();
  for (const [id, field, level, n] of g.ledger) { if (!ledgerBy.has(id)) ledgerBy.set(id, []); ledgerBy.get(id).push({ field, level, n }); }
  for (const [id, col] of g.owner) { if (!ownerBy.has(id)) ownerBy.set(id, []); ownerBy.get(id).push(col); }
  for (const [key, rows] of [["views", g.views], ["climbers", g.climbers], ["objectives", g.objectives]])
    for (const [id, n] of rows) { if (!use.has(id)) use.set(id, {}); use.get(id)[key] = n; }

  let states = g.states.map(([id, name, p, n]) => ({ id, name, country: p.split(".")[0], n }));
  if (onlyState) { states = states.filter((s) => s.id === onlyState); if (!states.length) { console.error(`FAIL: no state area "${onlyState}"`); process.exit(1); } }

  const total = newAgg(), byDisc = {}, byState = {}, byStateDisc = {}, byRegion = {}, units = new Map();
  const batches = [];
  for (const s of states) {
    const b = batches[batches.length - 1];
    if (b && b.n + s.n <= BATCH_ROUTES) { b.states.push(s); b.n += s.n; } else batches.push({ states: [s], n: s.n });
  }
  for (const [bi, batch] of batches.entries()) {
    if (bi) await sleep(PACE_MS);
    const label = batch.states.map((s) => s.id).join(",");
    const { j: bj, ms } = query(batchSql(batch.states.map((s) => s.id)), label);
    process.stderr.write(`  [${bi + 1}/${batches.length}] ${label}: ${batch.n} routes (${(ms / 1000).toFixed(1)} s)\n`);
    if (ms > SLOW_MS) { console.error(`STOP: ${label} took ${Math.round(ms / 1000)} s — the database is struggling. Re-run later; nothing was written.`); process.exit(1); }
  for (const s of batch.states) {
    const j = bj[s.id];
    // The count is read seconds before the batch, and other sessions write the catalog meanwhile (measured: one
    // WA route added between the two, 2026-11-23). So a few rows of drift is the live catalog; a SHORT read is not.
    if (!j || j.routes.length < s.n * 0.995) { console.error(`FAIL: ${s.id}: read ${j ? j.routes.length : "nothing"} routes, the count said ${s.n} — a partial read is not a measurement`); process.exit(1); }
    if (j.routes.length !== s.n) process.stderr.write(`    ${s.id}: ${j.routes.length} routes read, ${s.n} counted a moment earlier — the catalog moved\n`);
    const areas = new Map(j.areas.map(([id, parent, type, name, depth, parking, approach, season, ll]) => [id, { id, parent, type, name, depth, parking, approach, season, ll }]));
    // Per area: its destination (outermost crag/peak), its region (depth 3), and what it or an ancestor fills.
    const memo = new Map();
    const info = (aid) => {
      if (memo.has(aid)) return memo.get(aid);
      const chain = [];
      for (let a = areas.get(aid); a; a = areas.get(a.parent)) chain.push(a);
      const dest = destinationOf(chain);
      const destParent = dest ? areas.get(dest.parent) : null;
      const region = chain.find((a) => a.depth === 3) || chain[0];
      const below = chain.filter((a) => a.depth > 2); // the state's own row never fills a route's field
      const r = { dest, destParent, region, has: { parking: below.some((a) => a.parking), approach: below.some((a) => a.approach), season: below.some((a) => a.season),
        // the point the page draws: the route's own area's, else the nearest crag/peak above it — never a region's
        coords: !!(chain.find((a) => a.ll || a.type === "region") || {}).ll } };
      memo.set(aid, r);
      return r;
    };
    byState[s.id] ||= Object.assign(newAgg(), { name: s.name, country: s.country });
    byStateDisc[s.id] ||= {};
    for (const [id, areaId, discipline, grade, rockGrade, alpineGrade, pitches, classic, classicScore, guideStars, stars, listed, bits] of j.routes) {
      const a = areas.get(areaId);
      const { dest, destParent, region, has } = info(areaId);
      const cat = catOfRow({ discipline, grade, rock_grade: rockGrade, alpine_grade: alpineGrade }, a && a.type);
      const rel = relevantDims(cat, pitches, bits);
      const lt = ledgerTiers(ledgerBy.get(id), ownerBy.get(id));
      const tiers = {};
      for (const d of rel) tiers[d] = tierOf(d, bits, has, lt);
      const w = usageWeight({ classic, classic_score: classicScore, guide_stars: guideStars, stars, listed }, use.get(id));
      const gap = gapOf(tiers);
      add(total, tiers, w, gap);
      add(byDisc[cat] ||= newAgg(), tiers, w, gap);
      add(byState[s.id], tiers, w, gap);
      add(byStateDisc[s.id][cat] ||= newAgg(), tiers, w, gap);
      const rk = `${s.id}/${region ? region.id : "-"}`;
      add(byRegion[rk] ||= Object.assign(newAgg(), { state: s.id, name: region ? region.name : "-" }), tiers, w, gap);
      const uk = dest ? dest.id : areaId;
      if (!units.has(uk)) units.set(uk, Object.assign(newAgg(), { id: uk, name: dest ? dest.name : uk, parent: destParent ? destParent.name : null, type: dest ? dest.type : null, state: s.id, region: region ? region.name : null, discs: {}, missingW: {} }));
      const u = units.get(uk);
      add(u, tiers, w, gap);
      u.discs[cat] = (u.discs[cat] || 0) + 1;
      for (const [k, t] of Object.entries(tiers)) if (t === 0) u.missingW[k] = (u.missingW[k] || 0) + w;
    }
  }
  }

  // ── report ──
  const fmt = (agg) => { const [r, st, so, lo] = slots(agg); return `${pct(st, r).toFixed(1)}% stored · ${pct(so, r).toFixed(2)}% sourced · ${pct(lo, r).toFixed(2)}% locked`; };
  console.log(`\nCOVERAGE — ${total.routes.toLocaleString()} routes, ${states.length} state(s) — ${fmt(total)} of relevant fields\n`);
  console.log("By dimension (relevant routes → stored / sourced / locked):");
  for (const d of DIMENSIONS) {
    const [r, st, so, lo] = total.dims[d.key];
    console.log(`  ${d.label.padEnd(24)} ${String(r).padStart(7)}  ${pct(st, r).toFixed(1).padStart(5)}%  ${pct(so, r).toFixed(2).padStart(6)}%  ${pct(lo, r).toFixed(2).padStart(6)}%`);
  }
  console.log("\nBy discipline:");
  for (const [k, a] of Object.entries(byDisc).sort((x, y) => y[1].routes - x[1].routes)) console.log(`  ${k.padEnd(16)} ${String(a.routes).padStart(7)} routes  ${fmt(a)}`);
  const ranked = [...units.values()].sort((x, y) => y.priority - x.priority);
  const topMissing = (u) => Object.entries(u.missingW).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k]) => DIMENSIONS.find((d) => d.key === k).label).join(", ");
  console.log(`\nPRIORITY — the ${top} areas where use × missing data is greatest:`);
  ranked.slice(0, top).forEach((u, n) => console.log(`  ${String(n + 1).padStart(3)}. ${u.name}${u.parent && u.parent !== u.region ? " — " + u.parent : ""} (${u.state}${u.region ? " › " + u.region : ""}) — ${u.routes} routes, use ${Math.round(u.weight)}, ${fmt(u)}\n       missing most: ${topMissing(u)}`));

  // A dimension no route here is relevant to is left out (a reader treats it as [0,0,0,0]). Kept small on purpose:
  // the first full snapshot was 3.1 MB, three quarters of it a 3,357-row priority list nobody reads past the top.
  const liveDims = (dims) => Object.fromEntries(Object.entries(dims).filter(([, a]) => a[0] > 0));
  const slim = (a) => ({ routes: a.routes, weight: Math.round(a.weight), priority: Math.round(a.priority), dims: liveDims(a.dims), ...(a.name ? { name: a.name } : {}), ...(a.state ? { state: a.state } : {}), ...(a.country ? { country: a.country } : {}) });
  const perState = {};
  for (const u of ranked) { (perState[u.state] ||= []).length < 20 && perState[u.state].push(u.id); }
  const keep = new Set([...ranked.slice(0, 500).map((u) => u.id), ...Object.values(perState).flat()]);
  const snapshot = {
    meta: { generatedAt: new Date().toISOString(), scope: onlyState || "all", tiers: ["relevant", "stored", "sourced", "locked"],
      dimensions: DIMENSIONS.map(({ key, label }) => ({ key, label })),
      note: "dims[key] = [relevant, stored, sourced, locked] route counts; rules in scripts/lib/coverage.mjs" },
    total: slim(total),
    byDiscipline: Object.fromEntries(Object.entries(byDisc).map(([k, a]) => [k, slim(a)])),
    byState: Object.fromEntries(Object.entries(byState).map(([k, a]) => [k, slim(a)])),
    byStateDiscipline: Object.fromEntries(Object.entries(byStateDisc).map(([k, m]) => [k, Object.fromEntries(Object.entries(m).map(([c, a]) => [c, slim(a)]))])),
    byRegion: Object.fromEntries(Object.entries(byRegion).map(([k, a]) => [k, slim(a)])),
    priorities: ranked.filter((u) => keep.has(u.id)).map((u) => ({ ...slim(u), id: u.id, parent: u.parent, type: u.type, region: u.region, discs: u.discs,
      missingWeighted: Object.fromEntries(Object.entries(u.missingW).map(([k, v]) => [k, Math.round(v)])) })),
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot) + "\n");
  console.log(`\nSnapshot: ${path.relative(ROOT, outPath)}`);

  if (prev) {
    // In FIELDS, not percentage points: a research batch moves a few hundred fields of 1.4 million, which reads as
    // "+0.00 pts" (measured on the first two runs). Only what changed is printed.
    const sg = (n) => (n > 0 ? "+" : "") + n;
    const delta = (a, b) => { const x = slots(a), y = b ? slots(b) : [0, 0, 0, 0]; return { routes: a.routes - (b ? b.routes : 0), st: x[1] - y[1], so: x[2] - y[2], lo: x[3] - y[3] }; };
    const show = (label, dl, pad) => console.log(`${pad}${label.padEnd(24)} ${sg(dl.st)} stored · ${sg(dl.so)} sourced · ${sg(dl.lo)} locked fields  (${sg(dl.routes)} routes)`);
    console.log(`\nSince ${cmp} (${new Date(prev.meta.generatedAt).toLocaleString("en-CA")}):`);
    const sameScope = prev.meta.scope === (onlyState || "all");
    if (sameScope) show("TOTAL", delta(total, prev.total), "  ");
    else console.log(`  (scopes differ — ${prev.meta.scope} vs ${onlyState || "all"} — so only the states both measured are compared)`);
    if (sameScope) for (const d of DIMENSIONS) {
      const a = total.dims[d.key], b = (prev.total.dims || {})[d.key] || [0, 0, 0, 0];
      if (a.some((v, n) => v !== b[n])) console.log(`    ${d.label.padEnd(22)} ${sg(a[1] - b[1])} stored · ${sg(a[2] - b[2])} sourced · ${sg(a[3] - b[3])} locked`);
    }
    let quiet = 0;
    for (const [k, a] of Object.entries(byState)) {
      const dl = delta(a, prev.byState && prev.byState[k]);
      if (dl.routes || dl.st || dl.so || dl.lo) show(k, dl, "  "); else quiet++;
    }
    if (quiet) console.log(`  (${quiet} state(s) unchanged)`);
  }
}

main().catch((e) => { console.error("FAIL:", e && e.stack || e); process.exit(1); });
