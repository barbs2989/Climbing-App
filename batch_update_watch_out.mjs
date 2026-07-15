#!/usr/bin/env node
/**
 * Batch update watch_out field for ice and high-grade alpine routes
 *
 * Usage:
 *   node batch_update_watch_out.mjs < data.json
 *   cat data.json | node batch_update_watch_out.mjs
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://ofuofhojhbcrcahuotya.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

/**
 * Validate watch_out data structure
 */
function validateWatchOutData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: must be an object');
  }

  if (!data.id || typeof data.id !== 'string') {
    throw new Error('Invalid data: missing or invalid id');
  }

  if (!Array.isArray(data.watch_out)) {
    throw new Error(`Invalid data for ${data.id}: watch_out must be an array`);
  }

  data.watch_out.forEach((item, idx) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(`Invalid data for ${data.id}: watch_out[${idx}] must be non-empty string`);
    }
  });

  return true;
}

/**
 * Update a single route's watch_out field
 */
async function updateRoute(routeData) {
  validateWatchOutData(routeData);

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/routes?id=eq.${encodeURIComponent(routeData.id)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          watch_out: routeData.watch_out
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error ${response.status}: ${error}`);
    }

    return { success: true, id: routeData.id };
  } catch (error) {
    return { success: false, id: routeData.id, error: error.message };
  }
}

/**
 * Batch update multiple routes
 */
async function batchUpdateRoutes(dataArray, opts = {}) {
  const {
    batchSize = 10,
    delayMs = 100,
    dryRun = false,
    verbose = false
  } = opts;

  const results = {
    success: 0,
    failed: 0,
    errors: [],
    updated: []
  };

  for (let i = 0; i < dataArray.length; i++) {
    const batch = dataArray.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(data => dryRun ? { success: true, id: data.id, dryRun: true } : updateRoute(data))
    );

    batchResults.forEach(result => {
      if (result.success) {
        results.success++;
        results.updated.push(result.id);
        if (verbose) console.log(`✓ ${result.id}`);
      } else {
        results.failed++;
        results.errors.push(result);
        if (verbose) console.error(`✗ ${result.id}: ${result.error}`);
      }
    });

    if (i + batchSize < dataArray.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Main: read JSON from stdin and process
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  if (dryRun) console.log('[DRY RUN MODE]\n');

  let input = '';

  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', chunk => {
    input += chunk;
  });

  process.stdin.on('end', async () => {
    try {
      let dataArray;

      // Try to parse as JSON
      try {
        const parsed = JSON.parse(input);
        dataArray = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // Try to parse as JSONL (one object per line)
        dataArray = input
          .trim()
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => JSON.parse(line));
      }

      console.log(`Processing ${dataArray.length} routes...\n`);

      const results = await batchUpdateRoutes(dataArray, {
        batchSize: 10,
        delayMs: 100,
        dryRun,
        verbose
      });

      console.log(`\n=== RESULTS ===`);
      console.log(`Success: ${results.success}/${dataArray.length}`);
      console.log(`Failed: ${results.failed}`);

      if (results.errors.length > 0) {
        console.log(`\nErrors:`);
        results.errors.forEach(err => {
          console.log(`  ${err.id}: ${err.error}`);
        });
      }

      process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
      console.error('Fatal error:', error.message);
      process.exit(1);
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = { validateWatchOutData, updateRoute, batchUpdateRoutes };
