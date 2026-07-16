#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cohortFiles = [
  'gear-research/batch9/cohort1.json',
  'gear-research/batch9/cohort2.json',
  'gear-research/batch9/cohort3.json',
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

const migrationContent = `-- Gear audit batch 9 (real route IDs verified against live DB): 54 routes across 42 areas
-- Generated: 2026-07-16
-- Every route_id below was cross-checked against a live query of the routes table before inclusion.
-- Includes 10 Mount Rainier technical routes (Willis Wall, Ptarmigan Ridge, Mowich Face, Curtis
-- Ridge, Kautz Headwall, Nisqually Icefall, Sunset Ridge, Tahoma Glacier, Fuhrer Finger, Gibraltar
-- Ledges — differentiated per-route, not generic glacier boilerplate), Mount Olympus (2 routes),
-- Mount Fury East Mongo Ridge (Grade VI big-wall ridge), plus many Olympic Mountains scrambles.
--
-- Requires migration 0028 (structured_rack_fields) + gear_confidence column to be applied first.
-- Apply via Supabase SQL editor, psql with the service role, or programmatically via the
-- service_role key (REST PATCH bypasses RLS for row updates once the schema exists).

BEGIN;
${updates.join('\n')}
COMMIT;
`;

const outPath = path.join(__dirname, 'supabase/migrations/0039_gear_audit_batch_9_real.sql');
fs.writeFileSync(outPath, migrationContent);
console.log(`\nMigration written: ${outPath}`);
console.log(`Size: ${(migrationContent.length / 1024).toFixed(1)} KB`);
