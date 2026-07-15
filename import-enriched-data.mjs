#!/usr/bin/env node
/**
 * Import enriched climbing data into Supabase
 * Usage: node import-enriched-data.mjs <data-file.json>
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import ws from 'ws';

const supabase = createClient(
  'https://ofuofhojhbcrcahuotya.supabase.co',
  'sb_secret_SQgG_ctJaZQ2HblK1rRxBA_HR23-Zjp',
  { realtime: { transport: ws } }
);

async function importEnrichedData(dataFile) {
  console.log('=== IMPORTING ENRICHED CLIMBING DATA ===\n');
  
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const routes = data.routes || [];
  
  console.log(`Importing ${routes.length} routes...\n`);
  
  let updated = 0;
  let failed = 0;
  const BATCH_SIZE = 25;
  
  for (let i = 0; i < routes.length; i += BATCH_SIZE) {
    const batch = routes.slice(i, i + BATCH_SIZE);
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
    
    for (const route of batch) {
      // Build update object with only populated fields
      const updateData = {};
      const fieldsToUpdate = [
        'lat', 'lng', 'elevation', 'elevation_gain', 'description', 'overview', 
        'beta', 'approach', 'approach_distance', 'approach_time', 'descent', 
        'descent_time', 'time_estimate', 'gear', 'hazards', 'waypoints', 'gpx', 'pitches'
      ];
      
      fieldsToUpdate.forEach(field => {
        if (route[field] !== null && route[field] !== undefined) {
          updateData[field] = route[field];
        }
      });
      
      if (Object.keys(updateData).length > 0) {
        try {
          const { error } = await supabase
            .from('routes')
            .update(updateData)
            .eq('id', route.id);
          
          if (error) {
            console.error(`    ✗ ${route.id}: ${error.message}`);
            failed++;
          } else {
            updated++;
          }
        } catch (e) {
          console.error(`    ✗ ${route.id}: ${e.message}`);
          failed++;
        }
      }
    }
    
    if (i + BATCH_SIZE < routes.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  
  if (failed === 0) {
    console.log(`\n✓ All routes enriched successfully!`);
  }
}

const dataFile = process.argv[2] || '/tmp/enrichment-template.json';
importEnrichedData(dataFile).catch(console.error);
