#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// List of JSON files to process
const jsonFiles = [
  'CASCADE_PEAK_GEAR_AUDIT.json',
  'DRAGONTAIL_GEAR.json',
  'ENCHANTMENT_PEAK_GEAR.json',
  'JACK_MOUNTAIN_COMPREHENSIVE_GEAR.json',
  'McClellan_Peak_Gear_Research.json',
  'dolomite-tower-gear-research.json',
  'dorado_needle_gear_research.json',
  'dragontail_gear_research.json',
  'kennedy-peak-gear-audit.json',
  'kyes-peak-comprehensive-gear.json'
];

const updates = [];
const peaksCovered = new Set();
const routesCovered = new Set();

// Helper to escape SQL strings
const escapeSql = (str) => {
  if (!str) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
};

// Helper to convert gear data to JSONB format
const gearToJsonb = (gearData) => {
  if (!gearData) return 'NULL';
  const json = JSON.stringify(gearData);
  return escapeSql(json);
};

console.log('Processing Batch 4 JSON files...\n');

jsonFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${file}`);
    return;
  }

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Handle different JSON structures
    const routes = content.routes ||
                   (content.peakMetadata && content.routes ? content.routes : []);

    if (!Array.isArray(routes)) {
      console.warn(`⚠️  Invalid routes structure in ${file}`);
      return;
    }

    console.log(`✓ Processing ${file}: ${routes.length} route(s)`);

    routes.forEach((route) => {
      // Handle multiple field name variants for route ID
      const routeId = route.routeId || route.route_id || route.id || route.route_name;
      if (!routeId) {
        console.warn(`  ⚠️  Route missing ID in ${file}`);
        return;
      }

      routesCovered.add(routeId);

      // Build UPDATE statement with all new fields
      const peakId = content.peakMetadata?.id || content.peak?.name || route.peakId || 'unknown';
      peaksCovered.add(peakId);

      // Extract structured gear data - handle multiple field name variants
      const slingRack = route.sling_specifications || route.sling_rack || route.slingRack || route.slings || null;
      let alpineDraws = route.alpine_draws || route.alpineDraws;
      // Ensure alpineDraws is a number, not an object
      if (typeof alpineDraws === 'object' && alpineDraws !== null) {
        alpineDraws = alpineDraws.quantity || alpineDraws.count || 0;
      }
      alpineDraws = alpineDraws || 0;

      const ropeType = route.rope_type || route.ropeType || route.rope?.type || route.ropeDetails?.type || null;
      const ropeLengthM = route.rope_length_m || route.ropeLengthM || route.rope?.length_m || route.rope?.lengthM || route.ropeDetails?.lengthM || null;
      const ropeNote = route.rope_note || route.ropeNote || route.rope?.notes || route.ropeDetails?.note || null;
      const ascender = route.ascender || route.ascenders || null;
      const corrections = route.corrections || route.corrections_and_notes || route.corrections_and_conflicts || null;

      // Properly serialize JSONB fields with object-to-string conversion
      let slingRackJsonb = 'NULL';
      if (slingRack && typeof slingRack === 'object') {
        try {
          // Already an object, stringify it
          slingRackJsonb = escapeSql(JSON.stringify(slingRack));
        } catch (e) {
          console.warn(`  ⚠️  Failed to serialize slingRack for ${routeId}`);
        }
      } else if (slingRack && typeof slingRack === 'string') {
        // Already a string, just escape it
        slingRackJsonb = escapeSql(slingRack);
      }

      let ascenderJsonb = 'NULL';
      if (ascender) {
        try {
          if (typeof ascender === 'object') {
            ascenderJsonb = escapeSql(JSON.stringify(ascender));
          } else {
            ascenderJsonb = escapeSql(String(ascender));
          }
        } catch (e) {
          console.warn(`  ⚠️  Failed to serialize ascender for ${routeId}`);
        }
      }

      let correctionsJsonb = 'NULL';
      if (corrections) {
        try {
          if (typeof corrections === 'object') {
            correctionsJsonb = escapeSql(JSON.stringify(corrections));
          } else {
            correctionsJsonb = escapeSql(String(corrections));
          }
        } catch (e) {
          console.warn(`  ⚠️  Failed to serialize corrections for ${routeId}`);
        }
      }

      // Build the UPDATE statement
      const updateStmt = `
UPDATE routes SET
  sling_rack = ${slingRackJsonb},
  alpine_draws = ${alpineDraws || 0},
  rope_type = ${ropeType ? escapeSql(ropeType) : 'NULL'},
  rope_length_m = ${ropeLengthM || 'NULL'},
  rope_note = ${ropeNote ? escapeSql(ropeNote) : 'NULL'},
  ascender = ${ascenderJsonb},
  corrections = ${correctionsJsonb},
  updated_at = now()
WHERE route_id = ${escapeSql(routeId)};`;

      updates.push(updateStmt);
    });

  } catch (err) {
    console.error(`✗ Error processing ${file}:`, err.message);
  }
});

console.log(`\n=== BATCH 4 SUMMARY ===`);
console.log(`Peaks covered: ${peaksCovered.size}`);
console.log(`Routes updated: ${routesCovered.size}`);
console.log(`SQL statements generated: ${updates.length}\n`);

// Generate migration file
const timestamp = new Date().toISOString().split('T')[0];
const migrationNumber = '0033';
const migrationContent = `-- Gear audit batch 4: ${peaksCovered.size} peaks / ${routesCovered.size} routes
-- Generated: ${new Date().toISOString()}
-- Research methodology: 7-source integration (guidebooks, guides, manufacturers, media, forums, terrain, weather)
-- Quality gates: 3-vote adversarial verification, confidence levels, full source attribution

BEGIN;

${updates.join('\n')}

COMMIT;
`;

const migrationFile = path.join(__dirname, `supabase/migrations/0033_gear_audit_batch_4_comprehensive.sql`);

// Ensure directory exists
const dirPath = path.dirname(migrationFile);
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

fs.writeFileSync(migrationFile, migrationContent);

console.log(`✓ Migration generated: ${migrationFile}`);
console.log(`  File size: ${(migrationContent.length / 1024).toFixed(1)} KB`);
console.log(`  Routes: ${routesCovered.size}`);
console.log(`  Peaks: ${peaksCovered.size}`);
