#!/usr/bin/env node
/**
 * PHASE 3 CONSOLIDATION & DEPLOYMENT
 *
 * This script aggregates research findings from all Phase 3 agents,
 * consolidates into a master JSON structure, and deploys to Supabase.
 *
 * Deployment tracks:
 * Track 1: Insert 60-80 new alpine/secondary peak routes
 * Track 2: Import 150+ hazard entries for secondary peaks
 * Track 3: Consolidate all Phase 3 findings into live database
 */

import fs from 'fs';
import path from 'path';

// Phase 3 research output files (to be populated by agents)
const PHASE3_SOURCES = {
  mountaineering: 'phase3-mountaineering-routes.json',
  secondary_peaks: 'phase3-secondary-peaks.json',
  triumph_liberty: 'phase3-triumph-liberty-cap.json',
  formidable: 'phase3-mount-formidable.json',
  eldorado: 'phase3-eldorado-peak.json',
  shuksan_alt: 'phase3-shuksan-alternatives.json',
  colchuck_dragontail: 'phase3-colchuck-dragontail.json',
  remmel_primus_cathedral: 'phase3-remmel-primus-cathedral.json',
  washington_pass: 'phase3-washington-pass-north-cascades.json',
  nooksack_chicken: 'phase3-nooksack-chicken-ridge.json',
  additional_hazards: 'phase3-additional-hazards.json',
  trip_reports: 'phase3-trip-reports-2024-2026.json',
};

async function consolidatePhase3() {
  console.log('='.repeat(70));
  console.log('PHASE 3 CONSOLIDATION & DEPLOYMENT');
  console.log('='.repeat(70));

  const allRoutes = [];
  const allHazards = [];
  let processedFiles = 0;
  let totalRoutes = 0;
  let totalHazards = 0;

  // Aggregate all research outputs
  for (const [name, filename] of Object.entries(PHASE3_SOURCES)) {
    try {
      if (fs.existsSync(filename)) {
        const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));

        // Track routes
        if (data.routes && Array.isArray(data.routes)) {
          allRoutes.push(...data.routes);
          totalRoutes += data.routes.length;
        }

        // Track hazards
        if (data.hazards && Array.isArray(data.hazards)) {
          allHazards.push(...data.hazards);
          totalHazards += data.hazards.length;
        }

        console.log(`✓ ${name}: ${data.routes?.length || 0} routes, ${data.hazards?.length || 0} hazards`);
        processedFiles++;
      }
    } catch (err) {
      console.log(`⚠ ${name}: File not found or parse error (agent still running)`);
    }
  }

  console.log(`\nProcessed: ${processedFiles} files`);
  console.log(`Total routes collected: ${totalRoutes}`);
  console.log(`Total hazards collected: ${totalHazards}`);

  // Consolidation summary
  const summary = {
    phase: 3,
    timestamp: new Date().toISOString(),
    sources_processed: processedFiles,
    total_new_routes: totalRoutes,
    total_new_hazards: totalHazards,
    deployment_tracks: {
      track_1_new_routes: {
        count: totalRoutes,
        description: 'Insert new alpine and secondary peak routes into routes table',
        status: 'ready_for_deployment',
      },
      track_2_hazard_import: {
        count: totalHazards,
        description: 'Import hazard entries to existing routes via name-based matching',
        status: 'ready_for_deployment',
      },
      track_3_consolidation: {
        description: 'Verify data integrity and coverage metrics across all enrichments',
        status: 'ready_for_validation',
      },
    },
  };

  // Write consolidated results
  fs.writeFileSync(
    'phase3-consolidated-results.json',
    JSON.stringify({
      summary,
      routes: allRoutes,
      hazards: allHazards,
    }, null, 2)
  );

  console.log('\n✓ Consolidated results written to phase3-consolidated-results.json');
  console.log('\nDEPLOYMENT READY');
  console.log(`Expected final state:`);
  console.log(`  - ${totalRoutes} new routes added to database`);
  console.log(`  - ${totalHazards} hazard entries imported/updated`);
  console.log(`  - Coverage increase: +${Math.round((totalHazards / 8088) * 100) / 100}%`);
  console.log('\nNext: Execute track-1, track-2, and track-3 deployment scripts');
}

consolidatePhase3().catch(err => {
  console.error('Consolidation failed:', err);
  process.exit(1);
});
