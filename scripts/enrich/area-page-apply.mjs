#!/usr/bin/env node
// Write researched AREA-PAGE fields (0304): blurb, parking_note, approach, approach_min,
// season_months, rock (+ rock_basis 'researched'), aspect — from a batch file, through patchRow,
// with a rollback file. The same seven fields a climber can edit (lib/areaFields.js), so a
// research pass and a contribution land in the same columns and render in the same sections.
//
//   node scripts/enrich/area-page-apply.mjs --from audits/area-pages/<batch>.json [--dry] [--overwrite]
//
// Batch shape: { "<area id>": { "_expect": { "name": "...", "region": "..." }, "blurb": "...",
//   "parking_note": "...", "approach": "...", "approach_min": 60, "season_months": [3,4,5],
//   "rock": "sandstone", "aspect": "varies" } }
//
// Rules, each one a rule this repo learned the hard way:
//   * The id is asserted against `_expect` (name, region) before anything is written — ~91% of
//     ids are name-shaped and a name is not evidence of which place you are on.
//   * Only EMPTY columns are written unless --overwrite; a researched pass must not silently
//     out-vote what a climber or an earlier pass put there.
//   * No sentence names a source, says "according to", or SHOUTS (audit:misplaced-prose,
//     audit:shouted-prose refuse the same things); prose is written here in our own words.
//   * Column limits are the database's (0247 / 0248 / 0249 / 0282 / 0304); a value the column
//     would refuse fails the whole entry before any write.
//   * patchRow throws unless exactly one row changed; the row is re-read and reconciled, and
//     a 200 is never taken as evidence that the data changed.
import fs from "fs";
import { patchRow, SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
import { shoutedStrings } from "../lib/shouted-prose.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const OVER = args.includes("--overwrite");
const from = (() => { const i = args.indexOf("--from"); return i >= 0 ? args[i + 1] : null; })();
if (!from) { console.error("usage: --from <batch.json> [--dry] [--overwrite]"); process.exit(2); }
const batch = JSON.parse(fs.readFileSync(from, "utf8"));

const FIELDS = ["blurb", "approach", "approach_min", "parking_note", "rock", "aspect", "season_months"];
const ASPECTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "varies"];
// Words that mean a sentence is pointing at somebody else's text rather than describing the place.
// "the crag" as two words is ordinary English ("the crag is busy"); only the site's own spelling counts.
const CITES = /\b(mountain ?project|summitpost|openbeta|thecrag|27crags|guidebook|according to|per the|as described (by|in)|source[sd]?)\b|thecrag\.com/i;

function validate(id, e) {
  const bad = [];
  const str = (k, lo, hi) => { if (e[k] == null) return; if (typeof e[k] !== "string") return bad.push(`${k}: not a string`); const s = e[k].trim(); if (s.length < lo || s.length > hi) bad.push(`${k}: ${s.length} chars, needs ${lo}–${hi}`); if (CITES.test(s)) bad.push(`${k}: names a source — "${s.match(CITES)[0]}"`); if (shoutedStrings([s]).length) bad.push(`${k}: SHOUTS`); };
  str("blurb", 20, 1500); str("approach", 1, 600); str("parking_note", 5, 400); str("rock", 1, 40);
  if (e.approach_min != null && !(Number.isInteger(e.approach_min) && e.approach_min >= 1 && e.approach_min <= 600)) bad.push("approach_min: 1–600 whole minutes");
  if (e.aspect != null && !ASPECTS.includes(e.aspect)) bad.push("aspect: not one of " + ASPECTS.join("/"));
  if (e.season_months != null) { const m = e.season_months; if (!Array.isArray(m) || !m.length || m.length > 12 || new Set(m).size !== m.length || m.some(x => !Number.isInteger(x) || x < 1 || x > 12)) bad.push("season_months: distinct ints 1–12"); }
  if (!e._expect || !e._expect.name) bad.push("_expect.name missing — the id cannot be asserted");
  return bad;
}

const key = requireServiceKey();
const ROLLBACK = `scripts/rollback-area-page-${Date.now()}.json`;
const rollback = {};
let wrote = 0, skipped = 0, failed = 0;
for (const [id, e] of Object.entries(batch)) {
  const bad = validate(id, e);
  if (bad.length) { console.log(`✗ ${id}: ${bad.join("; ")}`); failed++; continue; }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${encodeURIComponent(id)}&select=id,name,region,area_type,${FIELDS.join(",")},rock_basis`, { headers: headers(key) });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length !== 1) { console.log(`✗ ${id}: ${Array.isArray(rows) ? rows.length : "?"} rows — not written`); failed++; continue; }
  const row = rows[0];
  if (row.name !== e._expect.name || (e._expect.region && row.region !== e._expect.region)) { console.log(`✗ ${id}: row is "${row.name}" / ${row.region}, batch expects "${e._expect.name}" / ${e._expect.region || "(any)"} — not written`); failed++; continue; }
  const patch = {};
  for (const k of FIELDS) {
    if (e[k] == null) continue;
    const empty = row[k] == null || (typeof row[k] === "string" && !row[k].trim()) || (Array.isArray(row[k]) && !row[k].length);
    if (!empty && !OVER) { console.log(`  · ${id}.${k} already set — kept (use --overwrite)`); continue; }
    patch[k] = typeof e[k] === "string" ? e[k].trim() : e[k];
    if (k === "rock") patch.rock_basis = "researched";
  }
  if (!Object.keys(patch).length) { console.log(`= ${id}: nothing to write`); skipped++; continue; }
  console.log(`${DRY ? "would write" : "writing"} ${id} (${row.name}): ${Object.keys(patch).join(", ")}`);
  if (DRY) continue;
  rollback[id] = Object.fromEntries(Object.keys(patch).map(k => [k, row[k] ?? null]));
  fs.writeFileSync(ROLLBACK, JSON.stringify(rollback, null, 1));
  await patchRow("areas", id, patch);
  const back = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${encodeURIComponent(id)}&select=${Object.keys(patch).join(",")}`, { headers: headers(key) })).json())[0];
  const drift = Object.keys(patch).filter(k => JSON.stringify(back[k]) !== JSON.stringify(patch[k]));
  if (drift.length) { console.log(`✗ ${id}: re-read differs on ${drift.join(", ")}`); failed++; } else wrote++;
  // Production writes are paced (owner rule: at least 1 s per write; a season pass runs to thousands).
  await new Promise(res => setTimeout(res, 1100));
}
console.log(`\n${DRY ? "dry run" : "done"}: ${wrote} written, ${skipped} unchanged, ${failed} refused${wrote ? ` · rollback: ${ROLLBACK}` : ""}`);
process.exit(failed ? 1 : 0);
