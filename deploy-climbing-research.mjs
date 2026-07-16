#!/usr/bin/env node
/**
 * DEPLOY: Consolidate Phases 5-10 Climbing Research to Supabase
 * 
 * Combines all climbing phases into a unified, Supabase-ready format:
 * - Phase 5: Sport climbing crags (Index, Peshastin, Darrington, Vantage, Icicle)
 * - Phase 8: Beginner alpine (Rainier, Hood, Adams, St Helens, etc.)
 * - Phase 9: Sport/bouldering crags (42 crags, 139 hazards)
 * - Phase 10: Trad rock climbing (28 routes, 74 hazards)
 * 
 * Output: supabase-climbing-routes-final.json ready for bulk import
 */

import fs from 'fs';
import path from 'path';

const WORKTREE = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints';

console.log('='.repeat(80));
console.log('PREPARING CLIMBING RESEARCH FOR SUPABASE DEPLOYMENT');
console.log('='.repeat(80));
console.log('');

const deployment = {
  metadata: {
    session_date: new Date().toISOString(),
    phases: '5-10 (climbing-only)',
    constraint: 'Outdoor climbing only - rock, alpine, ice, trad, mixed, aid, bouldering',
    excluded: 'Mountaineering, skiing, peak-bagging, paragliding, wilderness access, indoor climbing',
    total_routes_collected: 0,
    total_hazards_collected: 0,
    deployment_strategy: 'Bulk upsert to routes table, JSONB hazard import to watch_out field',
  },
  routes_to_insert: [],
  hazards_by_route_id: {},
  import_summary: {},
};

console.log('Phase 5: Loading sport climbing crags...');
const phase5 = JSON.parse(fs.readFileSync('/tmp/washington-climbing-routes-comprehensive.json', 'utf-8'));
let phase5Count = 0;
Object.entries(phase5.areas || {}).forEach(([areaKey, area]) => {
  (area.routes || []).forEach(route => {
    deployment.routes_to_insert.push({
      ...route,
      phase: 'phase5',
      area_name: area.name,
      research_source: 'phase5-sport-crags',
    });
    if (route.hazards && Array.isArray(route.hazards)) {
      if (!deployment.hazards_by_route_id[route.id]) {
        deployment.hazards_by_route_id[route.id] = [];
      }
      deployment.hazards_by_route_id[route.id].push(...route.hazards);
    }
    phase5Count++;
  });
});
deployment.import_summary.phase5 = { routes: phase5Count, areas: Object.keys(phase5.areas || {}).length };
console.log(`  ✓ Phase 5: ${phase5Count} sport climbing routes`);

console.log('Phase 8: Loading beginner alpine routes...');
const phase8File = `${WORKTREE}/beginner-alpine-routes.json`;
let phase8Count = 0;
if (fs.existsSync(phase8File)) {
  const phase8 = JSON.parse(fs.readFileSync(phase8File, 'utf-8'));
  (phase8.beginner_routes || []).forEach(route => {
    deployment.routes_to_insert.push({
      ...route,
      phase: 'phase8',
      research_source: 'phase8-beginner-alpine',
    });
    phase8Count++;
  });
}
deployment.import_summary.phase8 = { routes: phase8Count };
console.log(`  ✓ Phase 8: ${phase8Count} beginner alpine routes`);

console.log('Phase 9: Loading sport/bouldering crags...');
const phase9File = `${WORKTREE}/WASHINGTON_CRAGS_COMPREHENSIVE.json`;
let phase9Count = 0;
if (fs.existsSync(phase9File)) {
  const phase9 = JSON.parse(fs.readFileSync(phase9File, 'utf-8'));
  
  // Sport climbing crags
  (phase9.sport_climbing_crags || []).forEach(crag => {
    deployment.routes_to_insert.push({
      ...crag,
      phase: 'phase9',
      type: 'sport_climbing_crag',
      research_source: 'phase9-sport-crags',
    });
    if (crag.hazard_ids) {
      if (!deployment.hazards_by_route_id[crag.id]) {
        deployment.hazards_by_route_id[crag.id] = [];
      }
      deployment.hazards_by_route_id[crag.id].push(...crag.hazard_ids);
    }
    phase9Count++;
  });
  
  // Bouldering areas
  (phase9.bouldering_areas || []).forEach(boulder => {
    deployment.routes_to_insert.push({
      ...boulder,
      phase: 'phase9',
      type: 'bouldering_area',
      research_source: 'phase9-bouldering',
    });
    phase9Count++;
  });
  
  // Alpine mountaineering routes
  (phase9.alpine_mountaineering_routes || []).forEach(alpine => {
    deployment.routes_to_insert.push({
      ...alpine,
      phase: 'phase9',
      type: 'alpine_mountaineering',
      research_source: 'phase9-alpine',
    });
    phase9Count++;
  });
}
deployment.import_summary.phase9 = { crags: phase9Count };
console.log(`  ✓ Phase 9: ${phase9Count} crags (sport/bouldering/alpine)`);

console.log('Phase 10: Loading trad rock climbing...');
const phase10File = `${WORKTREE}/wa-trad-climbing-research.json`;
let phase10Count = 0;
if (fs.existsSync(phase10File)) {
  const phase10 = JSON.parse(fs.readFileSync(phase10File, 'utf-8'));
  (phase10.routes || []).forEach(route => {
    deployment.routes_to_insert.push({
      ...route,
      phase: 'phase10',
      research_source: 'phase10-trad-rock',
    });
    if (route.hazard_ids) {
      if (!deployment.hazards_by_route_id[route.id]) {
        deployment.hazards_by_route_id[route.id] = [];
      }
      deployment.hazards_by_route_id[route.id].push(...route.hazard_ids);
    }
    phase10Count++;
  });
}
deployment.import_summary.phase10 = { routes: phase10Count };
console.log(`  ✓ Phase 10: ${phase10Count} trad rock routes`);

deployment.metadata.total_routes_collected = deployment.routes_to_insert.length;
deployment.metadata.total_hazards_collected = Object.values(deployment.hazards_by_route_id).flat().length;

console.log('\n' + '='.repeat(80));
console.log('CONSOLIDATION SUMMARY');
console.log('='.repeat(80));
console.log(`\nRoutes/Crags collected: ${deployment.metadata.total_routes_collected}`);
console.log(`Total hazard references: ${deployment.metadata.total_hazards_collected}`);
console.log(`\nPhase breakdown:`);
Object.entries(deployment.import_summary).forEach(([phase, summary]) => {
  console.log(`  ${phase}: ${JSON.stringify(summary)}`);
});

// Write deployment file
const outputFile = `${WORKTREE}/supabase-climbing-routes-final.json`;
fs.writeFileSync(outputFile, JSON.stringify(deployment, null, 2));
console.log(`\n✓ Deployment package written to: ${outputFile}`);

console.log('\n' + '='.repeat(80));
console.log('NEXT: Database Import');
console.log('='.repeat(80));
console.log(`\n1. Use supabase-climbing-routes-final.json for bulk import`);
console.log(`2. Strategy: Upsert routes, merge hazards into watch_out JSONB arrays`);
console.log(`3. Verify coverage metrics in Supabase after import`);
console.log(`4. Test in live app before GitHub Pages deployment`);

process.exit(0);
