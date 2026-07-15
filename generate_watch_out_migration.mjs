#!/usr/bin/env node
/**
 * Generate SQL migration file for watch_out updates
 *
 * Reads JSON data from stdin and generates SQL UPDATE statements
 * suitable for Supabase migration files.
 *
 * Usage:
 *   cat ice_route_watch_out_examples.json | node generate_watch_out_migration.mjs > watch_out_updates.sql
 */

async function main() {
  let input = '';

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', chunk => { input += chunk; });

  process.stdin.on('end', async () => {
    try {
      const data = JSON.parse(input);
      const routes = Array.isArray(data) ? data : [data];

      // Generate SQL migration file header
      console.log(`-- Migration: populate watch_out field for ice and high-grade alpine routes`);
      console.log(`-- Generated: ${new Date().toISOString()}`);
      console.log(`-- Total routes: ${routes.length}`);
      console.log(`\n-- IMPORTANT: Review each hazard description for accuracy before running in production\n`);

      // Generate individual UPDATE statements
      routes.forEach((route, index) => {
        if (!route.id || !Array.isArray(route.watch_out)) {
          console.error(`ERROR: Invalid route data at index ${index}:`, route);
          return;
        }

        const watchOutJson = JSON.stringify(route.watch_out);
        console.log(`UPDATE routes`);
        console.log(`SET watch_out = '${watchOutJson}'::jsonb`);
        console.log(`WHERE id = '${route.id}';`);
        console.log();
      });

      console.log(`-- END OF MIGRATION`);
      console.log(`-- To verify: SELECT id, name, watch_out FROM routes WHERE watch_out IS NOT NULL LIMIT 10;`);

    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });
}

main();
