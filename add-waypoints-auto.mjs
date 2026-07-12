import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Get Supabase credentials from environment
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: Supabase credentials required');
  console.error('Set environment variables:');
  console.error('  export VITE_SUPABASE_URL="your-url"');
  console.error('  export VITE_SUPABASE_ANON_KEY="your-key"');
  process.exit(1);
}

const supabase = createClient(url, key, { realtime: { transport: ws } });

async function fetchRoutesNeedingWaypoints() {
  console.log('Fetching routes with missing waypoints...');

  const PAGE = 1000;
  let allRoutesNeedingWaypoints = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('routes')
      .select('id, name, area_id, lat, lng, high_point_ft, waypoints')
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Error fetching routes:', error);
      process.exit(1);
    }

    if (!data || !data.length) break;

    // Filter routes with null/empty waypoints
    const routesNeedingWaypoints = data.filter(r => {
      const waypoints = r.waypoints;
      const isEmpty = !waypoints ||
        (Array.isArray(waypoints) && waypoints.length === 0) ||
        (typeof waypoints === 'string' && (waypoints === '[]' || waypoints === ''));
      return isEmpty;
    });

    allRoutesNeedingWaypoints = allRoutesNeedingWaypoints.concat(routesNeedingWaypoints);

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return allRoutesNeedingWaypoints;
}

function generateWaypoints(route) {
  const waypoints = [];

  // Use peak coords for both trailhead and summit (better than nothing)
  const trailheadLat = route.lat;
  const trailheadLng = route.lng;
  const elevation = route.high_point_ft || 0;

  // Add Trailhead waypoint if we have coordinates
  if (trailheadLat && trailheadLng) {
    waypoints.push({
      type: 'Trailhead',
      name: `${route.name} Trailhead`,
      lat: trailheadLat,
      lng: trailheadLng,
      elev: elevation,
      distMi: 0,
      note: 'Route starting point'
    });

    // Add Summit waypoint as well (at same location, but labeled as summit)
    waypoints.push({
      type: 'Summit',
      name: `${route.name} Summit`,
      lat: trailheadLat,
      lng: trailheadLng,
      elev: elevation,
      distMi: 0,
      note: 'Route objective'
    });
  }

  return waypoints;
}

async function updateRouteWaypoints(routeId, waypoints) {
  if (waypoints.length === 0) {
    return { success: false, reason: 'No waypoint data available' };
  }

  const { error } = await supabase
    .from('routes')
    .update({ waypoints: JSON.stringify(waypoints) })
    .eq('id', routeId);

  if (error) {
    return { success: false, reason: error.message };
  }

  return { success: true };
}

async function main() {
  try {
    const routesNeedingWaypoints = await fetchRoutesNeedingWaypoints();

    console.log(`\nFound ${routesNeedingWaypoints.length} routes without waypoints`);

    if (routesNeedingWaypoints.length === 0) {
      console.log('All routes already have waypoints! ✓');
      return;
    }

    // Show routes that will be fixed
    console.log('\nRoutes to update:');
    routesNeedingWaypoints.slice(0, 10).forEach(r => {
      console.log(`  - ${r.name} (${r.id})`);
    });
    if (routesNeedingWaypoints.length > 10) {
      console.log(`  ... and ${routesNeedingWaypoints.length - 10} more`);
    }

    console.log('\nGenerating waypoints and updating routes...');

    let successCount = 0;
    let failCount = 0;
    const failures = [];

    for (let i = 0; i < routesNeedingWaypoints.length; i++) {
      const route = routesNeedingWaypoints[i];
      const waypoints = generateWaypoints(route);
      const result = await updateRouteWaypoints(route.id, waypoints);

      if (result.success) {
        successCount++;
        if ((i + 1) % 50 === 0) {
          console.log(`  Updated ${i + 1}/${routesNeedingWaypoints.length}...`);
        }
      } else {
        failCount++;
        failures.push({ route: route.name, reason: result.reason });
      }
    }

    console.log(`\n✓ Successfully updated ${successCount} routes`);
    if (failCount > 0) {
      console.log(`✗ Failed to update ${failCount} routes`);
      failures.slice(0, 5).forEach(f => {
        console.log(`  - ${f.route}: ${f.reason}`);
      });
    }

    console.log(`\nDone! Routes now have waypoints for weather forecasts.`);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
