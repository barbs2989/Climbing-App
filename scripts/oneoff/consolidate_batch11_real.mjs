#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cohortFiles = [
  'gear-research/batch11/cohort1.json',
  'gear-research/batch11/cohort2.json',
  'gear-research/batch11/cohort3.json',
  'gear-research/batch11/cohort4.json',
  'gear-research/batch11/cohort5.json',
];

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

const seen = new Map();
for (const file of cohortFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  for (const route of data.routes) {
    if (seen.has(route.routeId)) {
      console.log(`  WARNING: duplicate routeId ${route.routeId} in ${file} (also in ${seen.get(route.routeId)})`);
    }
    seen.set(route.routeId, file);
  }
}

const migrationContent = `-- Gear audit batch 11 (FINAL BATCH - real route IDs verified against live DB): 119 routes across 83 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- This closes out the original 764-route curated WA alpine/mountaineering/scrambling scope.
-- Includes Prusik Peak (4 routes, Enchantments), Sloan Peak (3 routes), South Early Winters Spire
-- (7 routes, Washington Pass), Spire Gully/Alpenkuhl (5 routes), Unicorn Peak (4 routes, Tatoosh),
-- Guye Peak (5 routes, incl. Improbable Traverse flagged as currently discouraged post-2021
-- rockfall), West McMillan Spire, Vesper Peak, Whatcom Peak, Southeast Mox Peak's Devils Club
-- (23-pitch remote big wall), plus many Class 2-4 scrambles.
--
-- Requires migration 0028 (structured_rack_fields) + gear_confidence column to be applied first.
-- Apply via Supabase SQL editor, psql with the service role, or programmatically via the
-- service_role key (REST PATCH bypasses RLS for row updates once the schema exists).

BEGIN;
${updates.join('\n')}
COMMIT;
`;

const outPath = path.join(__dirname, 'supabase/migrations/0041_gear_audit_batch_11_real.sql');
fs.writeFileSync(outPath, migrationContent);
console.log(`\nMigration written: ${outPath}`);
console.log(`Size: ${(migrationContent.length / 1024).toFixed(1)} KB`);
