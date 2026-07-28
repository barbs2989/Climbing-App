# Phase 3 Tier 2 Deployment Plan

## Blocked Status
- Tier 1 (59 routes, 158 hazards): DEPLOYED 2026-07-16 ✅
- Tier 2 (60+ routes, 100+ hazards): RESEARCHED but missing routes from DB

## High-Priority Tier 2 Routes (by hazard count)

Based on research agents (Alpine Volcanoes, Leavenworth Rock, Secondary Peaks):

### Alpine/Volcano Routes (15-18 routes)
- Mount Shuksan: Fisher Chimneys, North Face Direct
- Mount Formidable: South Route, Chasm Route variants
- Eldorado Peak: West Arete, East Ridge alternatives
- Nooksack Tower: North Face variants
- Mount Triumph: Direct routes
- Liberty Cap: Wilder Ridge, Moraine Ascent

### Rock/Trad Climbing (20-25 routes)
- Leavenworth Granite: specific crags
- Snoqualmie Pass: specific formations
- Index Sandstone: specific walls

### Secondary Peaks (15-20 routes)
- Colchuck Peak variants
- Dragontail Peak variants
- Remmel Mountain routes
- Primus Peak variants
- Cathedral Peak variants

## Deployment Strategy
1. Generate tier 2 route batch (60+ routes)
2. Create migration to add routes (0056_phase3_tier2_routes.sql)
3. Create migration to add tier 2 hazards (0057_phase3_tier2_hazards.sql)
4. Deploy and verify

## Estimate
- Route batch generation: 1 hour
- Migration creation: 1 hour
- Deployment + verification: 1 hour
- Total: 3 hours

