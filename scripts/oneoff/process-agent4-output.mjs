#!/usr/bin/env node
/**
 * Process Agent 4 Output Handler
 * Automatically consolidates and prepares ice route research for deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('='.repeat(80));
console.log('AGENT 4 OUTPUT PROCESSOR');
console.log('Ice & Mixed Alpine Route Research Pipeline');
console.log('='.repeat(80));

// Look for agent output - check multiple possible locations
const possibleOutputLocations = [
  'research-data/agent4-ice-routes-tier2.json',
  'research-data/phase3-tier2-ice-routes.json',
  'research-data/ice-routes-agent4.json',
  '/private/tmp/agent4-output.json',
];

let agentData = null;
let outputFile = null;

// Try to find agent output
for (const location of possibleOutputLocations) {
  if (fs.existsSync(location)) {
    try {
      const content = fs.readFileSync(location, 'utf-8');
      agentData = JSON.parse(content);
      outputFile = location;
      console.log(`✓ Found agent output at: ${location}`);
      console.log(`  Routes: ${Array.isArray(agentData) ? agentData.length : agentData.routes?.length || 0}`);
      break;
    } catch (err) {
      console.log(`✗ Could not parse ${location}: ${err.message}`);
    }
  }
}

if (!agentData) {
  console.log(`\nNo agent output found. Waiting for manual input...`);
  console.log(`Expected locations:`);
  possibleOutputLocations.forEach(loc => {
    console.log(`  - ${loc}`);
  });
  console.log(`\nOnce agent completes, save output to one of these locations and re-run this script.`);
  process.exit(0);
}

// Normalize data structure
let routesArray = Array.isArray(agentData) ? agentData : (agentData.routes || []);

if (routesArray.length === 0) {
  console.error('\nNo routes found in agent output');
  process.exit(1);
}

console.log(`\n${'='.repeat(80)}`);
console.log('CONSOLIDATING RESEARCH DATA');
console.log('='.repeat(80));

// Ensure research-data directory exists
if (!fs.existsSync('research-data')) {
  fs.mkdirSync('research-data', { recursive: true });
}

// Save normalized agent output
const normalizedOutput = routesArray;
fs.writeFileSync('research-data/agent4-ice-routes-tier2.json', JSON.stringify(normalizedOutput, null, 2));
console.log(`✓ Normalized ${routesArray.length} routes to research-data/agent4-ice-routes-tier2.json`);

// Run consolidation script
console.log(`\nRunning consolidation script...`);
const consolidate = spawn('node', ['consolidate-phase3-tier2-ice-routes.mjs'], {
  cwd: __dirname,
  stdio: 'inherit'
});

consolidate.on('close', (code) => {
  if (code === 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('PROCESSING COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nNext steps:`);
    console.log(`  1. Review the generated migration file in supabase/migrations/`);
    console.log(`  2. Deploy migration: npm run migrate:dev`);
    console.log(`  3. Verify import: node verify-phase3-tier2-hazards.mjs`);
    console.log(`  4. Commit changes: git add -A && git commit -m "Phase 3 Tier 2: Ice routes hazard research"`);
  } else {
    console.error(`Consolidation script failed with code ${code}`);
    process.exit(1);
  }
});

consolidate.on('error', (err) => {
  console.error('Failed to run consolidation script:', err);
  process.exit(1);
});
