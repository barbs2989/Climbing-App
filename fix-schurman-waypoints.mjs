#!/usr/bin/env node
// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node fix-schurman-waypoints.mjs
// Fixes Camp Schurman's coordinates on the Rainier Emmons-Winthrop route — the stored
// value (46.8721,-121.7099) was ~3mi off the real saddle below Steamboat Prow, verified
// against WTA + Peakbagger-corroborated sources against Recreation.gov (White River TH)
// and Peakbagger/Wikipedia (Columbia Crest). Also corrects the summit elevation to NPS's
// currently-cited 14,410ft (the stored 14,417ft traces to an older/superseded survey).
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Error: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY (service_role secret)'); process.exit(1); }

const waypoints = [
  {type:"Trailhead", name:"White River Campground", lat:46.9024, lng:-121.6418, elev:4400, distMi:0,
   note:"White River Campground/ranger station trailhead, Mount Rainier NP."},
  {type:"Campsite", name:"Camp Schurman", lat:46.9003, lng:-121.6581, elev:9460, distMi:6.5,
   note:"NPS high camp/ranger patrol cabin on the saddle below Steamboat Prow; permits required in climbing season."},
  {type:"Summit", name:"Columbia Crest", lat:46.8529, lng:-121.7604, elev:14410, distMi:9,
   note:"Mount Rainier's true summit, on the crater rim's high point."}
];

async function main() {
  const res = await fetch(`${url}/rest/v1/routes?id=eq.wa_rainier_emmons_glacier`, {
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
