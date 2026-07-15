#!/usr/bin/env node

import * as fs from 'fs';

const SUPABASE_URL = 'https://ofuofhojhbcrcahuotya.supabase.co';
const ANON_KEY = 'sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5';

// Fetch all areas and routes via REST API
async function fetchData() {
  console.log('Fetching all areas...');
  const areasResp = await fetch(`${SUPABASE_URL}/rest/v1/areas?limit=10000`, {
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' }
  });
  const areas = await areasResp.json();

  console.log('Fetching all routes...');
  const routesResp = await fetch(`${SUPABASE_URL}/rest/v1/routes?limit=10000&select=id,area_id,name,discipline,grade,grade_system`, {
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' }
  });
  const routes = await routesResp.json();

  return { areas, routes };
}

// Audit hierarchy
function auditHierarchy(areas, routes) {
  console.log('\n=== HIERARCHY AUDIT ===\n');

  const errors = [];
  const warnings = [];
  const stats = {
    totalAreas: areas.length,
    totalRoutes: routes.length,
    areasByType: {},
    areasByDepth: {},
    orphanedRoutes: [],
    brokenParentLinks: [],
    countMismatches: [],
    leafXorViolations: [],
  };

  // Build lookup maps
  const areasById = new Map(areas.map(a => [a.id, a]));
  const routesByAreaId = new Map();
  const areasByParentId = new Map();

  // Index areas by parent
  areas.forEach(area => {
    if (!areasByParentId.has(area.parent_id)) {
      areasByParentId.set(area.parent_id, []);
    }
    areasByParentId.get(area.parent_id).push(area);
  });

  // Index routes by area
  routes.forEach(route => {
    if (!routesByAreaId.has(route.area_id)) {
      routesByAreaId.set(route.area_id, []);
    }
    routesByAreaId.get(route.area_id).push(route);
  });

  // 1. Verify all routes have valid area_id
  console.log('Checking 1: All routes have valid area references...');
  routes.forEach(route => {
    if (!areasById.has(route.area_id)) {
      errors.push(`ORPHANED ROUTE: route "${route.id}" references non-existent area "${route.area_id}"`);
      stats.orphanedRoutes.push(route);
    }
  });

  // 2. Verify all parent_id references exist
  console.log('Checking 2: All parent area references are valid...');
  areas.forEach(area => {
    if (area.parent_id && !areasById.has(area.parent_id)) {
      errors.push(`BROKEN PARENT LINK: area "${area.id}" references non-existent parent "${area.parent_id}"`);
      stats.brokenParentLinks.push(area);
    }
  });

  // 3. Verify leaf XOR parent rule
  console.log('Checking 3: Leaf XOR parent (area is leaf OR has children, not both)...');
  areas.forEach(area => {
    const hasChildren = areasByParentId.has(area.id) && areasByParentId.get(area.id).length > 0;
    const hasRoutes = routesByAreaId.has(area.id) && routesByAreaId.get(area.id).length > 0;

    if (hasChildren && hasRoutes) {
      const violation = `area "${area.id}" (${area.name}) has BOTH ${areasByParentId.get(area.id).length} children AND ${routesByAreaId.get(area.id).length} routes`;
      errors.push(`LEAF XOR PARENT VIOLATION: ${violation}`);
      stats.leafXorViolations.push(area);
    }
  });

  // 4. Check hierarchy depth
  console.log('Checking 4: Hierarchy depth...');
  function getDepth(areaId) {
    let depth = 0;
    let current = areasById.get(areaId);
    while (current && current.parent_id) {
      depth++;
      current = areasById.get(current.parent_id);
      if (!current) break;
    }
    return depth;
  }

  areas.forEach(area => {
    const depth = getDepth(area.id);
    if (!stats.areasByDepth[depth]) stats.areasByDepth[depth] = [];
    stats.areasByDepth[depth].push(area);

    if (!stats.areasByType[area.area_type]) {
      stats.areasByType[area.area_type] = [];
    }
    stats.areasByType[area.area_type].push(area);
  });

  const peakDepths = areas
    .filter(a => routesByAreaId.has(a.id) && routesByAreaId.get(a.id).length > 0)
    .map(a => ({ id: a.id, name: a.name, depth: getDepth(a.id), routes: routesByAreaId.get(a.id).length }));

  if (peakDepths.length > 0) {
    const depths = peakDepths.map(p => p.depth);
    const minPeakDepth = Math.min(...depths);
    const maxPeakDepth = Math.max(...depths);
    console.log(`  Route-holding areas span depths ${minPeakDepth}-${maxPeakDepth}`);

    if (minPeakDepth !== maxPeakDepth) {
      warnings.push(`WARNING: Route-holding areas at inconsistent depths (${minPeakDepth}-${maxPeakDepth})`);
      const byDepth = {};
      peakDepths.forEach(p => {
        if (!byDepth[p.depth]) byDepth[p.depth] = [];
        byDepth[p.depth].push(p);
      });
      Object.entries(byDepth).sort(([a],[b]) => parseInt(a) - parseInt(b)).forEach(([d, peaks]) => {
        console.log(`    Depth ${d}: ${peaks.length} areas`);
      });
    }
  }

  // 5. Check naming
  console.log('Checking 5: ID naming consistency...');
  areas.forEach(area => {
    if (!/^[a-z0-9_-]+$/.test(area.id)) {
      warnings.push(`WARNING: Area ID "${area.id}" doesn't follow snake_case convention`);
    }
  });

  // 6. Check route_count accuracy
  console.log('Checking 6: route_count aggregation...');
  function getExpectedRouteCount(areaId) {
    const area = areasById.get(areaId);
    if (!area) return 0;

    let count = routesByAreaId.get(areaId)?.length || 0;
    const children = areasByParentId.get(areaId) || [];
    children.forEach(child => {
      count += getExpectedRouteCount(child.id);
    });
    return count;
  }

  areas.forEach(area => {
    const expected = getExpectedRouteCount(area.id);
    if (area.route_count !== expected) {
      const mismatch = `area "${area.id}" (${area.name}): route_count=${area.route_count}, expected=${expected}`;
      stats.countMismatches.push({ area, expected, actual: area.route_count });
      if (Math.abs(area.route_count - expected) > 5) {
        errors.push(`ROUTE_COUNT MISMATCH: ${mismatch}`);
      } else {
        warnings.push(`route_count off: ${mismatch}`);
      }
    }
  });

  // 7. Discipline breakdown
  console.log('Checking 7: Discipline breakdown...');
  const disciplines = new Map();
  routes.forEach(route => {
    const d = route.discipline || 'unknown';
    if (!disciplines.has(d)) disciplines.set(d, 0);
    disciplines.set(d, disciplines.get(d) + 1);
  });

  console.log('  Discipline counts:');
  Array.from(disciplines.entries()).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => {
    console.log(`    ${d}: ${c}`);
  });

  return { errors, warnings, stats, areasById, routesByAreaId, areasByParentId, peakDepths };
}

// Print Washington hierarchy
function printWAHierarchy(areasById, areasByParentId, routesByAreaId) {
  console.log('\n=== WASHINGTON (WA) ALPINE HIERARCHY ===\n');

  const waArea = areasById.get('wa');
  if (!waArea) {
    console.log('(Washington state area not found)');
    return;
  }

  function printTree(areaId, indent = '') {
    const area = areasById.get(areaId);
    if (!area) return;

    const directRoutes = (routesByAreaId.get(areaId) || []).length;
    const children = (areasByParentId.get(areaId) || []).sort((a, b) => a.name.localeCompare(b.name));

    console.log(`${indent}${area.name} (${area.id})[${area.area_type}] direct=${directRoutes} aggregate=${area.route_count}`);

    children.forEach(child => {
      printTree(child.id, indent + '  ');
    });
  }

  printTree('wa');
}

// Main
async function main() {
  const { areas, routes } = await fetchData();

  const { errors, warnings, stats, areasById, routesByAreaId, areasByParentId, peakDepths } = auditHierarchy(areas, routes);

  printWAHierarchy(areasById, areasByParentId, routesByAreaId);

  // Print summary stats
  console.log('\n=== STATISTICS ===');
  console.log(`Total areas: ${stats.totalAreas}`);
  console.log(`Total routes: ${stats.totalRoutes}`);
  console.log(`\nRoutes by discipline:`);
  const routesByDiscipline = {};
  routes.forEach(r => {
    const d = r.discipline || 'unknown';
    routesByDiscipline[d] = (routesByDiscipline[d] || 0) + 1;
  });
  Object.entries(routesByDiscipline).sort((a,b) => b[1]-a[1]).forEach(([d,c]) => {
    console.log(`  ${d}: ${c}`);
  });

  console.log(`\nAreas by type:`);
  Object.entries(stats.areasByType).sort((a,b) => b[1].length - a[1].length).forEach(([t,as]) => {
    console.log(`  ${t}: ${as.length}`);
  });

  console.log(`\nAreas by hierarchy depth:`);
  Object.entries(stats.areasByDepth).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).forEach(([d,as]) => {
    console.log(`  Depth ${d}: ${as.length} areas`);
  });

  if (peakDepths && peakDepths.length > 0) {
    console.log(`\nRoute-holding areas: ${peakDepths.length} total`);
    const uniqueDepths = [...new Set(peakDepths.map(p => p.depth))].sort((a,b) => a-b);
    console.log(`  Depths: ${uniqueDepths.join(', ')}`);
  }

  // Errors
  if (errors.length > 0) {
    console.log(`\n=== ERRORS (${errors.length}) ===`);
    errors.forEach(e => console.log(`  ${e}`));
  }

  // Warnings
  if (warnings.length > 0) {
    console.log(`\n=== WARNINGS (${warnings.length}) ===`);
    warnings.forEach(w => console.log(`  ${w}`));
  }

  // Summary
  console.log(`\n=== SUMMARY ===`);
  console.log(`Status: ${errors.length === 0 ? 'PASS (no critical errors)' : 'FAIL (' + errors.length + ' critical errors)'}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (stats.orphanedRoutes.length > 0) {
    console.log(`\nOrphaned routes (${stats.orphanedRoutes.length}):`);
    stats.orphanedRoutes.forEach(r => console.log(`  ${r.id} -> area ${r.area_id}`));
  }

  if (stats.brokenParentLinks.length > 0) {
    console.log(`\nBroken parent links (${stats.brokenParentLinks.length}):`);
    stats.brokenParentLinks.forEach(a => console.log(`  ${a.id} -> parent ${a.parent_id}`));
  }

  if (stats.leafXorViolations.length > 0) {
    console.log(`\nLeaf XOR violations (${stats.leafXorViolations.length}):`);
    stats.leafXorViolations.forEach(a => console.log(`  ${a.id} (${a.name})`));
  }

  if (stats.countMismatches.length > 0) {
    console.log(`\nRoute count mismatches (${stats.countMismatches.length}):`);
    stats.countMismatches.slice(0, 20).forEach(m => {
      console.log(`  ${m.area.id}: actual=${m.actual}, expected=${m.expected}`);
    });
    if (stats.countMismatches.length > 20) {
      console.log(`  ... and ${stats.countMismatches.length - 20} more`);
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
