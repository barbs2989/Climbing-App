const supabaseUrl = "https://ofuofhojhbcrcahuotya.supabase.co";
const supabaseKey = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

async function debugData() {
  try {
    console.log("=== DEBUG: Checking available regions and route counts ===\n");

    // First, let's check what regions exist
    console.log("Fetching areas by region...");
    
    const areaUrl = `${supabaseUrl}/rest/v1/areas?select=region,count(id)&groupBy=region&limit=100`;
    
    const areaResponse = await fetch(areaUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });

    if (areaResponse.ok) {
      const areaData = await areaResponse.json();
      console.log("Regions found:", areaData);
    } else {
      console.log("Area grouping query failed, trying direct approach...");
      
      // Get unique regions manually
      const areasUrl = `${supabaseUrl}/rest/v1/areas?select=region&limit=1000`;
      const areasResp = await fetch(areasUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });
      
      if (areasResp.ok) {
        const areas = await areasResp.json();
        const regions = [...new Set(areas.map(a => a.region).filter(Boolean))];
        console.log(`Found ${regions.length} unique regions:`, regions.slice(0, 20));
        console.log("Full region list:", regions);
      }
    }

    // Check route disciplines
    console.log("\n\nFetching sample routes to check discipline values...");
    
    const routeUrl = `${supabaseUrl}/rest/v1/routes?select=id,name,discipline,areas(region)&limit=50`;
    
    const routeResponse = await fetch(routeUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });

    if (routeResponse.ok) {
      const routes = await routeResponse.json();
      console.log(`Sample routes (first 50):`);
      routes.slice(0, 10).forEach(r => {
        console.log(`  - ${r.name} (${r.discipline}) in region: ${r.areas?.region}`);
      });
      
      const disciplines = [...new Set(routes.map(r => r.discipline))];
      console.log(`\nUnique disciplines found:`, disciplines);
    }

    // Check WA routes specifically
    console.log("\n\nChecking Washington routes...");
    
    // Try different variations
    const variations = [
      "eq.Washington",
      "eq.WA",
      "ilike.Washington",
      "ilike.%Washington%"
    ];

    for (const filter of variations) {
      const testUrl = `${supabaseUrl}/rest/v1/areas?select=id,name,region&region=${filter}&limit=10`;
      const testResp = await fetch(testUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });
      
      if (testResp.ok) {
        const data = await testResp.json();
        console.log(`Filter '${filter}': found ${data.length} areas`);
        if (data.length > 0) {
          console.log(`  Sample: ${data[0].name} (region: ${data[0].region})`);
        }
      }
    }

    // Get Washington state area ID
    console.log("\n\nFinding Washington state area...");
    const waStateUrl = `${supabaseUrl}/rest/v1/areas?select=id,name,area_type,region&name=ilike.*Washington*&area_type=eq.state`;
    
    const waResp = await fetch(waStateUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }
    });

    if (waResp.ok) {
      const wa = await waResp.json();
      console.log(`Found ${wa.length} state-level Washington areas:`, wa.map(a => ({ id: a.id, name: a.name, type: a.area_type })));
    }

  } catch (error) {
    console.error("Error:", error.message);
  }

  process.exit(0);
}

debugData();
