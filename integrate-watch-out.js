#!/usr/bin/env node

/**
 * Integrates watch_out hazard data from research output into the wa.json catalog
 * Usage: node integrate-watch-out.js <research-output.json> [--output catalog/wa.json]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node integrate-watch-out.js <research-output.json> [--output catalog/wa.json]');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : './catalog/wa.json';

if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log(`Reading research data from ${inputFile}...`);
const researchData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

console.log(`Reading catalog from ${outputFile}...`);
const catalogData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

// Build lookup map from research data
const watchOutMap = {};
if (Array.isArray(researchData)) {
  researchData.forEach(item => {
    if (item.id && item.watch_out) {
      watchOutMap[item.id] = item.watch_out;
    }
  });
} else if (researchData.routes && Array.isArray(researchData.routes)) {
  researchData.routes.forEach(item => {
    if (item.id && item.watch_out) {
      watchOutMap[item.id] = item.watch_out;
    }
  });
}

console.log(`Loaded ${Object.keys(watchOutMap).length} routes with watch_out data`);

// Merge watch_out data into catalog routes
let updated = 0;
let alreadyHad = 0;
catalogData.routes.forEach(route => {
  if (watchOutMap[route.id]) {
    if (route.watch_out && route.watch_out.length > 0) {
      alreadyHad++;
    } else {
      route.watch_out = watchOutMap[route.id];
      updated++;
    }
  }
});

console.log(`Updated ${updated} routes`);
console.log(`Skipped ${alreadyHad} routes that already had watch_out data`);

// Write output
console.log(`Writing updated catalog to ${outputFile}...`);
fs.writeFileSync(outputFile, JSON.stringify(catalogData, null, 2) + '\n');

console.log('Done!');
console.log('\nSummary:');
console.log(`  Total routes in catalog: ${catalogData.routes.length}`);
const withWatchOut = catalogData.routes.filter(r => r.watch_out && r.watch_out.length > 0).length;
console.log(`  Routes with watch_out: ${withWatchOut}`);
console.log(`  Coverage: ${((withWatchOut / catalogData.routes.length) * 100).toFixed(1)}%`);
