// Applies researched, per-field corrections to `routes`, each guarded on the exact value it replaces.
//
//   node scripts/oneoff/apply-route-fixes.mjs <fixes.json>          # dry run
//   node scripts/oneoff/apply-route-fixes.mjs <fixes.json> --apply  # writes, then re-reads; saves <fixes>.rollback.json
//
// fixes.json is an array of { id, why, set: { <path>: { from?, to } } }. A path is a top-level column (`best_season`),
// one key of a jsonb column (`access.notes`, `access._raw`), or one month of the calendar
// (`seasonal_guidance.monthBreakdown.May`, whose `to` is {status, reason} or null to drop the month).
// `from` must equal the live value exactly (deep-equal for objects), or the whole batch is refused — so a fix
// researched against a row that has since changed can never land on the new text. `from` may be omitted only for a
// calendar month. Other refusals: a `season` that is not a <=12-char window seasonWindowMonths parses; any rendered
// string naming a source; a calendar whose optimal/good months fall outside the row's (new) season.
// Never deletes a row or changes an id.
import fs from "fs";
import { patchRow, requireServiceKey, headers, SUPABASE_URL } from "../lib/supabase-env.mjs";
const panelSrc = fs.readFileSync(new URL("../../EnrichmentPanels.jsx", import.meta.url), "utf8");
const a = panelSrc.indexOf("export function monthRank("), b = panelSrc.indexOf("export function SeasonalGuidancePanel");
if (a < 0 || b < a) throw new Error("seasonWindowMonths not found in EnrichmentPanels.jsx");
const seasonWindowMonths = new Function(panelSrc.slice(a, b).replace(/export function/g, "function") + "\nreturn seasonWindowMonths;")();

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: apply-route-fixes.mjs <fixes.json> [--apply]"); process.exit(2); }
const apply = flag === "--apply";
const fixes = JSON.parse(fs.readFileSync(file, "utf8"));
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const STATUSES = new Set(["optimal", "good", "marginal", "risky"]);
const SOURCE = /\b(according to|per (the |a )?(guide|guidebook|trip reports?|topo)|trip reports?|guidebook|summitpost|mountain ?project|cascade ?climbers|peakbagger|reported by|sources? (say|note|report|suggest|describe))\b|https?:|www\./i;
const canon = v => v && typeof v === "object" ? (Array.isArray(v) ? v.map(canon) : Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])]))) : v;
const same = (x, y) => JSON.stringify(canon(x ?? null)) === JSON.stringify(canon(y ?? null));
const strings = v => typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];

const key = requireServiceKey();
const ids = [...new Set(fixes.map(f => f.id))];
const cols = [...new Set(["id", "season", ...fixes.flatMap(f => Object.keys(f.set).map(p => p.split(".")[0]))])];
const read = async () => new Map((await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${cols.join(",")}&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(key) })).json()).map(r => [r.id, r]));
const live = await read();

const errors = [], plan = new Map();
for (const f of fixes) {
  const row = live.get(f.id), at = f.id;
  if (!row) { errors.push(`${at}: no such route`); continue; }
  const p = plan.get(at) || { id: at, before: {}, after: {}, why: [] };
  p.why.push(f.why || "");
  for (const [path, { from, to }] of Object.entries(f.set)) {
    const [col, ...rest] = path.split(".");
    if (!(col in p.after)) { p.before[col] = row[col]; p.after[col] = structuredClone(row[col] ?? null); }
    if (!rest.length) {
      if (!same(p.after[col], from)) { errors.push(`${at}: ${path} is not the expected value (live: ${JSON.stringify(p.after[col])?.slice(0, 90)})`); continue; }
      p.after[col] = to;
    } else if (col === "seasonal_guidance") {
      const m = rest[rest.length - 1];
      if (rest[0] !== "monthBreakdown" || !MONTHS.includes(m)) { errors.push(`${at}: bad calendar path ${path}`); continue; }
      if (!p.after[col]?.monthBreakdown) { errors.push(`${at}: no calendar to edit`); continue; }
      if (from !== undefined && !same(p.after[col].monthBreakdown[m], from)) { errors.push(`${at}: ${path} is not the expected value`); continue; }
      if (to === null) delete p.after[col].monthBreakdown[m];
      else if (!to || !STATUSES.has(to.status) || typeof to.reason !== "string" || !to.reason.trim() || to.reason.length > 200) { errors.push(`${at}: ${path} needs {status, reason<=200}`); continue; }
      else p.after[col].monthBreakdown[m] = { status: to.status, reason: to.reason.trim() };
    } else {
      const k = rest.join(".");
      if (p.after[col] == null || typeof p.after[col] !== "object") { errors.push(`${at}: ${col} is not an object`); continue; }
      if (!same(p.after[col][k], from)) { errors.push(`${at}: ${path} is not the expected value (live: ${JSON.stringify(p.after[col][k])?.slice(0, 90)})`); continue; }
      if (to === null) delete p.after[col][k]; else p.after[col][k] = to;
    }
    for (const s of strings(to)) if (SOURCE.test(s)) errors.push(`${at}: ${path} names a source: ${s.match(SOURCE)[0]}`);
  }
  plan.set(at, p);
}
for (const p of plan.values()) {
  const row = live.get(p.id), season = "season" in p.after ? p.after.season : row.season;
  if ("season" in p.after && (typeof season !== "string" || season.length > 12 || !seasonWindowMonths(season))) errors.push(`${p.id}: season "${season}" is not a parseable window of <=12 chars`);
  const sg = "seasonal_guidance" in p.after ? p.after.seasonal_guidance : row.seasonal_guidance, win = seasonWindowMonths(season);
  if (sg && win && ("season" in p.after || "seasonal_guidance" in p.after))
    for (const [m, v] of Object.entries(sg.monthBreakdown || {}))
      if ((v.status === "optimal" || v.status === "good") && !win.months.includes(MONTHS.indexOf(m))) errors.push(`${p.id}: ${m} is ${v.status} but outside season ${season}`);
}
if (errors.length) { console.error(`REFUSED — ${errors.length} problem(s):\n  ` + errors.join("\n  ")); process.exit(1); }
for (const p of plan.values()) console.log(`${p.id}: ${Object.keys(p.after).join(", ")}`);
console.log(`${fixes.length} fixes over ${plan.size} rows valid.`);
if (!apply) { console.log("Dry run — pass --apply to write."); process.exit(0); }

fs.writeFileSync(file.replace(/\.json$/, "") + ".rollback.json", JSON.stringify([...plan.values()].map(p => ({ id: p.id, ...p.before })), null, 1) + "\n");
const fresh = await read();
for (const p of plan.values()) if (Object.keys(p.before).some(c => !same(fresh.get(p.id)?.[c], p.before[c]))) { console.error(`${p.id} changed while this ran — nothing written.`); process.exit(1); }
for (const p of plan.values()) await patchRow("routes", p.id, p.after);
const after = await read();
const bad = [...plan.values()].filter(p => Object.entries(p.after).some(([c, v]) => !same(after.get(p.id)?.[c], v)));
if (bad.length) { console.error(`RECONCILE FAILED for ${bad.map(p => p.id).join(", ")}`); process.exit(1); }
console.log(`Wrote and re-read ${plan.size} rows; every one matches. Rollback saved beside the fixes file.`);
