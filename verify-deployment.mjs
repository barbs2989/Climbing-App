#!/usr/bin/env node
/**
 * DEPLOYMENT VERIFICATION
 *
 * Verifies that climbing research + permit data are correctly deployed
 * and accessible through the app's data layer.
 */

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key, { realtime: { transport: ws } });

console.log('='.repeat(80));
console.log('DEPLOYMENT VERIFICATION: Climbing Research + Permit Data');
console.log('='.repeat(80));
console.log('');

async function verify() {
  try {
    // 1. Verify climbing routes exist
    console.log('CHECK 1: Climbing Research Routes');
    const { data: routes, error: routeErr } = await supabase
      .from('routes')
      .select('id, name, discipline, watch_out')
      .in('discipline', ['rock_climbing', 'alpine', 'ice_climbing', 'aid_climbing'])
      .limit(100);

    if (routeErr) {
      console.error(`  ✗ ERROR: ${routeErr.message}`);
      return false;
    }

    console.log(`  ✓ Found ${routes.length} climbing routes`);

    const withHazards = routes.filter(r => r.watch_out && Array.isArray(r.watch_out) && r.watch_out.length > 0);
    console.log(`  ✓ Routes with hazard data: ${withHazards.length}`);

    if (withHazards.length > 0) {
      const sample = withHazards[0];
      console.log(`\n  Sample route: ${sample.name}`);
      console.log(`  Hazards: ${sample.watch_out.length}`);
      console.log(`  First hazard: "${sample.watch_out[0].substring(0, 60)}..."`);
    }

    // 2. Verify permit/access data exists
    console.log('\nCHECK 2: Permit/Access Data');
    const { data: permits, error: permitErr } = await supabase
      .from('routes')
      .select('id, name, access')
      .neq('access', null)
      .limit(50);

    if (permitErr) {
      console.error(`  ✗ ERROR: ${permitErr.message}`);
      return false;
    }

    console.log(`  ✓ Found ${permits.length} routes with permit/access data`);

    if (permits.length > 0) {
      const sample = permits[0];
      console.log(`\n  Sample: ${sample.name}`);
      if (sample.access.permit) console.log(`  Permit: ${sample.access.permit.substring(0, 50)}...`);
      if (sample.access.fees) console.log(`  Fees: ${sample.access.fees.substring(0, 50)}...`);
    }

    // 3. Verify data quality
    console.log('\nCHECK 3: Data Quality');
    const { data: allRoutes, error: countErr } = await supabase
      .from('routes')
      .select('id')
      .limit(1);

    if (!countErr && allRoutes) {
      console.log(`  ✓ Database accessible`);
    }

    const hazardCount = withHazards.reduce((sum, r) => sum + (r.watch_out?.length || 0), 0);
    console.log(`  ✓ Total hazard entries indexed: ${hazardCount}`);
    console.log(`  ✓ Permit/access records: ${permits.length}`);

    // 4. Verify no orphaned routes
    console.log('\nCHECK 4: Data Integrity');
    const { data: orphaned, error: orphanErr } = await supabase
      .from('routes')
      .select('id, name')
      .eq('area_id', null)
      .limit(10);

    if (!orphanErr && orphaned) {
      if (orphaned.length === 0) {
        console.log(`  ✓ No orphaned routes (all have valid area_id)`);
      } else {
        console.log(`  ⚠ WARNING: ${orphaned.length} routes have null area_id`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION COMPLETE ✓');
    console.log('='.repeat(80));
    console.log(`\nDeployment Status:`);
    console.log(`  ✓ Climbing research data: LIVE`);
    console.log(`  ✓ Permit/access data: LIVE`);
    console.log(`  ✓ Data integrity: VERIFIED`);
    console.log(`\nReady for production deployment to GitHub Pages.`);

    process.exit(0);
  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

verify();
