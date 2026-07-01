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

  adams_south_spur: {
    id: 'adams_south_spur',
    peakMetadata: {
      elevation: 12281,
      prominence: 6800,
      county: 'Yakima County',
      range: 'Cascade Range',
      geology: 'Stratovolcano; basaltic lava',
      firstAscent: {
        date: '1854',
        climbers: ['A.D. Wilson'],
        notes: 'Washington\'s second-highest peak',
      },
    },
    seasonalGuidance: {
      optimalWindow: 'May–September (South Spur); winter climbs on north side',
      monthBreakdown: {
        May: { status: 'good', reason: 'Firm snow, spring climbing conditions' },
        June: { status: 'optimal', reason: 'Peak season; snow stable, weather favorable' },
        July: { status: 'good', reason: 'Very crowded ("highway of climbers"), soft snow by afternoon' },
        August: { status: 'marginal', reason: 'Soft snow, heat, afternoon thunderstorms' },
        September: { status: 'risky', reason: 'Early storms, snow instability' },
      },
    },
    seasonalHazards: {
      avalanche: {
        zone: 'NWAC — Mt Adams',
        byMonth: {
          May: 'Considerable',
          June: 'Moderate',
          July: 'Moderate',
          August: 'Low',
          September: 'Considerable',
        },
      },
      crevasses: {
        location: 'White Salmon and Nativity glaciers',
        timing: 'Variable; soft snow increases hazard July–August',
      },
      weather: {
        typical: 'Exposed ridge; wind, lightning risk, rapid weather changes',
        probability: 'Afternoon thunderstorms: 40–50% June–August',
      },
    },
    crowds: {
      estimatePerSeason: 300,
      peakTraffic: '"Highway of climbers" on South Spur; peak July weekends',
      solitudeRating: 1,
    },
    permits: {
      type: 'Recreation.gov (peak season)',
      cost: '$10–15',
      regulations: 'Self-issued off-season (Nov–April)',
    },
    partnerRequirements: {
      experienceLevel: 'Beginner-friendly',
      fitnessSpec: { hiking: '900–1,100 ft/hr', packWeight: '25–35 lb' },
      requiredSkills: ['Self-arrest', 'Rope team basics'],
      approachTime: '~3–4 hours to summit',
    },
    dataQuality: {
      confidence: 'HIGH',
      lastVerified: '2026-06-15',
      gaps: [],
    },
  },

  st_helens_monitor: {
    id: 'st_helens_monitor',
    peakMetadata: {
      elevation: 8365,
      prominence: 3530,
      county: 'Skamania County',
      range: 'Cascade Range',
      geology: 'Active stratovolcano; post-1980 eruption topography',
      firstAscent: {
        date: '1853',
        climbers: ['Unknown'],
        notes: 'Pre-1980 summit elevation: 9,677 ft. Eruption reduced by ~1,300 ft.',
      },
    },
    seasonalGuidance: {
      optimalWindow: 'April–October (Monitor Ridge); winter climbs possible but hazardous',
      monthBreakdown: {
        April: { status: 'good', reason: 'Spring snow, firm conditions, lower crowds' },
        May: { status: 'optimal', reason: 'Best conditions; snow stable, weather favorable' },
        June: { status: 'optimal', reason: 'Optimal; dry season begins' },
        July: { status: 'good', reason: 'Popular, mostly dry, heat possible' },
        August: { status: 'good', reason: 'Mostly dry, heat; afternoon storms possible' },
        September: { status: 'good', reason: 'Cooling; early storms possible' },
        October: { status: 'marginal', reason: 'Snow begins, weather unstable' },
      },
    },
    seasonalHazards: {
      avalanche: {
        zone: 'NWAC — Mt St. Helens',
        byMonth: {
          April: 'Moderate',
          May: 'Moderate',
          June: 'Low',
          July: 'Low',
          August: 'Low',
          September: 'Low',
          October: 'Moderate',
        },
      },
      exposure: {
        location: 'Monitor Ridge has exposure; crater access forbidden (hazard area)',
        detail: 'Post-1980 crater unstable; geothermal hazards; sulfur vents',
      },
      weather: {
        typical: 'Exposure on ridge; wind funneling; afternoon thunderstorms Apr–Sep',
        probability: 'Afternoon thunderstorms: 30–40% May–September',
      },
    },
    crowds: {
      estimatePerSeason: 400,
      peakTraffic: 'May–July heavily trafficked; weekends crowded',
      solitudeRating: 1,
    },
    permits: {
      type: 'Recreation.gov (summer), self-issued (winter)',
      cost: '$10–15 (summer)',
      regulations: 'Day-use only; no camping above 4,000 ft. Crater access forbidden (geothermal hazard).',
    },
    partnerRequirements: {
      experienceLevel: 'Beginner-friendly',
      fitnessSpec: { hiking: '800–1,000 ft/hr', packWeight: '20–30 lb' },
      requiredSkills: ['Basic scrambling'],
      approachTime: '~3–4 hours to summit',
    },
    dataQuality: {
      confidence: 'HIGH',
      lastVerified: '2026-06-15',
      gaps: ['Real-time crater access status', 'Current permit system changes'],
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
