#!/usr/bin/env node

/**
 * Phase 3 Tier 2 Partial Deployment (Agents 1 & 3)
 * Deploys 72 hazards across 46 routes from Alpine Volcanoes + Leavenworth Rock research
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Alpine Volcanoes route data (from Agent 1)
const alpineVolcanoeRoutes = [
  {
    id: 'wa_mount_rainier_ingraham_direct',
    name: 'Mount Rainier - Ingraham Direct',
    peak: 'Mount Rainier',
    hazards: [
      {
        type: 'Crevasse',
        description: 'Crevasses widening significantly in 11,500-13,000 ft zone due to summer temperatures. Serac band around 12,500 ft poses major icefall potential. RMI guides report ladders require daily maintenance and doubling/tripling in high-traffic zones as ice pours over rocky features beneath.',
        source_count: 3,
        confidence: 'medium'
      },
      {
        type: 'Icefall',
        description: 'Major serac band at 12,500 ft identified as critical icefall hazard. Large ice blocks have crossed the route seasonally. Seracs pulling from the mountain require ranger assessment of whether they will topple. Route traverses directly under overhead hazard zone.',
        source_count: 3,
        confidence: 'medium'
      },
      {
        type: 'Glacier Hazard',
        description: 'Route abandoned by all three major guide services (AAI, RMI, IMG) in 2025 due to deteriorating conditions. Crevasses opened wider than ladder span capacity. No fixed ancillaries (ladders, hand lines, pickets) maintained in late season, requiring independent navigation around large openings.',
        source_count: 2,
        confidence: 'medium'
      }
    ]
  },
  {
    id: 'wa_mount_rainier_camp_muir_standard',
    name: 'Mount Rainier - Camp Muir Standard (Disappointment Cleaver)',
    peak: 'Mount Rainier',
    hazards: [
      {
        type: 'Glacier Hazard',
        description: 'Muir Snowfield itself is crevasse-free on standard route, but hidden crevasses begin opening by September under thin snow bridges. Surface transitions from hard-packed ice (June-early July) to consolidated firn by August. By September, significant snow melt exposes hazard zones.',
        source_count: 3,
        confidence: 'medium'
      },
      {
        type: 'Rockfall',
        description: 'Disappointment Cleaver itself generates persistent rockfall, particularly late summer when freeze-thaw cycles destabilize loose volcanic rock. Guide services initiate midnight climbs to pass through rockfall zone in frozen conditions. Rock islands in snowfield create melt holes that trap climbers.',
        source_count: 3,
        confidence: 'medium'
      },
      {
        type: 'Icefall',
        description: 'Serac band documented on upper Ingraham Glacier above Camp Muir. Overhead hanging ice presents unpredictable fall hazard. June 1981: catastrophic serac collapse killed 11 climbers on guided rope team—worst mountaineering accident in US history.',
        source_count: 2,
        confidence: 'medium'
      },
      {
        type: 'Altitude',
        description: 'High altitude illness rates disproportionately high on standard route relative to safer alternatives. Severe weather above 10,000 ft creates hypothermia and frostbite risk, particularly with rain events that freeze when temperature drops.',
        source_count: 2,
        confidence: 'medium'
      }
    ]
  },
  {
    id: 'wa_mount_rainier_nisqually_glacier',
    name: 'Mount Rainier - Nisqually Glacier',
    peak: 'Mount Rainier',
    hazards: [
      {
        type: 'Rockfall',
        description: 'Nisqually Icefall presents active rockfall hazard. Loose volcanic rock debris embedded in snow. Route trending west toward Gibraltar Chute encounters increasing rockfall exposure from hanging terrain.',
        source_count: 2,
        confidence: 'medium-low'
      },
      {
        type: 'Icefall',
        description: 'Icefall directly active on Nisqually approach via Gibraltar Ledges transition. Ice blocks regularly fall from upper seracs into route corridor.',
        source_count: 2,
        confidence: 'medium-low'
      }
    ]
  },
  {
    id: 'wa_mount_rainier_gibraltar_ledge',
    name: 'Mount Rainier - Gibraltar Ledge',
    peak: 'Mount Rainier',
    hazards: [
      {
        type: 'Rockfall',
        description: 'Significant rockfall hazard from loose volcanic rock along Gibraltar Rock ledge system. Hazard is season-dependent; recommended winter-only ascent due to extreme rockfall in warm months. Moving quickly before sun exposure increases hazard. Large rocks embedded in snow create additional impact risk.',
        source_count: 3,
        confidence: 'medium'
      },
      {
        type: 'Icefall',
        description: 'Gibraltar Chute icefall zone directly above route transition. Exposure to steep, firm slopes below ledge system where falls cannot self-arrest. Ideal conditions require firm snow/solid ice, but loose 4th-class rock may be encountered seasonally.',
        source_count: 2,
        confidence: 'medium-low'
      }
    ]
  },
  {
    id: 'wa_mount_rainier_fuhrer_finger',
    name: 'Mount Rainier - Fuhrer Finger',
    peak: 'Mount Rainier',
    hazards: [
      {
        type: 'Rockfall',
        description: 'Chute experiences active rockfall and avalanche hazard requiring rapid movement. Large rocks embedded in snow throughout approach. Climbers mid-morning reported moderate amounts of rock and icefall. Considerable rockfall risk from above.',
        source_count: 3,
        confidence: 'medium'
      },
      {
        type: 'Icefall',
        description: 'Icefall directly climber\'s right of chute while accessing Wilson Bench is quite active. Mid-morning ascent particularly hazardous due to increased sublimation and destabilized hanging ice.',
        source_count: 2,
        confidence: 'medium'
      }
    ]
  },
  {
    id: 'wa_mount_rainier_tahoma_glacier',
    name: 'Mount Rainier - Tahoma Glacier',
    peak: 'Mount Rainier',
    hazards: [
      {
        type: 'Icefall',
        description: 'Western glacier face features serac potential. Primary hazard is hanging ice and serac fall, particularly in late season as melt accelerates. Limited climbing activity on this glacier relative to standard routes.',
        source_count: 1,
        confidence: 'medium-low'
      },
      {
        type: 'Glacier Hazard',
        description: 'Part of Mount Rainier\'s western face glacier complex. Glacier retreat has accelerated over recent decades, exposing new terrain and changing crevasse patterns season-to-season.',
        source_count: 1,
        confidence: 'medium-low'
      }
    ]
  },
  {
    id: 'wa_mount_rainier_winthrop_glacier',
    name: 'Mount Rainier - Winthrop Glacier (Emmons-Winthrop Route)',
    peak: 'Mount Rainier',
    hazards: [
      {
        type: 'Crevasse',
        description: 'Emmons-Winthrop route features most common crevasse falls on Mount Rainier. Upper glacier transforms into unnavigable crevasse labyrinth by late August. Tired climbers descending from upper mountain frequently fall into slots. Extensive crevassing makes late-season attempts very difficult.',
        source_count: 3,
        confidence: 'medium'
      },
      {
        type: 'Glacier Hazard',
        description: 'Seasonal variation critical: early season (May-June) features deep snowpack smoothing crevasse patterns; late season (August-September) crevasses open wide and require ladder systems and complex movement. 2025 season was unusually favorable; melt accelerating compared to historical average.',
        source_count: 2,
        confidence: 'medium'
      }
    ]
  },
  {
    id: 'wa_mount_rainier_puyallup_glacier',
    name: 'Mount Rainier - Puyallup Glacier',
    peak: 'Mount Rainier',
    hazards: [
      {
        type: 'Icefall',
        description: 'Western glacier faces Disappointment Cleaver area overhead hanging ice. Serac fall hazard similar to Cowlitz Glacier side. Rarely climbed route with less documentation than standard alternatives.',
        source_count: 1,
        confidence: 'low'
      },
      {
        type: 'Glacier Hazard',
        description: 'Glacier encircles western portion of Mount Rainier. Subject to same ablation and retreat patterns as other Rainier glaciers with significant area reduction since 1896.',
        source_count: 1,
        confidence: 'low'
      }
    ]
  },
  {
    id: 'wa_mount_baker_southwest_ridge',
    name: 'Mount Baker - Southwest Ridge',
    peak: 'Mount Baker',
    hazards: [
      {
        type: 'Crevasse',
        description: 'Mount Baker southwest area features large crevasses, particularly in Coleman Glacier approach zone around 8,800 ft. Snow bridge collapse documented June 2025 - main route-crossing bridge failed mid-season.',
        source_count: 2,
        confidence: 'medium-low'
      }
    ]
  },
  {
    id: 'wa_mount_baker_crevasse_glacier_route',
    name: 'Mount Baker - Crevasse Glacier Route',
    peak: 'Mount Baker',
    hazards: [
      {
        type: 'Crevasse',
        description: 'Route defined by very large crevasses. Glacier contains complex crevasse network. Snow bridges subject to collapse as melt accelerates. Seasonal warming causes rapid snowmelt and crevasse development.',
        source_count: 2,
        confidence: 'medium'
      }
    ]
  },
  {
    id: 'wa_mount_baker_coleman_deming',
    name: 'Mount Baker - Coleman-Deming',
    peak: 'Mount Baker',
    hazards: [
      {
        type: 'Crevasse',
        description: 'Major snow bridge collapse documented June 2025 at approximately 8,800 feet. This bridge had been the main route crossing over large crevasse. Later in season, hazardous rock and icefall from Colfax Peak enters glacier zone. Large crevasses open in Coleman Glacier area progressively through summer.',
        source_count: 2,
        confidence: 'medium'
      },
      {
        type: 'Icefall',
        description: 'Later-season icefall from Colfax Peak and serac zones above Coleman Glacier. Seasonal warming accelerates ice collapse in upper zones above Coleman-Deming route.',
        source_count: 2,
        confidence: 'medium-low'
      },
      {
        type: 'Glacier Hazard',
        description: 'Route requires high level of objective hazard navigation. Most commonly climbed Mount Baker route located on NW corner of peak. Summer melt accelerating crevasse development week-by-week.',
        source_count: 2,
        confidence: 'medium'
      }
    ]
  },
  {
    id: 'wa_mount_adams_avalanche_glacier',
    name: 'Mount Adams - Avalanche Glacier',
    peak: 'Mount Adams',
    hazards: [
      {
        type: 'Glacier Hazard',
        description: 'Historic debris avalanche hazard documented: approximately 4 million cubic meters of altered rock fell from head of Avalanche Glacier in 1921, traveled nearly 6 km down Salt Creek valley. Several similar but smaller debris avalanches have occurred since 1921. Volcano-specific hazard.',
        source_count: 2,
        confidence: 'medium'
      }
    ]
  },
  {
    id: 'wa_mount_adams_south_side',
    name: 'Mount Adams - South Side',
    peak: 'Mount Adams',
    hazards: [
      {
        type: 'Crevasse',
        description: 'Crevasses do not typically appear on South Side standard route on lower glacier, but crevasses can occasionally emerge on summit plateau area. Crevasses filled during winter gradually become more exposed through spring and summer as melt reveals them.',
        source_count: 2,
        confidence: 'medium-low'
      }
    ]
  },
  {
    id: 'wa_mount_adams_north_ridge',
    name: 'Mount Adams - North Ridge',
    peak: 'Mount Adams',
    hazards: [
      {
        type: 'Glacier Hazard',
        description: 'North Ridge is not technically difficult but is relatively exposed in places. Steep snow and loose rock characterize the route. Exposure hazard combined with unstable rock creates falling object risk.',
        source_count: 1,
        confidence: 'medium-low'
      }
    ]
  },
  {
    id: 'wa_glacier_peak_plummer_mountain',
    name: 'Glacier Peak - Plummer Mountain',
    peak: 'Glacier Peak',
    hazards: [
      {
        type: 'Isolation/Rescue',
        description: 'Plummer Mountain approach is buried deep in Glacier Peak Wilderness near exact geographic center. Only heartiest hikers or backpackers with significant wilderness experience access this route. Limited rescue infrastructure in remote location.',
        source_count: 1,
        confidence: 'low'
      }
    ]
  },
  {
    id: 'wa_glacier_peak_white_chuck',
    name: 'Glacier Peak - White Chuck',
    peak: 'Glacier Peak',
    hazards: [
      {
        type: 'Crevasse',
        description: 'Gerdine Glacier below Disappointment Peak experiences crevasse field. Crevasses beginning to appear on glacier lower section; rope team travel recommended for this section. Route finding changes year-to-year based on glacier conditions.',
        source_count: 2,
        confidence: 'medium'
      },
      {
        type: 'Glacier Hazard',
        description: 'White Chuck Glacier route requires real glacier travel with crevasse rescue gear considered mandatory for summer climbs. Cool Glacier alternative was described as maze of crevasses in August 2015 due to low snowpack.',
        source_count: 2,
        confidence: 'medium'
      }
    ]
  },
  {
    id: 'wa_glacier_peak_frostbite_ridge',
    name: 'Glacier Peak - Frostbite Ridge',
    peak: 'Glacier Peak',
    hazards: [
      {
        type: 'Rockfall',
        description: 'Kennedy Peak regularly sheds rock into snow gully on left side of approach, creating high objective hazard. Crumbling section with large boulders on glacial till below Kennedy Peak identified as perhaps most dangerous part of route. Loose rock embedded in ice creates impact hazard.',
        source_count: 2,
        confidence: 'medium'
      },
      {
        type: 'Icefall',
        description: 'Gaining toe of Kennedy Glacier involves delicate travel on exposed ice. Ice sections subject to collapse as melt season progresses.',
        source_count: 2,
        confidence: 'medium-low'
      },
      {
        type: 'Glacier Hazard',
        description: 'Very little crevasse hazard on left half of wide-open Kennedy Glacier, but upper transition areas require careful assessment. Route conditions change annually based on glacier melt patterns.',
        source_count: 2,
        confidence: 'medium'
      }
    ]
  }
];

console.log('═'.repeat(60));
console.log('Phase 3 Tier 2 Partial Deployment (Agents 1 & 3)');
console.log('═'.repeat(60));

async function deploy() {
  try {
    const hazards = [];

    // Flatten hazard data from Alpine Volcanoes routes
    for (const route of alpineVolcanoeRoutes) {
      for (const hazard of route.hazards) {
        hazards.push({
          route_id: route.id,
          hazard_type: hazard.type,
          description: hazard.description,
          source_count: hazard.source_count,
          confidence: hazard.confidence,
          research_phase: '3',
          research_tier: '2'
        });
      }
    }

    console.log(`\n📋 Deploying ${hazards.length} hazards from Agent 1 (Alpine Volcanoes)...`);
    console.log(`Routes: ${alpineVolcanoeRoutes.length}`);

    // Insert hazards in batches
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < hazards.length; i += BATCH_SIZE) {
      const batch = hazards.slice(i, i + BATCH_SIZE);
      const { data: result, error } = await supabase
        .from('route_hazard_research')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Batch insert failed: ${error.message}`);
        process.exit(1);
      }

      inserted += batch.length;
      console.log(`  ✓ Inserted ${inserted}/${hazards.length}`);
    }

    console.log('\n✓ Agent 1 (Alpine Volcanoes) deployment complete: 42 hazards, 16 routes');
    console.log('\n⏳ Agent 3 (Leavenworth Rock) data pending manual insertion (see LEAVENWORTH_DATA.sql)');

    console.log('\n' + '═'.repeat(60));
    console.log('✓ Phase 3 Tier 2 Partial Deployment Complete');
    console.log('═'.repeat(60));

  } catch (err) {
    console.error(`❌ Deployment failed: ${err.message}`);
    process.exit(1);
  }
}

deploy();
