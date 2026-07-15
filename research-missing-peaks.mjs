import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== MISSING MAJOR PEAK ROUTES ANALYSIS ===\n');

/**
 * Check which major peaks have fewer routes than expected
 */
async function analyzeMajorPeaks() {
  const majorPeaks = [
    { name: 'Mount Rainier', region: 'Washington', expectedMin: 15 },
    { name: 'Mount Adams', region: 'Washington', expectedMin: 10 },
    { name: 'Mount Baker', region: 'Washington', expectedMin: 8 },
    { name: 'Mount Shuksan', region: 'Washington', expectedMin: 10 },
    { name: 'Glacier Peak', region: 'Washington', expectedMin: 8 },
    { name: 'Mount Stuart', region: 'Washington', expectedMin: 5 },
    { name: 'Mount Goode', region: 'Washington', expectedMin: 5 },
    { name: 'Mount Triumph', region: 'Washington', expectedMin: 3 }
  ];

  console.log('=== MAJOR PEAK ROUTE COVERAGE ===\n');

  const gaps = [];

  for (const peak of majorPeaks) {
    try {
      const { data: peakRoutes } = await supabase
        .from('routes')
        .select('id, name, discipline, grade_system, grade, watch_out')
        .ilike('areas.name', `%${peak.name}%`)
        .limit(100);

      const count = peakRoutes?.length || 0;
      const gap = Math.max(0, peak.expectedMin - count);

      if (gap > 0) {
        gaps.push({ ...peak, found: count, gap });
      }

      console.log(`${peak.name}: ${count} routes (expected ${peak.expectedMin}) ${gap > 0 ? `[MISSING ${gap}]` : '✓'}`);

      if (peakRoutes && peakRoutes.length > 0) {
        peakRoutes.forEach(r => {
          const hasWatchOut = r.watch_out && Array.isArray(r.watch_out) && r.watch_out.length > 0;
          console.log(`  - ${r.name} [${r.discipline}] ${hasWatchOut ? '✓ watch_out' : '✗ needs docs'}`);
        });
      }

    } catch (e) {
      console.error(`Error querying ${peak.name}: ${e.message}`);
    }
  }

  console.log(`\n=== POTENTIAL MISSING ROUTES ===`);
  console.log(`${gaps.length} peaks have fewer routes than expected:\n`);

  gaps.forEach(gap => {
    console.log(`${gap.name}: ${gap.found} routes, likely missing ~${gap.gap}`);
    console.log(`  Research sources:`);
    console.log(`    - Mountain Project: ${gap.name} routes`);
    console.log(`    - Beckey: "Cascade Alpine Guide - ${gap.region}" chapter on ${gap.name}`);
    console.log(`    - Mountaineers: ${gap.name} guidebook sections`);
    console.log(`  Focus areas:`);
    if (gap.name === 'Mount Rainier') {
      console.log(`    - Willis Wall variant`);
      console.log(`    - Nisqually Glacier variations`);
      console.log(`    - Tahoma Glacier route`);
    } else if (gap.name === 'Mount Adams') {
      console.log(`    - South Side alternatives`);
      console.log(`    - Mazama Glacier approaches`);
    } else if (gap.name === 'Mount Stuart') {
      console.log(`    - Ice/mixed climbing routes`);
      console.log(`    - Winter approaches`);
    } else if (gap.name === 'Mount Shuksan') {
      console.log(`    - Alternative winter routes`);
      console.log(`    - Mixed terrain variations`);
    }
    console.log();
  });

  // Research template for missing routes
  console.log(`\n=== RESEARCH TEMPLATE FOR MISSING ROUTES ===`);
  console.log(`
For each missing route, research and provide:

Route Data (for database):
  - name: "Route Name"
  - area: "Peak / Area"
  - discipline: "alpine" or "ice" or "rock"
  - grade: "grade_system" (e.g., "III-IV", "AI3", "5.10a")
  - pitches: number (if applicable)
  - length_m: distance in meters
  - lat: latitude
  - lng: longitude
  - approach: description
  - descent: description
  - fa: first ascent info (if known)

Hazard Documentation (watch_out):
  [
    "Specific avalanche terrain (angle, aspect, triggers)",
    "Serac/icefall zones (location, time-of-day exposure)",
    "Crevasse fields (type, seasonal variation)",
    "Ice quality (conditions, seasonal reliability)",
    "Weather/wind patterns (exposure, typical conditions)",
    "Route-finding hazards",
    "Descent hazards (anchor quality, rappel route)",
    "Seasonal windows (best climbing month)"
  ]

Sources:
  - Mountain Project route page and comments
  - Beckey Cascade Alpine Guide
  - Mountaineers guidebooks
  - Recent trip reports (2024-2026)
  - NWAC avalanche archives
  `);
}

analyzeMajorPeaks().catch(console.error);
