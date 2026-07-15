const supabaseUrl = 'https://ofuofhojhbcrcahuotya.supabase.co';
const supabaseKey = 'sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5';

async function check() {
  console.log('=== MAJOR PEAKS IN DATABASE ===\n');

  try {
    // Get areas with significant route counts
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/areas?select=id,name,region,area_type,route_count&route_count=gt.3&region=eq.Washington&order=route_count.desc&limit=50`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    const areas = await resp.json();
    console.log(`Found ${areas.length} areas in Washington with 3+ routes:\n`);

    areas.forEach(a => {
      console.log(`${a.name}: ${a.route_count} routes (${a.area_type})`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
}

check();
