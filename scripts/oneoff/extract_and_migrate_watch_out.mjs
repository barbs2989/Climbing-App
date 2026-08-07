const supabaseUrl = "https://ofuofhojhbcrcahuotya.supabase.co";
const supabaseKey = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

// Convert existing hazards text[] into watch_out array
function extractWatchOutFromHazards(hazardsArray) {
  if (!hazardsArray || !Array.isArray(hazardsArray)) return [];
  
  // Split long hazard entries on commas to create more granular warnings
  return hazardsArray.flatMap(h => {
    const trimmed = h.trim();
    // Keep multi-clause hazards together if separated by em-dash or semicolon
    if (trimmed.includes('—') && trimmed.length < 200) {
      return trimmed; // Keep as single entry if readable
    }
    // Split on common delimiters
    return trimmed.split(/[,;]\s+/).filter(s => s.length > 10);
  });
}

async function analyzeMissingWatchOut() {
  console.log("=== ANALYZING ICE ROUTES FOR WATCH_OUT MIGRATION ===\n");
  
  try {
    // Get all ice routes with hazards
    const iceResp = await fetch(
      `${supabaseUrl}/rest/v1/routes?select=id,name,area_id,ice_grade,watch_out,hazards,commitment&discipline=eq.ice&limit=200`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );
    
    if (!iceResp.ok) throw new Error(`API error: ${iceResp.status}`);
    
    const routes = await iceResp.json();
    
    const candidates = routes.filter(r => r.hazards && r.hazards.length > 0 && !r.watch_out);
    
    console.log(`Total ice routes: ${routes.length}`);
    console.log(`With existing hazards: ${routes.filter(r => r.hazards).length}`);
    console.log(`Candidates for watch_out migration: ${candidates.length}\n`);
    
    // Generate migration data
    console.log("=== MIGRATION DATA (first 20 routes) ===\n");
    
    const migrationData = candidates.slice(0, 20).map(r => {
      const watchOut = extractWatchOutFromHazards(r.hazards);
      return {
        id: r.id,
        name: r.name,
        ice_grade: r.ice_grade,
        watch_out: watchOut,
        source_hazards: r.hazards
      };
    });
    
    // Output as JSON for import
    console.log("JSON for import to Supabase:");
    console.log(JSON.stringify(migrationData.map(m => ({
      id: m.id,
      watch_out: m.watch_out
    })), null, 2));
    
    // Generate SQL
    console.log("\n\n=== SQL UPDATES ===\n");
    migrationData.forEach(m => {
      const watchOutJson = JSON.stringify(m.watch_out);
      console.log(`UPDATE routes SET watch_out = '${watchOutJson}'::jsonb WHERE id = '${m.id}';`);
    });
    
  } catch (e) {
    console.error("Error:", e.message);
  }
  
  process.exit(0);
}

analyzeMissingWatchOut();
