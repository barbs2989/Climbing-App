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

    // Get route count for each WA area
    console.log("Step 1: Identifying WA alpine/mountaineering areas and route counts...");
    
    const waAreas = ["Alpine Lakes", "North Cascades / Stehekin", "Olympic Mountains", 
                     "Mountain Loop Highway", "Washington Pass", "North Cascades Core", 
                     "Pasayten Wilderness/Hozomeen", "Goat Rocks / Tatoosh", "Glacier Peak Wilderness",
                     "Entiat Mountains", "Pasayten/Okanogan"];
    
    // Get total count via count query
    const countUrl = `${supabaseUrl}/rest/v1/routes?select=count()&limit=1`;
    const countResponse = await fetch(countUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });
    
    let totalRoutes = 0;
    if (countResponse.ok) {
      const countData = await countResponse.json();
      totalRoutes = countData.length > 0 ? countData[0].count : 0;
      console.log(`Total routes in database: ${totalRoutes}\n`);
    }

    // Get routes with specific focus on alpine/mountaineering
    console.log("Step 2: Fetching alpine and mountaineering routes from all WA areas...");
    
    let alpineRoutes = [];
    let mountaineeringRoutes = [];
    let iceRoutes = [];
    let allHighGradeWaRoutes = [];

    // Query alpine routes specifically
    const alpineUrl = `${supabaseUrl}/rest/v1/routes?select=id,name,area_id,discipline,grade_system,grade_num,alpine_grade,ice_grade,commitment,watch_out,hazards,obj_haz,areas(name,region)&discipline=eq.alpine&areas.region=in.("${waAreas.join('","')}")&limit=1000`;
    
    try {
      const alpResp = await fetch(alpineUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });
      if (alpResp.ok) {
        alpineRoutes = await alpResp.json();
        console.log(`  Alpine discipline routes: ${alpineRoutes.length}`);
      }
    } catch (e) {
      console.error(`  Error fetching alpine routes:`, e.message);
    }

    // Query ice routes
    const iceUrl = `${supabaseUrl}/rest/v1/routes?select=id,name,area_id,discipline,grade_system,grade_num,alpine_grade,ice_grade,commitment,watch_out,hazards,obj_haz,areas(name,region)&discipline=eq.ice&areas.region=in.("${waAreas.join('","')}")&limit=1000`;
    
    try {
      const iceResp = await fetch(iceUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });
      if (iceResp.ok) {
        iceRoutes = await iceResp.json();
        console.log(`  Ice discipline routes: ${iceRoutes.length}`);
      }
    } catch (e) {
      console.error(`  Error fetching ice routes:`, e.message);
    }

    // Query high-grade rock routes in alpine areas (potential alpine scrambles/mixed)
    const highGradeUrl = `${supabaseUrl}/rest/v1/routes?select=id,name,area_id,discipline,grade_system,grade_num,alpine_grade,ice_grade,commitment,watch_out,hazards,obj_haz,areas(name,region)&areas.region=in.("${waAreas.join('","')}")&grade_num=gte.9&limit=1000`;
    
    try {
      const hgResp = await fetch(highGradeUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });
      if (hgResp.ok) {
        allHighGradeWaRoutes = await hgResp.json();
        console.log(`  High-grade rock routes in WA alpine areas: ${allHighGradeWaRoutes.length}`);
      }
    } catch (e) {
      console.error(`  Error fetching high-grade routes:`, e.message);
    }

    // Combine all relevant routes
    const allRelevantRoutes = [];
    const seen = new Set();
    
    [alpineRoutes, iceRoutes, allHighGradeWaRoutes].forEach(arr => {
      arr.forEach(r => {
        if (!seen.has(r.id)) {
          allRelevantRoutes.push(r);
          seen.add(r.id);
        }
      });
    });

    console.log(`\nTotal relevant routes: ${allRelevantRoutes.length}`);

    // ANALYSIS
    console.log("\n=== SUMMARY ===");
    console.log(`Total alpine/mountaineering routes analyzed: ${allRelevantRoutes.length}`);
    
    const withWatchOut = allRelevantRoutes.filter(r => hasWatchOut(r));
    const coverage = allRelevantRoutes.length > 0 ? ((withWatchOut.length / allRelevantRoutes.length) * 100).toFixed(1) : 0;
    console.log(`Routes WITH watch_out: ${withWatchOut.length} (${coverage}%)`);
    console.log(`Routes WITHOUT watch_out: ${allRelevantRoutes.length - withWatchOut.length}`);

    // By discipline
    console.log("\n=== BY DISCIPLINE ===");
    const disciplines = {};
    allRelevantRoutes.forEach(r => {
      const d = r.discipline || "unknown";
      if (!disciplines[d]) disciplines[d] = { total: 0, withWatchOut: 0, routes: [] };
      disciplines[d].total++;
      if (hasWatchOut(r)) disciplines[d].withWatchOut++;
      disciplines[d].routes.push(r);
    });

    Object.keys(disciplines).sort().forEach(disc => {
      const data = disciplines[disc];
      const pct = data.total > 0 ? ((data.withWatchOut / data.total) * 100).toFixed(1) : 0;
      console.log(`${disc}: ${data.total} routes | with: ${data.withWatchOut} (${pct}%) | without: ${data.total - data.withWatchOut}`);
    });

    // Routes WITH watch_out (samples)
    console.log("\n\n=== SAMPLE ROUTES WITH WATCH_OUT DATA (10-15) ===");
    const samples = withWatchOut.slice(0, 15);
    console.log(`Showing ${samples.length} routes with watch_out`);
    samples.forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name}`);
      console.log(`   Area: ${r.areas?.name || "N/A"}, Region: ${r.areas?.region || "N/A"}`);
      console.log(`   Discipline: ${r.discipline}, Alpine: ${r.alpine_grade || "N/A"}, Ice: ${r.ice_grade || "N/A"}, Grade: ${r.grade_num || "N/A"}`);
      const display = getWatchOutDisplay(r);
      if (display.length > 150) {
        console.log(`   Watch_out: "${display.substring(0, 150)}..."`);
      } else {
        console.log(`   Watch_out: "${display}"`);
      }
    });

    // High-grade routes WITHOUT watch_out (samples)
    console.log("\n\n=== HIGH-GRADE ROUTES WITHOUT WATCH_OUT (10-15) ===");
    const highGradeNoWatchOut = allRelevantRoutes.filter(r => {
      const hasData = hasWatchOut(r);
      const isHighGrade = 
        (r.alpine_grade && (r.alpine_grade.includes("IV") || r.alpine_grade.includes("V") || r.alpine_grade.includes("AD") || r.alpine_grade.includes("D"))) ||
        (r.ice_grade && (r.ice_grade.includes("AI3") || r.ice_grade.includes("AI4"))) ||
        (r.grade_num && r.grade_num >= 11);
      return !hasData && isHighGrade;
    }).sort((a, b) => (b.grade_num || 0) - (a.grade_num || 0));

    console.log(`Found ${highGradeNoWatchOut.length} high-grade routes without watch_out`);
    highGradeNoWatchOut.slice(0, 15).forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name}`);
      console.log(`   Area: ${r.areas?.name || "N/A"}`);
      console.log(`   Discipline: ${r.discipline}, Alpine: ${r.alpine_grade || "N/A"}, Ice: ${r.ice_grade || "N/A"}, Grade: ${r.grade_num || "N/A"}`);
      if (r.hazards) console.log(`   Hazards field: ${r.hazards}`);
    });

    // Alpine-specific analysis
    console.log("\n\n=== ALPINE DISCIPLINE ANALYSIS ===");
    if (alpineRoutes.length > 0) {
      const alpWithWatchOut = alpineRoutes.filter(r => hasWatchOut(r));
      const alpCoverage = ((alpWithWatchOut.length / alpineRoutes.length) * 100).toFixed(1);
      console.log(`Alpine discipline routes: ${alpineRoutes.length}`);
      console.log(`  With watch_out: ${alpWithWatchOut.length} (${alpCoverage}%)`);
      console.log(`  WITHOUT watch_out: ${alpineRoutes.length - alpWithWatchOut.length}`);
      
      console.log(`\n  Alpine routes without watch_out:`);
      alpineRoutes.filter(r => !hasWatchOut(r)).forEach(r => {
        console.log(`    - ${r.name} (${r.alpine_grade}) - Hazards: ${r.hazards || "NONE"}`);
      });
    }

    // Ice-specific analysis
    console.log("\n\n=== ICE DISCIPLINE ANALYSIS ===");
    if (iceRoutes.length > 0) {
      const iceWithWatchOut = iceRoutes.filter(r => hasWatchOut(r));
      const iceCoverage = ((iceWithWatchOut.length / iceRoutes.length) * 100).toFixed(1);
      console.log(`Ice discipline routes: ${iceRoutes.length}`);
      console.log(`  With watch_out: ${iceWithWatchOut.length} (${iceCoverage}%)`);
      console.log(`  WITHOUT watch_out: ${iceRoutes.length - iceWithWatchOut.length}`);
      
      console.log(`\n  Ice routes details:`);
      iceRoutes.forEach(r => {
        console.log(`    - ${r.name} (${r.ice_grade}) - Watch_out: ${hasWatchOut(r) ? "YES" : "NO"}`);
      });
    }

    // Specific peak analysis
    console.log("\n\n=== KEY WA PEAKS ANALYSIS ===");
    const keyPeaks = ["Dragontail", "Le Conte", "Mount Maude", "Mount Rainier", "Mount Adams", "Mount Baker", "Mount Shuksan", "Mount Stuart", "Glacier Peak", "Mount Olympus"];
    keyPeaks.forEach(peak => {
      const peakRoutes = allRelevantRoutes.filter(r => r.areas?.name && r.areas.name.includes(peak));
      if (peakRoutes.length > 0) {
        const withWarning = peakRoutes.filter(r => hasWatchOut(r));
        const coverage = ((withWarning.length / peakRoutes.length) * 100).toFixed(1);
        console.log(`\n${peak}: ${peakRoutes.length} routes (${withWarning.length} with watch_out - ${coverage}%)`);
        
        peakRoutes.forEach(r => {
          const status = hasWatchOut(r) ? "HAS" : "MISSING";
          console.log(`  - ${r.name} [${r.discipline}] ${status} watch_out`);
        });
      }
    });

  } catch (error) {
    console.error("Error:", error.message);
  }

  process.exit(0);
}

analyzeWatchOutData();
