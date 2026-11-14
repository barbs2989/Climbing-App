import "../lib/load-env.mjs";
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function queryIceRoutes() {
  console.log("=== QUERYING ICE ROUTES ===\n");
  
  try {
    // Query all ice routes with minimal fields first
    const iceResp = await fetch(
      `${supabaseUrl}/rest/v1/routes?select=id,name,area_id,discipline,ice_grade,watch_out,hazards&discipline=eq.ice&limit=200`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );
    
    if (iceResp.ok) {
      const routes = await iceResp.json();
      console.log(`Total ice routes: ${routes.length}\n`);
      
      const withWatchOut = routes.filter(r => r.watch_out);
      const withoutWatchOut = routes.filter(r => !r.watch_out);
      
      console.log(`With watch_out: ${withWatchOut.length}`);
      console.log(`WITHOUT watch_out: ${withoutWatchOut.length}\n`);
      
      console.log("=== SAMPLE ICE ROUTES (first 10) ===");
      routes.slice(0, 10).forEach((r, i) => {
        console.log(`${i+1}. ${r.name}`);
        console.log(`   Grade: ${r.ice_grade}, Watch_out: ${r.watch_out ? 'YES' : 'NO'}`);
        if (r.hazards) console.log(`   Hazards: ${r.hazards}`);
      });
    } else {
      console.error("Error:", iceResp.status, iceResp.statusText);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
  
  process.exit(0);
}

queryIceRoutes();
