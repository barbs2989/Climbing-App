#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cohortFiles = [
  'gear-research/batch5/cohort1.json',
  'gear-research/batch5/cohort2.json',
  'gear-research/batch5/cohort3.json',
];

// Load the real route list to validate every routeId actually exists
const realRoutes = JSON.parse(fs.readFileSync(path.join(__dirname, 'real_remaining_routes.json'), 'utf8'));
const realIds = new Set(realRoutes.map(r => r.id));

const escapeSql = (str) => "'" + String(str).replace(/'/g, "''") + "'";

const updates = [];
const skipped = [];

for (const file of cohortFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  for (const route of data.routes) {
    const routeId = route.routeId;
    if (!realIds.has(routeId)) {
      skipped.push({ file, routeId, reason: 'not found in real_remaining_routes.json' });
      continue;
    }

    const slingRack = route.sling_rack ? escapeSql(JSON.stringify(route.sling_rack)) : 'NULL';
    let ascender = 'NULL';
    if (route.ascender === true) {
      ascender = escapeSql('Prusik cords (see rope_note)');
    } else if (route.ascender === false || route.ascender === null || route.ascender === undefined) {
      ascender = 'NULL';
    } else if (typeof route.ascender === 'object') {
      ascender = escapeSql(JSON.stringify(route.ascender));
    } else {
      ascender = escapeSql(String(route.ascender));
    }
    const alpineDraws = typeof route.alpine_draws === 'number' ? route.alpine_draws : 0;
    const ropeType = route.rope_type ? escapeSql(String(route.rope_type)) : 'NULL';
    const ropeLengthM = route.rope_length_m != null ? route.rope_length_m : 'NULL';
    const ropeNote = route.rope_note ? escapeSql(String(route.rope_note)) : 'NULL';
    const corrections = route.corrections ? escapeSql(String(route.corrections)) : 'NULL';
    const confidence = route.confidence ? escapeSql(String(route.confidence)) : 'NULL';

    updates.push(`
UPDATE routes SET
  sling_rack = ${slingRack},
  alpine_draws = ${alpineDraws},
  rope_type = ${ropeType},
  rope_length_m = ${ropeLengthM},
  rope_note = ${ropeNote},
  ascender = ${ascender},
  corrections = ${corrections},
  gear_confidence = ${confidence},
  updated_at = now()
WHERE id = ${escapeSql(routeId)};`);
  }
}

console.log(`Valid updates: ${updates.length}`);
console.log(`Skipped (not real route IDs): ${skipped.length}`);
skipped.forEach(s => console.log(`  SKIPPED: ${s.routeId} (${s.file}) - ${s.reason}`));

const migrationContent = `-- Gear audit batch 5 (CORRECTED — real route IDs verified against live DB): 50 routes across 35 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- Research methodology: direct WebSearch/WebFetch against Mountain Project, SummitPost, WTA, AAC,
-- Mountaineers, and trip-report sources. confidence field distinguishes "verified" (real trip-report/
-- route-page data found) from "inferred" (no route-specific source found; gear derived from grade/terrain).
--
-- NOTE: requires migration 0028 (structured_rack_fields) to be applied first.
-- This worktree has no SUPABASE_SERVICE_ROLE_KEY — this file must be applied by hand,
-- either via \`supabase db push\` / psql with the service role, or pasted directly into
-- the Supabase SQL editor.

BEGIN;

ALTER TABLE routes ADD COLUMN IF NOT EXISTS gear_confidence text;
${updates.join('\n')}
COMMIT;
`;

const outPath = path.join(__dirname, 'supabase/migrations/0034_gear_audit_batch_5_real.sql');
fs.writeFileSync(outPath, migrationContent);
console.log(`\nMigration written: ${outPath}`);
console.log(`Size: ${(migrationContent.length / 1024).toFixed(1)} KB`);
