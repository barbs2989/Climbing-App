// import-ice-wi.mjs — add the WI-graded ice climbs the original state import DROPPED.
//
// etl-state.mjs asks OpenBeta for `grades{yds vscale}` only and drops any climb with neither
// ("dropped (no grade)"), so a pure ice climb — graded WI and nothing else — never reached the
// catalog. Measured 2026-09-24: of 168 routes filed as ice, ~17 carried a WI grade anywhere; the
// rest are climbs OpenBeta ALSO gave a 5.x grade. This script fetches exactly the dropped set
// (a WI grade and NO yds / V grade) and adds them as discipline 'ice', grade_system 'wi', so the
// route finder's WI grade range has climbs to find.
//
// PLACEMENT. Our areas were built from the same OpenBeta walk, with names copied verbatim, but
// their ids were minted in walk order and are not recoverable from OpenBeta — so each climb is
// placed by DESCENDING OUR TREE BY AREA NAME from the state row, one level per OpenBeta ancestor.
// A level with zero or several same-named children REFUSES the climb rather than guessing (areas
// restructured since the import, e.g. peaks re-parented under a formation, simply do not match).
// The etl filed a crag's climbs in a same-named "<id>_climbs" child whenever the crag also had
// sub-areas; that rule is mirrored, and a climb whose area holds child areas but no such child is
// refused, because routes_require_leaf would reject it anyway.
//
// IDENTITY. A climb already present under (area_id, name) is skipped — never duplicated. New ids
// are area_id + "_" + slug(name), the scheme etl-state uses, uniq'd against ids already taken.
//
// Usage (from the repo root):
//   node scripts/pipeline/import-ice-wi.mjs colorado            # dry run: fetch + resolve + report
//   node scripts/pipeline/import-ice-wi.mjs colorado --apply    # write, then read back and reconcile
//   node scripts/pipeline/import-ice-wi.mjs --all [--apply]     # every state row under 'usa'
// Fetched climbs are cached in catalog/_ice_wi/<state>.json (catalog/ is gitignored), so --apply
// after a dry run does not re-walk OpenBeta; pass --refetch to force it.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply"), REFETCH = args.includes("--refetch"), ALL = args.includes("--all");
const KEY = requireServiceKey();
const H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
const API = "https://api.openbeta.io";
const CHUNK = 4;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const norm = s => String(s || "").trim().toLowerCase();

function sql(q) {
  const out = execFileSync("npx", ["supabase", "db", "query", "--linked", q], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  const j = JSON.parse(out.slice(out.indexOf("{")));
  if (!Array.isArray(j.rows)) throw new Error("unexpected db query output");
  return j.rows;
}
async function gql(query, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const j = JSON.parse(await r.text());
      if (j.errors) throw new Error("GraphQL: " + JSON.stringify(j.errors.map(e => e.message)));
      return j.data;
    } catch (e) { if (i === tries - 1) throw e; await sleep(1500 * (i + 1)); }
  }
}

// ── 1. Fetch: every climb under the state with a WI grade and no yds / V grade. ──
const CLIMB = `climbs{ name fa type{ice mixed alpine} grades{wi yds vscale} length pitches{pitchNumber} }`;
const af = d => `area_name ${CLIMB} ` + (d > 0 ? `children{ ${af(d - 1)} }` : `children{ uuid area_name }`);
async function fetchState(stateName) {
  const found = (await gql(`{ areas(filter:{area_name:{match:"${stateName}",exactMatch:true}}){ uuid children{ uuid } } }`)).areas || [];
  const st = found.filter(a => a.children && a.children.length).sort((a, b) => b.children.length - a.children.length)[0];
  if (!st) throw new Error("state not found in OpenBeta: " + stateName);
  const out = []; let fetches = 0, seen = 0;
  async function walk(uuid, chain) {
    fetches++; await sleep(120);
    const root = (await gql(`{ area(uuid:"${uuid}"){ ${af(CHUNK)} } }`)).area;
    if (!root) return;
    async function proc(n, ch, level) {
      const here = [...ch, n.area_name];
      for (const c of n.climbs || []) {
        seen++;
        const g = c.grades || {};
        if (g.wi && !g.yds && !g.vscale) out.push({ chain: here, hasKids: !!(n.children && n.children.length), name: c.name, wi: g.wi, fa: c.fa || null, type: c.type || {}, length: c.length, pitches: (c.pitches || []).length });
      }
      if (level < CHUNK) { for (const k of n.children || []) await proc(k, here, level + 1); }
      else { for (const k of n.children || []) await walk(k.uuid, here); }
    }
    await proc(root, chain, 0);
  }
  const top = (await gql(`{ area(uuid:"${st.uuid}"){ children{ uuid } } }`)).area;
  for (const region of top.children || []) await walk(region.uuid, []);
  return { climbs: out, fetches, seen };
}

// ── 2. Resolve each climb to one of our areas by descending the tree by name. ──
function resolver(stateId) {
  const rows = sql(`select a.id, a.name, a.parent_id from areas a where a.path <@ (select path from areas where id = '${stateId.replace(/'/g, "''")}')`);
  const kids = new Map();
  for (const r of rows) { const k = r.parent_id + "|" + norm(r.name); (kids.get(k) || kids.set(k, []).get(k)).push(r); }
  const hasKids = new Set(rows.map(r => r.parent_id));
  return function place(chain) {
    let cur = stateId;
    for (const nm of chain) {
      const c = kids.get(cur + "|" + norm(nm)) || [];
      if (c.length !== 1) return { why: (c.length ? "ambiguous" : "no area") + " at \"" + nm + "\"" };
      cur = c[0].id;
    }
    if (hasKids.has(cur)) {
      // etl-state filed a crag's climbs in a same-named child "<id>_climbs" when it also had sub-areas.
      const c = (kids.get(cur + "|" + norm(chain[chain.length - 1])) || []).filter(r => r.id === cur + "_climbs");
      if (c.length !== 1) return { why: "area has sub-areas and no _climbs child" };
      cur = c[0].id;
      if (hasKids.has(cur)) return { why: "the _climbs child is not a leaf" };
    }
    return { areaId: cur };
  };
}

async function runState(st) {
  const cacheDir = "catalog/_ice_wi"; mkdirSync(cacheDir, { recursive: true });
  const cache = `${cacheDir}/${st.id}.json`;
  let fetched;
  if (existsSync(cache) && !REFETCH) fetched = JSON.parse(readFileSync(cache, "utf8"));
  else { fetched = await fetchState(st.name); writeFileSync(cache, JSON.stringify(fetched, null, 1)); }
  const { climbs } = fetched;
  if (!climbs.length) { console.log(`${st.name}: 0 WI-only climbs (${fetched.seen} climbs walked)`); return { placed: 0, written: 0, refused: 0 }; }

  const place = resolver(st.id);
  const placed = [], refused = {};
  for (const c of climbs) {
    const p = place(c.chain);
    if (p.areaId) placed.push({ ...c, areaId: p.areaId });
    else { refused[p.why] = (refused[p.why] || 0) + 1; }
  }
  // Skip anything already present under (area_id, name); take ids that are free.
  const areaIds = [...new Set(placed.map(p => p.areaId))];
  const existing = areaIds.length ? sql(`select id, area_id, name from routes where area_id in (${areaIds.map(a => "'" + a.replace(/'/g, "''") + "'").join(",")})`) : [];
  const haveName = new Set(existing.map(r => r.area_id + "|" + norm(r.name)));
  const takenId = new Set(existing.map(r => r.id));
  const rows = [], dupNames = new Set();
  let already = 0;
  for (const p of placed) {
    const k = p.areaId + "|" + norm(p.name);
    if (haveName.has(k) || dupNames.has(k)) { already++; continue; }
    dupNames.add(k);
    let id = p.areaId + "_" + slug(p.name), n = 2; while (takenId.has(id)) id = p.areaId + "_" + slug(p.name) + "_" + n++;
    takenId.add(id);
    const gn = gradeNumFrom(p.wi, "wi");
    if (gn == null) { refused["grade not readable: " + p.wi] = (refused["grade not readable: " + p.wi] || 0) + 1; continue; }
    const t = p.type || {};
    rows.push({
      id, area_id: p.areaId, name: p.name, discipline: "ice", grade: p.wi, grade_system: "wi", grade_num: gn, ice_grade: p.wi,
      pitches: p.pitches || 0, length_m: p.length > 0 ? Math.round(p.length) : null, fa: p.fa,
      disciplines: ["ice", ...(t.mixed ? ["mixed"] : []), ...(t.alpine ? ["alpine"] : [])], auto_generated: false,
    });
  }
  const nRef = Object.values(refused).reduce((a, b) => a + b, 0);
  console.log(`${st.name}: ${climbs.length} WI-only climbs | placed ${placed.length} | already present ${already} | to add ${rows.length} | refused ${nRef}` + (nRef ? "  " + JSON.stringify(refused) : ""));
  if (!APPLY || !rows.length) return { placed: placed.length, written: 0, refused: nRef, toAdd: rows.length };

  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(batch) });
    const txt = await r.text();
    if (!r.ok) throw new Error(`${st.name}: insert failed ${r.status} ${txt.slice(0, 300)}`);
    const got = JSON.parse(txt);
    if (got.length !== batch.length) throw new Error(`${st.name}: inserted ${got.length} of ${batch.length} — refusing to continue`);
  }
  // A 201 is not evidence the data landed: read every id back.
  const back = sql(`select count(*)::int n from routes where grade_system = 'wi' and id in (${rows.map(r => "'" + r.id.replace(/'/g, "''") + "'").join(",")})`)[0].n;
  if (back !== rows.length) throw new Error(`${st.name}: read back ${back} of ${rows.length}`);
  console.log(`  wrote and verified ${back}`);
  return { placed: placed.length, written: back, refused: nRef };
}

const states = sql(`select id, name from areas where parent_id = 'usa' and area_type = 'state' order by name`);
const pick = ALL ? states : states.filter(s => args.includes(s.id));
if (!pick.length) { console.error("Name a state id (e.g. colorado) or pass --all. Known: " + states.map(s => s.id).join(", ")); process.exit(1); }
console.log((APPLY ? "APPLY" : "DRY RUN") + " — " + pick.length + " state(s)");
const tot = { placed: 0, written: 0, refused: 0, toAdd: 0 };
for (const st of pick) {
  try { const r = await runState(st); for (const k in tot) tot[k] += r[k] || 0; }
  catch (e) { console.error(`${st.name}: FAILED — ${e.message}`); process.exitCode = 1; }
}
console.log(`TOTAL placed ${tot.placed} | ${APPLY ? "written " + tot.written : "would add " + tot.toAdd} | refused ${tot.refused}`);
