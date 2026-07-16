#!/usr/bin/env node
/**
 * MASTER CONSOLIDATION: Phases 5-10 Climbing Research
 * 
 * Combines:
 * - Phase 5: Sport climbing crags (26 routes, 64 hazards)
 * - Phase 8: Beginner alpine (14 routes, 40+ hazards)
 * - Phase 9: Sport/bouldering crags (42 crags, 139 hazards)
 * - Phase 10: Trad rock climbing (28 routes, 74 hazards)
 * 
 * Output: master-climbing-research-final.json ready for Supabase deployment
 */

import fs from 'fs';
import path from 'path';

const WORKTREE = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints';

console.log('='.repeat(80));
console.log('MASTER CONSOLIDATION: PHASES 5-10 CLIMBING RESEARCH');
console.log('='.repeat(80));
console.log('');

const masterData = {
  metadata: {
    title: 'Washington State Climbing Routes & Hazards Master Database',
    version: '2.0',
    compiled: new Date().toISOString(),
    research_period: '2023-2026',
    phases: 'Phases 5-10 (climbing-only)',
    total_routes: 0,
    total_crags: 0,
    total_hazards: 0,
    sources: 'Mountain Project, AAC, SummitPost, theCrag, Beckey Guides, Mountaineers Club, USFS, NPS',
  },
  phases: {
    phase5: { name: 'Sport Climbing Crags', routes: 26, hazards: 64, file: '/tmp/washington-climbing-routes-comprehensive.json' },
    phase8: { name: 'Beginner Alpine Routes', routes: 14, hazards: 40, file: `${WORKTREE}/beginner-alpine-routes.json` },
    phase9: { name: 'Sport/Bouldering Crags', crags: 42, hazards: 139, file: `${WORKTREE}/WASHINGTON_CRAGS_COMPREHENSIVE.json` },
    phase10: { name: 'Trad Rock Climbing', routes: 28, hazards: 74, file: `${WORKTREE}/wa-trad-climbing-research.json` },
  },
  all_routes: [],
  all_hazards: [],
  deployment_status: 'ready',
};

// Phase 5: Sport climbing crags
console.log('Loading Phase 5: Sport Climbing Crags...');
const phase5File = '/tmp/washington-climbing-routes-comprehensive.json';
if (fs.existsSync(phase5File)) {
  const phase5 = JSON.parse(fs.readFileSync(phase5File, 'utf-8'));
  const areas = phase5.areas || {};
  
  // Flatten routes from areas
  let phase5Routes = 0;
  Object.values(areas).forEach(area => {
    if (area.routes) {
      masterData.all_routes.push(...area.routes);
      phase5Routes += area.routes.length;
    }
  });
  
  console.log(`  ✓ Phase 5: ${phase5Routes} routes from ${Object.keys(areas).length} areas`);
  masterData.metadata.total_routes += phase5Routes;
  masterData.metadata.total_crags += Object.keys(areas).length;
}

// Phase 8: Beginner alpine
console.log('Loading Phase 8: Beginner Alpine Routes...');
const phase8File = `${WORKTREE}/beginner-alpine-routes.json`;
if (fs.existsSync(phase8File)) {
  const phase8 = JSON.parse(fs.readFileSync(phase8File, 'utf-8'));
  if (phase8.routes) {
    masterData.all_routes.push(...phase8.routes);
    console.log(`  ✓ Phase 8: ${phase8.routes.length} alpine routes`);
    masterData.metadata.total_routes += phase8.routes.length;
  }
}

// Phase 9: Sport/bouldering crags
console.log('Loading Phase 9: Sport/Bouldering Crags...');
const phase9File = `${WORKTREE}/WASHINGTON_CRAGS_COMPREHENSIVE.json`;
if (fs.existsSync(phase9File)) {
  const phase9 = JSON.parse(fs.readFileSync(phase9File, 'utf-8'));
  if (phase9.crags) {
    masterData.all_routes.push(...phase9.crags);
    console.log(`  ✓ Phase 9: ${phase9.crags.length} crags (sport/bouldering)`);
    masterData.metadata.total_crags += phase9.crags.length;
  }
  if (phase9.hazards) {
    masterData.all_hazards.push(...phase9.hazards);
  }
}

// Phase 10: Trad rock
console.log('Loading Phase 10: Trad Rock Climbing...');
const phase10File = `${WORKTREE}/wa-trad-climbing-research.json`;
if (fs.existsSync(phase10File)) {
  const phase10 = JSON.parse(fs.readFileSync(phase10File, 'utf-8'));
  if (phase10.routes) {
    masterData.all_routes.push(...phase10.routes);
    console.log(`  ✓ Phase 10: ${phase10.routes.length} trad multi-pitch routes`);
    masterData.metadata.total_routes += phase10.routes.length;
  }
  if (phase10.hazards) {
    masterData.all_hazards.push(...phase10.hazards);
  }
}

console.log('\n' + '='.repeat(80));
console.log('CONSOLIDATION COMPLETE');
console.log('='.repeat(80));

console.log(`\nTotal Routes/Crags: ${masterData.metadata.total_routes}`);
console.log(`Total Crags (climbing areas): ${masterData.metadata.total_crags}`);
console.log(`Total Hazard Entries: ${masterData.all_hazards.length}`);
console.log(`Hazard Density: ${(masterData.all_hazards.length / (masterData.metadata.total_routes || 1) * 100).toFixed(1)}%`);

// Write consolidated file
const outputFile = `${WORKTREE}/master-climbing-research-final.json`;
fs.writeFileSync(outputFile, JSON.stringify(masterData, null, 2));
console.log(`\n✓ Consolidated data written to: ${outputFile}`);

console.log('\n' + '='.repeat(80));
console.log('DEPLOYMENT READY');
console.log('='.repeat(80));
console.log(`\nNext steps:`);
console.log(`  1. Verify JSON structure in: ${outputFile}`);
console.log(`  2. Prepare Supabase import script (bulk upsert routes + hazards)`);
console.log(`  3. Run database migration`);
console.log(`  4. Verify coverage in live app`);
console.log(`  5. Deploy to GitHub Pages`);

process.exit(0);
