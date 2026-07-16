#!/usr/bin/env node
// Applies gear-audit data from batch 5-11 cohort JSON files directly to the live
// Supabase DB via the service_role key (bypasses RLS). Requires SUPABASE_SERVICE_KEY env var.
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = "https://ofuofhojhbcrcahuotya.supabase.co";
const key = process.env.SUPABASE_SERVICE_KEY;
if (!key) { console.error("Set SUPABASE_SERVICE_KEY env var"); process.exit(1); }
const supabase = createClient(url, key, { auth: { persistSession: false }, realtime: { transport: ws } });

const cohortFiles = [
  'gear-research/batch5/cohort1.json', 'gear-research/batch5/cohort2.json', 'gear-research/batch5/cohort3.json',
  'gear-research/batch6/cohort1.json', 'gear-research/batch6/cohort2.json', 'gear-research/batch6/cohort3.json',
  'gear-research/batch7/cohort1.json', 'gear-research/batch7/cohort2.json', 'gear-research/batch7/cohort3.json',
  'gear-research/batch8/cohort1.json', 'gear-research/batch8/cohort2.json', 'gear-research/batch8/cohort3.json',
  'gear-research/batch9/cohort1.json', 'gear-research/batch9/cohort2.json', 'gear-research/batch9/cohort3.json',
  'gear-research/batch10/cohort1.json', 'gear-research/batch10/cohort2.json', 'gear-research/batch10/cohort3.json',
  'gear-research/batch11/cohort1.json', 'gear-research/batch11/cohort2.json', 'gear-research/batch11/cohort3.json',
  'gear-research/batch11/cohort4.json', 'gear-research/batch11/cohort5.json',
];

const realRoutes = JSON.parse(fs.readFileSync(path.join(__dirname, 'real_remaining_routes.json'), 'utf8'));
const realIds = new Set(realRoutes.map(r => r.id));

function buildPayload(route) {
  const payload = {
    sling_rack: route.sling_rack ?? null,
    alpine_draws: typeof route.alpine_draws === 'number' ? route.alpine_draws : 0,
    rope_type: route.rope_type ? String(route.rope_type) : null,
    rope_length_m: route.rope_length_m != null ? route.rope_length_m : null,
    rope_note: route.rope_note ? String(route.rope_note) : null,
    corrections: route.corrections ? String(route.corrections) : null,
    gear_confidence: route.confidence ? String(route.confidence) : null,
  };
  if (route.ascender === true) payload.ascender = 'Prusik cords (see rope_note)';
  else if (route.ascender === false || route.ascender == null) payload.ascender = null;
  else if (typeof route.ascender === 'object') payload.ascender = JSON.stringify(route.ascender);
  else payload.ascender = String(route.ascender);
  return payload;
}

async function main() {
  let succeeded = 0, failed = 0, skipped = 0;
  const failures = [];
  const seen = new Set();

  for (const file of cohortFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) { console.warn(`Missing file: ${file}`); continue; }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const route of data.routes) {
      const routeId = route.routeId;
      if (seen.has(routeId)) continue; // dedupe across files
      seen.add(routeId);

      if (!realIds.has(routeId)) { skipped++; continue; }

      const payload = buildPayload(route);
      const { error } = await supabase.from('routes').update(payload).eq('id', routeId);
      if (error) {
        failed++;
        failures.push({ routeId, error: error.message });
        console.error(`FAILED ${routeId}: ${error.message}`);
      } else {
        succeeded++;
      }
    }
  }

  console.log(`\n=== BATCH 5-11 APPLY RESULTS ===`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (not real id): ${skipped}`);
  if (failures.length) {
    fs.writeFileSync('/tmp/apply_batch5_11_failures.json', JSON.stringify(failures, null, 2));
    console.log(`Failure details written to /tmp/apply_batch5_11_failures.json`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
