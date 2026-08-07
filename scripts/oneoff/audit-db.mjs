// Simple REST API approach to avoid Supabase client initialization issues
const API_URL = "https://ofuofhojhbcrcahuotya.supabase.co/rest/v1";
const ANON_KEY = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

async function query(table, select = "*", filters = []) {
  const url = new URL(`${API_URL}/${table}`);
  url.searchParams.set("select", select);

  // Add filters
  for (const [col, op, val] of filters) {
    if (op === "not.is") {
      url.searchParams.append(`${col}`, `not.is.${val}`);
    } else if (op === "neq") {
      url.searchParams.append(`${col}`, `neq.${val}`);
    } else if (op === "in") {
      url.searchParams.append(`${col}`, `in.(${val.join(",")})`);
    } else if (op === "eq") {
      url.searchParams.append(`${col}`, `eq.${val}`);
    }
  }

  const response = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });

  if (!response.ok) {
    console.error(`Query failed: ${response.status}`, await response.text());
    return [];
  }

  return response.json();
}

// Phase 1: Hazard quality check
async function auditHazards() {
  console.log("=== PHASE 1: HAZARD QUALITY AUDIT ===\n");

  const url = new URL(`${API_URL}/routes`);
  url.searchParams.set("select", "id,name,watch_out,areas(name,parent_id,path)");
  url.searchParams.set("watch_out", "not.is.null");
  url.searchParams.set("limit", "500");

  const response = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const routesWithHazards = await response.json();

  console.log(`Total routes with watch_out: ${routesWithHazards?.length || 0}`);

  // Group by peak
  const peakGroups = {};
  (routesWithHazards || []).forEach((r) => {
    const peakName = r.areas?.name || "unknown";
    if (!peakGroups[peakName]) peakGroups[peakName] = [];
    peakGroups[peakName].push(r);
  });

  // Sample 50 routes across peaks
  const sampled = [];
  const peakKeys = Object.keys(peakGroups).slice(0, 20);
  for (const peak of peakKeys) {
    const routes = peakGroups[peak];
    if (routes.length > 0) {
      sampled.push(routes[Math.floor(Math.random() * routes.length)]);
    }
  }
  while (sampled.length < 50 && sampled.length < (routesWithHazards?.length || 0)) {
    const r = routesWithHazards[Math.floor(Math.random() * routesWithHazards.length)];
    if (!sampled.includes(r)) sampled.push(r);
  }

  console.log(`Sampling ${sampled.length} hazard entries\n`);

  // Score hazard depth
  const hazardScores = sampled
    .filter((r) => r.watch_out)
    .map((r) => {
      const hazardText = Array.isArray(r.watch_out) ? r.watch_out.join(" ") : String(r.watch_out || "");
      const score = scoreHazardDepth(hazardText);
      return {
        routeId: r.id,
        routeName: r.name,
        peakName: r.areas?.name,
        hazards: r.watch_out,
        depth: score.score,
        issues: score.issues,
      };
    });

  const highQuality = hazardScores.filter((h) => h.depth >= 3).length;
  const lowQuality = hazardScores.filter((h) => h.depth < 3).length;
  const avgScore = hazardScores.reduce((s, h) => s + h.depth, 0) / Math.max(1, hazardScores.length);

  console.log(`Hazard Quality Summary:`);
  console.log(`  High quality (3-5): ${highQuality}`);
  console.log(`  Needs enhancement (<3): ${lowQuality}`);
  console.log(`  Average depth score: ${avgScore.toFixed(2)}/5\n`);

  const poorHazards = hazardScores.filter((h) => h.depth < 3).slice(0, 10);
  if (poorHazards.length > 0) {
    console.log(`Sample of routes needing hazard enhancement:\n`);
    poorHazards.forEach((h) => {
      console.log(`  ${h.routeName} (${h.peakName})`);
      console.log(`    Current: ${JSON.stringify(h.hazards)}`);
      console.log(`    Issues: ${h.issues.join("; ")}\n`);
    });
  }

  return { hazardScores, stats: { highQuality, lowQuality, avgScore } };
}

// Phase 2: Access/Permit data verification
async function auditAccess() {
  console.log("\n=== PHASE 2: ACCESS/PERMIT DATA AUDIT ===\n");

  const url = new URL(`${API_URL}/routes`);
  url.searchParams.set("select", "id,name,permit,access,areas(name,parent_id)");
  url.searchParams.set("permit", "not.is.null");
  url.searchParams.set("limit", "500");

  const response = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const routesWithAccess = await response.json();

  console.log(`Total routes with permit data: ${routesWithAccess?.length || 0}`);

  const sampled = (routesWithAccess || [])
    .sort(() => Math.random() - 0.5)
    .slice(0, 50);

  console.log(`Sampling ${sampled.length} permit entries\n`);

  const permitData = sampled
    .filter((r) => r.permit)
    .map((r) => {
      const permitText = String(r.permit);
      const issues = checkPermitData(permitText);
      return {
        routeId: r.id,
        routeName: r.name,
        peakName: r.areas?.name,
        permit: permitText.substring(0, 200),
        issuesFound: issues,
      };
    });

  const withoutIssues = permitData.filter((p) => p.issuesFound.length === 0).length;
  const withIssues = permitData.filter((p) => p.issuesFound.length > 0).length;

  console.log(`Permit Data Quality:`);
  console.log(`  Without issues: ${withoutIssues}`);
  console.log(`  With potential issues: ${withIssues}\n`);

  const flaggedPermits = permitData.filter((p) => p.issuesFound.length > 0).slice(0, 10);
  if (flaggedPermits.length > 0) {
    console.log(`Sample of permits flagged for review:\n`);
    flaggedPermits.forEach((p) => {
      console.log(`  ${p.routeName} (${p.peakName})`);
      console.log(`    Text: "${p.permit}..."`);
      console.log(`    Flags: ${p.issuesFound.join("; ")}\n`);
    });
  }

  return { permitData, stats: { withoutIssues, withIssues } };
}

// Phase 3: GPS Coordinate accuracy
async function auditGPS() {
  console.log("\n=== PHASE 3: GPS COORDINATE ACCURACY AUDIT ===\n");

  const url = new URL(`${API_URL}/routes`);
  url.searchParams.set("select", "id,name,lat,lng,high_point_ft,areas(name,elevation_ft,lat,lng)");
  url.searchParams.set("lat", "not.is.null");
  url.searchParams.set("lng", "not.is.null");
  url.searchParams.set("limit", "500");

  const response = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const routesWithCoords = await response.json();

  console.log(`Total routes with GPS coordinates: ${routesWithCoords?.length || 0}`);

  const sampled = (routesWithCoords || [])
    .sort(() => Math.random() - 0.5)
    .slice(0, 20);

  console.log(`Sampling ${sampled.length} GPS entries\n`);

  const gpsData = sampled.map((r) => {
    const issues = checkGPSAccuracy(r);
    return {
      routeId: r.id,
      routeName: r.name,
      peakName: r.areas?.name,
      lat: r.lat,
      lng: r.lng,
      highPointFt: r.high_point_ft,
      peakElevFt: r.areas?.elevation_ft,
      issuesFound: issues,
    };
  });

  const accurate = gpsData.filter((g) => g.issuesFound.length === 0).length;
  const needsReview = gpsData.filter((g) => g.issuesFound.length > 0).length;

  console.log(`GPS Quality Summary:`);
  console.log(`  Appears accurate: ${accurate}`);
  console.log(`  Needs review: ${needsReview}\n`);

  const flaggedCoords = gpsData.filter((g) => g.issuesFound.length > 0).slice(0, 8);
  if (flaggedCoords.length > 0) {
    console.log(`Sample of GPS coordinates flagged for review:\n`);
    flaggedCoords.forEach((g) => {
      console.log(`  ${g.routeName} (${g.peakName})`);
      console.log(`    Coords: [${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}]`);
      console.log(`    Route high point: ${g.highPointFt}ft, Peak elev: ${g.peakElevFt}ft`);
      console.log(`    Issues: ${g.issuesFound.join("; ")}\n`);
    });
  }

  return { gpsData, stats: { accurate, needsReview } };
}

// Phase 4: Get data for incident research
async function getIncidentResearchData() {
  console.log("\n=== PHASE 4: DATA FOR INCIDENT CROSS-REFERENCE ===\n");

  const url = new URL(`${API_URL}/areas`);
  url.searchParams.set("select", "id,name,area_type,region,route_count");
  url.searchParams.set("region", "in.(Mount Rainier,North Cascades,Snoqualmie,Alpine Lakes)");
  url.searchParams.set("area_type", "eq.peak");
  url.searchParams.set("order", "route_count.desc");
  url.searchParams.set("limit", "30");

  const response = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const majorPeaks = await response.json();

  console.log(`Major WA peaks identified for incident research:\n`);
  const peakNames = (majorPeaks || [])
    .map((p) => {
      console.log(`  ${p.name} (${p.region}) - ${p.route_count} routes`);
      return p.name;
    })
    .slice(0, 15);

  console.log(`\nThese peaks will be cross-referenced with recent incident reports.\n`);

  return peakNames;
}

// Helper: Score hazard depth
function scoreHazardDepth(text) {
  if (!text || text.length === 0) return { score: 1, issues: ["No hazard data"] };

  const issues = [];
  let score = 1;

  const hasLocation = /glacier|pitch|serac|crevasse|rockfall|section|ridge|face|wall|couloir/i.test(text);
  const hasTiming = /early|late|season|winter|summer|spring|fall|month|week|day|weather|rain|snow|freeze/i.test(text);
  const hasCondition = /loose|fragile|unstable|difficult|serious|exposed|dangerous|hazard/i.test(text);
  const hasAction = /avoid|watch|beware|check|verify|scout|rope|caution/i.test(text);

  if (!hasLocation) issues.push("No specific location mentioned");
  if (!hasTiming) issues.push("No seasonal or timing info");
  if (!hasCondition) issues.push("No condition description");
  if (!hasAction) issues.push("No actionable guidance");

  if (hasLocation && hasTiming && hasCondition && hasAction) score = 5;
  else if (hasLocation && hasTiming && hasCondition) score = 4;
  else if (hasLocation && (hasTiming || hasCondition)) score = 3;
  else if (hasLocation || hasTiming || hasCondition) score = 2;

  return { score, issues };
}

// Helper: Check permit data quality
function checkPermitData(text) {
  const issues = [];

  if (text.length < 20) issues.push("Very brief, may lack detail");
  if (!/permit|pass|fee|reservation|contact|require/i.test(text))
    issues.push("Doesn't mention permit/pass/fee structure");
  if (!/\$|cost|fee/i.test(text)) issues.push("No fee information");
  if (!/station|office|website|number|contact/i.test(text))
    issues.push("No pickup/contact location specified");
  if (/202[0-4]|2025/i.test(text) && !/2026/i.test(text))
    issues.push("References older year, may need 2026 verification");

  return issues;
}

// Helper: Check GPS accuracy
function checkGPSAccuracy(route) {
  const issues = [];

  if (route.lat < 45.5 || route.lat > 49.1) issues.push("Latitude outside WA bounds");
  if (route.lng < -124.8 || route.lng > -116.9) issues.push("Longitude outside WA bounds");

  if (route.highPointFt && route.areas?.elevation_ft) {
    if (route.highPointFt > route.areas.elevation_ft * 1.15)
      issues.push("Route high point significantly exceeds peak elevation");
    if (route.highPointFt < route.areas.elevation_ft * 0.5)
      issues.push("Route high point seems too low compared to peak");
  }

  if (route.lat === 0 || route.lng === 0) issues.push("Coordinate is at origin (0,0) - likely placeholder");

  return issues;
}

// Main
async function main() {
  try {
    const hazards = await auditHazards();
    const access = await auditAccess();
    const gps = await auditGPS();
    const peaks = await getIncidentResearchData();

    const report = {
      timestamp: new Date().toISOString(),
      phase1_hazards: {
        checked: hazards.hazardScores.length,
        high_quality: hazards.stats.highQuality,
        needs_enhancement: hazards.stats.lowQuality,
        average_depth_score: hazards.stats.avgScore,
        sample_routes: hazards.hazardScores.slice(0, 5),
      },
      phase2_access: {
        checked: access.permitData.length,
        without_issues: access.stats.withoutIssues,
        with_issues: access.stats.withIssues,
        sample_routes: access.permitData.slice(0, 5),
      },
      phase3_gps: {
        checked: gps.gpsData.length,
        accurate: gps.stats.accurate,
        needs_review: gps.stats.needsReview,
        sample_routes: gps.gpsData.slice(0, 5),
      },
      phase4_peaks_for_incident_research: peaks,
    };

    console.log("\n\n=== FULL REPORT JSON ===\n");
    console.log(JSON.stringify(report, null, 2));

    const fs = require("fs");
    fs.writeFileSync(
      "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/audit-report.json",
      JSON.stringify(report, null, 2)
    );
    console.log("\n✓ Report saved to audit-report.json");
  } catch (err) {
    console.error("Error:", err.message);
    console.error(err.stack);
  }
}

main();
