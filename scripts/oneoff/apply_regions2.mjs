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

function areasUnderSegment(segmentId) {
  return waAreas.filter(a => String(a.path).split('.').includes(segmentId)).map(a => a.id);
}

const RAINIER_ACCESS = {
  permit: "Mount Rainier Climbing Permit (required above 10,000 ft or on any glacier)",
  fees: "$82 per person — Climbing Cost Recovery Fee (2026 rate). Annual: covers unlimited climbs that calendar year. Separate from the park entrance fee.",
  rules: "Blue bags required for human waste above high camp — pack out and deposit only in barrels marked \"Human Waste\" at Camp Muir or the trailhead; do not cache on-route. Check-out is required after every climb.",
  notes: "How to get it: pay online in advance (pay.gov / recreation.gov), then register in person. Winter (Sept 16–May 21): self-issue at the Paradise Old Station kiosk after paying online. Summer (May 22–Sept 30): no self-issue — register at a Wilderness Information Center (Longmire, Paradise, or White River); roughly half of summer registration slots are held for walk-up, up to 24 hrs ahead. No timed-entry vehicle reservation is in effect for the 2026 season, so park entry itself is first-come, first-served.",
  group_limit: 12,
  land_manager: "National Park Service",
  parking_pass: "Not a Northwest Forest Pass (that's a USFS pass and doesn't apply inside the park). Standard NPS entrance fee applies: $30/vehicle (7 consecutive days), $55 Mount Rainier annual pass, or $80 America the Beautiful interagency annual pass.",
};

const NCNP_ACCESS = {
  permit: 'North Cascades NP wilderness/backcountry camping permit (required for any overnight stay; day climbs need none)',
  fees: '$10/person/night + a flat $6 nonrefundable reservation fee (charged mid-May–early Oct only; free the rest of the year). No separate climbing fee — North Cascades NP entrance itself is free.',
  rules: 'Group size capped at 6 in off-trail cross-country zones (which includes most Picket Range/Boston Basin/Eldorado approaches; 12 in on-trail corridors). Bear canisters required in some zones — free loaners at permit offices.',
  notes: '60% of sites are reservable in advance via Recreation.gov (2026 lottery Mar 2–13); the remaining 40% are walk-up, obtained in person the day before at the Wilderness Information Center in Marblemount.',
  group_limit: 6,
  land_manager: 'National Park Service — North Cascades National Park (Stephen Mather Wilderness)',
  parking_pass: null,
};

const SKYKOMISH_ACCESS = {
  permit: 'None required.',
  fees: 'None — no climbing fee (National Forest, not Mount Rainier NP)',
  rules: null,
  notes: 'Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.',
  group_limit: null,
  land_manager: 'Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)',
  parking_pass: 'Northwest Forest Pass or America the Beautiful pass required at developed trailheads.',
};

const SNOQUALMIE_ACCESS = {
  permit: 'None required — free self-issue day-use permit at the trailhead (no quota for day use).',
  fees: 'None — no climbing fee (National Forest wilderness, not Mount Rainier NP)',
  rules: 'Standard USFS wilderness group-size limit of 12 people (combined with stock) per party where the peak is inside Alpine Lakes Wilderness.',
  notes: 'Climbable roughly June–October; heavy winter snowfall and frequent avalanche control closures on I-90 affect access the rest of the year.',
  group_limit: 12,
  land_manager: 'Mt. Baker-Snoqualmie National Forest (Snoqualmie Ranger District)',
  parking_pass: 'Northwest Forest Pass ($30/yr) or America the Beautiful pass, or a $5/day pass at developed trailheads.',
};

const BAKER_NEIGHBORS_ACCESS = {
  permit: 'None required — a self-issue climbing register may exist at some trailheads but is optional and free.',
  fees: 'None — no climbing fee (National Forest, not Mount Rainier NP)',
  rules: 'Pack out human waste (blue bags) — no burial or glacier deposition. Some approaches cross into North Cascades National Park land on the upper mountain, where a free NPS backcountry permit is required only if camping overnight past the boundary.',
  notes: null,
  group_limit: null,
  land_manager: 'Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) — Mount Baker Wilderness, with some upper routes crossing into North Cascades National Park',
  parking_pass: 'Northwest Forest Pass required at most trailheads — $30/year or $5/day.',
};

const OLYMPIC_ACCESS = {
  permit: 'Wilderness/backcountry camping permit required for any overnight stay supporting the climb (day climbs need none). Reserved online via Recreation.gov — paper self-registration at trailheads has been discontinued.',
  fees: '$8/person/night (16+; free for 15 and under) + $6 non-refundable reservation fee per permit. An optional annual Wilderness Pass ($45/person) covers per-night fees for 12 months but not the $6 reservation fee.',
  rules: 'Group size capped at 12 people / 8 stock; groups of 7+ must use designated Group Sites. Bear-resistant food containers mandatory park-wide for overnight trips — free loaners at Wilderness Information Centers.',
  notes: 'No separate climbing cost-recovery fee like Mount Rainier’s $82 — only the standard entrance fee and wilderness camping permit apply.',
  group_limit: 12,
  land_manager: 'National Park Service — Olympic National Park (Olympic Wilderness)',
  parking_pass: 'Olympic NP entrance fee: $30/vehicle (7-day), $55 annual Olympic NP pass, or $80 America the Beautiful interagency annual pass.',
};

const PASAYTEN_ACCESS = {
  permit: 'Free, self-issue wilderness permit at the trailhead — no fee.',
  fees: 'None — no climbing fee (National Forest wilderness, not Mount Rainier NP)',
  rules: 'Group size capped at 12 people / 18 head of stock.',
  notes: null,
  group_limit: 12,
  land_manager: 'Okanogan-Wenatchee National Forest — Pasayten Wilderness',
  parking_pass: 'Northwest Forest Pass required at trailheads — $5/day or $30/annual.',
};

const GLACIER_PEAK_REGION_ACCESS = {
  permit: 'None required — free self-issue wilderness permits available at trailheads/ranger stations for day/overnight travel where the peak is inside designated wilderness.',
  fees: 'None — no climbing fee (National Forest, not Mount Rainier NP)',
  rules: 'Group size capped at 12 (people + stock combined) inside Glacier Peak Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft in wilderness.',
  notes: null,
  group_limit: 12,
  land_manager: 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)',
  parking_pass: 'Northwest Forest Pass required at Mountain Loop Highway trailheads — $5/day or $30/year.',
};

const REGIONS = [
  {
    name: 'Picket Range (North Cascades NP — includes Elephant Butte, Mount Triumph)',
    areaIds: new Set(areasUnderSegment('wa_picket_range')),
    access: NCNP_ACCESS,
  },
  {
    name: 'Mount Rainier satellite summits (Little Tahoma, Liberty Cap, Point Success)',
    areaIds: new Set(['wa_little_tahoma', 'wa_liberty_cap', 'wa_point_success']),
    access: RAINIER_ACCESS,
  },
  {
    name: 'Skykomish / Stevens Pass region (broader)',
    areaIds: new Set(areasUnderSegment('wa_stevens_pass_region')),
    access: SKYKOMISH_ACCESS,
  },
  {
    name: 'Snoqualmie Pass / I-90 region (broader)',
    areaIds: new Set(areasUnderSegment('wa_snoqualmie_i90_region')),
    access: SNOQUALMIE_ACCESS,
  },
  {
    name: 'Shuksan/Baker neighbors (Twin Sisters, Nooksack Tower, etc.)',
    areaIds: new Set(areasUnderSegment('wa_shuksan_baker_neighbors')),
    access: BAKER_NEIGHBORS_ACCESS,
  },
  {
    name: 'Olympic National Park (all sub-regions)',
    areaIds: new Set(areasUnderSegment('wa_olympic_np')),
    access: OLYMPIC_ACCESS,
  },
  {
    name: 'Pasayten Wilderness (broader segment incl. Mt Remmel)',
    areaIds: new Set(areasUnderSegment('wa_pasayten_wilderness')),
    access: PASAYTEN_ACCESS,
  },
  {
    name: 'Glacier Peak region (broader — Darrington/Mountain Loop Hwy)',
    areaIds: new Set(areasUnderSegment('wa_glacier_peak_region')),
    access: GLACIER_PEAK_REGION_ACCESS,
  },
];

let totalUpdated = 0;
for (const region of REGIONS) {
  const areaIds = [...region.areaIds];
  if (!areaIds.length) { console.log('SKIP (no areas matched):', region.name); continue; }
  const routes = await fetchAll('routes', 'id, name, area_id, access', q => q.in('area_id', areaIds));
  console.log(`\n=== ${region.name} — ${areaIds.length} areas, ${routes.length} routes ===`);
  for (const r of routes) {
    const cur = r.access || {};
    const merged = { ...cur };
    for (const [k, v] of Object.entries(region.access)) {
      if (v == null) continue;
      const curVal = cur[k];
      const looksBad = curVal == null || curVal === '' || typeof curVal === 'number' ||
        (region.name.indexOf('Rainier') === -1 && /mount rainier climbing permit/i.test(String(curVal)));
      if (looksBad) merged[k] = v;
    }
    const { error } = await supabase.from('routes').update({ access: merged }).eq('id', r.id);
    if (error) console.error('FAILED', r.id, error);
    else totalUpdated++;
  }
  console.log(`Updated ${routes.length} routes in ${region.name}`);
}
console.log('\nTOTAL ROUTES UPDATED (pass 2):', totalUpdated);
