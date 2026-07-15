import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

// Read the Eastern WA research file
const researchFile = '/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/eastern-washington-alpine-research-2026-07-15.json';
if (fs.existsSync(researchFile)) {
  const research = JSON.parse(fs.readFileSync(researchFile, 'utf-8'));
  
  const dragontail = research.peaks?.find(p => p.name?.includes('Dragontail'));
  if (dragontail) {
    console.log('=== DRAGONTAIL RESEARCH DATA ===');
    console.log(`Name: ${dragontail.name}`);
    console.log(`Elevation: ${dragontail.elevation_ft} ft`);
    console.log(`GPS: ${dragontail.lat}, ${dragontail.lng}`);
    console.log(`Routes (${dragontail.routes?.length || 0}):`);
    dragontail.routes?.forEach(r => {
      console.log(`  - ${r.name}: ${r.grade}`);
    });
  }
}

// Check what routes exist in the catalog for Dragontail
const { data: catalogRoutes, error } = await supabase
  .from('routes')
  .select('id, name, area_id, grade')
  .or('name.ilike.%dragontail%, area_id.eq.wa_dragontail_peak')
  .limit(20);

console.log('\n=== ROUTES IN DB WITH "DRAGONTAIL" ===');
if (error) console.error('Error:', error.message);
if (catalogRoutes && catalogRoutes.length > 0) {
  catalogRoutes.forEach(r => {
    console.log(`  ${r.id}: ${r.name} (area: ${r.area_id}, grade: ${r.grade})`);
  });
} else {
  console.log('No routes found');
}
