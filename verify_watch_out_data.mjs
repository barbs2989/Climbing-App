#!/usr/bin/env node
/**
 * Verify watch_out data for quality, completeness, and accuracy
 *
 * Checks:
 * 1. JSON structure validity
 * 2. Required fields present
 * 3. Hazard descriptions meet quality standards
 * 4. Cross-check against database
 * 5. Identify duplicates or conflicts
 *
 * Usage:
 *   node verify_watch_out_data.mjs < data.json
 */

const supabaseUrl = "https://ofuofhojhbcrcahuotya.supabase.co";
const supabaseKey = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

class WatchOutValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalRoutes: 0,
      validRoutes: 0,
      invalidRoutes: 0,
      totalHazards: 0,
      avgHazardsPerRoute: 0
    };
  }

  validateRoute(route, index) {
    // Check required fields
    if (!route.id || typeof route.id !== 'string') {
      this.errors.push(`[Route ${index}] Missing or invalid id`);
      return false;
    }

    if (!Array.isArray(route.watch_out)) {
      this.errors.push(`[${route.id}] watch_out must be an array`);
      return false;
    }

    // Check hazard count
    if (route.watch_out.length === 0) {
      this.warnings.push(`[${route.id}] No hazards documented (empty array)`);
    }

    if (route.watch_out.length > 20) {
      this.warnings.push(`[${route.id}] Very high hazard count (${route.watch_out.length}) — may be too detailed`);
    }

    // Check each hazard
    for (let i = 0; i < route.watch_out.length; i++) {
      const hazard = route.watch_out[i];

      // Type check
      if (typeof hazard !== 'string') {
        this.errors.push(`[${route.id}] watch_out[${i}] is not a string`);
        return false;
      }

      // Length check
      if (hazard.trim().length === 0) {
        this.errors.push(`[${route.id}] watch_out[${i}] is empty string`);
        return false;
      }

      if (hazard.length < 15) {
        this.warnings.push(`[${route.id}] watch_out[${i}] very short (${hazard.length} chars) — may lack detail`);
      }

      if (hazard.length > 300) {
        this.warnings.push(`[${route.id}] watch_out[${i}] very long (${hazard.length} chars) — consider breaking into multiple entries`);
      }

      // Content checks
      if (!hazard.includes(':') && !hazard.includes('—') && !hazard.includes('-')) {
        this.warnings.push(`[${route.id}] watch_out[${i}] lacks structure (no label or separator)`);
      }

      this.stats.totalHazards++;
    }

    return true;
  }

  validate(dataArray) {
    this.stats.totalRoutes = dataArray.length;

    for (let i = 0; i < dataArray.length; i++) {
      if (this.validateRoute(dataArray[i], i)) {
        this.stats.validRoutes++;
      } else {
        this.stats.invalidRoutes++;
      }
    }

    if (this.stats.validRoutes > 0) {
      this.stats.avgHazardsPerRoute = (this.stats.totalHazards / this.stats.validRoutes).toFixed(2);
    }

    return {
      valid: this.stats.invalidRoutes === 0,
      stats: this.stats,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  async crossCheckDatabase(routes) {
    console.log("\nCross-checking against database...");

    const routeIds = routes.map(r => r.id);
    const checkBatches = [];

    for (let i = 0; i < routeIds.length; i += 50) {
      checkBatches.push(routeIds.slice(i, i + 50));
    }

    const dbStatus = {
      found: 0,
      notFound: 0,
      conflicts: 0,
      missingIds: []
    };

    for (const batch of checkBatches) {
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/routes?select=id,name,watch_out&id=in.(${batch.map(id => `"${id}"`).join(',')})`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            }
          }
        );

        if (response.ok) {
          const dbRoutes = await response.json();
          const foundIds = new Set(dbRoutes.map(r => r.id));

          batch.forEach(id => {
            if (foundIds.has(id)) {
              dbStatus.found++;
            } else {
              dbStatus.notFound++;
              dbStatus.missingIds.push(id);
            }
          });

          // Check for conflicts (route already has watch_out)
          dbRoutes.forEach(dbRoute => {
            if (dbRoute.watch_out) {
              dbStatus.conflicts++;
              this.warnings.push(`[${dbRoute.id}] Already has watch_out in database — update will overwrite`);
            }
          });
        }
      } catch (e) {
        this.errors.push(`Database check failed: ${e.message}`);
      }
    }

    return dbStatus;
  }

  generateReport(dataArray, dbStatus = null) {
    console.log("\n=== WATCH_OUT DATA VALIDATION REPORT ===\n");

    console.log("Statistics:");
    console.log(`  Total routes: ${this.stats.totalRoutes}`);
    console.log(`  Valid routes: ${this.stats.validRoutes}`);
    console.log(`  Invalid routes: ${this.stats.invalidRoutes}`);
    console.log(`  Total hazards documented: ${this.stats.totalHazards}`);
    console.log(`  Avg hazards per route: ${this.stats.avgHazardsPerRoute}`);

    if (dbStatus) {
      console.log("\nDatabase Cross-Check:");
      console.log(`  Routes found in DB: ${dbStatus.found}`);
      console.log(`  Routes NOT found: ${dbStatus.notFound}`);
      console.log(`  Existing watch_out conflicts: ${dbStatus.conflicts}`);
    }

    if (this.errors.length > 0) {
      console.log("\nERRORS (Critical):");
      this.errors.slice(0, 20).forEach(err => {
        console.log(`  ✗ ${err}`);
      });
      if (this.errors.length > 20) {
        console.log(`  ... and ${this.errors.length - 20} more errors`);
      }
    }

    if (this.warnings.length > 0) {
      console.log("\nWARNINGS (Review):");
      this.warnings.slice(0, 20).forEach(warn => {
        console.log(`  ⚠ ${warn}`);
      });
      if (this.warnings.length > 20) {
        console.log(`  ... and ${this.warnings.length - 20} more warnings`);
      }
    }

    console.log("\nStatus:");
    if (this.stats.invalidRoutes === 0) {
      console.log("  ✓ Data structure is VALID");
    } else {
      console.log("  ✗ Data structure has ERRORS — do not import");
    }

    if (this.warnings.length === 0) {
      console.log("  ✓ No quality warnings");
    } else {
      console.log(`  ⚠ ${this.warnings.length} quality warnings — review before import`);
    }

    return this.stats.invalidRoutes === 0;
  }
}

async function main() {
  let input = '';

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', chunk => { input += chunk; });

  process.stdin.on('end', async () => {
    try {
      const data = JSON.parse(input);
      const routes = Array.isArray(data) ? data : [data];

      const validator = new WatchOutValidator();
      const result = validator.validate(routes);
      const dbStatus = await validator.crossCheckDatabase(routes);
      const isValid = validator.generateReport(routes, dbStatus);

      process.exit(isValid && validator.stats.invalidRoutes === 0 ? 0 : 1);

    } catch (error) {
      console.error('Fatal error:', error.message);
      process.exit(1);
    }
  });
}

main();
