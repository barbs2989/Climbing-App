import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

const { count: totalWa } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%');

const { count: withHazard } = await supabase
  .from('routes')
  .select('*', { count: 'exact', head: true })
  .ilike('area_id', 'wa_%')
  .not('watch_out', 'is', null);

const pct = ((withHazard / totalWa) * 100).toFixed(1);
console.log(`\nHazard Documentation Coverage:`);
console.log(`  ${withHazard} / ${totalWa} WA routes (${pct}%)\n`);
