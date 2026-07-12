import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(url, key);

async function findRoutesWithoutWaypoints() {
  console.log('Fetching all routes...');

  // Fetch all routes
  const PAGE = 1000;
  let allRoutes = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('routes')
      .select('id, name, area_id, lat, lng, elevation_ft, start_lat, start_lng')
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Error fetching routes:', error);
      process.exit(1);
    }

    if (!data || !data.length) break;
    allRoutes = allRoutes.concat(data);

    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Found ${allRoutes.length} total routes`);

  // Fetch routes with waypoint data to check which have empty waypoints
  let routesWithoutWaypoints = [];
  from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('routes')
      .select('id, name, area_id, waypoints, lat, lng, elevation_ft, start_lat, start_lng, areas(name, lat, lng, elevation_ft)')
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Error fetching routes with waypoints:', error);
      process.exit(1);
    }

    if (!data || !data.length) break;

    // Filter routes with null or empty waypoints
    const routesNeedingWaypoints = data.filter(r => {
      if (!r.waypoints) return true;
      if (Array.isArray(r.waypoints) && r.waypoints.length === 0) return true;
      if (typeof r.waypoints === 'string') {
        try {
          const parsed = JSON.parse(r.waypoints);
          return !Array.isArray(parsed) || parsed.length === 0;
        } catch {
          return true;
        }
      }
      return false;
    });

    routesWithoutWaypoints = routesWithoutWaypoints.concat(routesNeedingWaypoints);

    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`\nRoutes without waypoints: ${routesWithoutWaypoints.length}`);

  // Show first 20
  console.log('\nFirst 20 routes needing waypoints:');
  routesWithoutWaypoints.slice(0, 20).forEach(r => {
    console.log(`  - ${r.name} (id: ${r.id}, area: ${r.areas?.name || 'unknown'})`);
  });

  return routesWithoutWaypoints;
}

async function addWaypointsToRoute(routeId, route) {
  // Create basic waypoints from available data
  const waypoints = [];

  // Trailhead waypoint (use start_lat/lng or route lat/lng)
  const trailheadLat = route.start_lat || route.lat;
  const trailheadLng = route.start_lng || route.lng;

  if (trailheadLat && trailheadLng) {
    waypoints.push({
      type: 'Trailhead',
      name: `${route.name} Trailhead`,
      lat: trailheadLat,
      lng: trailheadLng,
      elev: route.elevation_ft,
      distMi: 0,
      note: 'Starting point for this route'
    });
  }

  // Summit waypoint (if we have elevation)
  if (route.lat && route.lng && route.elevation_ft) {
    waypoints.push({
      type: 'Summit',
      name: `${route.name} Summit`,
      lat: route.lat,
      lng: route.lng,
      elev: route.elevation_ft,
      distMi: 0,
      note: 'Route objective'
    });
  }

  if (waypoints.length === 0) {
    console.log(`  No waypoint data available for ${route.name}`);
    return false;
  }

  // Update the route with waypoints
  const { error } = await supabase
    .from('routes')
    .update({ waypoints: JSON.stringify(waypoints) })
    .eq('id', routeId);

  if (error) {
    console.log(`  Error updating ${route.name}: ${error.message}`);
    return false;
  }

  console.log(`  Updated ${route.name} with ${waypoints.length} waypoints`);
  return true;
}

async function main() {
  const routesNeedingWaypoints = await findRoutesWithoutWaypoints();

  if (routesNeedingWaypoints.length === 0) {
    console.log('All routes have waypoints!');
    return;
  }

  console.log(`\nAdding waypoints to routes without them...`);

  let updated = 0;
  for (const route of routesNeedingWaypoints) {
    const success = await addWaypointsToRoute(route.id, route);
    if (success) updated++;
  }

  console.log(`\nUpdated ${updated}/${routesNeedingWaypoints.length} routes with waypoints`);
}

main().catch(console.error);
