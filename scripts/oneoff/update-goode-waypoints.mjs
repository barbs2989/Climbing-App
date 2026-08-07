#!/usr/bin/env node
// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node update-goode-waypoints.mjs
// The routes table only has a public-read RLS policy (see supabase/migrations/0001_areas_routes.sql) —
// writes need the service_role key, which bypasses RLS. Never hardcode it; pass via env only.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Error: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY (service_role secret)'); process.exit(1); }

const waypoints = [
  {type:"Trailhead", name:"Bridge Creek / Rainy Pass PCT Trailhead", lat:48.5049, lng:-120.7191, elev:4500, distMi:0,
   note:"Large paved parking area on SR-20 near Rainy Pass. Head south on the PCT — same trailhead used for Goode's Southwest Couloir route."},
  {type:"Junction", name:"PCT / North Fork Bridge Creek Trail junction", lat:48.487365, lng:-120.853537, elev:2800, distMi:10,
   note:"Leave the PCT here and turn onto the North Fork Bridge Creek Trail toward Goode's north side."},
  {type:"Hazard", name:"North Fork Bridge Creek ford", lat:48.486488, lng:-120.860258, elev:3000, distMi:10.5,
   note:"Ford of the North Fork can be thigh-deep and hazardous in high water; trail grows brushy and overgrown beyond here."},
  {type:"Campsite", name:"High camp near Goode Glacier toe", lat:48.4898, lng:-120.9003, elev:6600, distMi:15.5,
   note:"Established bivy sites on the lateral moraine with views of the glacier and buttress. Several documented tent spots cluster in this immediate area."},
  {type:"Hazard", name:"Goode Glacier moat / bergschrund crossing", lat:48.4898, lng:-120.9003, elev:6700, distMi:15.8,
   note:"Right at/just above high camp. Aim for the toe of the buttress (the 'red ledges'); a collapsed section of glacier ice usually bridges the moat, but it can require downclimbing or a short rappel and gets harder to cross later in the season."},
  {type:"Water", name:"Near-summit snow patch", lat:48.4829, lng:-120.9141, elev:9100, distMi:16.8,
   note:"Reliable snow-patch water source close to the summit in a typical season — treat/melt before drinking."},
  {type:"Summit", name:"Goode Mountain summit", lat:48.4829, lng:-120.9109, elev:9220, distMi:17,
   note:"Highest point in North Cascades National Park. Many parties bivy here before descending the next day."},
  {type:"Hazard", name:"Black Tooth Notch", lat:48.48, lng:-120.91, elev:8900, distMi:19,
   note:"Descent via the Southwest Couloir: several rappels down the ridge to this foot-wide notch (fixed sling marks the crux step), then continue down the couloir. Loose rock — same feature used on the Southwest Couloir route."}
];

async function main() {
  const res = await fetch(`${url}/rest/v1/routes?id=eq.wa_mount_goode_northeast_buttress`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ waypoints }),
  });
  if (!res.ok) { console.error('HTTP', res.status, await res.text()); process.exit(1); }
  const data = await res.json();
  console.log('Updated rows:', data.length);
  console.log('waypoints now:', JSON.stringify(data[0]?.waypoints, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
