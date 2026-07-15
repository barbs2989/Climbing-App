import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

console.log('=== VERIFY HAZARD DOCUMENTATION COVERAGE ===\n');

/**
 * Check watch_out coverage by discipline and area
 */
async function verifyImport() {
  try {
    // Get ice routes coverage
    const { data: iceRoutes } = await supabase
      .from('routes')
      .select('id, name, watch_out, hazards, areas(name, region)')
      .eq('discipline', 'ice')
      .limit(500);

    if (!iceRoutes) {
      console.error('Error fetching ice routes');
      return;
    }

    const iceWithWatchOut = iceRoutes.filter(r => r.watch_out && Array.isArray(r.watch_out) && r.watch_out.length > 0);
    const iceCoverage = ((iceWithWatchOut.length / iceRoutes.length) * 100).toFixed(1);

    console.log(`=== ICE ROUTES ===`);
    console.log(`Total ice routes: ${iceRoutes.length}`);
    console.log(`With watch_out: ${iceWithWatchOut.length} (${iceCoverage}%)`);
    console.log(`Without watch_out: ${iceRoutes.length - iceWithWatchOut.length}\n`);

    // Get alpine routes coverage
    const { data: alpineRoutes } = await supabase
      .from('routes')
      .select('id, name, watch_out, hazards, areas(name, region)')
      .eq('discipline', 'alpine')
      .limit(1000);

    if (!alpineRoutes) {
      console.error('Error fetching alpine routes');
      return;
    }

    const alpineWithWatchOut = alpineRoutes.filter(r => r.watch_out && Array.isArray(r.watch_out) && r.watch_out.length > 0);
    const alpineCoverage = ((alpineWithWatchOut.length / alpineRoutes.length) * 100).toFixed(1);

    console.log(`=== ALPINE ROUTES ===`);
    console.log(`Total alpine routes: ${alpineRoutes.length}`);
    console.log(`With watch_out: ${alpineWithWatchOut.length} (${alpineCoverage}%)`);
    console.log(`Without watch_out: ${alpineRoutes.length - alpineWithWatchOut.length}\n`);

    // Get high-grade rock coverage
    const { data: highGradeRoutes } = await supabase
      .from('routes')
      .select('id, name, watch_out, hazards, areas(name, region)')
      .gte('grade_num', 9)
      .ilike('areas.region', 'Washington')
      .limit(1000);

    if (!highGradeRoutes) {
      console.error('Error fetching high-grade routes');
      return;
    }

    const hgWithWatchOut = highGradeRoutes.filter(r => r.watch_out && Array.isArray(r.watch_out) && r.watch_out.length > 0);
    const hgCoverage = ((hgWithWatchOut.length / highGradeRoutes.length) * 100).toFixed(1);

    console.log(`=== HIGH-GRADE ROCK (5.9+) ===`);
    console.log(`Total high-grade WA routes: ${highGradeRoutes.length}`);
    console.log(`With watch_out: ${hgWithWatchOut.length} (${hgCoverage}%)`);
    console.log(`Without watch_out: ${highGradeRoutes.length - hgWithWatchOut.length}\n`);

    // Overall WA coverage
    console.log(`=== OVERALL WA COVERAGE ===`);
    const totalHazardDocs = iceWithWatchOut.length + alpineWithWatchOut.length + hgWithWatchOut.length;
    const totalRoutes = iceRoutes.length + alpineRoutes.length + highGradeRoutes.length;
    const overallCoverage = ((totalHazardDocs / totalRoutes) * 100).toFixed(1);

    console.log(`Total relevant WA routes: ${totalRoutes}`);
    console.log(`With watch_out: ${totalHazardDocs} (${overallCoverage}%)`);
    console.log(`Without watch_out: ${totalRoutes - totalHazardDocs}`);

    // Show routes still needing documentation
    console.log(`\n=== CRITICAL GAPS (no watch_out) ===`);

    const iceNeeds = iceRoutes.filter(r => !r.watch_out || (Array.isArray(r.watch_out) && r.watch_out.length === 0));
    const alpineNeeds = alpineRoutes.filter(r => !r.watch_out || (Array.isArray(r.watch_out) && r.watch_out.length === 0));

    if (iceNeeds.length > 0) {
      console.log(`\nICE routes needing documentation (${iceNeeds.length}):`);
      iceNeeds.slice(0, 10).forEach(r => {
        console.log(`  - ${r.name} (${r.areas?.name})`);
      });
      if (iceNeeds.length > 10) {
        console.log(`  ... and ${iceNeeds.length - 10} more`);
      }
    }

    if (alpineNeeds.length > 0) {
      console.log(`\nALPINE routes needing documentation (${alpineNeeds.length}):`);
      alpineNeeds.slice(0, 10).forEach(r => {
        console.log(`  - ${r.name} (${r.areas?.name})`);
      });
      if (alpineNeeds.length > 10) {
        console.log(`  ... and ${alpineNeeds.length - 10} more`);
      }
    }

    // Sample routes WITH watch_out
    console.log(`\n=== SAMPLE ROUTES WITH WATCH_OUT ===`);
    const samples = [...iceWithWatchOut, ...alpineWithWatchOut].slice(0, 5);
    samples.forEach((r, i) => {
      console.log(`\n${i+1}. ${r.name}`);
      console.log(`   Area: ${r.areas?.name}`);
      console.log(`   Hazards: ${r.watch_out.length} items`);
      r.watch_out.slice(0, 2).forEach(h => {
        console.log(`     - ${h.substring(0, 70)}${h.length > 70 ? '...' : ''}`);
      });
    });

  } catch (e) {
    console.error('Error:', e.message);
  }

  process.exit(0);
}

verifyImport();
