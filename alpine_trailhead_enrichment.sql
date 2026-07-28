-- Alpine Route Trailhead Direction Enrichment
-- Generated: 2026-07-27
-- 7 WA alpine routes with complete trailhead/approach documentation
-- Run in Supabase SQL Editor after verifying route IDs match your database

BEGIN TRANSACTION;

-- ============================================================================
-- 1. Mount Goode - Northeast Buttress
-- Research: Bridge Creek Trailhead via PCT, 22km approach, 6 hours
-- ============================================================================
UPDATE routes
SET
  approach_logistics = '{
    "trailhead": "Bridge Creek Trailhead (Rainy Pass)",
    "trailheadDirection": "South-southeast via Pacific Crest Trail (PCT) descent, then east up North Fork Bridge Creek",
    "trailheadLat": 48.5075,
    "trailheadLng": -120.7312,
    "peakLat": 48.48291,
    "peakLng": -120.9108
  }'::jsonb,
  approach = 'South-southeast via Pacific Crest Trail (PCT) descent, then east up North Fork Bridge Creek',
  dist_km = 22,
  gain_ft = 6001,
  beta = 'Grade III-IV alpine rock route with 5.4-5.5 climbing. Approach via 10-mile PCT descent to Bridge Creek junction, then 3-4 miles up North Fork Bridge Creek to base camp. Route ascends the Northeast Buttress with glacier travel, scrambling (3rd-4th class), and rock pitches up to 5.5. Total trip: 3-4 days recommended.',
  timing = jsonb_set(coalesce(timing, '{}'::jsonb), '{approachTimeHrs}', '6'),
  access = jsonb_set(coalesce(access, '{}'::jsonb), '{notes}', '"Backcountry permit required ($10 + $6 fee) from North Cascades Visitor Center in Marblemount. Best climbing season: late July through September. Located within North Cascades National Park. Large paved parking available at trailhead."')
WHERE id = 'wa_mount_goode_northeast_buttress'
   OR (name ILIKE '%Goode%' AND name ILIKE '%Northeast%');

-- ============================================================================
-- 2. Forbidden Peak - North Ridge
-- Research: Boston Basin Trailhead, 6km approach, 3.5 hours, 3800 ft gain
-- ============================================================================
UPDATE routes
SET
  approach_logistics = '{
    "trailhead": "Boston Basin Trailhead",
    "trailheadDirection": "North-northeast via glacier traversals",
    "trailheadLat": 48.48055,
    "trailheadLng": -121.07979,
    "peakLat": 48.5114,
    "peakLng": -121.0578
  }'::jsonb,
  approach = 'North-northeast via glacier traversals. From Boston Basin parking, hike to Boston Basin high camp (~5700 ft). Traverse moraine and west edge of Quien Sabe Glacier to 7,500 ft. Climb to Sharkfin Col (7,720 ft).',
  dist_km = 6.0,
  gain_ft = 3800,
  beta = 'Grade III, 5.7 climbing. From Boston Basin high camp, traverse glacier to Sharkfin Col via 10 feet of 5.7 rock and 200 feet of Class 3 gully. Northeast ridge route at ~7,700 ft to summit. Moderate to good granite, high exposure with wonderful ridge position. Glaciers: Quien Sabe Glacier, Boston Glacier.',
  timing = jsonb_set(coalesce(timing, '{}'::jsonb), '{approachTimeHrs}', '3.5'),
  access = jsonb_set(coalesce(access, '{}'::jsonb), '{notes}', '"Register at Marblemount Ranger Station. Seasonal: July-September (summer/early fall). Required skills: Crevasse rescue, glacier travel. Hazards: Glacier travel, crevasses, exposure on ridge."')
WHERE id LIKE '%forbidden%north%'
   OR (name ILIKE '%Forbidden%' AND name ILIKE '%North%');

-- ============================================================================
-- 3. Cutthroat Peak - North Ridge
-- Research: Pacific Crest Trailhead at Rainy Pass, 2km approach, 1.5 hours
-- ============================================================================
UPDATE routes
SET
  approach_logistics = '{
    "trailhead": "Pacific Crest Trailhead at Rainy Pass",
    "trailheadDirection": "South-southwest via open timber basin",
    "trailheadLat": 48.5564,
    "trailheadLng": -120.6547,
    "peakLat": 48.5264,
    "peakLng": -120.7036
  }'::jsonb,
  approach = 'South-southwest via open timber basin. From PCT trailhead, hike south on PCT for ~20 minutes, leave trail at small stream bed. Ascend steeply through open timber to basin northwest of peak.',
  dist_km = 2.0,
  gain_ft = 2500,
  beta = 'Grade II, 5.7 climbing. Short approach from highway. Rock improves significantly higher on ridge. Fair granite in approach, improves on ridge. Moderate exposure. Quick alpine climb from Rainy Pass. Uncrowded route.',
  timing = jsonb_set(coalesce(timing, '{}'::jsonb), '{approachTimeHrs}', '1.5'),
  access = jsonb_set(coalesce(access, '{}'::jsonb), '{notes}', '"No permits required. Small unpaved parking lot at Rainy Pass trailhead. Seasonal: June-October. Hazards: Steep terrain, loose rock in approach gully, exposure."')
WHERE id LIKE '%cutthroat%'
   OR (name ILIKE '%Cutthroat%' AND name ILIKE '%North%');

-- ============================================================================
-- 4. Mount Shuksan - White Salmon Glacier
-- Research: Lake Ann Trailhead (Austin Pass), 7.2km approach, 2.5 hours
-- ============================================================================
UPDATE routes
SET
  approach_logistics = '{
    "trailhead": "Lake Ann Trailhead (Austin Pass)",
    "trailheadDirection": "South to Lake Ann, then west to glacier camp",
    "trailheadLat": 48.8502,
    "trailheadLng": -121.6861,
    "peakLat": 48.8611,
    "peakLng": -121.8194
  }'::jsonb,
  approach = 'South to Lake Ann, then west to glacier camp. Hike Lake Ann Trail south over Austin Pass (4,700 ft). At ~2 miles cross small creek, hike up small stream and over ridge to Lake Ann. Continue to high camp at ~6,500 ft on moraine above White Salmon Glacier.',
  dist_km = 7.2,
  gain_ft = 1900,
  beta = 'Grade II-III alpine ice/mixed route, up to 50-degree ice. Route to summit via Winnies Slide (50+ degree ice) or Fisher Chimneys junction. Mixed rock and ice. High exposure with steep glacier headwall. Active Hanging Glacier avalanches. Bergschrunds, steep ice (50+ degrees), crevasses.',
  timing = jsonb_set(coalesce(timing, '{}'::jsonb), '{approachTimeHrs}', '2.5'),
  access = jsonb_set(coalesce(access, '{}'::jsonb), '{notes}', '"No permits required. North Cascades National Park. Seasonal: July-September (Artist Point road closed after first snow Sept-Nov, reopens by July). Required skills: Alpine ice climbing, crevasse rescue."')
WHERE id LIKE '%shuksan%white%salmon%'
   OR (name ILIKE '%Shuksan%' AND name ILIKE '%White%Salmon%');

-- ============================================================================
-- 5. Glacier Peak - Spider Glacier
-- Research: Phelps Creek Trailhead, 13.5km approach, 4 hours, 3500 ft gain
-- ============================================================================
UPDATE routes
SET
  approach_logistics = '{
    "trailhead": "Phelps Creek Trailhead",
    "trailheadDirection": "East-southeast via Phelps Creek valley to Spider Meadow, then north to Spider Gap",
    "trailheadLat": 48.0830,
    "trailheadLng": -120.8349,
    "peakLat": 48.1097,
    "peakLng": -121.1117
  }'::jsonb,
  approach = 'East-southeast via Phelps Creek valley to Spider Meadow, then north to Spider Gap and glacier. Follow Phelps Creek Trail (7.2 miles) up valley alongside Phelps Creek through dense forest. Reach Spider Meadow at ~5,000 ft. Ascend 1.2 miles to Spider Gap (7,040 ft) via steep loose rock fields.',
  dist_km = 13.5,
  gain_ft = 3500,
  beta = 'Grade II-III alpine ice/rock route. Spider Gap connects Spider Meadow to Lyman Lakes traverse (part of Glacier Peak Circumnavigation). Loose scree fields, poor rock quality. Moderate exposure on approach, high on glacier. No maintained trail to Spider Gap. Requires route finding, alpine scrambling, glacier travel.',
  timing = jsonb_set(coalesce(timing, '{}'::jsonb), '{approachTimeHrs}', '4.0'),
  access = jsonb_set(coalesce(access, '{}'::jsonb), '{notes}', '"No permits required. Glacier Peak Wilderness. Seasonal: July-September (snow persists into summer). Hazards: Avalanches from hanging glaciers, loose scree fields, crevasses on glacier, poor visibility in storms, river crossings."')
WHERE id LIKE '%glacier_peak%spider%'
   OR (name ILIKE '%Glacier Peak%' AND name ILIKE '%Spider%');

-- ============================================================================
-- 6. Mount Baker - Park Glacier
-- Research: Artist Point Trailhead, 8km approach, 3.5 hours, 1840 ft gain
-- ============================================================================
UPDATE routes
SET
  approach_logistics = '{
    "trailhead": "Artist Point Trailhead",
    "trailheadDirection": "Southeast via Chain Lakes Trail to Ptarmigan Ridge",
    "trailheadLat": 48.8465,
    "trailheadLng": -121.6928,
    "peakLat": 48.7769,
    "peakLng": -121.8142
  }'::jsonb,
  approach = 'Southeast via Chain Lakes Trail to Ptarmigan Ridge. From Artist Point parking, take Chain Lakes Trail (682) to Ptarmigan Ridge Trail (682.1) junction. Continue 3 miles east to Coleman Pinnacle base, then 0.5 miles to Camp Kiser (~7,000 ft).',
  dist_km = 8.0,
  gain_ft = 1840,
  beta = 'Grade II glacier travel with crevasse rescue. Longest climb of the northern approaches. From Camp Kiser, primitive boot path leads to Park Glacier and climbing terrain. High exposure with extensive glacier and numerous crevasses. 100+ km² of glaciers and permanent snowfields; iciest mountain in Cascade Range.',
  timing = jsonb_set(coalesce(timing, '{}'::jsonb), '{approachTimeHrs}', '3.5'),
  access = jsonb_set(coalesce(access, '{}'::jsonb), '{notes}', '"Recreation Pass required at Artist Point trailhead. Seasonal: Late June-September (road closed after first snow). Party size limit: 12. No campfires or potable water at trailhead. Glacier Public Service Center: (360) 599-2714. Hazards: Crevasses (major danger), heavy snow/avalanche in early season, broken glacier mid-late summer. Best early season (June-July) before glacier becomes heavily crevassed."')
WHERE id LIKE '%baker%park%glacier%'
   OR (name ILIKE '%Baker%' AND name ILIKE '%Park%Glacier%');

-- ============================================================================
-- 7. Mount Redoubt - South/Southwest Approach
-- Research: Depot Creek Trailhead (British Columbia), 17.7km, 5 hours, 5000 ft gain
-- ============================================================================
UPDATE routes
SET
  approach_logistics = '{
    "trailhead": "Depot Creek Road Trailhead (British Columbia side)",
    "trailheadDirection": "Southeast via Depot Creek and Redoubt Glacier",
    "trailheadLat": 49.0217,
    "trailheadLng": -121.2542,
    "peakLat": 48.9581,
    "peakLng": -121.3018
  }'::jsonb,
  approach = 'Southeast via Depot Creek and Redoubt Glacier. International border crossing required (Canadian side). Approach via Depot Glacier to Redoubt Glacier.',
  dist_km = 17.7,
  gain_ft = 5000,
  beta = 'Grade II-III alpine rock/glacier route, up to 5.7 rock and 60-degree ice possible. Two documented routes: 1) Northeast Face - 60-degree ice plus low 5th class rock (Grade III); 2) South route - glacier walk plus scree/snow slopes to summit (Grade II). Skagit Gneiss - poor quality rock. High exposure on Northeast Face route.',
  timing = jsonb_set(coalesce(timing, '{}'::jsonb), '{approachTimeHrs}', '5.0'),
  access = jsonb_set(coalesce(access, '{}'::jsonb), '{notes}', '"No permits required but requires crossing into British Columbia, Canada; US citizens need valid passport. Seasonal: July-September. Hazards: Steep ice (60+ degrees), low 5th class rock, avalanche potential, remote location. Required skills: Alpine ice climbing, rock scrambling, glacier travel. Chilliwack River Road is remote and narrow."')
WHERE id LIKE '%redoubt%'
   OR (name ILIKE '%Redoubt%' AND (name ILIKE '%South%' OR name ILIKE '%Southwest%'));

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after applying updates to verify data was applied correctly

-- SELECT name, approach, dist_km, gain_ft, approach_logistics FROM routes
-- WHERE name ILIKE '%Goode%Northeast%' OR name ILIKE '%Forbidden%North%'
--    OR name ILIKE '%Cutthroat%North%' OR name ILIKE '%Shuksan%White%'
--    OR name ILIKE '%Spider%Glacier%' OR name ILIKE '%Baker%Park%'
--    OR name ILIKE '%Redoubt%';
