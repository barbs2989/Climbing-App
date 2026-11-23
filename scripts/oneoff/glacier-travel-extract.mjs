// Builds the review batches for a state's glacier-travel / snow-in-season review (migration 0490).
//
// For every route on an alpine Conditions card that still carries the snow logic on an UNSETTLED answer, or whose
// text names a glacier while its glacier question is unsettled, this writes the route's own snow and glacier
// sentences, a batch at a time, for the per-route review (research-data/glacier-travel-2026-11-23/RULE.md).
// Washington was done first, by hand-run copies of this; this is the per-state form.
//
// Read-only.
//   node scripts/oneoff/glacier-travel-extract.mjs --state or             # ~95 routes a batch
//   node scripts/oneoff/glacier-travel-extract.mjs --state ca --per 80
// Writes research-data/glacier-travel-2026-11-23/<state>/in-<n>.json and audit.json (what the card does today).
import "../lib/load-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, headers, requireServiceKey, selectAll, stateIdFilter } from "../lib/supabase-env.mjs";
import { routeTerrain, CORPUS_COLUMNS } from "../../lib/terrain.js";
import { condKind, hasSnowLegs, bridgeWord, ALPINE_COND_DISCIPLINES } from "../../lib/alpineConditions.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const STATE = arg("--state", null), PER = +arg("--per", 95);
if (!STATE) { console.error("needs --state <slug>"); process.exit(2); }
const key = requireServiceKey();

// routes has no style / route_ft / gain_m column; the rest of the corpus is selected as lib/terrain.js names it.
const NOT_COLUMNS = ["style", "route_ft", "gain_m"];
const cols = [...new Set(["id", "name", "area_id", "discipline", "grade", "pitches", "high_point_ft", "season", "seasonal_hazards", "approach_variants", "glacier_travel", "snow_in_season", ...CORPUS_COLUMNS.filter((c) => !NOT_COLUMNS.includes(c))])];
const rows = await selectAll("routes", cols.join(","), stateIdFilter(STATE) + `&discipline=in.(${ALPINE_COND_DISCIPLINES.join(",")})`, { key, pageSize: 300 });

const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))], areas = {};
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type&id=in.(${encodeURIComponent(chunk)})`, { headers: headers(key) });
  const a = await res.json();
  if (!res.ok || !Array.isArray(a)) throw new Error("areas -> " + res.status + " " + JSON.stringify(a).slice(0, 200));
  a.forEach((x) => (areas[x.id] = x));
  await new Promise((r) => setTimeout(r, 250));
}

const fifth = (g) => /(^|[^\d.])5\.\d/.test(String(g || ""));
const RE = /glacier|glaciat|crevasse|s[eé]rac|icefall|schrund|snow|n[ée]v[ée]\b|firn|cornice|ice\s*axe|crampon|self[- ]arrest|glissad|picket|rope\s*team|moat/i;
const str = (v) => v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.map(str).join(". ") : typeof v === "object" ? Object.values(v).map(str).join(". ") : String(v);

const audit = [], items = [];
for (const r of rows) {
  const a = areas[r.area_id] || {};
  const cat = (r.discipline === "mountaineering" || r.discipline === "scrambling") && fifth(r.grade) ? "alpine" : r.discipline;
  const rr = Object.assign({}, r, { _dbArea: { areaType: a.area_type } });
  const t = routeTerrain(rr), kind = condKind(rr, t, cat), legs = hasSnowLegs(kind, t);
  const row = { id: r.id, name: r.name, area: a.name || null, areaType: a.area_type || null, disc: r.discipline, grade: r.grade, kind, legs, bridges: legs ? bridgeWord(kind, t) : false, glacier: r.glacier_travel || null, snow: r.snow_in_season || null, textGlacier: !!t.evidence.glacierSeen };
  audit.push(row);
  const open = (legs && (row.glacier == null || row.snow == null)) || (row.glacier == null && row.textGlacier);
  if (!open) continue;
  const sents = [];
  for (const c of cols) {
    if (["id", "name", "area_id", "discipline", "grade", "pitches", "high_point_ft", "glacier_travel", "snow_in_season"].includes(c)) continue;
    const text = str(r[c]); if (!text) continue;
    for (const s of text.split(/(?<=[.!?;])\s+|\n+/)) if (RE.test(s) && sents.length < 14) { const x = "[" + c + "] " + s.trim().slice(0, 260); if (!sents.includes(x)) sents.push(x); }
  }
  items.push({ id: r.id, name: r.name, peak: a.name || null, areaType: a.area_type || null, discipline: r.discipline, grade: r.grade, highFt: r.high_point_ft, season: r.season || null, kindToday: kind, text: sents });
}

const dir = path.join(ROOT, "research-data", "glacier-travel-2026-11-23", STATE);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "audit.json"), JSON.stringify(audit));
const N = Math.max(1, Math.ceil(items.length / PER)), per = Math.ceil(items.length / N);
for (let i = 0; i < N; i++) fs.writeFileSync(path.join(dir, `in-${i + 1}.json`), JSON.stringify(items.slice(i * per, (i + 1) * per), null, 1));
const tally = (rs, f) => rs.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
console.log(`${STATE}: ${audit.length} routes on an alpine Conditions card; by kind ${JSON.stringify(tally(audit, (r) => r.kind))}`);
console.log(`  carry the snow logic: ${audit.filter((r) => r.legs).length}; print bridges as fact ${audit.filter((r) => r.bridges === "yes").length}, hedged ${audit.filter((r) => r.bridges === "maybe").length}`);
console.log(`  to review: ${items.length} in ${N} batch(es) of about ${per}; with no snow or glacier sentence at all: ${items.filter((x) => !x.text.length).length}; by kind ${JSON.stringify(tally(items, (r) => r.kindToday))}`);
