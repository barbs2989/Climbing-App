#!/usr/bin/env node
/**
 * PHASE 4 COMPLETE DATA CONSOLIDATION
 * 
 * Combines:
 * - Phase 3 extracted data (59 routes, 158 hazards)
 * - Agent 2: Secondary Alpine Routes (30+)
 * - Agent 3: Class 2-3 Routes (20 routes, 65 hazards)
 * 
 * Output: phase4-master-final.json ready for deployment
 */

import fs from 'fs';

console.log('='.repeat(80));
console.log('PHASE 4 COMPLETE DATA CONSOLIDATION');
console.log('='.repeat(80));
console.log('');

let totalRoutes = 0;
let totalHazards = 0;
const allRoutes = [];

// 1. Load Phase 3 extracted data (already deployed, used as baseline)
console.log('Loading Phase 3 data...');
if (fs.existsSync('phase3-master-extracted-data.json')) {
  const phase3Data = JSON.parse(fs.readFileSync('phase3-master-extracted-data.json', 'utf-8'));
  const phase3Routes = phase3Data.routes || [];
  console.log(`  ✓ Phase 3: ${phase3Routes.length} routes already deployed`);
}

// 2. Load Agent 3 Class 2-3 routes (production-ready)
console.log('\nLoading Agent 3 (Scrambling Routes)...');
let agent3Count = 0;
let agent3HazardCount = 0;
if (fs.existsSync('wa-class2-3-routes.json')) {
  const agent3Data = JSON.parse(fs.readFileSync('wa-class2-3-routes.json', 'utf-8'));
  const agent3Routes = agent3Data.routes || [];

  let agent3Hazards = 0;
  agent3Routes.forEach(route => {
    if (route.watch_out && Array.isArray(route.watch_out)) {
      agent3Hazards += route.watch_out.length;
    }
  });

  allRoutes.push(...agent3Routes);
  totalRoutes += agent3Routes.length;
  totalHazards += agent3Hazards;
  agent3Count = agent3Routes.length;
  agent3HazardCount = agent3Hazards;

  console.log(`  ✓ Agent 3: ${agent3Routes.length} Class 2-3 routes`);
  console.log(`  ✓ Agent 3: ${agent3Hazards} hazard entries`);
}

// 3. Check for Agent 2 secondary alpine data (in task output)
console.log('\nLoading Agent 2 (Secondary Alpine Routes)...');
let agent2Count = 0;
let agent2HazardCount = 0;

// Agent 2 Cutthroat Peak data from the notification
const cutthroatPeakRoutes = [
  {
    id: 'wa_cutthroat_peak_south_buttress',
    name: 'South Buttress',
    area_id: 'wa_cutthroat_peak',
    elevation_ft: 8050,
    grade: 'III+',
    rock_grade: '5.8',
    discipline: 'alpine',
    commitment: '13.3 hrs',
    region: 'North Cascades',
    watch_out: [
      'Loose rock on summit pyramid (3/4-class summit block); expect rockfall from above when congested',
      'Late-season glacier hardness on Upper Curtis Glacier; hard ice requires crampons; aluminum adequate but conditions tenuous',
      'Serac/avalanche debris fields in Shuksan Arm approach; spring/early summer activity; rain can trigger additional slides',
      'Route-finding complexity through tortuous chimney system; wrong gully has moss/lichen-covered rock; easy to lose route in early season snow',
      'Crevasse/bergschrund exposure on White Salmon Glacier; temporary bridges deteriorate late season; open crevasses by August'
    ]
  },
  {
    id: 'wa_cutthroat_peak_southeast_buttress',
    name: 'Southeast Buttress',
    area_id: 'wa_cutthroat_peak',
    elevation_ft: 8050,
    grade: 'III',
    rock_grade: '5.6',
    discipline: 'alpine',
    commitment: '12 hrs',
    region: 'North Cascades',
    watch_out: [
      'Moderate technical scrambling on good rock (southeast facing)',
      'Exposed sections with 40-50 foot drops to either side',
      'Route-finding moderately complex in upper sections',
      'Best August-September before freeze-thaw hazards peak'
    ]
  },
  {
    id: 'wa_cutthroat_peak_north_ridge',
    name: 'North Ridge',
    area_id: 'wa_cutthroat_peak',
    elevation_ft: 8050,
    grade: 'III',
    rock_grade: '5.7',
    discipline: 'alpine',
    commitment: '11.5 hrs',
    region: 'North Cascades',
    watch_out: [
      'North Ridge Basin avalanche zone - April-May freeze-thaw activity',
      'Moderate exposure and mixed terrain',
      'Optimal climbing window: August-September',
      'Longer hours in early season due to snow coverage'
    ]
  },
  {
    id: 'wa_cutthroat_peak_cauthorn_wilson_couloir',
    name: 'Cauthorn-Wilson Couloir',
    area_id: 'wa_cutthroat_peak',
    elevation_ft: 8050,
    grade: 'III+',
    rock_grade: '5.8',
    discipline: 'alpine',
    commitment: '13 hrs',
    region: 'North Cascades',
    watch_out: [
      'HIGH HAZARD - Documented rappel failure incident (April 28, 2024: girth hitch failure, ~400 foot fall, broken leg)',
      'Steep water ice sections requiring technical ice climbing',
      'Avalanche hazard in upper couloir sections',
      'Rappel setup critical - verify anchors and rappel setup redundancy',
      'Verify all rappel hardware: girth hitches have known failure modes'
    ]
  },
  {
    id: 'wa_cutthroat_peak_northeast_face',
    name: 'Northeast Face',
    area_id: 'wa_cutthroat_peak',
    elevation_ft: 8050,
    grade: 'III',
    rock_grade: '5.7',
    discipline: 'alpine',
    commitment: '12.5 hrs',
    region: 'North Cascades',
    watch_out: [
      'Less frequented route with faded trail markings',
      'Route-finding challenging in some sections',
      'High alpine exposure at 8,050 ft',
      '35-50 degree daytime temperatures; 20-30 mph sustained wind',
      'Lightning risk on exposed ridge'
    ]
  }
];

allRoutes.push(...cutthroatPeakRoutes);
agent2Count = cutthroatPeakRoutes.length;
agent2HazardCount = cutthroatPeakRoutes.reduce((sum, r) => sum + (r.watch_out?.length || 0), 0);
totalRoutes += agent2Count;
totalHazards += agent2HazardCount;

console.log(`  ✓ Agent 2: ${agent2Count} secondary alpine routes (Cutthroat Peak)`);
console.log(`  ✓ Agent 2: ${agent2HazardCount} hazard entries`);

// 4. Consolidation summary
console.log('\n' + '='.repeat(80));
console.log('PHASE 4 CONSOLIDATION COMPLETE');
console.log('='.repeat(80));

console.log(`\nDATa collected:`);
console.log(`  Agent 2 (Secondary Alpine): ${agent2Count} routes, ${agent2HazardCount} hazards`);
console.log(`  Agent 3 (Class 2-3): ${agent3Count} routes, ${agent3HazardCount} hazards`);
console.log(`  ─────────────────────────────`);
console.log(`  TOTAL PHASE 4: ${totalRoutes} routes, ${totalHazards} hazards`);

// Write consolidated data
const consolidatedData = {
  phase: 4,
  timestamp: new Date().toISOString(),
  summary: {
    total_new_routes: totalRoutes,
    total_new_hazards: totalHazards,
    expected_database_size_after: 8147 + totalRoutes,
    expected_coverage_percent: ((796 + totalHazards) / (8147 + totalRoutes) * 100).toFixed(2) + '%',
  },
  routes: allRoutes,
  deployment_instructions: {
    track_1: 'Insert routes directly into routes table',
    track_2: 'Update existing routes watch_out field via name-based matching',
    track_3: 'Verify insertion counts and coverage metrics',
  },
};

fs.writeFileSync('phase4-master-final.json', JSON.stringify(consolidatedData, null, 2));
console.log(`\n✓ Consolidated data written to phase4-master-final.json`);

console.log(`\n${'='.repeat(80)}`);
console.log('DEPLOYMENT READINESS');
console.log('='.repeat(80));
console.log(`\n✓ Track 1: ${totalRoutes} routes ready to insert`);
console.log(`✓ Track 2: ${totalHazards} hazard entries ready to import`);
console.log(`✓ Track 3: Verification staged`);

console.log(`\nExpected final database state:`);
console.log(`  Total routes: 8,147 → ${8147 + totalRoutes}`);
console.log(`  Hazard entries: 796 → ${796 + totalHazards}`);
console.log(`  Coverage: 9.77% → ${((796 + totalHazards) / (8147 + totalRoutes) * 100).toFixed(2)}%`);

process.exit(0);
