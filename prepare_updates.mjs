#!/usr/bin/env node
// Prepare SQL UPDATE statements from research results
// Takes JSON research results and generates Supabase UPDATE commands

import * as fs from 'fs';

function escapeJson(obj) {
  return JSON.stringify(JSON.stringify(obj));
}

function generateUpdate(routeId, enrichmentData) {
  const updates = [];

  if (enrichmentData.trailheadDirection) {
    const approachLogistics = {
      trailhead: enrichmentData.trailheadName || null,
      trailheadDirection: enrichmentData.trailheadDirection,
      trailheadLat: enrichmentData.trailheadLat || null,
      trailheadLng: enrichmentData.trailheadLng || null,
    };
    updates.push(
      `approach_logistics = '${JSON.stringify(approachLogistics).replace(/'/g, "''")}'::jsonb`
    );
  }

  if (enrichmentData.approachDistanceKm) {
    updates.push(`dist_km = ${enrichmentData.approachDistanceKm}`);
  }

  if (enrichmentData.elevationGainM) {
    // Convert meters to feet (rough, but matches the db schema)
    const gainFt = Math.round(enrichmentData.elevationGainM * 3.28084);
    updates.push(`gain_ft = ${gainFt}`);
  }

  if (enrichmentData.approachTimeHrs) {
    const timing = {
      approachTimeHrs: enrichmentData.approachTimeHrs,
    };
    updates.push(`timing = jsonb_set(coalesce(timing, '{}'::jsonb), '{approachTimeHrs}', '"${enrichmentData.approachTimeHrs}"')`);
  }

  if (enrichmentData.beta || enrichmentData.routeDescription) {
    const beta = enrichmentData.beta || enrichmentData.routeDescription;
    updates.push(`beta = ${escapeJson(beta)}`);
  }

  if (enrichmentData.accessInfo) {
    const access = {
      notes: enrichmentData.accessInfo,
    };
    updates.push(`access = jsonb_set(coalesce(access, '{}'::jsonb), '{notes}', ${escapeJson(enrichmentData.accessInfo)})`);
  }

  if (updates.length === 0) return null;

  return `UPDATE routes SET ${updates.join(', ')} WHERE id = '${routeId}';`;
}

// Example usage - read research results and generate SQL
const researchResults = {
  goode: {
    routeName: 'Mount Goode - Northwest Buttress',
    trailheadName: 'Cascade Pass Trail',
    trailheadDirection: 'North from Cascade Pass toward Mount Goode, then northwest up snow/scree to Northwest Buttress',
    approachTimeHrs: 6.5,
    approachDistanceKm: 12,
    elevationGainM: 1200,
    trailheadLat: 48.4167,
    trailheadLng: -121.4167,
    peakLat: 48.4281,
    peakLng: -121.4083,
    accessInfo: 'North Cascades National Park permit required; seasonal access May-October',
    routeDescription: 'Popular alpine ice/mixed route on Mount Goode',
  },
};

// Generate SQL from research
const sqlStatements = [];
for (const [key, data] of Object.entries(researchResults)) {
  // For now, this is example data - would need actual route IDs from database
  if (data.routeName === 'Mount Goode - Northwest Buttress') {
    const routeId = 'wa_mount_goode_northwest_buttress'; // Would need to look up
    const sql = generateUpdate(routeId, data);
    if (sql) sqlStatements.push(sql);
  }
}

console.log('-- Auto-generated trailhead enrichment SQL');
console.log('-- Run these in Supabase SQL Editor after verifying route IDs');
console.log('');
sqlStatements.forEach((sql) => console.log(sql));

export { generateUpdate, escapeJson };
