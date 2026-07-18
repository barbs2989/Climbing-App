#!/usr/bin/env node
// Applies rack/features data (rack_features_data.json, 431 routes) to the live
// Supabase DB via the service_role key (bypasses RLS). Requires migration
// 0050_rack_features_columns.sql to already be applied (adds the rack/features
// columns) -- run that in the Supabase SQL editor first, then run this script
// with SUPABASE_SERVICE_KEY set.
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

const routes = JSON.parse(fs.readFileSync(path.join(__dirname, "rack_features_data.json"), "utf8"));

async function main() {
  let succeeded = 0, failed = 0;
  const failures = [];

  for (const route of routes) {
    const payload = {
      rack: Array.isArray(route.rack) ? route.rack : [],
      features: Array.isArray(route.features) ? route.features : [],
    };
    const { error } = await supabase.from("routes").update(payload).eq("id", route.id);
    if (error) {
      failed++;
      failures.push({ id: route.id, error: error.message });
      console.error(`FAILED ${route.id}: ${error.message}`);
    } else {
      succeeded++;
    }
  }

  console.log(`\n=== RACK/FEATURES APPLY RESULTS ===`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) {
    console.log("Failures:", JSON.stringify(failures, null, 2));
  }
}

main();
