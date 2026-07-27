#!/usr/bin/env node
// Find alpine routes with missing/thin trailhead direction data
// Usage: node find_thin_routes.mjs > thin_routes.json

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

// Use REST API directly to avoid WebSocket dependency
async function querySupabase(table, select, filterStr = "") {
  let query = `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  if (filterStr) query += `&${filterStr}`;

  const res = await fetch(query, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function findThinRoutes() {
  console.error("Fetching alpine routes...");

  try {
    const routes = await querySupabase(
      "routes",
      "*,areas(name,parent_id,path)",
      "discipline=eq.alpine&limit=10000"
    );

    console.error(`Found ${routes.length} alpine routes total`);

  // Identify "thin" routes — ones with missing critical trailhead fields
  const thin = routes.filter((r) => {
    const hasApproach = r.approach && r.approach.trim().length > 10;
    const hasApproachLogistics = r.approach_logistics && Object.keys(r.approach_logistics || {}).length > 0;
    const hasBeta = r.beta && r.beta.trim().length > 10;
    const hasGpx = r.gpx && Array.isArray(r.gpx) && r.gpx.length > 0;
    const hasDistKm = r.dist_km && r.dist_km > 0;

    // "Thin" = missing most of these fields
    const filled = [hasApproach, hasApproachLogistics, hasBeta, hasGpx, hasDistKm].filter(Boolean).length;
    return filled < 2; // Less than 2 of 5 key fields
  });

  console.error(`Identified ${thin.length} thin routes (< 2/5 key fields)`);

  // Find Goode specifically
  const goode = routes.find((r) => r.name && r.name.toLowerCase().includes("goode"));
  if (goode) {
    console.error(`Found Goode route: "${goode.name}" in area "${goode.areas?.name}"`);
    console.error(`  - approach: ${goode.approach ? "yes" : "NO"}`);
    console.error(`  - approach_logistics: ${goode.approach_logistics ? "yes" : "NO"}`);
    console.error(`  - beta: ${goode.beta ? "yes" : "NO"}`);
    console.error(`  - gpx: ${goode.gpx ? `${goode.gpx.length} pts` : "NO"}`);
    console.error(`  - dist_km: ${goode.dist_km ?? "NO"}`);
  }

  // Output the thin routes for research
  const output = {
    timestamp: new Date().toISOString(),
    totalAlpine: routes.length,
    thinCount: thin.length,
    goode,
    thinRoutes: thin.slice(0, 50).map((r) => ({
      id: r.id,
      name: r.name,
      areaName: r.areas?.name,
      areaPath: r.areas?.path,
      discipline: r.discipline,
      grade: r.grade,
      approach: r.approach ? r.approach.substring(0, 100) : null,
      hasApproachLogistics: !!r.approach_logistics,
      hasBeta: !!r.beta,
      hasGpx: !!(r.gpx && r.gpx.length > 0),
      distKm: r.dist_km,
    })),
  };

    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

findThinRoutes();
