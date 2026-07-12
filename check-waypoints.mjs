#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkWaypoints() {
  console.log('Checking waypoint status of all routes...\n');

  const PAGE = 1000;
  let totalRoutes = 0;
  let withWaypoints = 0;
  let withoutWaypoints = 0;
  const missingWaypointsList = [];

  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('routes')
      .select('id, name, area_id, lat, lng, waypoints')
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    if (!data || !data.length) break;

    data.forEach(route => {
      totalRoutes++;
      const waypoints = route.waypoints;
      const hasWaypoints = waypoints &&
        (Array.isArray(waypoints) && waypoints.length > 0 ||
         typeof waypoints === 'string' && waypoints !== '[]' && waypoints !== '');

      if (hasWaypoints) {
        withWaypoints++;
      } else {
        withoutWaypoints++;
        missingWaypointsList.push({
          id: route.id,
          name: route.name,
          hasCoords: !!(route.lat && route.lng)
        });
      }
    });

    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Summary stats
  console.log(`Summary:`);
  console.log(`  Total routes: ${totalRoutes}`);
  console.log(`  With waypoints: ${withWaypoints} (${(withWaypoints/totalRoutes*100).toFixed(1)}%)`);
  console.log(`  Without waypoints: ${withoutWaypoints} (${(withoutWaypoints/totalRoutes*100).toFixed(1)}%)`);

  console.log(`\nRoutes missing waypoints (first 30):`);
  missingWaypointsList.slice(0, 30).forEach(r => {
    const coordsStatus = r.hasCoords ? '✓ has coords' : '✗ no coords';
    console.log(`  - ${r.name.padEnd(50)} [${r.id}] ${coordsStatus}`);
  });

  if (missingWaypointsList.length > 30) {
    console.log(`  ... and ${missingWaypointsList.length - 30} more`);
  }

  // Find South Twin Sister specifically
  const twinSister = missingWaypointsList.filter(r => r.name.toLowerCase().includes('twin sister'));
  if (twinSister.length > 0) {
    console.log(`\nSouth Twin Sister routes:`);
    twinSister.forEach(r => {
      console.log(`  - ${r.name} [${r.id}]`);
    });
  }
}

checkWaypoints().catch(console.error);
