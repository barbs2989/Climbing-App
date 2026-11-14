import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = 'https://ofuofhojhbcrcahuotya.supabase.co';
const supabaseKey = 'sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5';
const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws
  }
});

async function findWashingtonRoutes() {
  // First, get all Washington state areas and their child areas
  const { data: washinton, error: waError } = await supabase
    .from('areas')
    .select('id, name, area_type, parent_id')
    .eq('name', 'Washington')
    .eq('area_type', 'state');

  if (waError) {
    console.error('Error fetching Washington:', waError);
    return;
  }

  if (!washinton || washinton.length === 0) {
    console.error('Washington state not found');
    return;
  }

  const waId = washinton[0].id;
  console.log('Found Washington area:', waId);

  // Get all routes under Washington using the RPC function
  const { data: routes, error: routeError } = await supabase
    .rpc('routes_in_subtree', {
      root_id: waId,
      q: null,
      disc: null,
      min_grade: null,
      max_grade: null,
      min_stars: null,
      min_pitches: null,
      min_length_m: null,
      max_length_m: null,
      sort_by: 'name',
      lim: 10000,
      off: 0
    });

  if (routeError) {
    console.error('Error fetching routes:', routeError);
    return;
  }

  console.log(`Found ${routes.length} total routes in Washington`);

  // Filter for alpine and mountaineering routes
  const alpineRoutes = routes.filter(r =>
    (r.activity && (r.activity.includes('alpine') || r.activity.includes('mountaineering'))) ||
    (r.discipline && (r.discipline.includes('alpine') || r.discipline.includes('mountaineering')))
  );

  console.log(`Filtered to ${alpineRoutes.length} alpine/mountaineering routes`);

  // Get full route details for alpine routes
  const routeIds = alpineRoutes.map(r => r.id);

  // Fetch in batches since Supabase has limits
  const batchSize = 100;
  let fullRoutes = [];

  for (let i = 0; i < routeIds.length; i += batchSize) {
    const batch = routeIds.slice(i, i + batchSize);
    const { data: batchRoutes, error: batchError } = await supabase
      .from('routes')
      .select('id, name, area_id, grade_system, activity, discipline, areas(name)')
      .in('id', batch);

    if (batchError) {
      console.error('Error fetching batch:', batchError);
    } else {
      fullRoutes = fullRoutes.concat(batchRoutes);
    }
  }

  console.log(`Fetched ${fullRoutes.length} full route details`);

  // Group routes by normalized name to find potential duplicates
  const nameGroups = {};

  fullRoutes.forEach(route => {
    // Normalize the name by removing common variations
    const normalized = route.name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\b(route|climb|peak|summit)\b/g, '')
      .trim()
      .replace(/\s+/g, ' ');

    if (!nameGroups[normalized]) {
      nameGroups[normalized] = [];
    }
    nameGroups[normalized].push(route);
  });

  // Find actual duplicates (same normalized name with different IDs)
  const potentialDuplicates = [];

  Object.entries(nameGroups).forEach(([normalized, routeList]) => {
    if (routeList.length > 1) {
      // Check if they're actually the same climb (same area or very similar)
      const uniqueAreas = new Set(routeList.map(r => r.area_id));
      if (uniqueAreas.size === 1 || routeList.length > 1) {
        potentialDuplicates.push({
          normalized,
          routes: routeList.sort((a, b) => a.id.localeCompare(b.id))
        });
      }
    }
  });

  // Also look for name variations
  const similarityThreshold = 0.85;
  const exactDuplicates = [];

  // Check for exact name matches (case-insensitive)
  const nameMap = {};
  fullRoutes.forEach(route => {
    const key = route.name.toLowerCase().trim();
    if (!nameMap[key]) {
      nameMap[key] = [];
    }
    nameMap[key].push(route);
  });

  Object.entries(nameMap).forEach(([name, routeList]) => {
    if (routeList.length > 1) {
      exactDuplicates.push({
        name,
        routes: routeList.sort((a, b) => a.id.localeCompare(b.id))
      });
    }
  });

  // Output results
  console.log('\n=== EXACT NAME MATCHES (DUPLICATES) ===\n');

  if (exactDuplicates.length === 0) {
    console.log('No exact duplicate names found (case-insensitive)');
  } else {
    exactDuplicates.forEach(dup => {
      console.log(`\nDuplicate: "${dup.name}"`);
      dup.routes.forEach(r => {
        console.log(`  ID: ${r.id}`);
        console.log(`  Area: ${r.areas && r.areas.name ? r.areas.name : 'Unknown'}`);
        console.log(`  Grade: ${r.grade_system || 'N/A'}`);
        console.log(`  Activity: ${r.activity || 'N/A'}`);
      });
    });
  }

  console.log('\n=== SIMILAR NAMES (POTENTIAL DUPLICATES) ===\n');

  if (potentialDuplicates.length === 0) {
    console.log('No similar name patterns found');
  } else {
    potentialDuplicates.filter(p => p.routes.length > 1).slice(0, 20).forEach(dup => {
      console.log(`\nPotential duplicate (normalized): "${dup.normalized}"`);
      dup.routes.forEach(r => {
        console.log(`  ID: ${r.id}`);
        console.log(`  Full name: "${r.name}"`);
        console.log(`  Area: ${r.areas && r.areas.name ? r.areas.name : 'Unknown'}`);
        console.log(`  Grade: ${r.grade_system || 'N/A'}`);
      });
    });
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total routes analyzed: ${fullRoutes.length}`);
  console.log(`Exact name duplicates found: ${exactDuplicates.length}`);
  console.log(`Potential similar names: ${potentialDuplicates.filter(p => p.routes.length > 1).length}`);
}

findWashingtonRoutes().catch(console.error);
