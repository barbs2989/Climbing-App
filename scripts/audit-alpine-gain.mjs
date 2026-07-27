import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ofuofhojhbcrcahuotya.supabase.co",
  "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5"
);

async function auditAlpineGain() {
  console.log("Fetching all WA alpine routes with elevation gain data...\n");

  // Get all routes with discipline containing 'alpine' or 'mountaineering'
  const { data: routes, error } = await supabase
    .from("routes")
    .select("id,name,discipline,gain_ft,high_point_ft,areas(id,name,state)")
    .filter("discipline", "in", '("alpine","mountaineering")')
    .order("gain_ft", { ascending: false });

  if (error) {
    console.error("Error fetching routes:", error);
    return;
  }

  console.log(`Found ${routes.length} alpine/mountaineering routes\n`);

  // Filter to WA only
  const waRoutes = routes.filter(r => r.areas && r.areas.state === "Washington");
  console.log(`${waRoutes.length} WA alpine routes:\n`);

  // Group by issue patterns
  const issues = [];
  waRoutes.forEach(r => {
    if (r.gain_ft) {
      console.log(`${r.name}`);
      console.log(`  Discipline: ${r.discipline}`);
      console.log(`  Gain: ${r.gain_ft} ft, High point: ${r.high_point_ft || "N/A"} ft`);

      // Check for obvious issues
      if (r.high_point_ft && r.gain_ft) {
        const ratio = r.gain_ft / r.high_point_ft;
        if (ratio > 1.5 || ratio < 0.1) {
          issues.push({
            route: r.name,
            gain: r.gain_ft,
            highPoint: r.high_point_ft,
            ratio: ratio.toFixed(2),
            issue: ratio > 1.5 ? "gain suspiciously high" : "gain suspiciously low"
          });
        }
      }
      console.log();
    }
  });

  if (issues.length > 0) {
    console.log("\n⚠️ POTENTIAL ISSUES:");
    issues.forEach(i => {
      console.log(
        `  ${i.route}: gain=${i.gain} ft, high_point=${i.highPoint} ft (ratio=${i.ratio}) - ${i.issue}`
      );
    });
  } else {
    console.log("\n✓ No obvious elevation gain issues found");
  }
}

auditAlpineGain().catch(console.error);
