#!/usr/bin/env node
// Generate SQL UPDATE statements from alpine route research

import * as fs from 'fs';

function escapeJsonValue(str) {
  if (!str) return 'null';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateApproachLogisticsJson(route) {
  return {
    trailhead: route.trailheadName || null,
    trailheadDirection: route.trailheadDirection || null,
    trailheadLat: route.trailheadLat || null,
    trailheadLng: route.trailheadLng || null,
    peakLat: route.peakLat || null,
    peakLng: route.peakLng || null,
  };
}

function generateTimingJson(route) {
  return {
    approachTimeHrs: route.approachTimeHrs || null,
  };
}

function generateAccessJson(route) {
  return {
    permit: route.accessInfo ? route.accessInfo.substring(0, 200) : null,
    notes: route.accessInfo || null,
  };
}

function generateUpdateStatement(routeId, route) {
  const updates = [];

  // approach_logistics - structured trailhead data
  const approachLogistics = generateApproachLogisticsJson(route);
  updates.push(
    `approach_logistics = '${JSON.stringify(approachLogistics).replace(/'/g, "''")}'::jsonb`
  );

  // approach - text description
  if (route.trailheadDirection) {
    updates.push(
      `approach = ${escapeJsonValue(route.trailheadDirection)}`
    );
  }

  // dist_km
  if (route.approachDistanceKm) {
    updates.push(`dist_km = ${parseFloat(route.approachDistanceKm)}`);
  }

  // gain_ft (convert from meters if needed)
  if (route.elevationGainM) {
    const gainFt = Math.round(route.elevationGainM * 3.28084);
    updates.push(`gain_ft = ${gainFt}`);
  }

  // timing
  if (route.approachTimeHrs) {
    const timing = generateTimingJson(route);
    updates.push(
      `timing = jsonb_set(coalesce(timing, '{}'::jsonb), '{approachTimeHrs}', '${route.approachTimeHrs}')`
    );
  }

  // beta - general description
  if (route.routeDescription || route.beta) {
    const beta = route.routeDescription || route.beta;
    updates.push(`beta = ${escapeJsonValue(beta)}`);
  }

  // access - permits/restrictions
  if (route.accessInfo) {
    const access = generateAccessJson(route);
    updates.push(
      `access = jsonb_set(coalesce(access, '{}'::jsonb), '{notes}', ${escapeJsonValue(route.accessInfo)})`
    );
  }

  if (updates.length === 0) return null;

  return {
    routeId,
    statement: `UPDATE routes SET ${updates.join(', ')} WHERE id = '${routeId}';`,
    fields_updated: updates.length,
  };
}

// Example routes data (will be populated from research)
const routesData = [
  {
    routeId: 'wa_mount_goode_northeast_buttress',
    data: {
      routeName: 'Mount Goode - Northeast Buttress',
      trailheadName: 'Bridge Creek Trailhead (Rainy Pass)',
      trailheadLat: 48.5075,
      trailheadLng: -120.7312,
      peakLat: 48.48291,
      peakLng: -120.9108,
      trailheadDirection: 'South-southeast via Pacific Crest Trail (PCT) descent, then east up North Fork Bridge Creek',
      approachTimeHrs: 6,
      approachDistanceKm: 22,
      elevationGainM: 1829,
      routeDescription: 'Grade III-IV alpine rock route with 5.4-5.5 climbing. Approach via 10-mile PCT descent to Bridge Creek junction, then 3-4 miles up North Fork Bridge Creek to base camp. Route ascends the Northeast Buttress with glacier travel, scrambling (3rd-4th class), and rock pitches up to 5.5. Total trip: 3-4 days recommended.',
      accessInfo: 'Backcountry permit required ($10 + $6 fee) from North Cascades Visitor Center in Marblemount. Best climbing season: late July through September. Located within North Cascades National Park. Large paved parking available at trailhead.',
    },
  },
  // Additional routes will be added here once research completes
];

// Generate SQL
console.log('-- Alpine Route Trailhead Enrichment SQL Updates');
console.log('-- Generated for Supabase database');
console.log('-- Run in Supabase SQL Editor after verifying route IDs');
console.log('');
console.log('BEGIN TRANSACTION;');
console.log('');

let successCount = 0;
routesData.forEach(({ routeId, data }) => {
  const result = generateUpdateStatement(routeId, data);
  if (result) {
    console.log(`-- ${data.routeName}`);
    console.log(result.statement);
    console.log('');
    successCount++;
  }
});

console.log('COMMIT;');
console.log('');
console.log(`-- Generated updates for ${successCount} routes`);

export { generateUpdateStatement, generateApproachLogisticsJson };
