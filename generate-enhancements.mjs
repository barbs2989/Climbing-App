// Generate detailed enhancement recommendations from audit findings
const API_URL = "https://ofuofhojhbcrcahuotya.supabase.co/rest/v1";
const ANON_KEY = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

async function getDetailedHazardRoutes() {
  console.log("Fetching detailed hazard routes for recommendations...\n");

  const url = new URL(`${API_URL}/routes`);
  url.searchParams.set("select", "id,name,watch_out,areas(name,parent_id),gain_ft,grade,grade_system");
  url.searchParams.set("watch_out", "not.is.null");
  url.searchParams.set("limit", "100");

  const response = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });

  return response.json();
}

function generateRecommendations(routes) {
  const recommendations = [];

  (routes || []).forEach((route) => {
    if (!route.watch_out || route.watch_out.length === 0) return;

    const hazardText = Array.isArray(route.watch_out)
      ? route.watch_out.join(" ")
      : String(route.watch_out || "");

    // Analyze what's missing
    const missing = [];
    const suggestions = [];

    if (!/glacier|couloir|serac|crevasse|rockfall|scree|section|pitch|ridge|face|wall|zone/i.test(hazardText)) {
      missing.push("No specific location/feature reference");
      suggestions.push(
        `Add specific geographic markers: e.g., "Emmons Glacier's bergschrund," "North Face serac zone," "Southwest gully"`
      );
    }

    if (!/early|late|season|winter|spring|summer|fall|month|week|june|july|august|september/i.test(hazardText)) {
      missing.push("No seasonal/timing information");
      suggestions.push(
        `Add seasonal windows: e.g., "June-July high rockfall risk," "December-February avalanche prone," "Post-snowmelt crevasse exposure increases"`
      );
    }

    if (!/loose|fragile|unstable|difficult|serious|exposed|dangerous|hazardous|consequence/i.test(hazardText)) {
      missing.push("No condition/severity description");
      suggestions.push(
        `Describe condition severity: e.g., "Extremely loose volcanic rock," "Serious exposure - 200ft+ to terrain," "High consequence for falls"`
      );
    }

    if (!/avoid|watch|beware|check|verify|scout|rope|caution|require|don't|do not/i.test(hazardText)) {
      missing.push("No actionable guidance");
      suggestions.push(
        `Add action guidance: e.g., "Scout this pitch in daylight," "Require helmet," "Verify rope protection," "Stay off during afternoon storms"`
      );
    }

    // Identify hazard category
    const category = identifyHazardCategory(hazardText);

    if (missing.length > 0) {
      recommendations.push({
        routeId: route.id,
        routeName: route.name,
        peakName: route.areas?.name,
        grade: route.grade,
        gradeSystem: route.grade_system,
        gainFt: route.gain_ft,
        hazardCategory: category,
        currentHazards: route.watch_out,
        missingElements: missing,
        suggestions: suggestions,
        priority:
          missing.length >= 3 ? "high" : missing.length === 2 ? "medium" : "low",
      });
    }
  });

  return recommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 30); // Top 30 recommendations
}

function identifyHazardCategory(text) {
  const textLower = text.toLowerCase();

  if (/glacier|serac|bergschrund|crevasse|moat/i.test(textLower)) return "Glacier/Crevasse";
  if (/avalanche|avy|snow slide|slough/i.test(textLower)) return "Avalanche";
  if (/rockfall|loose rock|falling rock/i.test(textLower)) return "Rockfall";
  if (/exposure|exposed|fall|belay|anchor/i.test(textLower)) return "Exposure/Fall";
  if (/weather|storm|lightning|wind|cold/i.test(textLower)) return "Weather";
  if (/water|creek|stream|crossing/i.test(textLower)) return "Water Hazard";
  if (/navigation|route.?find|lost|scramble/i.test(textLower)) return "Route Finding";
  if (/loose|unstable|fragile|scree/i.test(textLower)) return "Loose Terrain";
  if (/commitment|long|strenuous|fatigue/i.test(textLower)) return "Commitment/Endurance";

  return "General Hazard";
}

// Format recommendations for report
function formatRecommendations(recs) {
  let output = "HAZARD ENHANCEMENT RECOMMENDATIONS\n";
  output += "=".repeat(80) + "\n\n";

  const byCategory = {};
  recs.forEach((r) => {
    if (!byCategory[r.hazardCategory]) byCategory[r.hazardCategory] = [];
    byCategory[r.hazardCategory].push(r);
  });

  Object.keys(byCategory)
    .sort()
    .forEach((category) => {
      output += `\n${category.toUpperCase()}\n`;
      output += "-".repeat(40) + "\n";

      byCategory[category].slice(0, 5).forEach((r) => {
        output += `\n${r.routeName} (${r.peakName}) [${r.priority.toUpperCase()}]\n`;
        output += `Route ID: ${r.routeId}\n`;
        output += `Grade: ${r.grade} ${r.gradeSystem || ""} | Gain: ${r.gainFt || "?"}ft\n`;
        output += `Current hazards: ${JSON.stringify(r.currentHazards)}\n`;
        output += `Missing elements:\n`;
        r.missingElements.forEach((m) => {
          output += `  - ${m}\n`;
        });
        output += `Suggestions:\n`;
        r.suggestions.forEach((s) => {
          output += `  - ${s}\n`;
        });
      });
    });

  return output;
}

async function main() {
  try {
    const routes = await getDetailedHazardRoutes();
    console.log(`Retrieved ${routes.length} routes with hazard data\n`);

    const recommendations = generateRecommendations(routes);
    console.log(`\nGenerated ${recommendations.length} prioritized enhancement recommendations\n`);

    // Group by priority
    const byPriority = {};
    recommendations.forEach((r) => {
      if (!byPriority[r.priority]) byPriority[r.priority] = [];
      byPriority[r.priority].push(r);
    });

    console.log(`\nPriority breakdown:`);
    console.log(`  High priority: ${byPriority.high?.length || 0}`);
    console.log(`  Medium priority: ${byPriority.medium?.length || 0}`);
    console.log(`  Low priority: ${byPriority.low?.length || 0}`);

    // Output formatted recommendations
    console.log("\n" + formatRecommendations(recommendations));

    // Export as JSON
    const enhancementReport = {
      timestamp: new Date().toISOString(),
      total_recommendations: recommendations.length,
      by_priority: {
        high: byPriority.high?.length || 0,
        medium: byPriority.medium?.length || 0,
        low: byPriority.low?.length || 0,
      },
      recommendations: recommendations,
    };

    console.log("\n\n=== ENHANCEMENT REPORT JSON ===\n");
    console.log(JSON.stringify(enhancementReport, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
