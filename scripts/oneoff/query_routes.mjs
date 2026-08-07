import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = "https://ofuofhojhbcrcahuotya.supabase.co";
const key = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

const skipIds = new Set([
  "wa_direct_north_buttress",
  "wa_concord_tower_north_face",
  "wa_south_face_center",
  "wa_north_ridge_3",
  "wa_cutthroat_peak_r1",
  "wa_direct_southwest_buttress",
  "wa_forbidden_peak_west_ridge",
  "wa_east_ridge_direct",
  "wa_forbidden_peak_north_ridge",
  "wa_ingalls_peak_south_ridge",
  "wa_east_ridge_4",
  "wa_north_face_3",
  "wa_mount_thomson_west_ridge",
  "wa_south_face_2",
  "wa_sherpa_peak_east_ridge",
  "wa_sherpa_peak_west_ridge",
  "wa_south_early_winter_spire_direct_east_buttress",
  "wa_south_twin_sister_west_ridge"
]);

async function queryRoutes() {
  try {
    console.error("Fetching WA alpine/mountaineering routes...");
    
    // Get all routes with pagination - filter to WA only by area_id prefix
    let allRoutes = [];
    let offset = 0;
    const limit = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from("routes")
        .select("id, name, area_id, discipline, grade, lat, lng, gain_ft, approach, access, road, waypoints")
        .in("discipline", ["alpine", "mountaineering"])
        .like("id", "wa_%")
        .order("id")
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error("Query error:", error.message);
        process.exit(1);
      }
      
      if (!data || data.length === 0) break;
      allRoutes = allRoutes.concat(data);
      if (data.length < limit) break;
      offset += limit;
    }
    
    console.error(`Total WA alpine/mountaineering routes: ${allRoutes.length}`);
    
    // Filter out skipped IDs
    const filtered = allRoutes.filter(r => !skipIds.has(r.id));
    
    console.error(`After filtering skipped IDs: ${filtered.length}\n`);
    
    console.log(`Routes 101-200 (offset 100, limit 100):`);
    console.log(`${'='.repeat(100)}\n`);
    
    const batch = filtered.slice(100, 200);
    batch.forEach((r, idx) => {
      const hasApproach = !!r.approach;
      const hasAccess = !!r.access;
      const hasRoad = !!r.road;
      const hasWaypoints = !!r.waypoints;
      const hasCoords = r.lat != null && r.lng != null;
      const needsResearch = !hasApproach || !hasAccess || !hasRoad;
      
      console.log(`${idx + 101}. ${r.name} (${r.id})`);
      console.log(`   Grade: ${r.grade || 'N/A'}, Discipline: ${r.discipline}`);
      if (hasCoords) {
        console.log(`   Coords: ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`);
      } else {
        console.log(`   Coords: MISSING`);
      }
      console.log(`   Approach: ${hasApproach ? 'YES' : 'MISSING'} | Access: ${hasAccess ? 'YES' : 'MISSING'} | Road: ${hasRoad ? 'YES' : 'MISSING'} | Waypoints: ${hasWaypoints ? 'YES' : 'MISSING'}`);
      if (needsResearch) {
        console.log(`   ** NEEDS RESEARCH **`);
      }
      console.log();
    });
    
    // Save batch to JSON for research
    const batchData = batch.map((r, idx) => ({
      number: idx + 101,
      id: r.id,
      name: r.name,
      grade: r.grade,
      discipline: r.discipline,
      lat: r.lat,
      lng: r.lng,
      gain_ft: r.gain_ft,
      hasApproach: !!r.approach,
      hasAccess: !!r.access,
      hasRoad: !!r.road,
      hasWaypoints: !!r.waypoints
    }));
    
    console.error("\nJSON data saved for research:");
    console.log(JSON.stringify(batchData, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

queryRoutes();
