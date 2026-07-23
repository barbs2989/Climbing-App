import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env2 = fs.readFileSync('.env', 'utf8');
const url = envLocal.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = env2.match(/SUPABASE_SERVICE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, serviceKey, { realtime: { transport: ws } });

async function fetchAll(table, select, extra) {
  let all = [], from = 0; const pageSize = 1000;
  while (true) {
    let q = supabase.from(table).select(select).order('id').range(from, from + pageSize - 1);
    if (extra) q = extra(q);
    const { data, error } = await q;
    if (error) { console.error(error); process.exit(1); }
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

const allAreas = await fetchAll('areas', 'id, name, path');
const waAreas = allAreas.filter(a => a.path && String(a.path).startsWith('usa.washington'));
const byId = Object.fromEntries(waAreas.map(a => [a.id, a]));

function areasUnderSegment(segmentId) {
  // any area whose path contains this segment id as a dot-delimited component
  return waAreas.filter(a => String(a.path).split('.').includes(segmentId)).map(a => a.id);
}

// ---- Region definitions ----
const REGIONS = [
  {
    name: 'Washington Pass corridor (USFS, no climbing permit)',
    areaIds: new Set(areasUnderSegment('wa_sub_wapass')),
    access: {
      permit: 'None required for day climbing',
      fees: 'None — no climbing permit fee (this is National Forest, not Mount Rainier NP)',
      rules: 'No climbing or wilderness permit required for day climbing. Dispersed camping capped at 10 days; no camping within ¼ mile of Cutthroat Lake; no campfires at dispersed sites; bear-resistant food storage required; dogs on leash ≤6 ft.',
      notes: 'Not inside North Cascades National Park — this corridor is entirely Okanogan-Wenatchee National Forest (Methow Valley Ranger District). No Mount Rainier-style climbing fee applies here.',
      seasonal: 'WA-20 (North Cascades Highway) closes gate-to-gate roughly early December–mid/late April; the entire Washington Pass corridor is car-inaccessible in winter.',
      group_limit: null,
      land_manager: 'Okanogan-Wenatchee National Forest (Methow Valley Ranger District)',
      parking_pass: 'Northwest Forest Pass required at Washington Pass Overlook, Blue Lake, and Cutthroat trailheads — $5/day or $30/annual (America the Beautiful pass also honored).',
    },
  },
  {
    name: 'North Cascades NP core / Boston Basin (NPS wilderness permit)',
    areaIds: new Set(areasUnderSegment('wa_north_cascades')),
    access: {
      permit: 'North Cascades NP wilderness/backcountry camping permit (required for any overnight stay; day climbs need none)',
      fees: '$10/person/night + a flat $6 nonrefundable reservation fee (charged mid-May–early Oct only; free the rest of the year). No separate climbing fee — North Cascades NP entrance itself is free.',
      rules: 'Group size capped at 6 in off-trail cross-country zones (which includes Boston Basin/Eldorado approaches; 12 in on-trail corridors). Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft, High Camp ~6,400 ft). Bear canisters required in some zones — free loaners at permit offices.',
      notes: '60% of sites (Boston Basin/Eldorado/Sulphide Glacier/etc.) are reservable in advance via Recreation.gov (2026 lottery Mar 2–13); the remaining 40% are walk-up, obtained in person the day before at the Wilderness Information Center in Marblemount.',
      seasonal: 'Cascade River Road (the access road for these trailheads) has a history of washouts/closures — check current NPS road-conditions page each season.',
      group_limit: 6,
      land_manager: 'National Park Service — North Cascades National Park (Stephen Mather Wilderness)',
      parking_pass: null,
    },
  },
  {
    name: 'Stuart-Enchantments (Alpine Lakes Wilderness, lottery zone)',
    areaIds: new Set(areasUnderSegment('wa_stuart_range')),
    access: {
      permit: 'Day climbs: free self-issue day-use permit at the trailhead — no lottery needed. Overnight camping inside the Enchantment Permit Area boundary: Enchantments overnight lottery permit (Recreation.gov).',
      fees: 'Day-use: free. Overnight lottery: $6 non-refundable application fee, then $5/person/night if selected. (Some approaches — e.g. Mount Stuart via Ingalls Creek/Longs Pass — fall entirely outside the Enchantment Permit Area and need only the free self-issue permit even overnight.)',
      rules: 'Overnight groups inside the permit boundary capped at 8 people, must camp together at one previously-impacted site, max 14 consecutive days, no re-entry same trip, permits non-transferable. Bear-resistant food storage mandatory forest-wide.',
      notes: '2026 lottery application window Feb 15–Mar 1 (results after Mar 17, accept/pay by Mar 31). ~25% of overnight slots also released as a walk-up daily lottery the day before entry. Season requiring the overnight permit: May 15–Oct 31. A single-day ascent with no camp inside the boundary never needs the lottery.',
      seasonal: null,
      group_limit: 8,
      land_manager: 'Okanogan-Wenatchee National Forest — Alpine Lakes Wilderness',
      parking_pass: 'Northwest Forest Pass required at Stuart Lake, Eightmile, and Snow Lakes trailheads — $5/day or $30/annual (overnight permit holders get a covering parking pass instead).',
    },
  },
  {
    name: 'Mount Adams (Gifford Pinchot NF)',
    areaIds: new Set(['wa_mount_adams']),
    access: {
      permit: 'Mt. Adams Climbing Pass (Recreation.gov) — required above 7,000 ft, May 1–Sept 30. Below 7,000 ft or off-season, a free self-issued Wilderness Permit at the trailhead suffices instead.',
      fees: '$20 per person (single-trip, not annual); free for climbers under 16.',
      rules: 'Group size capped at 12. Human waste must be packed out above 7,000 ft (blue/WAG bags) — free bags available at the Trout Lake Ranger District office, no collection service. The Mazama Glacier route and Bird Creek Meadows/Round-the-Mountain area cross Yakama Nation land and require a separate small tribal recreation permit purchased at Bird Creek Meadows — the standard South Climb/Cold Springs route stays on Forest Service land and does not.',
      notes: 'Purchase online in advance — no cell coverage at the trailhead, so print or save the pass. Party leader enters each climber’s name and a vehicle license plate.',
      seasonal: 'South Climb route typically opens as snow melts out around May.',
      group_limit: 12,
      land_manager: 'Gifford Pinchot National Forest (Mt. Adams Ranger District) — Mount Adams Wilderness',
      parking_pass: 'Cold Springs/South Climb Trailhead day-use fee: $5/vehicle/day or $30/year (a Northwest Forest Pass satisfies this; the Climbing Pass’s parking stub also covers it May 1–Sept 30).',
    },
  },
  {
    name: 'Mount Baker (MBS NF)',
    areaIds: new Set(['wa_mount_baker']),
    access: {
      permit: 'None required for day or overnight climbing — a self-issue climbing register exists at trailheads but is optional and free.',
      fees: 'None — no climbing fee (this is National Forest, not Mount Rainier NP)',
      rules: 'No camping below 6,000 ft except at designated tent pads; no camping within 1 mile of Mazama, Iceberg, Hayes, and Arbuthnot Lakes and several named trails. Campfires banned (stoves only) within 1 mile of ~17 listed trails, including Heliotrope Ridge. Pack out human waste (blue bags) — no burial or glacier deposition.',
      notes: 'No published numeric group-size cap for Baker specifically — don’t assume one.',
      seasonal: 'Baker Lake Road (FSR 11) and FSR 12 (Park Butte/Schriebers Meadow access) have had seasonal bridge-work closures — check current Forest Service alerts before a trip.',
      group_limit: null,
      land_manager: 'Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) — Mount Baker Wilderness',
      parking_pass: 'Northwest Forest Pass required at Heliotrope Ridge, Park Butte/Schriebers Meadow, and Lake Ann trailheads — $30/year or $5/day (WA Sno-Park permit substitutes Nov–Apr).',
    },
  },
  {
    name: 'Mount Shuksan (MBS NF approach / NPS upper mountain)',
    areaIds: new Set(['wa_mount_shuksan']),
    access: {
      permit: 'None required on the Forest Service approach. If camping overnight past the North Cascades NP boundary on the upper mountain, a free NPS backcountry permit is required (obtained at the Glacier/Marblemount ranger station).',
      fees: 'None — no climbing fee (Forest Service approach; free NPS permit only if camping overnight past the park boundary)',
      rules: 'Same MBS NF rules as Mount Baker (fire/camping setbacks near named trails/lakes, pack out human waste). No published numeric group-size cap found for Shuksan specifically.',
      notes: 'Dual land manager: the lower approach (Lake Ann Trail, Sulphide Glacier forest approach) is USFS; the summit, camps, and most of the upper route (Fisher Chimneys and Sulphide Glacier) are inside North Cascades National Park.',
      seasonal: 'Baker Lake Road (FSR 11) has had seasonal bridge-work closures affecting Shuksan-area access — check current Forest Service alerts before a trip.',
      group_limit: null,
      land_manager: 'Mt. Baker-Snoqualmie National Forest (approach) / National Park Service — North Cascades NP (upper mountain and summit)',
      parking_pass: 'Northwest Forest Pass required at Lake Ann trailhead — $30/year or $5/day.',
    },
  },
  {
    name: 'Glacier Peak Wilderness cluster (MBS NF)',
    areaIds: new Set([...areasUnderSegment('wa_glacier_peak_wilderness'), 'wa_vesper_peak', 'wa_morning_star_peak']),
    access: {
      permit: 'None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel.',
      fees: 'None — no climbing fee (National Forest wilderness, not Mount Rainier NP)',
      rules: 'Group size capped at 12 (people + stock combined) in Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft.',
      notes: null,
      seasonal: 'Mountain Loop Highway has a seasonal gate closure (Deer Creek–Bedal, ~14 mi), typically Nov–mid/late May. Suiattle River Road (FSR 26), the primary Glacier Peak access, has had storm-damage closures — check current conditions before a trip.',
      group_limit: 12,
      land_manager: 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) — Glacier Peak Wilderness',
      parking_pass: 'Northwest Forest Pass required at Mountain Loop Highway trailheads (e.g. Sunrise Mine TH for Vesper Peak) — $5/day or $30/year.',
    },
  },
  {
    name: 'Squire Creek Wall / Waterfall Basin (Boulder River Wilderness, MBS NF)',
    areaIds: new Set(['wa_waterfall_basin', 'wa_south_face']),
    access: {
      permit: 'None required — free self-issue wilderness permit available if needed.',
      fees: 'None — no climbing fee (National Forest wilderness, not Mount Rainier NP)',
      rules: 'Standard Boulder River Wilderness rules apply (no numeric group-size cap published — don’t assume Glacier Peak Wilderness’s 12-person limit applies here).',
      notes: 'Approached via a ~1.5 mi walk on a decommissioned logging road (Squire Creek Trail 654) — roadside-adjacent but still within a designated wilderness boundary for part of the approach.',
      seasonal: null,
      group_limit: null,
      land_manager: 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) — Boulder River Wilderness',
      parking_pass: 'Assume Northwest Forest Pass required at the trailhead (standard for MBS NF day-use trailheads) — $5/day or $30/year.',
    },
  },
  {
    name: 'Olympic National Park peaks',
    areaIds: new Set(['wa_mount_olympus', 'wa_mount_constance', 'wa_steeple_rock']),
    access: {
      permit: 'Wilderness/backcountry camping permit required for any overnight stay supporting the climb (day climbs need none). Reserved online via Recreation.gov — paper self-registration at trailheads has been discontinued.',
      fees: '$8/person/night (16+; free for 15 and under) + $6 non-refundable reservation fee per permit. An optional annual Wilderness Pass ($45/person) covers per-night fees for 12 months but not the $6 reservation fee.',
      rules: 'Group size capped at 12 people / 8 stock; groups of 7+ must use designated Group Sites. Bear-resistant food containers mandatory park-wide for overnight trips — free loaners at Wilderness Information Centers. Some approach corridors (e.g. Hoh River toward Olympus) have quota-limited camps.',
      notes: 'No separate climbing cost-recovery fee like Mount Rainier’s $82 — only the standard entrance fee and wilderness camping permit apply.',
      seasonal: null,
      group_limit: 12,
      land_manager: 'National Park Service — Olympic National Park (Olympic Wilderness)',
      parking_pass: 'Olympic NP entrance fee: $30/vehicle (7-day), $55 annual Olympic NP pass, or $80 America the Beautiful interagency annual pass.',
    },
  },
  {
    name: 'Pasayten Wilderness (Cathedral Peak, Amphitheater Mountain)',
    areaIds: new Set([...areasUnderSegment('wa_pasayten'), 'wa_amphitheatre_mountain']),
    access: {
      permit: 'Free, self-issue wilderness permit at the trailhead — no fee.',
      fees: 'None — no climbing fee (National Forest wilderness, not Mount Rainier NP)',
      rules: 'Group size capped at 12 people / 18 head of stock.',
      notes: null,
      seasonal: null,
      group_limit: 12,
      land_manager: 'Okanogan-Wenatchee National Forest — Pasayten Wilderness',
      parking_pass: 'Northwest Forest Pass required at trailheads (e.g. Andrews Creek, Chewuch River) — $5/day or $30/annual.',
    },
  },
  {
    name: 'Tatoosh Range (inside Mount Rainier NP, non-technical elevation)',
    areaIds: new Set(['wa_unicorn_peak', 'wa_lane_peak']),
    access: {
      permit: 'None required (below the 10,000 ft / glacier threshold that triggers Rainier’s climbing permit)',
      fees: 'None — no climbing cost-recovery fee; only the standard park entrance fee applies',
      rules: null,
      notes: 'Inside Mount Rainier National Park, but both summits are non-glaciated and well below the 10,000 ft/high-camp threshold that triggers Rainier’s climbing permit and $82 Climbing Cost Recovery Fee — neither applies here. Only the standard park entrance fee applies.',
      seasonal: null,
      group_limit: null,
      land_manager: 'National Park Service — Mount Rainier National Park',
      parking_pass: 'Standard Mount Rainier NP entrance fee: $30/vehicle (7 days), $55 Mount Rainier annual pass, or $80 America the Beautiful interagency annual pass.',
    },
  },
  {
    name: 'Snoqualmie Pass (Alpine Lakes Wilderness, MBS NF)',
    areaIds: new Set(['wa_guye_peak', 'wa_summer_fall_rock_2', 'wa_summer_fall_rock_3']),
    access: {
      permit: 'None required — free self-issue day-use permit at the trailhead (no quota for day use).',
      fees: 'None — no climbing fee (National Forest wilderness, not Mount Rainier NP)',
      rules: 'Standard USFS wilderness group-size limit of 12 people (combined with stock) per party.',
      notes: 'The Alpental approach road crosses private Alpental Community Club land — a rerouted public approach to the talus field is used following a 2021 access dispute; check current beta before relying on the old direct approach.',
      seasonal: 'Climbable roughly June–October; heavy winter snowfall and frequent avalanche control closures on I-90 affect access the rest of the year.',
      group_limit: 12,
      land_manager: 'Mt. Baker-Snoqualmie National Forest (Snoqualmie Ranger District) — Alpine Lakes Wilderness',
      parking_pass: 'Alpental/Snow Lake Trailhead day-use fee: $5/day, or a Northwest Forest Pass ($30/yr) / America the Beautiful pass.',
    },
  },
  {
    name: 'Skykomish Valley (MBS NF, no wilderness designation)',
    areaIds: new Set(['wa_half_moon_crag', 'wa_mount_index']),
    access: {
      permit: 'None required.',
      fees: 'None — no climbing fee (National Forest, not Mount Rainier NP)',
      rules: null,
      notes: 'Mount Index sits outside designated wilderness (adjacent to Wild Sky Wilderness) — administratively unrestricted despite being a serious Grade III+ alpine objective. Half Moon Crag is reached via an unofficial pulloff with no maintained trail and is not a developed fee site.',
      seasonal: null,
      group_limit: null,
      land_manager: 'Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)',
      parking_pass: 'Mount Index (Lake Serene/Bridal Veil Falls trailhead): Northwest Forest Pass or America the Beautiful pass required. Half Moon Crag: no fee site identified.',
    },
  },
  {
    name: 'The Dikes (Umatilla NF, SE Washington)',
    areaIds: new Set(['wa_dikes_the']),
    access: {
      permit: 'None found — treat as free dispersed roadside access.',
      fees: 'None found',
      rules: null,
      notes: 'A basalt "cordwood-jointed" dike/fin formation in the East Fork Touchet River valley off FS Rd 64, ~16-17 mi south of Dayton, WA. Unmaintained approach, seasonally snowed in late fall through spring.',
      seasonal: null,
      group_limit: null,
      land_manager: 'Umatilla National Forest (Walla Walla Ranger District)',
      parking_pass: null,
    },
  },
];

// ---- Apply ----
let totalUpdated = 0;
for (const region of REGIONS) {
  const areaIds = [...region.areaIds];
  if (!areaIds.length) { console.log('SKIP (no areas matched):', region.name); continue; }
  const routes = await fetchAll('routes', 'id, name, area_id, access', q => q.in('area_id', areaIds));
  console.log(`\n=== ${region.name} — ${areaIds.length} areas, ${routes.length} routes ===`);
  for (const r of routes) {
    const cur = r.access || {};
    // Merge: only fill fields that are null/missing/wrong-looking; never blank out something more specific already there
    const merged = { ...cur };
    for (const [k, v] of Object.entries(region.access)) {
      if (v == null) continue;
      const curVal = cur[k];
      const looksBad = curVal == null || typeof curVal === 'number' || /mount rainier climbing permit/i.test(String(curVal)) && region.name.indexOf('Tatoosh') === -1 && region.name.indexOf('Rainier') === -1;
      if (looksBad || curVal === '') merged[k] = v;
    }
    const { error } = await supabase.from('routes').update({ access: merged }).eq('id', r.id);
    if (error) console.error('FAILED', r.id, error);
    else { totalUpdated++; }
  }
  console.log(`Updated ${routes.length} routes in ${region.name}`);
}
console.log('\nTOTAL ROUTES UPDATED:', totalUpdated);
