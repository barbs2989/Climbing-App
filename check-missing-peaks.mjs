import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const peaksToCheck = [
  'Mount Constance',
  'Mount Mystery',
  'Mount Seattle',
  'Mount Deception',
  'Mount Rainier',
  'Mount Baker',
  'Mount Olympus'
];

console.log('=== CHECKING PEAK EXISTENCE ===\n');

for (const peak of peaksToCheck) {
  const { data: areas, error: areaError } = await supabase
    .from('areas')
    .select('id, name, elevation_ft, parent_id')
    .ilike('name', `%${peak}%`)
    .limit(5);

  const { data: routes, error: routeError } = await supabase
    .from('routes')
    .select('id')
    .ilike('area_id', `%${peak.toLowerCase().replace(/ /g, '_')}%`)
    .limit(100);

  if (areas && areas.length > 0) {
    const area = areas[0];
    const routeCount = routes?.length || 0;
    console.log(`✓ ${peak}`);
    console.log(`  Area ID: ${area.id}`);
    console.log(`  Elevation: ${area.elevation_ft} ft`);
    console.log(`  Parent: ${area.parent_id}`);
    console.log(`  Routes: ${routeCount}`);
  } else {
    console.log(`✗ ${peak} - NOT FOUND`);
  }
  console.log();
}
