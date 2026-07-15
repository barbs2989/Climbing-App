export const meta = {
  name: 'enhance-wa-approach-full',
  description: 'Research and enhance approach descriptions + logistics for 624 WA alpine routes',
  phases: [
    { title: 'Research batch 1', detail: 'Routes 1-100' },
    { title: 'Research batch 2', detail: 'Routes 101-200' },
    { title: 'Research batch 3', detail: 'Routes 201-300' },
    { title: 'Research batch 4', detail: 'Routes 301-400' },
    { title: 'Research batch 5', detail: 'Routes 401-500' },
    { title: 'Research batch 6', detail: 'Routes 501-624' },
  ],
}

phase('Research batch 1')
const batch1 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 1-100 (offset 0, limit 100). For each route, research and return JSON with id, name, enhancedApproach (2-3 paragraphs, specific to that mountain with GPS coords, road names/numbers, seasonal closures, landmarks, practical warnings), and approach_logistics (structured JSON with trailhead_gps, parking_capacity, parking_fee, road_name, road_status, permit_type, permit_cost, supplies_town_1/2 with distances and services). Write unique narratives, not generic.`,
  { label: 'batch-1', phase: 'Research batch 1', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 2')
const batch2 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 101-200 (offset 100, limit 100). Same research format as batch 1: id, name, enhancedApproach, approach_logistics.`,
  { label: 'batch-2', phase: 'Research batch 2', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 3')
const batch3 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 201-300 (offset 200, limit 100). Same format: id, name, enhancedApproach, approach_logistics.`,
  { label: 'batch-3', phase: 'Research batch 3', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 4')
const batch4 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 301-400 (offset 300, limit 100). Same format: id, name, enhancedApproach, approach_logistics.`,
  { label: 'batch-4', phase: 'Research batch 4', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 5')
const batch5 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 401-500 (offset 400, limit 100). Same format: id, name, enhancedApproach, approach_logistics.`,
  { label: 'batch-5', phase: 'Research batch 5', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 6')
const batch6 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 501-624 (offset 500, limit 124). Same format: id, name, enhancedApproach, approach_logistics.`,
  { label: 'batch-6', phase: 'Research batch 6', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

// Flatten all results
const allResults = [batch1, batch2, batch3, batch4, batch5, batch6]
  .filter(Boolean)
  .flatMap(b => b.results || [])

log(`Completed: ${allResults.length} routes researched`)

return {
  total_routes: 624,
  researched: allResults.length,
  routes: allResults
}
