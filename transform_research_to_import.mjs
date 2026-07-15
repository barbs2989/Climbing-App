#!/usr/bin/env node
/**
 * Transform research agent output to batch import format
 *
 * Usage:
 *   node transform_research_to_import.mjs < wa-ice-alpine-hazards.json > wa-ice-alpine-import.json
 */

async function main() {
  let input = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', chunk => { input += chunk; });

  process.stdin.on('end', () => {
    try {
      const researchData = JSON.parse(input);
      
      if (!researchData.routes || !Array.isArray(researchData.routes)) {
        throw new Error('Invalid research data format: missing routes array');
      }

      // Transform to import format
      const importData = researchData.routes.map(route => {
        // Generate ID from route name and area
        const id = `wa_${route.area.toLowerCase().replace(/\s+/g, '_')}_${route.route_name.toLowerCase().replace(/[\s\/\-]+/g, '_')}`.substring(0, 100);

        return {
          id: id,
          watch_out: route.watch_out || [],
          route_name: route.route_name,
          area: route.area,
          grade: route.grade,
          source: route.mountain_project_url,
          confidence: route.confidence || 'medium'
        };
      });

      console.log(JSON.stringify(importData, null, 2));

    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });
}

main();
