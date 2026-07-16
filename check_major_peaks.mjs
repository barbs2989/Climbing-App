const supabaseUrl = "https://ofuofhojhbcrcahuotya.supabase.co";
const supabaseKey = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

async function checkMajorPeaks() {
  const peaks = ["Mount Rainier", "Mount Adams", "Mount Baker", "Mount Shuksan", "Mount Stuart", "Glacier Peak"];
  
  for (const peak of peaks) {
    console.log(`\n=== ${peak} ===`);
    
    try {
      // Search for areas containing the peak name
      const areaResp = await fetch(
        `${supabaseUrl}/rest/v1/areas?select=id,name,region,area_type&name=ilike.%${peak}%&limit=50`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );
      
      if (areaResp.ok) {
        const areas = await areaResp.json();
        console.log(`Areas found: ${areas.length}`);
        
        for (const area of areas) {
          console.log(`  - ${area.name} (${area.area_type}, ${area.region})`);
          
          // Get routes in this area
          const routeResp = await fetch(
            `${supabaseUrl}/rest/v1/routes?select=id,name,discipline,grade,grade_num,alpine_grade,ice_grade,watch_out&area_id=eq.${area.id}&limit=100`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              }
            }
          );
          
          if (routeResp.ok) {
            const routes = await routeResp.json();
            console.log(`    Routes: ${routes.length}`);
            routes.slice(0, 5).forEach(r => {
              const watchOut = r.watch_out ? "HAS" : "MISSING";
              console.log(`      - ${r.name} [${r.discipline}/${r.grade}] ${watchOut} watch_out`);
            });
            if (routes.length > 5) {
              console.log(`      ... and ${routes.length - 5} more`);
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
  
  process.exit(0);
}

checkMajorPeaks();
