// Writes researched `seasonal_guidance` ({optimalWindow, monthBreakdown}) into routes that have none.
//
//   node scripts/oneoff/apply-seasonal-guidance.mjs audits/seasonal-guidance/<batch>.json          # dry run
//   node scripts/oneoff/apply-seasonal-guidance.mjs audits/seasonal-guidance/<batch>.json --apply
//
// The batch file is an array of {id, seasonal_guidance, evidence, flags}; `evidence` and `flags` are for the
// reviewer and are never written. Every entry is validated before anything is written, and one failure refuses
// the whole batch:
//   - month keys are full English names, statuses are the four SeasonalGuidancePanel knows;
//   - every optimal/good month sits inside the route's own `season` window, parsed by the SAME function the
//     panel uses (seasonWindowMonths), so the calendar never contradicts the header strap it sits under;
//   - no shipped string names a source (the rule behind check:no-sources and audit:prose-citations).
// The write is guarded on `seasonal_guidance is null`, so it can only fill an empty row — never overwrite
// one of the researched breakdowns already live — and each row is re-read afterwards, because a 200 is not
// evidence the data changed.
import fs from "fs";
import { patchRow, requireServiceKey, headers, SUPABASE_URL } from "../lib/supabase-env.mjs";
// seasonWindowMonths is lifted out of the panel's own source (node cannot import JSX), so the check
// cannot drift from the parser the calendar actually draws with.
const panelSrc = fs.readFileSync(new URL("../../EnrichmentPanels.jsx", import.meta.url), "utf8");
const from = panelSrc.indexOf("export function monthRank("), to = panelSrc.indexOf("export function SeasonalGuidancePanel");
if (from < 0 || to < from) throw new Error("seasonWindowMonths not found in EnrichmentPanels.jsx");
const seasonWindowMonths = new Function(panelSrc.slice(from, to).replace(/export function/g, "function") + "\nreturn seasonWindowMonths;")();

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: apply-seasonal-guidance.mjs <batch.json> [--apply]"); process.exit(2); }
const apply = flag === "--apply";
const batch = JSON.parse(fs.readFileSync(file, "utf8"));

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const STATUSES = new Set(["optimal", "good", "marginal", "risky"]);
const SOURCE = /\b(according to|per (the |a )?(guide|guidebook|trip reports?|topo)|trip reports?|guidebook|beckey|nelson|summitpost|mountain ?project|cascade ?climbers|peakbagger|reported by|sources? (say|note|report|suggest|describe))\b|https?:|www\./i;

const key = requireServiceKey();
const ids = batch.map(e => e.id);
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,season,seasonal_guidance&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(key) });
const live = new Map((await res.json()).map(r => [r.id, r]));

const errors = [];
for (const e of batch) {
  const row = live.get(e.id), sg = e.seasonal_guidance, at = e.id;
  if (!row) { errors.push(`${at}: no such route`); continue; }
  if (row.seasonal_guidance != null) { errors.push(`${at}: already has seasonal_guidance — this script only fills empty rows`); continue; }
  if (!sg || typeof sg.optimalWindow !== "string" || !sg.optimalWindow.trim()) errors.push(`${at}: optimalWindow missing`);
  const mb = (sg && sg.monthBreakdown) || {};
  if (Object.keys(mb).length < 3) errors.push(`${at}: fewer than 3 months`);
  const win = seasonWindowMonths(row.season);
  const texts = [sg && sg.optimalWindow || ""];
  for (const [m, v] of Object.entries(mb)) {
    if (!MONTHS.includes(m)) errors.push(`${at}: bad month key ${m}`);
    if (!v || !STATUSES.has(v.status)) errors.push(`${at}: ${m} bad status ${v && v.status}`);
    if (!v || typeof v.reason !== "string" || !v.reason.trim()) errors.push(`${at}: ${m} has no reason`);
    else if (v.reason.length > 200) errors.push(`${at}: ${m} reason is ${v.reason.length} chars`);
    if (v) texts.push(v.reason || "");
    if (win && v && (v.status === "optimal" || v.status === "good") && !win.months.includes(MONTHS.indexOf(m)))
      errors.push(`${at}: ${m} is ${v.status} but outside the route's season (${row.season})`);
  }
  for (const t of texts) if (SOURCE.test(t)) errors.push(`${at}: names a source: ${t.match(SOURCE)[0]} — "${t.slice(0, 80)}"`);
}
if (errors.length) { console.error(`REFUSED — ${errors.length} problem(s):\n  ` + errors.join("\n  ")); process.exit(1); }
console.log(`${batch.length} entries valid.`);
if (!apply) { console.log("Dry run — pass --apply to write."); process.exit(0); }

// Store months in calendar order, which is how the panel sorts them anyway.
const ordered = sg => ({ optimalWindow: sg.optimalWindow.trim(), monthBreakdown: Object.fromEntries(
  MONTHS.filter(m => sg.monthBreakdown[m]).map(m => [m, { status: sg.monthBreakdown[m].status, reason: sg.monthBreakdown[m].reason.trim() }])) });
for (const e of batch) await patchRow("routes", e.id, { seasonal_guidance: ordered(e.seasonal_guidance) }, { filter: "seasonal_guidance=is.null" });

const back = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,seasonal_guidance&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(key) });
const after = new Map((await back.json()).map(r => [r.id, r]));
const bad = batch.filter(e => JSON.stringify(after.get(e.id)?.seasonal_guidance) !== JSON.stringify(ordered(e.seasonal_guidance)));
if (bad.length) { console.error(`RECONCILE FAILED for ${bad.map(e => e.id).join(", ")}`); process.exit(1); }
console.log(`Wrote and re-read ${batch.length} rows; every one matches.`);
