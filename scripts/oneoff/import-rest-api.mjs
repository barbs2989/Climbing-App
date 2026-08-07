#!/usr/bin/env node
/**
 * Import all 327 WA alpine/mountaineering routes using Supabase REST API
 * Bypasses SDK auth issues by using direct HTTP requests
 */
import fs from 'fs';
import https from 'https';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Error: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const baseURL = url.replace(/\/$/, '');
const projectRef = baseURL.split('.')[0].split('//')[1]; // Extract from https://xxxxx.supabase.co

async function importViaREST() {
  console.log('=== IMPORTING VIA REST API ===\n');

  // 1. Load research results
  console.log('Loading research results...');
  const researchOutput = JSON.parse(
    fs.readFileSync('/private/tmp/claude-501/-Users-nathanbarber-dev-Climbing-App/c80fcaa9-99ef-43a9-91ea-2dcbfab0f22e/tasks/wvbh48jc8.output', 'utf-8')
  );

  const researchByArea = {};
  researchOutput.result.results.forEach(batch => {
    if (batch.areas) {
      batch.areas.forEach(area => {
        researchByArea[area.area_id] = {
          area_name: area.area_name,
          access: area.access
        };
      });
    }
  });
  console.log(`  Loaded research for ${Object.keys(researchByArea).length} areas\n`);

  // 2. Load catalog
  console.log('Loading catalog routes...');
  const catalogData = JSON.parse(
    fs.readFileSync('/Users/nathanbarber/dev/Climbing-App/catalog/wa-alpine/routes.json', 'utf-8')
  );
  const catalogRoutes = catalogData.routes || [];
  console.log(`  Loaded ${catalogRoutes.length} routes\n`);

  // 3. Normalize research data
  console.log('Normalizing research data...');
  Object.entries(researchByArea).forEach(([areaId, data]) => {
    if (!data.access) {
      data.access = {
        landManager: 'N/A',
        permit: 'N/A',
        fees: 'N/A',
        passRequired: 'N/A',
        closures: 'N/A',
        permitZone: 'N/A'
      };
    } else {
      const acc = data.access;
      data.access = {
        landManager: acc.land_manager || 'N/A',
        permit: acc.permit_type || 'N/A',
        fees: acc.permit_cost_structure || 'N/A',
        passRequired: acc.parking_pass_required || 'None',
        closures: acc.seasonal_closure_dates || 'N/A',
        permitZone: acc.wilderness_zone || 'N/A'
      };
    }
  });

  // 4. Query existing routes via REST
  console.log('Querying existing routes via REST API...');
  let existingIds = new Set();
  let offset = 0;
  const limit = 1000;

  try {
    while (true) {
      const response = await httpRequest(
        'GET',
        `${baseURL}/rest/v1/routes?select=id&offset=${offset}&limit=${limit}`,
        serviceKey
      );

      if (!response || response.length === 0) break;
      response.forEach(r => existingIds.add(r.id));
      if (response.length < limit) break;
      offset += limit;
    }
  } catch (e) {
    console.error(`  Error querying routes: ${e.message}`);
    console.error(`  Attempting import anyway...`);
  }

  console.log(`  Found ${existingIds.size} existing routes\n`);

  // 5. Prepare routes for import
  console.log('Preparing routes for import...');
  const routesToImport = [];
  let skipped = 0;

  catalogRoutes.forEach(route => {
    if (!existingIds.has(route.id)) {
      const researchData = researchByArea[route.area_id];
      if (researchData) {
        route.access = researchData.access;
      } else {
        route.access = {
          landManager: 'N/A',
          permit: 'N/A',
          fees: 'N/A',
          passRequired: 'N/A',
          closures: 'N/A',
          permitZone: 'N/A'
        };
      }
      routesToImport.push(route);
    } else {
      skipped++;
    }
  });

  console.log(`  Routes to import: ${routesToImport.length}`);
  console.log(`  Routes already exist: ${skipped}\n`);

  // 6. Batch upsert via REST
  console.log('Upserting via REST API...\n');
  const BATCH_SIZE = 10;
  let imported = 0;
  let failed = 0;
  const failedRoutes = [];

  for (let i = 0; i < routesToImport.length; i += BATCH_SIZE) {
    const batch = routesToImport.slice(i, i + BATCH_SIZE);
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} routes)...`);

    for (const route of batch) {
      try {
        const payload = {
          id: route.id,
          area_id: route.area_id,
          name: route.name,
          discipline: route.discipline,
          grade: route.grade,
          grade_system: route.grade_system,
          grade_num: route.grade_num,
          pitches: route.pitches,
          access: route.access
        };

        // Add other fields
        Object.keys(route).forEach(key => {
          if (!payload.hasOwnProperty(key) && route[key] !== undefined && route[key] !== null) {
            payload[key] = route[key];
          }
        });

        await httpRequest(
          'POST',
          `${baseURL}/rest/v1/routes?on_conflict=id`,
          serviceKey,
          payload
        );

        imported++;
      } catch (e) {
        console.error(`    ✗ ${route.id}: ${e.message}`);
        failed++;
        failedRoutes.push({ id: route.id, error: e.message });
      }
    }

    if (i + BATCH_SIZE < routesToImport.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // 7. Summary
  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Imported (new): ${imported}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failedRoutes.length > 0) {
    console.log(`\nFailed routes:`);
    failedRoutes.slice(0, 10).forEach(f => {
      console.log(`  - ${f.id}: ${f.error}`);
    });
  }

  if (failed === 0) {
    console.log(`\n✓ All ${routesToImport.length} new routes imported successfully!`);
  }
}

function httpRequest(method, requestUrl, authKey, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(requestUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${authKey}`,
        'apikey': authKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data ? JSON.parse(data) : null);
          } else {
            const errorData = data ? JSON.parse(data) : { message: `HTTP ${res.statusCode}` };
            reject(new Error(errorData.message || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

importViaREST().catch(console.error);
