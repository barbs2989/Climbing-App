// Enrichment database with validation
// Schema: all fields optional, but when present must follow structure

export const enrichmentTiers = {
  FULL: ['peakMetadata', 'seasonalGuidance', 'hazards', 'crowds', 'permitInfo', 'partnerRequirements', 'dataQuality'],
  ALPINE: ['peakMetadata', 'seasonalGuidance', 'seasonalHazards', 'permitInfo', 'crowds', 'partnerRequirements', 'dataQuality'],
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
  if (route.permitInfo) {
    if (typeof route.permitInfo !== 'object') issues.push(`${route.id}: permitInfo must be object`);
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
    permitInfo: {
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

  wa_blue_glacier: {
    id: 'wa_blue_glacier',
    peakMetadata: {
      elevation: 7958,
      prominence: 3166,
      county: 'Jefferson County',
      range: 'Olympic Mountains',
      geology: 'Metamorphic - gneiss and schist',
      firstAscent: {
        date: '1890-01-01',
        climbers: ['Early mountaineers'],
        notes: 'One of the earliest routes in the Olympic Mountains',
      },
    },
    seasonalGuidance: {
      optimalWindow: 'July–September (snow recession and stable weather)',
      monthBreakdown: {
        May: { status: 'risky', reason: 'Heavy snow, avalanche risk' },
        June: { status: 'marginal', reason: 'Snow lingering, crevasses opening' },
        July: { status: 'optimal', reason: 'Excellent conditions, stable snow' },
        August: { status: 'good', reason: 'Warm, mostly dry' },
        September: { status: 'marginal', reason: 'Weather deteriorating' },
      },
    },
    seasonalHazards: {
      avalanche: {
        zone: 'Olympic Range',
        byMonth: {
          May: 'Considerable',
          June: 'Moderate',
          July: 'Low',
          August: 'Low',
          September: 'Moderate',
        },
      },
      crevasses: {
        location: 'Blue Glacier headwall',
        timing: 'Open July onwards',
      },
      weather: {
        typical: 'Pacific storms, rapid weather changes',
        probability: '30% chance of rain any day',
      },
    },
    crowds: {
      estimatePerSeason: 150,
      peakTraffic: 'August weekends: 5-10 parties',
      solitudeRating: 3,
    },
    permitInfo: {
      type: 'Self-issued',
      cost: 'Free',
      regulations: 'Olympic National Park: register at ranger station',
    },
    partnerRequirements: {
      experienceLevel: 'Intermediate',
      fitnessSpec: { hiking: '800 ft/hr', packWeight: '30–35 lb' },
      requiredSkills: ['Self-arrest', 'Crampon use'],
      approachTime: '~5–6 hours to glacier',
    },
    dataQuality: {
      confidence: 'MEDIUM',
      lastVerified: '2026-06-20',
      gaps: ['Recent condition changes', 'Crowd estimates'],
    },
  },

  wa_honeymoon_route: {
    id: 'wa_honeymoon_route',
    peakMetadata: {
      elevation: 6883,
      prominence: 1683,
      county: 'King County',
      range: 'Cascade Range',
      geology: 'Andesite and basalt - volcanic',
      firstAscent: {
        date: '1965-01-01',
        climbers: ['Arnie & Diane Bloomer'],
        notes: 'Named for the first ascent couple',
      },
    },
    seasonalGuidance: {
      optimalWindow: 'June–August (snow melt, stable weather)',
      monthBreakdown: {
        May: { status: 'marginal', reason: 'Upper sections snowy' },
        June: { status: 'good', reason: 'Seasonal window opening' },
        July: { status: 'optimal', reason: 'Prime climbing season' },
        August: { status: 'good', reason: 'Stable conditions' },
        September: { status: 'risky', reason: 'Weather turns wet' },
      },
    },
    crowds: {
      estimatePerSeason: 80,
      peakTraffic: 'July weekends: 3-5 parties',
      solitudeRating: 4,
    },
    permitInfo: {
      type: 'Self-issued',
      cost: 'Free',
      regulations: 'Alpine Lakes Wilderness: group limits apply',
    },
    partnerRequirements: {
      experienceLevel: 'Beginner-friendly',
      fitnessSpec: { hiking: '600 ft/hr', packWeight: '25–30 lb' },
      requiredSkills: ['Basic scrambling'],
      approachTime: '~4 hours',
    },
    dataQuality: {
      confidence: 'MEDIUM',
      lastVerified: '2026-06-15',
      gaps: ['Current conditions reports'],
    },
  },
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
    permitInfo: !!route.permitInfo,
    partnerRequirements: !!route.partnerRequirements,
    dataQuality: !!route.dataQuality,
  };

  const fieldCount = Object.values(hasFields).filter(Boolean).length;

  if (fieldCount >= 7 || (hasFields.seasonalHazards && hasFields.seasonalGuidance)) return 'FULL';
  if (hasFields.seasonalHazards || (hasFields.seasonalGuidance && hasFields.permitInfo)) return 'ALPINE';
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
