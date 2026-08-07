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
    console.log("=== COMPREHENSIVE WATCH_OUT ANALYSIS FOR WA ALPINE/MOUNTAINEERING ROUTES ===\n");

    // Get all areas in WA to understand the hierarchy
    console.log("Step 1: Identifying WA alpine/mountaineering areas...");
    
    const waAreas = ["Alpine Lakes", "North Cascades / Stehekin", "Olympic Mountains", 
                     "Mountain Loop Highway", "Washington Pass", "North Cascades Core", 
                     "Pasayten Wilderness/Hozomeen", "Goat Rocks / Tatoosh", "Glacier Peak Wilderness",
                     "Entiat Mountains", "Pasayten/Okanogan"];
    
    console.log(`Found ${waAreas.length} WA alpine/mountaineering areas`);

    // Get all routes in these areas
    console.log("\nStep 2: Fetching all routes in WA alpine/mountaineering areas...");
    
    let allWaRoutes = [];
    let totalChecked = 0;

    for (const area of waAreas) {
      const url = `${supabaseUrl}/rest/v1/routes?select=id,name,area_id,discipline,grade_system,grade_num,alpine_grade,ice_grade,commitment,watch_out,hazards,obj_haz,areas(id,name,region)&areas.region=eq.${encodeURIComponent(area)}&limit=1000`;
      
      try {
        const response = await fetch(url, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        });

        if (response.ok) {
          const routes = await response.json();
          console.log(`  ${area}: ${routes.length} routes`);
          allWaRoutes = allWaRoutes.concat(routes);
          totalChecked += routes.length;
        }
      } catch (e) {
        console.error(`  Error fetching ${area}:`, e.message);
      }
    }

    // Remove duplicates by ID
    const seen = new Set();
    allWaRoutes = allWaRoutes.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    console.log(`\nTotal unique routes fetched: ${allWaRoutes.length}`);

    // Check disciplines present
    const disciplinesSet = new Set(allWaRoutes.map(r => r.discipline));
    console.log(`Disciplines found: ${Array.from(disciplinesSet).join(', ')}`);

    // ANALYSIS
    console.log("\n=== SUMMARY ===");
    console.log(`Total WA alpine/mountaineering routes: ${allWaRoutes.length}`);
    
    const withWatchOut = allWaRoutes.filter(r => hasWatchOut(r));
    const coverage = allWaRoutes.length > 0 ? ((withWatchOut.length / allWaRoutes.length) * 100).toFixed(1) : 0;
    console.log(`Routes WITH watch_out: ${withWatchOut.length} (${coverage}%)`);
    console.log(`Routes WITHOUT watch_out: ${allWaRoutes.length - withWatchOut.length}`);

    // By discipline
    console.log("\n=== BY DISCIPLINE ===");
    Array.from(disciplinesSet).sort().forEach(disc => {
      const discRoutes = allWaRoutes.filter(r => r.discipline === disc);
      const discWithWatchOut = discRoutes.filter(r => hasWatchOut(r));
      const pct = discRoutes.length > 0 ? ((discWithWatchOut.length / discRoutes.length) * 100).toFixed(1) : 0;
      console.log(`${disc}: ${discRoutes.length} routes | with: ${discWithWatchOut.length} (${pct}%) | without: ${discRoutes.length - discWithWatchOut.length}`);
    });

    // High-grade routes without watch_out
    console.log("\n=== HIGH-GRADE ROUTES WITHOUT WATCH_OUT (potential risks) ===");
    const highGradeRoutes = allWaRoutes.filter(r => {
      const hasData = hasWatchOut(r);
      const isHighGrade = 
        (r.alpine_grade && (r.alpine_grade.includes("IV") || r.alpine_grade.includes("V") || r.alpine_grade.includes("AD") || r.alpine_grade.includes("D"))) ||
        (r.ice_grade && (r.ice_grade.includes("AI3") || r.ice_grade.includes("AI4") || r.ice_grade.includes("AI5"))) ||
        (r.grade_num && r.grade_num >= 11);
      return !hasData && isHighGrade;
    }).sort((a, b) => (b.alpine_grade || b.ice_grade || "").localeCompare(a.alpine_grade || a.ice_grade || ""));

    console.log(`Found ${highGradeRoutes.length} high-grade routes without watch_out`);
    highGradeRoutes.slice(0, 15).forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name}`);
      console.log(`   Area: ${r.areas?.name || "N/A"}`);
      console.log(`   Discipline: ${r.discipline}`);
      console.log(`   Alpine Grade: ${r.alpine_grade || "N/A"}, Ice Grade: ${r.ice_grade || "N/A"}, Grade: ${r.grade_num || "N/A"}`);
      if (r.hazards) console.log(`   Hazards field: ${r.hazards}`);
    });

    // Routes with watch_out
    console.log("\n\n=== ROUTES WITH WATCH_OUT DATA (first 12) ===");
    const withWatchOutRoutes = withWatchOut.slice(0, 12);
    console.log(`Showing ${withWatchOutRoutes.length} routes with watch_out`);
    withWatchOutRoutes.forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name}`);
      console.log(`   Area: ${r.areas?.name || "N/A"}`);
      console.log(`   Discipline: ${r.discipline}, Alpine: ${r.alpine_grade || "N/A"}, Ice: ${r.ice_grade || "N/A"}`);
      console.log(`   Watch_out: "${getWatchOutDisplay(r)}"`);
    });

    // Alpine/mountaineering specific analysis
    console.log("\n\n=== ALPINE ROUTES ANALYSIS ===");
    const alpineRoutes = allWaRoutes.filter(r => r.alpine_grade);
    console.log(`Total alpine routes: ${alpineRoutes.length}`);
    const alpineWithWatchOut = alpineRoutes.filter(r => hasWatchOut(r));
    const alpineCoverage = alpineRoutes.length > 0 ? ((alpineWithWatchOut.length / alpineRoutes.length) * 100).toFixed(1) : 0;
    console.log(`Alpine routes with watch_out: ${alpineWithWatchOut.length} (${alpineCoverage}%)`);

    const alpineGrades = {};
    alpineRoutes.forEach(r => {
      const grade = r.alpine_grade || "unknown";
      if (!alpineGrades[grade]) alpineGrades[grade] = { total: 0, withWatchOut: 0 };
      alpineGrades[grade].total++;
      if (hasWatchOut(r)) alpineGrades[grade].withWatchOut++;
    });

    console.log("\nAlpine routes by grade:");
    Object.keys(alpineGrades).sort().forEach(grade => {
      const data = alpineGrades[grade];
      const pct = data.total > 0 ? ((data.withWatchOut / data.total) * 100).toFixed(1) : 0;
      console.log(`  ${grade}: ${data.total} routes (${data.withWatchOut} with watch_out - ${pct}%)`);
    });

    // Top peaks analysis
    console.log("\n\n=== HIGH-RISK PEAKS ANALYSIS ===");
    const riskPeaks = ["Mount Rainier", "Mount Adams", "Mount Baker", "Mount Shuksan", "Mount Stuart", "Cascade Pass"];
    riskPeaks.forEach(peak => {
      const peakRoutes = allWaRoutes.filter(r => r.areas?.name && r.areas.name.includes(peak));
      if (peakRoutes.length > 0) {
        const withWarning = peakRoutes.filter(r => hasWatchOut(r));
        const coverage = ((withWarning.length / peakRoutes.length) * 100).toFixed(1);
        console.log(`\n${peak}: ${peakRoutes.length} routes | ${withWarning.length} with watch_out (${coverage}%)`);
        
        const missing = peakRoutes.filter(r => !hasWatchOut(r));
        if (missing.length > 0) {
          console.log(`  Missing watch_out (${missing.length}):`);
          missing.forEach(m => {
            console.log(`    - ${m.name} (${m.discipline}, ${m.alpine_grade || m.ice_grade || m.grade_num})`);
          });
        }
      }
    });

    // Hazard analysis
    console.log("\n\n=== HAZARD FIELD ANALYSIS ===");
    const withHazards = allWaRoutes.filter(r => r.hazards);
    const withObjHaz = allWaRoutes.filter(r => r.obj_haz);
    console.log(`Routes with 'hazards' field populated: ${withHazards.length}`);
    console.log(`Routes with 'obj_haz' field populated: ${withObjHaz.length}`);
    
    if (withHazards.length > 0) {
      console.log("\nSample hazard entries:");
      withHazards.slice(0, 5).forEach((r, idx) => {
        console.log(`  ${idx + 1}. ${r.name}: ${r.hazards}`);
      });
    }

  } catch (error) {
    console.error("Error:", error.message);
  }

  process.exit(0);
}

analyzeWatchOutData();
