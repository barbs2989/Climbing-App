export const meta = {
  name: 'enhance-wa-approach-full',
  description: 'Research and enhance approach descriptions + logistics for 624 WA alpine routes',
  phases: [
    { title: 'Fetch routes', detail: 'Get all 624 WA alpine route IDs' },
    { title: 'Research', detail: 'Web search for detailed approach + logistics info' },
    { title: 'Compile', detail: 'Organize results for database application' },
  ],
}

phase('Fetch routes')
const anon_key = 'sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5'
const base_url = 'https://ofuofhojhbcrcahuotya.supabase.co/rest/v1'

const routesRes = await fetch(`${base_url}/routes?discipline=in.(alpine,mountaineering)&select=id,name,area_id&limit=700`, {
  headers: { apikey: anon_key }
})
const routes = await routesRes.json()
const waRoutes = routes.filter(r => r.area_id && r.area_id.startsWith('wa_')).slice(0, 624)
log(`Found ${waRoutes.length} WA alpine/mountaineering routes to enhance`)

// Split into batches for parallel research
const batchSize = 60
const batches = []
for (let i = 0; i < waRoutes.length; i += batchSize) {
  batches.push(waRoutes.slice(i, i + batchSize))
}

phase('Research')
const enhancedBatches = await pipeline(
  batches,
  (batch, _, batchIdx) => agent(
    `Research and enhance approach descriptions + logistics for ${batch.length} WA alpine routes.

For EACH route, search for: (1) detailed trailhead location/GPS, (2) road names/numbers with seasonal closure dates/washout info, (3) parking (capacity, fees, overflow), (4) permits and costs, (5) key approach landmarks with distances, (6) water sources, (7) nearby supply towns.

Return JSON array with:
{
  "id": "route_id",
  "name": "Route Name",
  "enhancedApproach": "2-3 paragraph rich narrative specific to this mountain (not generic). Include practical climber details like 'SR 542 closes Nov-Apr' or 'road washouts after Sept'.",
  "approach_logistics": {
    "trailhead_gps": "lat, lng",
    "trailhead_elevation_ft": 3700,
    "parking_capacity": "Limited; fills weekends",
    "parking_fee": "$5/day or $30 annual",
    "parking_facilities": "vault toilets, picnic tables, no water",
    "road_name": "Mount Baker Highway (SR 542)",
    "road_to_trailhead": "8 miles on Glacier Creek Rd (FS 39)",
    "road_status": "Open year-round" or "Closed Nov-May" etc,
    "permit_type": "Free self-issue wilderness permit",
    "permit_cost": "Free; $5 vehicle day-use fee",
    "permit_group_limit": "12 person max",
    "supplies_town_1": "Glacier, WA (12 mi)",
    "supplies_town_1_distance": "12 miles",
    "supplies_town_1_services": "Groceries at Graham Store",
    "supplies_town_2": "Maple Falls, WA (20 mi)",
    "supplies_town_2_services": "Gas at Maple Fuels, groceries"
  }
}

Write unique, specific narratives (not copy-paste). Include practical warnings (e.g., "cross Kulshan Creek in morning before afternoon glacial melt surge makes it dangerous").`,
    {
      label: `enhance-batch-${batchIdx}`,
      phase: 'Research',
      effort: 'medium',
      schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                enhancedApproach: { type: 'string' },
                approach_logistics: { type: 'object' }
              }
            }
          }
        }
      }
    }
  )
)

phase('Compile')
// Flatten all results
const allEnhanced = enhancedBatches
  .filter(Boolean)
  .flatMap(b => b.results || [])

log(`Compiled ${allEnhanced.length} routes; ready for database application`)

// Return results (workflow harness will save to transcript)
return {
  total_processed: allEnhanced.length,
  routes: allEnhanced
}
