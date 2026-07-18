import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'fs';
const envLocal = fs.readFileSync('.env.local', 'utf8');
const env2 = fs.readFileSync('.env', 'utf8');
const url = envLocal.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = env2.match(/SUPABASE_SERVICE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, serviceKey, { realtime: { transport: ws } });

const WA_PASS_ACCESS = {
  permit: 'None required for day climbing',
  fees: 'None — no climbing permit fee (this is National Forest, not Mount Rainier NP)',
  rules: 'No climbing or wilderness permit required for day climbing. Dispersed camping capped at 10 days; bear-resistant food storage required.',
  notes: 'Not inside North Cascades National Park — this corridor is entirely Okanogan-Wenatchee National Forest (Methow Valley Ranger District). No Mount Rainier-style climbing fee applies here.',
  seasonal: 'WA-20 (North Cascades Highway) closes gate-to-gate roughly early December–mid/late April.',
  group_limit: null,
  land_manager: 'Okanogan-Wenatchee National Forest (Methow Valley Ranger District)',
  parking_pass: 'Northwest Forest Pass required — $5/day or $30/annual.',
};

const SNOQUALMIE_ACCESS = {
  permit: 'None required — free self-issue day-use permit at the trailhead.',
  fees: 'None — no climbing fee (National Forest wilderness, not Mount Rainier NP)',
  rules: 'Standard USFS wilderness group-size limit of 12 people per party.',
  notes: null,
  group_limit: 12,
  land_manager: 'Mt. Baker-Snoqualmie National Forest (Snoqualmie Ranger District)',
  parking_pass: 'Northwest Forest Pass ($30/yr) or a $5/day pass at developed trailheads.',
};

for (const [areaId, access] of [['wa_golden_horn', WA_PASS_ACCESS], ['wa_summer_fall_rock', SNOQUALMIE_ACCESS]]) {
  const { data: routes } = await supabase.from('routes').select('id, access').eq('area_id', areaId);
  for (const r of routes) {
    const { error } = await supabase.from('routes').update({ access: { ...(r.access||{}), ...access } }).eq('id', r.id);
    if (error) console.error('FAILED', r.id, error); else console.log('OK', r.id);
  }
}
