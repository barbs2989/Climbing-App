const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://ofuofhojhbcrcahuotya.supabase.co";
const supabaseKey = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeWatchOutData() {
  try {
    console.log("=== WASHINGTON ALPINE/MOUNTAINEERING ROUTES WATCH_OUT ANALYSIS ===\n");

    // Query alpine and mountaineering routes
    const disciplines = ["alpine", "mountaineering", "mixed", "ice"];
    const routesByDiscipline = {};
    let totalRoutes = 0;
    const allRoutes = [];

    for (const disc of disciplines) {
      console.log(`Fetching ${disc} routes...`);
      
      const { data: routes, error: routeError } = await supabase
        .from("routes")
        .select("id, name, area_id, discipline, grade_system, grade_num, alpine_grade, ice_grade, commitment, watch_out, hazards, obj_haz, areas(name, region, area_type)")
        .eq("discipline", disc);
      
      if (routeError) {
        console.error(`Error fetching ${disc} routes:`, routeError);
        continue;
      }

      if (!routes) routes = [];
      
      // Filter for Washington state routes
      const waRoutes = routes.filter(r => {
        const region = r.areas?.region;
        return region === "Washington" || region === "WA" || (r.areas?.name && r.areas.name.includes("Washington"));
      });

      routesByDiscipline[disc] = {
        total: waRoutes.length,
        withWatchOut: 0,
        withoutWatchOut: 0,
        routes: waRoutes
      };

      waRoutes.forEach(r => {
        if (r.watch_out && r.watch_out.trim()) {
          routesByDiscipline[disc].withWatchOut++;
        } else {
          routesByDiscipline[disc].withoutWatchOut++;
        }
        allRoutes.push(r);
        totalRoutes++;
      });

      console.log(`  Found ${waRoutes.length} ${disc} routes`);
    }

    // ANALYSIS
    console.log("\n=== SUMMARY ===");
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
    console.log("\n=== HIGH-GRADE ROUTES WITHOUT WATCH_OUT ===");
    const highGradeRoutes = allRoutes.filter(r => {
      const hasWatchOut = r.watch_out && r.watch_out.trim();
      const isHighGrade = 
        (r.alpine_grade && (r.alpine_grade === "IV" || r.alpine_grade === "V")) ||
        (r.ice_grade && (r.ice_grade === "AI3" || r.ice_grade === "AI4" || r.ice_grade === "AI4+")) ||
        (r.grade_num && r.grade_num >= 11);
      return !hasWatchOut && isHighGrade;
    });

    console.log(`Found ${highGradeRoutes.length} high-grade routes without watch_out`);
    highGradeRoutes.slice(0, 15).forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name}`);
      console.log(`   Area: ${r.areas?.name || "N/A"}`);
      console.log(`   Alpine Grade: ${r.alpine_grade || "N/A"}, Ice Grade: ${r.ice_grade || "N/A"}, Grade Num: ${r.grade_num || "N/A"}`);
      console.log(`   Watch_out: "${r.watch_out || "MISSING"}"`);
      if (r.hazards) console.log(`   Hazards: ${r.hazards}`);
    });

    // Routes with watch_out
    console.log("\n\n=== SAMPLE ROUTES WITH WATCH_OUT DATA (first 12) ===");
    const withWatchOut = allRoutes.filter(r => r.watch_out && r.watch_out.trim()).slice(0, 12);
    console.log(`Showing ${withWatchOut.length} routes with watch_out`);
    withWatchOut.forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name}`);
      console.log(`   Area: ${r.areas?.name || "N/A"}`);
      console.log(`   Discipline: ${r.discipline || "N/A"}, Alpine: ${r.alpine_grade || "N/A"}, Ice: ${r.ice_grade || "N/A"}`);
      console.log(`   Watch_out: "${r.watch_out}"`);
    });

    // Check for glacier/crevasse routes
    console.log("\n\n=== GLACIER/CREVASSE ANALYSIS ===");
    const mountaineeringRoutes = routesByDiscipline.mountaineering?.routes || [];
    const noCrevasseWarning = mountaineeringRoutes.filter(r => {
      const watchOut = (r.watch_out || "").toLowerCase();
      return !watchOut.includes("crevasse") && !watchOut.includes("glacier");
    });

    console.log(`Mountaineering routes without crevasse/glacier warning: ${noCrevasseWarning.length}`);
    noCrevasseWarning.slice(0, 10).forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.name} (${r.areas?.name})`);
      console.log(`   Watch_out: "${r.watch_out || "MISSING"}"`);
    });

    // High-risk peaks analysis
    console.log("\n\n=== HIGH-RISK PEAKS ANALYSIS ===");
    const riskPeaks = ["Mount Rainier", "Mount Adams", "Mount Baker", "Mount Shuksan", "Mount Stuart"];
    riskPeaks.forEach(peak => {
      const peakRoutes = allRoutes.filter(r => r.areas?.name && r.areas.name.includes(peak));
      const withWarning = peakRoutes.filter(r => r.watch_out && r.watch_out.trim());
      const coverage = peakRoutes.length > 0 ? ((withWarning.length / peakRoutes.length) * 100).toFixed(1) : 0;
      console.log(`\n${peak}: ${peakRoutes.length} routes | ${withWarning.length} with watch_out (${coverage}%)`);
    });

  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

analyzeWatchOutData();
