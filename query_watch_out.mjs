const supabaseUrl = "https://ofuofhojhbcrcahuotya.supabase.co";
const supabaseKey = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

function hasWatchOut(r) {
  if (!r.watch_out) return false;
  if (typeof r.watch_out === 'string') return r.watch_out.trim().length > 0;
  if (Array.isArray(r.watch_out)) return r.watch_out.length > 0;
  if (typeof r.watch_out === 'object') return Object.keys(r.watch_out).length > 0;
  return false;
}

function getWatchOutDisplay(r) {
  if (!r.watch_out) return "MISSING";
  if (typeof r.watch_out === 'string') return r.watch_out;
  if (Array.isArray(r.watch_out)) return r.watch_out.join(', ');
  if (typeof r.watch_out === 'object') return JSON.stringify(r.watch_out);
  return String(r.watch_out);
}

async function analyzeWatchOutData() {
  try {
    console.log("=== WASHINGTON ALPINE/MOUNTAINEERING ROUTES WATCH_OUT ANALYSIS ===\n");

    console.log("Fetching all routes with areas data...");
    
    const url = `${supabaseUrl}/rest/v1/routes?select=id,name,area_id,discipline,grade_system,grade_num,alpine_grade,ice_grade,commitment,watch_out,hazards,obj_haz,areas(name,region,area_type)`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    const allRoutes = await response.json();
    console.log(`Fetched ${allRoutes.length} total routes\n`);

    // Filter for Washington state routes
    const disciplines = ["alpine", "mountaineering", "mixed", "ice"];
    const routesByDiscipline = {};
    let totalRoutes = 0;

    // Filter WA routes
    const filteredRoutes = allRoutes.filter(r => {
      const region = r.areas?.region;
      return region === "Washington" || region === "WA" || (r.areas?.name && r.areas.name.includes("Washington"));
    });

    console.log(`Found ${filteredRoutes.length} WA routes across all disciplines\n`);

    // Organize by discipline
    disciplines.forEach(disc => {
      const discRoutes = filteredRoutes.filter(r => r.discipline === disc);
      
      let withWatchOut = 0;
      let withoutWatchOut = 0;

      discRoutes.forEach(r => {
        if (hasWatchOut(r)) {
          withWatchOut++;
        } else {
          withoutWatchOut++;
        }
      });

      routesByDiscipline[disc] = {
        total: discRoutes.length,
        withWatchOut: withWatchOut,
        withoutWatchOut: withoutWatchOut,
        routes: discRoutes
      };

      totalRoutes += discRoutes.length;
    });

    // ANALYSIS
    console.log("=== SUMMARY ===");
    console.log(`Total WA alpine/mountaineering routes: ${totalRoutes}`);
    
    const totalWithWatchOut = Object.values(routesByDiscipline).reduce((sum, d) => sum + d.withWatchOut, 0);
    const coverage = totalRoutes > 0 ? ((totalWithWatchOut / totalRoutes) * 100).toFixed(1) : 0;
    console.log(`Routes WITH watch_out: ${totalWithWatchOut} (${coverage}%)`);
    console.log(`Routes WITHOUT watch_out: ${totalRoutes - totalWithWatchOut}`);

    console.log("\n=== BY DISCIPLINE ===");
    Object.entries(routesByDiscipline).forEach(([disc, data]) => {
      const pct = data.total > 0 ? ((data.withWatchOut / data.total) * 100).toFixed(1) : 0;
      console.log(`${disc}: ${data.total} routes | with: ${data.withWatchOut} (${pct}%) | without: ${data.withoutWatchOut}`);
    });

    // High-grade routes without watch_out
    console.log("\n=== HIGH-GRADE ROUTES WITHOUT WATCH_OUT (POTENTIAL RISKS) ===");
    const highGradeRoutes = filteredRoutes.filter(r => {
      const hasData = hasWatchOut(r);
      const isHighGrade = 
        (r.alpine_grade && (r.alpine_grade === "IV" || r.alpine_grade === "V")) ||
        (r.ice_grade && (r.ice_grade === "AI3" || r.ice_grade === "AI4" || r.ice_grade === "AI4+")) ||
        (r.grade_num && r.grade_num >= 11);
      return !hasData && isHighGrade;
    }).sort((a, b) => (b.alpine_grade || "").localeCompare(a.alpine_grade || ""));

    console.log(`Found ${highGradeRoutes.length} high-grade routes without watch_out`);
    highGradeRoutes.slice(0, 15).forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name}`);
      console.log(`   Area: ${r.areas?.name || "N/A"}`);
      console.log(`   Alpine Grade: ${r.alpine_grade || "N/A"}, Ice Grade: ${r.ice_grade || "N/A"}, Grade Num: ${r.grade_num || "N/A"}`);
      if (r.hazards) console.log(`   Hazards: ${r.hazards}`);
    });

    // Routes with watch_out
    console.log("\n\n=== SAMPLE ROUTES WITH WATCH_OUT DATA (first 12) ===");
    const withWatchOutRoutes = filteredRoutes.filter(r => hasWatchOut(r)).slice(0, 12);
    console.log(`Showing ${withWatchOutRoutes.length} routes with watch_out`);
    withWatchOutRoutes.forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name}`);
      console.log(`   Area: ${r.areas?.name || "N/A"}`);
      console.log(`   Discipline: ${r.discipline || "N/A"}, Alpine: ${r.alpine_grade || "N/A"}, Ice: ${r.ice_grade || "N/A"}`);
      console.log(`   Watch_out: ${getWatchOutDisplay(r)}`);
    });

    // Check for glacier/crevasse routes
    console.log("\n\n=== GLACIER/CREVASSE ANALYSIS ===");
    const mountaineeringRoutes = routesByDiscipline.mountaineering?.routes || [];
    const noCrevasseWarning = mountaineeringRoutes.filter(r => {
      const watchOut = getWatchOutDisplay(r).toLowerCase();
      return !watchOut.includes("crevasse") && !watchOut.includes("glacier") && watchOut !== "missing";
    });

    console.log(`Mountaineering routes without explicit crevasse/glacier warning: ${noCrevasseWarning.length}`);
    noCrevasseWarning.slice(0, 10).forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name} (${r.areas?.name})`);
      console.log(`   Watch_out: ${getWatchOutDisplay(r)}`);
    });

    // High-risk peaks analysis
    console.log("\n\n=== HIGH-RISK PEAKS ANALYSIS ===");
    const riskPeaks = ["Mount Rainier", "Mount Adams", "Mount Baker", "Mount Shuksan", "Mount Stuart"];
    riskPeaks.forEach(peak => {
      const peakRoutes = filteredRoutes.filter(r => r.areas?.name && r.areas.name.includes(peak));
      const withWarning = peakRoutes.filter(r => hasWatchOut(r));
      const coverage = peakRoutes.length > 0 ? ((withWarning.length / peakRoutes.length) * 100).toFixed(1) : 0;
      console.log(`\n${peak}: ${peakRoutes.length} routes | ${withWarning.length} with watch_out (${coverage}%)`);
      
      // Show which routes are missing watch_out
      const missing = peakRoutes.filter(r => !hasWatchOut(r));
      if (missing.length > 0) {
        console.log(`  Missing watch_out (${missing.length}):`);
        missing.slice(0, 3).forEach(m => {
          console.log(`    - ${m.name} (${m.discipline}, ${m.alpine_grade || m.ice_grade || m.grade_num})`);
        });
      }
    });

  } catch (error) {
    console.error("Error:", error.message);
  }

  process.exit(0);
}

analyzeWatchOutData();
