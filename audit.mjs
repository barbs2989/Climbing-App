#!/usr/bin/env node

const URL = "https://ofuofhojhbcrcahuotya.supabase.co";
const ANON_KEY = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

async function query(table, options = {}) {
  const { select = "*", eq = null, is = null, order = null } = options;

  let url = `${URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;

  if (eq) {
    for (const [col, val] of Object.entries(eq)) {
      url += `&${col}=eq.${encodeURIComponent(val)}`;
    }
  }

  if (is) {
    for (const [col, val] of Object.entries(is)) {
      url += `&${col}=is.${val}`;
    }
  }

  if (order) {
    url += `&order=${order}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function rpc(functionName, args = {}) {
  const response = await fetch(`${URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    throw new Error(
      `RPC failed: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

async function audit() {
  console.log("=".repeat(80));
  console.log("WASHINGTON ALPINE/MOUNTAINEERING DATABASE AUDIT");
  console.log("=".repeat(80));
  console.log();

  try {
    // 1. Get Washington state area
    console.log("Step 1: Fetching Washington state area...");
    const waAreas = await query("areas", {
      eq: { name: "Washington" },
    });

    const wa = waAreas[0];
    if (!wa) {
      console.error("ERROR: Washington state not found!");
      return;
    }
    console.log(`Found Washington (id: ${wa.id})`);
    console.log();

    // 2. Get all areas in WA
    console.log("Step 2: Fetching all areas in Washington...");
    const allAreas = await query("areas", {
      select: "*",
      order: "name",
    });

    // Build area tree - find all areas with WA as ancestor
    const buildAncestors = (areaId) => {
      const area = allAreas.find((a) => a.id === areaId);
      if (!area || !area.parent_id) return [area];
      return [...buildAncestors(area.parent_id), area];
    };

    const peaksWithRoutes = allAreas.filter((a) => {
      if (a.route_count === 0 || a.area_type === "state") return false;
      const ancestors = buildAncestors(a.id);
      return ancestors.some((anc) => anc.id === wa.id);
    });

    console.log(`Found ${peaksWithRoutes.length} peaks with routes in WA`);
    console.log();

    // 3. Fetch all routes
    console.log("Step 3: Fetching all routes in Washington peaks...");
    const allRoutes = await query("routes", {
      select: "*",
    });

    const waRoutes = allRoutes.filter((r) => {
      return peaksWithRoutes.some((p) => p.id === r.area_id);
    });

    console.log(
      `Total routes found in WA alpine/mountaineering peaks: ${waRoutes.length}`
    );
    console.log();

    // 4. Route counts by peak
    console.log("Step 4: ROUTE COUNTS BY PEAK");
    console.log("-".repeat(80));
    const routesByPeak = {};
    waRoutes.forEach((r) => {
      if (!routesByPeak[r.area_id]) {
        const peak = peaksWithRoutes.find((p) => p.id === r.area_id);
        routesByPeak[r.area_id] = {
          name: peak?.name || "UNKNOWN",
          routes: [],
        };
      }
      routesByPeak[r.area_id].routes.push(r);
    });

    const sortedPeaks = Object.entries(routesByPeak)
      .map(([id, data]) => ({ id, ...data, count: data.routes.length }))
      .sort((a, b) => b.count - a.count);

    console.log("Peak Name".padEnd(40) + "Routes".padEnd(10) + "Area ID");
    console.log("-".repeat(80));
    sortedPeaks.forEach((p) => {
      console.log(
        p.name.substring(0, 39).padEnd(40) +
          p.count.toString().padEnd(10) +
          p.id
      );
    });
    console.log();

    // 5. Check specific peaks
    console.log("Step 5: SPECIFIC PEAK VERIFICATION");
    console.log("-".repeat(80));
    const adamsPeak = peaksWithRoutes.find((p) =>
      p.name.includes("Mount Adams")
    );
    const shuksanPeak = peaksWithRoutes.find((p) =>
      p.name.includes("Mount Shuksan")
    );

    if (adamsPeak) {
      const adamsRoutes = waRoutes.filter((r) => r.area_id === adamsPeak.id);
      console.log(
        `Mount Adams: ${adamsRoutes.length} routes (expected 7)`
      );
      if (adamsRoutes.length !== 7) {
        console.log(
          `  WARNING: Expected 7 routes, found ${adamsRoutes.length}`
        );
      }
      adamsRoutes.forEach((r) => {
        console.log(`  - ${r.name} (${r.grade || "NO GRADE"}) [${r.discipline}]`);
      });
    } else {
      console.log("Mount Adams: NOT FOUND");
    }
    console.log();

    if (shuksanPeak) {
      const shuksanRoutes = waRoutes.filter((r) => r.area_id === shuksanPeak.id);
      console.log(
        `Mount Shuksan: ${shuksanRoutes.length} routes (expected 10)`
      );
      if (shuksanRoutes.length !== 10) {
        console.log(
          `  WARNING: Expected 10 routes, found ${shuksanRoutes.length}`
        );
      }
      shuksanRoutes.forEach((r) => {
        console.log(`  - ${r.name} (${r.grade || "NO GRADE"}) [${r.discipline}]`);
      });
    } else {
      console.log("Mount Shuksan: NOT FOUND");
    }
    console.log();

    // 6. Data completeness check
    console.log("Step 6: DATA COMPLETENESS CHECK");
    console.log("-".repeat(80));

    const dataQualityIssues = {
      missingName: [],
      missingGrade: [],
      missingDiscipline: [],
      missingAreaId: [],
      missingDescription: [],
      nullGrade: [],
      invalidDiscipline: [],
      duplicates: [],
    };

    const VALID_DISCIPLINES = [
      "alpine",
      "mountaineering",
      "rock",
      "ice",
      "mixed",
      "bouldering",
    ];

    // Check for duplicates
    const routeNames = {};
    waRoutes.forEach((r) => {
      const key = `${r.area_id}-${r.name}`;
      if (routeNames[key]) {
        dataQualityIssues.duplicates.push({
          name: r.name,
          areaId: r.area_id,
          ids: [routeNames[key].id, r.id],
        });
      } else {
        routeNames[key] = r;
      }
    });

    waRoutes.forEach((r) => {
      if (!r.name || r.name.trim() === "")
        dataQualityIssues.missingName.push(r);
      if (!r.grade || r.grade.trim() === "")
        dataQualityIssues.missingGrade.push(r);
      if (!r.discipline) dataQualityIssues.missingDiscipline.push(r);
      if (!r.area_id) dataQualityIssues.missingAreaId.push(r);
      if (!r.description || r.description.trim() === "")
        dataQualityIssues.missingDescription.push(r);
      if (r.grade === null || r.grade === undefined)
        dataQualityIssues.nullGrade.push(r);
      if (
        r.discipline &&
        !VALID_DISCIPLINES.includes(r.discipline.toLowerCase())
      ) {
        dataQualityIssues.invalidDiscipline.push(r);
      }
    });

    console.log(`Total routes checked: ${waRoutes.length}`);
    console.log(`Routes missing name: ${dataQualityIssues.missingName.length}`);
    console.log(`Routes missing grade: ${dataQualityIssues.missingGrade.length}`);
    console.log(
      `Routes missing discipline: ${dataQualityIssues.missingDiscipline.length}`
    );
    console.log(
      `Routes missing area_id: ${dataQualityIssues.missingAreaId.length}`
    );
    console.log(
      `Routes missing description: ${dataQualityIssues.missingDescription.length}`
    );
    console.log(`Routes with null grade: ${dataQualityIssues.nullGrade.length}`);
    console.log(
      `Routes with invalid discipline: ${dataQualityIssues.invalidDiscipline.length}`
    );
    console.log(`Duplicate route names: ${dataQualityIssues.duplicates.length}`);

    // Report issues
    if (dataQualityIssues.duplicates.length > 0) {
      console.log("\n*** DUPLICATE ROUTES FOUND ***");
      dataQualityIssues.duplicates.forEach((d) => {
        console.log(
          `  - "${d.name}" in area ${d.areaId} (IDs: ${d.ids.join(", ")})`
        );
      });
    }

    if (dataQualityIssues.missingGrade.length > 0) {
      console.log("\n*** ROUTES MISSING GRADE ***");
      dataQualityIssues.missingGrade.slice(0, 5).forEach((r) => {
        console.log(`  - "${r.name}" (area: ${r.area_id})`);
      });
      if (dataQualityIssues.missingGrade.length > 5) {
        console.log(
          `  ... and ${dataQualityIssues.missingGrade.length - 5} more`
        );
      }
    }

    if (dataQualityIssues.missingDiscipline.length > 0) {
      console.log("\n*** ROUTES MISSING DISCIPLINE ***");
      dataQualityIssues.missingDiscipline.slice(0, 5).forEach((r) => {
        console.log(`  - "${r.name}" (area: ${r.area_id})`);
      });
      if (dataQualityIssues.missingDiscipline.length > 5) {
        console.log(
          `  ... and ${dataQualityIssues.missingDiscipline.length - 5} more`
        );
      }
    }

    if (dataQualityIssues.invalidDiscipline.length > 0) {
      console.log("\n*** ROUTES WITH INVALID DISCIPLINE ***");
      dataQualityIssues.invalidDiscipline.slice(0, 10).forEach((r) => {
        console.log(
          `  - "${r.name}": discipline="${r.discipline}" (area: ${r.area_id})`
        );
      });
      if (dataQualityIssues.invalidDiscipline.length > 10) {
        console.log(
          `  ... and ${dataQualityIssues.invalidDiscipline.length - 10} more`
        );
      }
    }

    console.log();

    // 7. Discipline breakdown
    console.log("Step 7: DISCIPLINE BREAKDOWN");
    console.log("-".repeat(80));
    const disciplines = {};
    waRoutes.forEach((r) => {
      const d = r.discipline || "NONE";
      disciplines[d] = (disciplines[d] || 0) + 1;
    });
    Object.entries(disciplines)
      .sort((a, b) => b[1] - a[1])
      .forEach(([d, count]) => {
        console.log(`${d.padEnd(20)}: ${count}`);
      });
    console.log();

    // 8. Grade distribution
    console.log("Step 8: GRADE DISTRIBUTION (Top 15)");
    console.log("-".repeat(80));
    const grades = {};
    waRoutes.forEach((r) => {
      const g = r.grade || "NONE";
      grades[g] = (grades[g] || 0) + 1;
    });
    const topGrades = Object.entries(grades)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    topGrades.forEach(([g, count]) => {
      console.log(`${g.padEnd(20)}: ${count}`);
    });
    console.log();

    // 9. Overall health assessment
    console.log("Step 9: OVERALL HEALTH ASSESSMENT");
    console.log("-".repeat(80));

    const totalIssues =
      dataQualityIssues.missingGrade.length +
      dataQualityIssues.missingDiscipline.length +
      dataQualityIssues.missingName.length +
      dataQualityIssues.duplicates.length +
      dataQualityIssues.invalidDiscipline.length;

    const issuePercent = (totalIssues / waRoutes.length) * 100;

    let healthStatus = "EXCELLENT";
    if (issuePercent > 5) healthStatus = "GOOD";
    if (issuePercent > 10) healthStatus = "FAIR";
    if (issuePercent > 20) healthStatus = "POOR";

    console.log(`Total routes: ${waRoutes.length}`);
    console.log(`Total peaks: ${sortedPeaks.length}`);
    console.log(`Issues found: ${totalIssues} (${issuePercent.toFixed(2)}%)`);
    console.log(`Health Status: ${healthStatus}`);
    console.log();

    // 10. Recommendations
    if (totalIssues > 0) {
      console.log("RECOMMENDED FIXES:");
      console.log("-".repeat(80));
      if (dataQualityIssues.missingGrade.length > 0) {
        console.log(
          `1. Add missing grades to ${dataQualityIssues.missingGrade.length} routes`
        );
      }
      if (dataQualityIssues.missingDiscipline.length > 0) {
        console.log(
          `2. Add missing disciplines to ${dataQualityIssues.missingDiscipline.length} routes`
        );
      }
      if (dataQualityIssues.invalidDiscipline.length > 0) {
        console.log(
          `3. Fix invalid disciplines in ${dataQualityIssues.invalidDiscipline.length} routes`
        );
      }
      if (dataQualityIssues.duplicates.length > 0) {
        console.log(
          `4. Remove ${dataQualityIssues.duplicates.length} duplicate route(s)`
        );
      }
    } else {
      console.log("NO ISSUES FOUND - Database is in excellent condition!");
    }

    console.log();
    console.log("=".repeat(80));
    console.log("AUDIT COMPLETE");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("AUDIT ERROR:", error.message);
    process.exit(1);
  }
}

audit();
