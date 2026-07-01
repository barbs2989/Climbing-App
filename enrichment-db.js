// Enrichment database with validation
// Schema: all fields optional, but when present must follow structure

export const enrichmentTiers = {
  FULL: ['peakMetadata', 'seasonalGuidance', 'hazards', 'crowds', 'permits', 'partnerRequirements', 'dataQuality'],
  ALPINE: ['peakMetadata', 'seasonalGuidance', 'seasonalHazards', 'permits', 'crowds', 'partnerRequirements', 'dataQuality'],
  ROCK: ['peakMetadata', 'partnerRequirements', 'crowds', 'dataQuality'],
  MINIMAL: ['peakMetadata', 'dataQuality'],
};

// Validation schema
export const validateEnrichmentData = (route) => {
  const issues = [];
  if (!route.id) issues.push(`Route missing id`);
  if (route.peakMetadata) {
    if (typeof route.peakMetadata !== 'object') issues.push(`${route.id}: peakMetadata must be object`);
  }
  if (route.seasonalGuidance) {
    if (typeof route.seasonalGuidance !== 'object') issues.push(`${route.id}: seasonalGuidance must be object`);
    if (route.seasonalGuidance.monthBreakdown && typeof route.seasonalGuidance.monthBreakdown !== 'object') {
      issues.push(`${route.id}: monthBreakdown must be object`);
    }
  }
  if (route.seasonalHazards) {
    if (typeof route.seasonalHazards !== 'object') issues.push(`${route.id}: seasonalHazards must be object`);
  }
  if (route.crowds) {
    if (typeof route.crowds !== 'object') issues.push(`${route.id}: crowds must be object`);
  }
  if (route.permits) {
    if (typeof route.permits !== 'object') issues.push(`${route.id}: permits must be object`);
  }
  if (route.partnerRequirements) {
    if (typeof route.partnerRequirements !== 'object') issues.push(`${route.id}: partnerRequirements must be object`);
  }
  if (route.dataQuality) {
    if (typeof route.dataQuality !== 'object') issues.push(`${route.id}: dataQuality must be object`);
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(route.dataQuality.confidence)) {
      issues.push(`${route.id}: confidence must be HIGH/MEDIUM/LOW`);
    }
  }
  if (issues.length) {
    console.warn(`Enrichment validation issues for ${route.id}:`, issues);
  }
  return { valid: issues.length === 0, issues };
};

// Enriched route data
export const enrichedRoutes = {
  baker_cd: {
    id: 'baker_cd',
    peakMetadata: {
      elevation: 10781,
      prominence: 8100,
      county: 'Whatcom County',
      range: 'North Cascades',
      geology: 'Stratovolcano; andesite lava flows and breccia',
      firstAscent: {
        date: '1868-08-17',
        climbers: ['Edmund Coleman', 'John Tennant', 'Thomas Stratton', 'David Ogilvy'],
        notes: 'Established Mount Baker\'s prominence in early North American mountaineering',
      },
    },
    seasonalGuidance: {
      optimalWindow: 'Late May–June (hard freeze, stable snow); early July (optimal compromise)',
      monthBreakdown: {
        May: { status: 'risky', reason: 'Late-season freeze-thaw only; if cold, excellent. High variability.' },
        June: { status: 'optimal', reason: 'Stable snow, firm conditions, comfortable weather window' },
        July: { status: 'good', reason: 'Optimal but crowded; popular weekends can have 10–30 simultaneous parties' },
        August: { status: 'marginal', reason: 'Snow softens, crevasse hazard increases; hard freeze by 5am required' },
        September: { status: 'risky', reason: 'Unstable snow bridges, crevasse hazard high, early storms possible' },
      },
    },
    seasonalHazards: {
      avalanche: {
        zone: 'NWAC — Mt Baker',
        byMonth: {
          May: 'Considerable',
          June: 'Considerable',
          July: 'Moderate',
          August: 'Moderate',
          September: 'Considerable',
        },
      },
      crevasses: {
        location: 'Primary on Coleman Glacier',
        timing: 'Early AM (solid/safe) → Midday (softening) → Afternoon (dangerous)',
      },
      weather: {
        typical: 'Afternoon thunderstorms, high wind, rapid visibility loss',
        probability: 'Afternoon thunderstorms: 60% daily by 2 PM July–August',
      },
    },
    crowds: {
      estimatePerSeason: 200,
      peakTraffic: 'July weekends: 10–30 simultaneous parties',
      solitudeRating: 2,
    },
    permits: {
      type: 'Self-issued',
      cost: 'Free',
      regulations: 'Northwest Forest Pass required for parking',
    },
    partnerRequirements: {
      experienceLevel: 'Beginner-friendly',
      fitnessSpec: { hiking: '1,000–1,200 ft/hr', packWeight: '30–40 lb' },
      requiredSkills: ['Self-arrest', 'Crevasse rescue', 'Rope team movement'],
      approachTime: '~4–5 hours to Coleman Saddle',
    },
    dataQuality: {
      confidence: 'HIGH',
      lastVerified: '2026-06-15',
      gaps: [],
    },
  },

  // Example template for future routes (Adams & St. Helens):
  // Add these when the route IDs are added to ROUTES array in ClimbMatch.jsx
  // adams_south_spur: { ... },
  // st_helens_monitor: { ... },
};

// Helper: Get enrichment by route ID
export const getEnrichment = (routeId) => {
  return enrichedRoutes[routeId] || null;
};

// Helper: Determine tier based on available fields
export const determineTier = (route) => {
  const hasFields = {
    peakMetadata: !!route.peakMetadata,
    seasonalGuidance: !!route.seasonalGuidance,
    seasonalHazards: !!route.seasonalHazards,
    crowds: !!route.crowds,
    permits: !!route.permits,
    partnerRequirements: !!route.partnerRequirements,
    dataQuality: !!route.dataQuality,
  };

  const fieldCount = Object.values(hasFields).filter(Boolean).length;

  if (fieldCount >= 7 || (hasFields.seasonalHazards && hasFields.seasonalGuidance)) return 'FULL';
  if (hasFields.seasonalHazards || (hasFields.seasonalGuidance && hasFields.permits)) return 'ALPINE';
  if (hasFields.peakMetadata && hasFields.partnerRequirements) return 'ROCK';
  return 'MINIMAL';
};

// Validate all enrichments on startup
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  Object.values(enrichedRoutes).forEach(route => {
    const { valid, issues } = validateEnrichmentData(route);
    if (!valid) {
      console.warn(`[Enrichment Validation] ${route.id}:`, issues);
    }
  });
}
