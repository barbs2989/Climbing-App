// Replaces PROSE in `routes.season` with the month WINDOW it describes, moving the prose into `best_season` when
// that column is empty (docs/codebase/enrichment-prose.md: `season` is a window rendered in the header strap).
//
//   node scripts/oneoff/apply-season-window.mjs <batch.json>          # dry run
//   node scripts/oneoff/apply-season-window.mjs <batch.json> --apply
//
// The batch is the same file apply-seasonal-guidance.mjs reads; only entries carrying `season_fix` are touched:
//   { id, season_fix: { season: "Dec-Apr", best_season?: "<prose, only when the row has none>" }, ... }
// Validation refuses the whole batch on one failure:
//   - the new season parses with the panel's own seasonWindowMonths and is at most 12 characters;
//   - the live season is NOT already a plain window (this script only repairs prose);
//   - best_season is written only where the live row has none, and names no source.
// Each write is guarded on the season value read here, so a row edited in between is left alone, then re-read.
import fs from "fs";
import { patchRow, requireServiceKey, headers, SUPABASE_URL } from "../lib/supabase-env.mjs";
const panelSrc = fs.readFileSync(new URL("../../EnrichmentPanels.jsx", import.meta.url), "utf8");
const from = panelSrc.indexOf("export function monthRank("), to = panelSrc.indexOf("export function SeasonalGuidancePanel");
if (from < 0 || to < from) throw new Error("seasonWindowMonths not found in EnrichmentPanels.jsx");
const seasonWindowMonths = new Function(panelSrc.slice(from, to).replace(/export function/g, "function") + "\nreturn seasonWindowMonths;")();

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: apply-season-window.mjs <batch.json> [--apply]"); process.exit(2); }
const apply = flag === "--apply";
const batch = JSON.parse(fs.readFileSync(file, "utf8")).filter(e => e.season_fix);
if (!batch.length) { console.log("No season_fix entries."); process.exit(0); }
const PLAIN = /^[A-Z][a-z]{2}-[A-Z][a-z]{2}$/;
const SOURCE = /\b(according to|per (the |a )?(guide|guidebook|trip reports?|topo|first[- ]ascent)|trip reports?|guidebook|beckey|nelson|summitpost|mountain ?project|cascade ?climbers|peakbagger|reported by|sources? (say|note|report|suggest|describe))\b|https?:|www\./i;

const key = requireServiceKey();
const ids = batch.map(e => e.id);
const read = async () => new Map((await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,season,best_season&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(key) })).json()).map(r => [r.id, r]));
const live = await read();

const errors = [], plan = [];
for (const e of batch) {
  const row = live.get(e.id), f = e.season_fix, at = e.id;
  if (!row) { errors.push(`${at}: no such route`); continue; }
  if (row.season && PLAIN.test(row.season.trim())) { errors.push(`${at}: season is already a window (${row.season})`); continue; }
  if (typeof f.season !== "string" || f.season.length > 12 || !seasonWindowMonths(f.season)) errors.push(`${at}: new season "${f.season}" is not a parseable window of <=12 chars`);
  const patch = { season: f.season };
  if (f.best_season != null) {
    if (row.best_season != null) errors.push(`${at}: best_season already set — refusing to overwrite it`);
    else if (typeof f.best_season !== "string" || !f.best_season.trim() || f.best_season.length > 400) errors.push(`${at}: best_season must be 1-400 chars`);
    else if (SOURCE.test(f.best_season)) errors.push(`${at}: best_season names a source: ${f.best_season.match(SOURCE)[0]}`);
    else patch.best_season = f.best_season.trim();
  }
  plan.push({ id: at, old: row.season, patch });
}
if (errors.length) { console.error(`REFUSED — ${errors.length} problem(s):\n  ` + errors.join("\n  ")); process.exit(1); }
for (const p of plan) console.log(`${p.id}: "${String(p.old).slice(0, 60)}" -> ${p.patch.season}${p.patch.best_season ? " (+best_season)" : ""}`);
if (!apply) { console.log(`${plan.length} entries valid. Dry run — pass --apply to write.`); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, p.patch, { filter: `season=eq.${encodeURIComponent(p.old)}` });
const after = await read();
const bad = plan.filter(p => Object.entries(p.patch).some(([k, v]) => after.get(p.id)?.[k] !== v));
if (bad.length) { console.error(`RECONCILE FAILED for ${bad.map(p => p.id).join(", ")}`); process.exit(1); }
console.log(`Wrote and re-read ${plan.length} rows; every one matches.`);
