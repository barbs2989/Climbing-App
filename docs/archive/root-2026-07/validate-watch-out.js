#!/usr/bin/env node

/**
 * Validates watch_out research data quality
 * Usage: node validate-watch-out.js <research-output.json>
 */

const fs = require('fs');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node validate-watch-out.js <research-output.json>');
  process.exit(1);
}

const inputFile = args[0];
if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

console.log('Validating watch_out research data...\n');

let data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Handle different input formats
let routes = [];
if (Array.isArray(data)) {
  routes = data;
} else if (data.routes && Array.isArray(data.routes)) {
  routes = data.routes;
}

console.log(`Found ${routes.length} routes\n`);

// Validation metrics
let totalRoutes = 0;
let totalHazards = 0;
let issuesFound = 0;

const issues = [];

routes.forEach((route, idx) => {
  totalRoutes++;

  // Check required fields
  if (!route.id) {
    issues.push(`Route ${idx}: Missing id`);
    issuesFound++;
  }
  if (!route.name) {
    issues.push(`Route ${idx}: Missing name`);
    issuesFound++;
  }
  if (!route.grade) {
    issues.push(`Route ${route.id || idx}: Missing grade`);
    issuesFound++;
  }
  if (!route.discipline) {
    issues.push(`Route ${route.id || idx}: Missing discipline`);
    issuesFound++;
  }
  if (!route.watch_out || !Array.isArray(route.watch_out)) {
    issues.push(`Route ${route.id || idx}: Missing or invalid watch_out array`);
    issuesFound++;
  }

  // Check watch_out quality
  if (route.watch_out && Array.isArray(route.watch_out)) {
    totalHazards += route.watch_out.length;

    if (route.watch_out.length < 3) {
      issues.push(`Route ${route.id}: Only ${route.watch_out.length} hazards (minimum 3 recommended)`);
      issuesFound++;
    }
    if (route.watch_out.length > 8) {
      issues.push(`Route ${route.id}: ${route.watch_out.length} hazards (exceeds recommended 8)`);
      issuesFound++;
    }

    // Check for generic/weak entries
    route.watch_out.forEach((hazard, hIdx) => {
      if (typeof hazard !== 'string') {
        issues.push(`Route ${route.id}, hazard ${hIdx}: Not a string`);
        issuesFound++;
      }
      if (hazard.length < 15) {
        issues.push(`Route ${route.id}, hazard ${hIdx}: Too short (${hazard.length} chars)`);
        issuesFound++;
      }
      if (hazard.length > 200) {
        issues.push(`Route ${route.id}, hazard ${hIdx}: Too long (${hazard.length} chars, max 200)`);
        issuesFound++;
      }

      // Check for weak/generic terms
      const weak = ['exposed', 'dangerous', 'hazard', 'be careful', 'watch out', 'be aware'];
      const content = hazard.toLowerCase();
      if (weak.some(w => content === w)) {
        issues.push(`Route ${route.id}, hazard ${hIdx}: Too generic ("${hazard}")`);
        issuesFound++;
      }
    });
  }
});

// Summary
console.log('=== VALIDATION REPORT ===\n');
console.log(`Total routes: ${totalRoutes}`);
console.log(`Total hazards documented: ${totalHazards}`);
console.log(`Average hazards per route: ${(totalHazards / totalRoutes).toFixed(1)}`);
console.log(`Issues found: ${issuesFound}\n`);

if (issuesFound > 0) {
  console.log('=== ISSUES ===\n');
  issues.forEach(issue => {
    console.log(`  - ${issue}`);
  });
  console.log('\n');
}

// Statistics
console.log('=== STATISTICS ===\n');

const gradeMap = {};
const disciplineMap = {};
const areaMap = {};

routes.forEach(r => {
  if (r.grade) {
    gradeMap[r.grade] = (gradeMap[r.grade] || 0) + 1;
  }
  if (r.discipline) {
    disciplineMap[r.discipline] = (disciplineMap[r.discipline] || 0) + 1;
  }
  if (r.mountainId) {
    areaMap[r.mountainId] = (areaMap[r.mountainId] || 0) + 1;
  }
});

console.log('Grades:');
Object.keys(gradeMap).sort().forEach(grade => {
  console.log(`  ${grade}: ${gradeMap[grade]}`);
});

console.log('\nDisciplines:');
Object.keys(disciplineMap).forEach(discipline => {
  console.log(`  ${discipline}: ${disciplineMap[discipline]}`);
});

console.log('\nAreas:');
Object.keys(areaMap).sort((a, b) => areaMap[b] - areaMap[a])
  .slice(0, 15)
  .forEach(area => {
    console.log(`  ${area}: ${areaMap[area]}`);
  });

console.log('\n');

if (issuesFound === 0) {
  console.log('VALIDATION PASSED');
} else {
  console.log(`VALIDATION FAILED: ${issuesFound} issues found`);
}
