# Enrichment Data Integration Guide

This guide explains the refactored enrichment system and how to add new enriched routes.

## Architecture Overview

The enrichment system is now organized into:

1. **EnrichmentPanels.jsx** — 7 React components that display enrichment data
   - `PeakMetadataPanel` — Elevation, prominence, county, range, geology, first ascent
   - `SeasonalGuidancePanel` — Optimal windows and month-by-month breakdown
   - `HazardsDetailPanel` — Avalanche, weather, crevasses by month
   - `CrowdsPanel` — Party estimates and solitude rating
   - `PermitsAccessPanel` — Permit type, cost, regulations
   - `PartnerRequirementsPanel` — Experience level, fitness, required skills
   - `DataQualityPanel` — Confidence rating and flagged gaps

2. **enrichment-db.js** — Data layer with schema validation
   - `enrichedRoutes` object containing all enriched route data
   - `validateEnrichmentData()` function for schema validation
   - `determineTier()` function to classify routes (FULL, ALPINE, ROCK, MINIMAL)
   - `getEnrichment()` helper to fetch enrichment by route ID

3. **ClimbMatch.jsx** — Main app with integrated enrichment display
   - Imports components and data layer
   - `enrichRoute()` helper to merge enrichment data into route objects
   - Route detail tabs include "Details" (enrichment) and displays hazards in "Safety" tab

## Adding New Enriched Routes

### Step 1: Add to enrichment-db.js

Add a new route object to the `enrichedRoutes` export following this schema:

```javascript
// enrichment-db.js
export const enrichedRoutes = {
  baker_cd: { /* existing */ },
  
  // NEW ROUTE:
  new_route_id: {
    id: 'new_route_id',
    peakMetadata: {
      elevation: 12000,
      prominence: 2000,
      county: 'County Name',
      range: 'Range Name',
      geology: 'Description of rock type',
      firstAscent: {
        date: 'YYYY-MM-DD',
        climbers: ['Climber 1', 'Climber 2'],
        notes: 'Historical context',
      },
    },
    seasonalGuidance: {
      optimalWindow: 'Months (e.g., "July–August")',
      monthBreakdown: {
        May: { status: 'risky'|'marginal'|'good'|'optimal', reason: 'Why' },
        June: { status: 'optimal', reason: '...' },
        // ...continue for all months
      },
    },
    seasonalHazards: {
      avalanche: {
        zone: 'Avalanche forecast zone name',
        byMonth: {
          May: 'Considerable',
          June: 'Moderate',
          // ...
        },
      },
      crevasses: { location: '...', timing: '...' },
      weather: { typical: '...', probability: '...' },
      exposure: { location: '...', consequence: '...' },
    },
    crowds: {
      estimatePerSeason: 200,
      peakTraffic: 'Busiest time/month',
      solitudeRating: 3, // 1-5 (1 = most solitary, 5 = most crowded)
    },
    permits: {
      type: 'Self-issued' | 'recreation.gov' | etc,
      cost: 'Free' | '$10–15' | etc,
      regulations: 'Special rules or requirements',
    },
    partnerRequirements: {
      experienceLevel: 'Beginner-friendly' | 'Intermediate' | 'Advanced',
      fitnessSpec: { hiking: '1,000+ ft/hr', packWeight: '30–40 lb' },
      requiredSkills: ['Self-arrest', 'Crevasse rescue'],
      approachTime: '~4–5 hours',
    },
    dataQuality: {
      confidence: 'HIGH' | 'MEDIUM' | 'LOW',
      lastVerified: 'YYYY-MM-DD',
      gaps: ['Missing data field 1', 'Field 2 needs update'],
    },
  },
};
```

### Step 2: Validate

The validation happens automatically on app load (dev mode only). Watch the browser console for errors:
```
[Enrichment Validation] new_route_id: confidence must be HIGH/MEDIUM/LOW
```

Fix any issues and reload.

### Step 3: Wire Up the Route Object in ClimbMatch.jsx

If the route already exists in the ROUTES array, merge the enrichment data:

```javascript
// In ClimbMatch.jsx, find the route and add enrichment fields:
{
  id: 'new_route_id',
  name: 'Route Name',
  discipline: 'mountaineering',
  // ... existing fields ...
  
  // Add these from enrichment-db.js:
  peakMetadata: { /* from enrichmentRoutes.new_route_id */ },
  seasonalGuidance: { /* ... */ },
  seasonalHazards: { /* ... */ },
  crowds: { /* ... */ },
  permits: { /* ... */ },
  partnerRequirements: { /* ... */ },
  dataQuality: { /* ... */ },
}
```

Or use the `enrichRoute()` helper when rendering:
```javascript
const enrichedRoute = enrichRoute(baseRoute);
// enrichedRoute now has all enrichment data merged in
```

## Enrichment Tiers

Routes are classified by how complete their enrichment is:

| Tier | Coverage | When to Use |
|------|----------|-------------|
| **FULL** | All 7 sections + month breakdowns | Complete alpine routes |
| **ALPINE** | Peak + seasonal + hazards + permits + crowds | Most glacier/alpine climbs |
| **ROCK** | Peak + partners + crowds + quality | Rock and alpine rock routes |
| **MINIMAL** | Peak + quality only | Placeholder while data gathers |

The `determineTier()` function auto-detects from available fields.

## Conditional Rendering

All enrichment panels check for data existence before rendering:

```javascript
export function HazardsDetailPanel({route, C}) {
  if (!route.seasonalHazards) return null; // Skip if no data
  // ... render hazards
}
```

So incomplete enrichment data gracefully shows fewer panels without breaking.

## Bulk Integration Workflow

To add 10+ enriched routes:

1. **Prep in enrichment-db.js**: Add all 10 route objects to `enrichedRoutes`
2. **Validate**: Run app in dev mode, check console for validation errors
3. **Wire in ClimbMatch.jsx**: Add enrichment fields to matching route objects (or bulk-merge using `enrichRoute()`)
4. **Test**: Navigate to each route, verify Details and Safety tabs show correctly
5. **Commit**: Single commit with all 3 files touched

Example commit message:
```
Add enrichment batch: 10 Enchantment peaks

- Dragontail Peak, Colchuck Lake, Enchantment Lake, Prusik Peak (alpine)
- 24+ technical routes with peak metadata, seasonal guidance, hazards
- HIGH confidence ratings from guidebook + community sources
- Validation passes; Details and Hazards tabs verified

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

## File Map

```
ClimbMatch.jsx
├── imports EnrichmentPanels.jsx components
├── imports enrichment-db.js data
├── enrichRoute() helper function
└── Route detail pages render components

EnrichmentPanels.jsx
├── PeakMetadataPanel
├── SeasonalGuidancePanel
├── HazardsDetailPanel
├── CrowdsPanel
├── PermitsAccessPanel
├── PartnerRequirementsPanel
└── DataQualityPanel

enrichment-db.js
├── enrichmentTiers (FULL, ALPINE, ROCK, MINIMAL)
├── validateEnrichmentData()
├── determineTier()
├── getEnrichment()
└── enrichedRoutes { baker_cd, adams_south_spur, st_helens_monitor, ... }
```

## Next Steps

1. ✅ Components extracted to EnrichmentPanels.jsx
2. ✅ Data layer created in enrichment-db.js
3. ✅ Validation schema in place
4. 🔲 Test Mount Baker enrichment in browser (should work!)
5. 🔲 Add 10-15 more routes following this guide
6. 🔲 Implement mobile collapsible panels (optional UX improvement)
7. 🔲 Add freshness timestamps and update prompts

## Common Issues

**Q: Validation fails for a new route**
A: Check the console for the exact error. Most common: `confidence` must be one of `['HIGH', 'MEDIUM', 'LOW']`.

**Q: Details tab shows empty panels**
A: Verify the route ID in enrichment-db.js matches the route in ROUTES array. The `enrichRoute()` helper should merge them.

**Q: Crowded on mobile (Details tab very tall)**
A: This is flagged as a MEDIUM priority improvement. Implement collapsible sections within EnrichmentPanels to improve mobile UX.

## References

- Schema: See `validateEnrichmentData()` in enrichment-db.js
- Components: See EnrichmentPanels.jsx
- Example data: Mount Baker (baker_cd) in enrichment-db.js
