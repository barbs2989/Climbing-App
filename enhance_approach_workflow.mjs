export const meta = {
  name: 'enhance-wa-approach-full',
  description: 'Research and enhance approach descriptions + logistics for 624 WA alpine routes with accuracy verification',
  phases: [
    { title: 'Audit duplicates', detail: 'Identify and flag duplicate routes to skip' },
    { title: 'Research batch 1', detail: 'Routes 1-100 (with geo accuracy verification)' },
    { title: 'Research batch 2', detail: 'Routes 101-200' },
    { title: 'Research batch 3', detail: 'Routes 201-300' },
    { title: 'Research batch 4', detail: 'Routes 301-400' },
    { title: 'Research batch 5', detail: 'Routes 401-500' },
    { title: 'Research batch 6', detail: 'Routes 501-624' },
    { title: 'Verify accuracy', detail: 'Audit geographic correctness, style consistency, no wrong-mountain errors' },
  ],
}

phase('Audit duplicates')
const dupAudit = await agent(
  `Query Supabase routes table for WA alpine/mountaineering routes. Identify duplicate route entries (same peak, same name, likely same historic route). Return JSON: {duplicates: [{peakId, routeIds: [...], recommendation: "delete_id_X_keep_Y"}], notDuplicates: count}. This prevents enriching routes that will be deleted. Cross-check by: same area_id + same normalized name (strip "Direct"/"Left"/"Sit" variants) + same or very close high_point_ft.`,
  { label: 'dedup-audit', phase: 'Audit duplicates', effort: 'high', schema: { type: 'object', properties: { duplicates: { type: 'array' }, notDuplicates: { type: 'number' } } } }
)
const skipIds = (dupAudit?.duplicates || []).flatMap(d => d.routeIds.slice(1)) // Skip all but canonical
log(`Skipping ${skipIds.length} duplicate route IDs`)

phase('Research batch 1')
const batch1 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 1-100 (offset 0, limit 100). SKIP any route whose ID is in: ${JSON.stringify(skipIds.slice(0, 20))}. For each remaining route, research and return JSON with id, name, enhancedApproach (2-3 paragraphs, specific to that mountain with GPS coords, road names/numbers, seasonal closures, landmarks, practical warnings like "start early before thunderstorms"), and approach_logistics. CRITICAL: Cross-reference trailhead GPS against the actual peak's area_id and coordinates — catch wrong-mountain errors. Match style of existing alpine routes (active voice, specific landmarks, practical warnings). Write unique narratives, not generic copy-paste.`,
  { label: 'batch-1', phase: 'Research batch 1', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 2')
const batch2 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 101-200 (offset 100, limit 100). SKIP any route whose ID is in: ${JSON.stringify(skipIds.slice(0, 20))}. For each, research id, name, enhancedApproach (2-3 paragraphs, specific landmarks, GPS, practical warnings), approach_logistics. CRITICAL: Verify trailhead GPS matches the actual peak location — catch wrong-mountain errors. Match alpine route style.`,
  { label: 'batch-2', phase: 'Research batch 2', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 3')
const batch3 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 201-300 (offset 200, limit 100). SKIP duplicate IDs from dedup audit. Research with geographic accuracy verification: trailhead GPS must match peak's actual area. Return id, name, enhancedApproach, approach_logistics.`,
  { label: 'batch-3', phase: 'Research batch 3', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 4')
const batch4 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 301-400 (offset 300, limit 100). SKIP duplicates. For each route, cross-reference trailhead GPS against peak's area coordinates to catch wrong-mountain errors. Research id, name, enhancedApproach (specific landmarks, practical warnings, active voice), approach_logistics.`,
  { label: 'batch-4', phase: 'Research batch 4', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 5')
const batch5 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 401-500 (offset 400, limit 100). SKIP duplicate IDs. Verify geographic accuracy: trailhead GPS in correct area, not confused with wrong peak. Return id, name, enhancedApproach (2-3 para, specific to that peak), approach_logistics (trailhead_gps, parking, permits, supplies).`,
  { label: 'batch-5', phase: 'Research batch 5', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

phase('Research batch 6')
const batch6 = await agent(
  `Query Supabase for WA alpine/mountaineering routes 501-624 (offset 500, limit 124). SKIP duplicates from dedup audit. For each route, verify geographic accuracy (GPS matches peak location), research enhancedApproach and approach_logistics. Style: specific landmarks, practical warnings, active voice. Return id, name, enhancedApproach, approach_logistics.`,
  { label: 'batch-6', phase: 'Research batch 6', effort: 'high', schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } } }
)

// Flatten all results
const allResults = [batch1, batch2, batch3, batch4, batch5, batch6]
  .filter(Boolean)
  .flatMap(b => b.results || [])

log(`Completed: ${allResults.length} routes researched`)

phase('Verify accuracy')
const verification = await agent(
  `Audit these ${allResults.length} enriched WA alpine routes for accuracy and style. For a random sample of 20-30 routes, verify: (1) trailhead GPS is in the correct area (not wrong mountain with same name), (2) road names/numbers are real (cross-check USFS/WA DOT sources), (3) seasonal closures are current (not outdated), (4) style matches existing alpine routes (active voice, specific landmarks, practical warnings). Return JSON: {verified_count: N, issues: [{routeId, issue: "wrong GPS for peak" or "outdated closure date" or "generic copy-paste style"}], ready_for_db: true/false}. If issues > 5, set ready_for_db to false.`,
  { label: 'accuracy-verify', phase: 'Verify accuracy', effort: 'high', schema: { type: 'object', properties: { verified_count: { type: 'number' }, issues: { type: 'array' }, ready_for_db: { type: 'boolean' } } } }
)

if (!verification?.ready_for_db) {
  log(`QUALITY GATE FAILED: ${verification?.issues?.length || 'unknown'} accuracy issues found. Review before applying to database.`)
}

return {
  total_routes: 624,
  researched: allResults.length,
  verification_status: verification?.ready_for_db ? 'PASSED' : 'REVIEW_NEEDED',
  issues_found: verification?.issues || [],
  routes: allResults
}
