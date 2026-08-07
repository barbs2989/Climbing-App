#!/usr/bin/env node
/**
 * Verify Phase 3 Tier 2 Ice Routes Hazard Import
 * Checks database coverage and validates hazard data quality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('='.repeat(80));
console.log('PHASE 3 TIER 2: HAZARD IMPORT VERIFICATION');
console.log('='.repeat(80));

async function verifyImport() {
  try {
    // Get overall coverage stats
    const { data: stats, error: statsError } = await supabase
      .from('routes')
      .select('state, hazard_tags', { count: 'exact' })
      .eq('state', 'WA');

    if (statsError) {
      console.error('Error fetching stats:', statsError);
      process.exit(1);
    }

    const totalRoutes = stats.length;
    const routesWithHazards = stats.filter(r => r.hazard_tags && r.hazard_tags.length > 0).length;
    const coverage = ((routesWithHazards / totalRoutes) * 100).toFixed(2);

    console.log(`\nWashington Routes Coverage:`);
    console.log(`  Total routes: ${totalRoutes}`);
    console.log(`  Routes with hazards: ${routesWithHazards}`);
    console.log(`  Coverage: ${coverage}%`);

    // Get discipline breakdown
    const { data: disciplines, error: discError } = await supabase
      .from('routes')
      .select('disciplines, hazard_tags', { count: 'exact' })
      .eq('state', 'WA');

    if (!discError && disciplines) {
      const discCoverage = {};
      disciplines.forEach(r => {
        if (r.disciplines && Array.isArray(r.disciplines)) {
          r.disciplines.forEach(disc => {
            if (!discCoverage[disc]) {
              discCoverage[disc] = { total: 0, covered: 0 };
            }
            discCoverage[disc].total++;
            if (r.hazard_tags && r.hazard_tags.length > 0) {
              discCoverage[disc].covered++;
            }
          });
        }
      });

      console.log(`\nCoverage by Discipline:`);
      Object.entries(discCoverage).forEach(([disc, data]) => {
        const pct = ((data.covered / data.total) * 100).toFixed(1);
        console.log(`  ${disc}: ${data.covered}/${data.total} (${pct}%)`);
      });
    }

    // Sample ice routes with hazards
    console.log(`\nSample Ice Routes with Hazards:`);
    const { data: iceRoutes, error: iceError } = await supabase
      .from('routes')
      .select('name, grade, disciplines, hazard_tags')
      .eq('state', 'WA')
      .in('disciplines', [['ice'], ['mixed']])
      .not('hazard_tags', 'is', null)
      .limit(10);

    if (!iceError && iceRoutes) {
      iceRoutes.forEach(route => {
        console.log(`  • ${route.name} (${route.grade})`);
        if (route.hazard_tags) {
          console.log(`    Hazards: ${route.hazard_tags.join(', ')}`);
        }
      });
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(80));

  } catch (err) {
    console.error('Verification error:', err);
    process.exit(1);
  }
}

verifyImport().then(() => process.exit(0));
