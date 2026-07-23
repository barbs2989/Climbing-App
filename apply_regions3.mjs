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

const REGIONS = [
  {
    name: 'Mount St. Helens NVM',
    areaIds: new Set(['wa_mount_st_helens']),
    access: {
      permit: 'Climbing permit required year-round above 4,800 ft. Apr 1–Oct 31: purchase in advance on Recreation.gov (released the 1st of the prior month, first-come first-served, no lottery). Nov 1–Mar 31: free, self-issued at the trailhead, unlimited.',
      fees: '$20/climber/day + $6 non-refundable reservation fee (Apr 1–Oct 31); free Nov 1–Mar 31.',
      rules: 'Group size capped at 12. Stay at least 30 ft back from the crater rim — cornices are unstable and have caused fatalities; entry into the crater is strictly prohibited. Blue bags required for human waste above treeline.',
      notes: 'Daily quota: 350 climbers/day (Apr 1–May 14), 110 climbers/day (May 15–Oct 31). This is a distinct fee/permit system from both Mount Rainier’s $82 Climbing Cost Recovery Fee and Mount Adams’ $20 Climbing Pass — do not conflate them.',
      seasonal: null,
      group_limit: 12,
      land_manager: 'U.S. Forest Service — Mount St. Helens National Volcanic Monument (Gifford Pinchot National Forest)',
      parking_pass: '$5/day/vehicle at Climber’s Bivouac, waived with a valid climbing permit.',
    },
  },
  {
    name: 'Goat Rocks Wilderness (Old Snowy Mountain, Gilbert Peak)',
    areaIds: new Set(['wa_old_snowy_mountain', 'wa_gilbert_peak']),
    access: {
      permit: 'None required — free self-issue wilderness permit at the trailhead.',
      fees: 'None — no climbing fee (National Forest wilderness, not Mount Rainier NP)',
      rules: 'Group size capped at 12 (people + stock combined) per 36 CFR 261.58(f).',
      notes: 'Straddles Gifford Pinchot NF (west) and Okanogan-Wenatchee NF (east, White Pass side); the standard approach (Snowgrass Flat, Berry Patch trailheads) is on the Gifford Pinchot side.',
      seasonal: null,
      group_limit: 12,
      land_manager: 'Gifford Pinchot National Forest (Cowlitz Valley Ranger District) — Goat Rocks Wilderness',
      parking_pass: 'Not required at Snowgrass Flat; required at Berry Patch trailhead — $5/day or $30/year Northwest Forest Pass.',
    },
  },
  {
    name: 'Tatoosh Range extras (Eagle Peak, The Castle) — inside Rainier NP, non-technical',
    areaIds: new Set(['wa_eagle_peak', 'wa_castle_the']),
    access: {
      permit: 'None required (below the 10,000 ft / glacier threshold that triggers Rainier’s climbing permit)',
      fees: 'None — no climbing cost-recovery fee; only the standard park entrance fee applies',
      rules: null,
      notes: 'Inside Mount Rainier National Park (not the adjacent Gifford Pinchot Tatoosh Wilderness), but both are non-glaciated scrambles under 6,000 ft — well below the threshold that triggers Rainier’s climbing permit and $82 fee. Only a backcountry camping permit is needed for an overnight stay.',
      seasonal: null,
      group_limit: null,
      land_manager: 'National Park Service — Mount Rainier National Park',
      parking_pass: 'Standard Mount Rainier NP entrance fee: $30/vehicle (7 days), $55 Mount Rainier annual pass, or $80 America the Beautiful interagency annual pass.',
    },
  },
  {
    name: 'Pinto Rock (Gifford Pinchot NF, non-wilderness crag)',
    areaIds: new Set(['wa_north_side', 'wa_west_face_6']),
    access: {
      permit: 'None required.',
      fees: 'None — no climbing fee (National Forest day-use crag, not designated wilderness)',
      rules: null,
      notes: 'A ~400 ft welded-tuff crag near Randle, WA — not designated wilderness, a bolted sport/trad crag.',
      seasonal: null,
      group_limit: null,
      land_manager: 'Gifford Pinchot National Forest (Cowlitz Valley Ranger District)',
      parking_pass: null,
    },
  },
  {
    name: 'Goose Egg Mountain / Tieton River Canyon',
    areaIds: new Set(['wa_goose_egg_mountain']),
    access: {
      permit: 'None required.',
      fees: 'None — no climbing fee (National Forest day-use crag, not designated wilderness)',
      rules: null,
      notes: 'A popular multi-pitch basalt crag with hundreds of bolted routes — outside any wilderness boundary.',
      seasonal: null,
      group_limit: null,
      land_manager: 'Okanogan-Wenatchee National Forest (Naches Ranger District)',
      parking_pass: null,
    },
  },
  {
    name: 'Teanaway (Ingalls Peak, outside Enchantment Permit Area)',
    areaIds: new Set(['wa_ingalls_peak', 'wa_ingalls_peak_east']),
    access: {
      permit: 'Wilderness permit required, but free self-issue at the trailhead — no lottery, no fee (outside the Enchantment Permit Area boundary, which only covers the Snow Lakes/Stuart Lake/Eightmile Lake trailheads off Icicle Creek).',
      fees: 'None — no climbing fee (free self-issue wilderness permit only)',
      rules: 'Group size capped at 12 (combined with pack/saddle stock) — standard Alpine Lakes Wilderness-wide limit.',
      notes: null,
      seasonal: null,
      group_limit: 12,
      land_manager: 'Okanogan-Wenatchee National Forest — Alpine Lakes Wilderness',
      parking_pass: 'Esmeralda/Ingalls Way trailhead day-use fee: $5/vehicle/day or $30/year (Northwest Forest Pass or Interagency Pass).',
    },
  },
  {
    name: 'Western Alpine Lakes (Lemah Mountain, Overcoat Peak, Little Big Chief)',
    areaIds: new Set(['wa_lemah_mountain', 'wa_overcoat_peak', 'wa_little_big_chief']),
    access: {
      permit: 'Wilderness permit required, but free self-issue at the trailhead (May 15–Oct 31) — no lottery, no fee.',
      fees: 'None — no climbing fee (free self-issue wilderness permit only)',
      rules: 'Group size capped at 12 (combined with pack/saddle stock); groups over 12 must split into separate parties spaced ≥1 mile apart.',
      notes: 'The west side of Alpine Lakes Wilderness — jointly managed with Mt. Baker-Snoqualmie National Forest holding the western portion these peaks sit in (trailheads themselves may be administered by either forest).',
      seasonal: null,
      group_limit: 12,
      land_manager: 'Mt. Baker-Snoqualmie National Forest / Okanogan-Wenatchee National Forest — Alpine Lakes Wilderness',
      parking_pass: 'Northwest Forest Pass required at Salmon La Sac, Pete Lake, and Necklace Valley trailheads — $5/day or $30/year.',
    },
  },
  {
    name: 'Entiat Mountains (Bonanza, Fortress, Chiwawa, Maude, Dark Peak)',
    areaIds: new Set(['wa_bonanza_peak', 'wa_fortress_mountain', 'wa_chiwawa_mountain', 'wa_mount_maude', 'wa_dark_peak']),
    access: {
      permit: 'None required — free self-issue wilderness permit at the trailhead, no reservation.',
      fees: 'None — no climbing fee (National Forest wilderness, not Mount Rainier NP)',
      rules: 'Group size capped at 12 (people + stock combined) — same Glacier Peak Wilderness system that covers Glacier Peak itself (one contiguous wilderness spanning both Mt. Baker-Snoqualmie and Okanogan-Wenatchee National Forests).',
      notes: null,
      seasonal: null,
      group_limit: 12,
      land_manager: 'Okanogan-Wenatchee National Forest (Chiwawa/Entiat Ranger Districts) — Glacier Peak Wilderness',
      parking_pass: 'Northwest Forest Pass required at some trailheads (fee day-use sites) — $5/day or $30/year.',
    },
  },
  {
    name: 'Nason Ridge / Chiwaukum (non-wilderness)',
    areaIds: new Set(['wa_alpine_lookout', 'wa_mount_howard']),
    access: {
      permit: 'None required — not designated wilderness.',
      fees: 'None — no climbing fee',
      rules: null,
      notes: 'Nason Ridge sits north of US-2, separate from the Alpine Lakes Wilderness boundary to the south — no wilderness permit applies.',
      seasonal: null,
      group_limit: null,
      land_manager: 'Okanogan-Wenatchee National Forest',
      parking_pass: 'Northwest Forest Pass likely required at developed trailheads (e.g. Alpine Lookout via FR 6910) — $5/day or $30/year.',
    },
  },
  {
    name: 'Stehekin (Flora Mountain)',
    areaIds: new Set(['wa_flora_mountain']),
    access: {
      permit: 'None required at the actual climbing/camping location — free self-issue USFS wilderness permit (the approach exits Lake Chelan National Recreation Area about 2.2 mi in and enters Glacier Peak Wilderness, where the peak itself sits).',
      fees: 'None — no climbing fee',
      rules: 'Group size capped at 12 in the Glacier Peak Wilderness portion.',
      notes: 'Mixed jurisdiction: the lower Stehekin valley near the boat/floatplane landing is NPS (Lake Chelan NRA); if a party camps at an NPS-side site en route, an NPS backcountry permit would apply for that night specifically.',
      seasonal: null,
      group_limit: 12,
      land_manager: 'U.S. Forest Service — Glacier Peak Wilderness (approach partly crosses NPS Lake Chelan National Recreation Area)',
      parking_pass: null,
    },
  },
  {
    name: 'Chelan Butte (WDFW state land)',
    areaIds: new Set(['wa_chelan_butte']),
    access: {
      permit: 'None required.',
      fees: null,
      rules: 'No wilderness restrictions — a day-hike/trail-running area.',
      notes: null,
      seasonal: null,
      group_limit: null,
      land_manager: 'Washington Department of Fish and Wildlife — Chelan Butte Wildlife Area (state land, not USFS or BLM)',
      parking_pass: 'Discover Pass (Washington state parking pass) required, not a Northwest Forest Pass.',
    },
  },
  {
    name: 'Hook Creek Drainage (Icicle Creek, outside Enchantment lottery)',
    areaIds: new Set(['wa_hook_creek_drainage']),
    access: {
      permit: 'None required — outside the Enchantment Permit Area boundary (that zone is higher up-valley: Snow, Colchuck, Core, Stuart, Eightmile/Caroline zones).',
      fees: 'None — no climbing fee',
      rules: null,
      notes: 'A low-elevation rock-climbing crag area accessed via lower Icicle Creek Road near Leavenworth. The approach crosses private property with a posted no-trespassing bridge — an access/legal concern, not a permit issue; an alternate ford exists downstream.',
      seasonal: null,
      group_limit: null,
      land_manager: 'Okanogan-Wenatchee National Forest',
      parking_pass: null,
    },
  },
];

let totalUpdated = 0;
for (const region of REGIONS) {
  const areaIds = [...region.areaIds];
  const routes = await fetchAll('routes', 'id, name, area_id, access', q => q.in('area_id', areaIds));
  console.log(`\n=== ${region.name} — ${areaIds.length} areas, ${routes.length} routes ===`);
  for (const r of routes) {
    const cur = r.access || {};
    const merged = { ...cur };
    for (const [k, v] of Object.entries(region.access)) {
      if (v == null) continue;
      const curVal = cur[k];
      const looksBad = curVal == null || curVal === '' || typeof curVal === 'number' ||
        (region.name.indexOf('Rainier') === -1 && region.name.indexOf('Tatoosh') === -1 && /mount rainier climbing permit/i.test(String(curVal)));
      if (looksBad) merged[k] = v;
    }
    const { error } = await supabase.from('routes').update({ access: merged }).eq('id', r.id);
    if (error) console.error('FAILED', r.id, error);
    else totalUpdated++;
  }
  console.log(`Updated ${routes.length} routes in ${region.name}`);
}
console.log('\nTOTAL ROUTES UPDATED (pass 3):', totalUpdated);
