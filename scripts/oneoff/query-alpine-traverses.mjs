#!/usr/bin/env node
/**
 * Query: Find alpine traverse routes in database
 * Used to identify which routes can be matched during import
 */

import https from 'https';

const key = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";

// Search for potential alpine traverse routes by name patterns
const searchTerms = [
  'High Route',
  'Cascade Crest',
  'Enchantments Loop',
  'Enchantment',
  'Ptarmigan Traverse',
  'Ptarmigan',
  'Alpine Lakes',
  'Picket Range',
  'Mount Baker',
  'Four Pass Loop'
];

const query = new URLSearchParams({
  select: 'id,name,discipline,grade,description',
  limit: '500'
});

const options = {
  hostname: 'ofuofhojhbcrcahuotya.supabase.co',
  path: `/rest/v1/routes?${query}`,
  method: 'GET',
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  }
};

let responseData = '';

const req = https.request(options, (res) => {
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const routes = JSON.parse(responseData);

      console.log('='.repeat(80));
      console.log('ALPINE TRAVERSE ROUTE SEARCH');
      console.log('='.repeat(80));
      console.log(`\nSearched ${routes.length} routes in database\n`);

      const matches = [];

      routes.forEach(route => {
        const nameUpper = (route.name || '').toUpperCase();
        const descUpper = (route.description || '').toUpperCase();

        searchTerms.forEach(term => {
          if (nameUpper.includes(term.toUpperCase()) || descUpper.includes(term.toUpperCase())) {
            const match = matches.find(m => m.id === route.id);
            if (!match) {
              matches.push({
                id: route.id,
                name: route.name,
                discipline: route.discipline,
                grade: route.grade,
                match_type: nameUpper.includes(term.toUpperCase()) ? 'name' : 'description'
              });
            }
          }
        });
      });

      if (matches.length === 0) {
        console.log('⚠ No alpine traverse routes found in database');
        console.log('\nSearched for:');
        searchTerms.forEach(t => console.log(`  - ${t}`));
        console.log('\nThis is expected for 2026-07-28 — alpine traverses may not be cataloged yet.');
        console.log('Research agent will create new route entries or match to existing peaks.');
      } else {
        console.log(`✓ Found ${matches.length} potential traverse routes:\n`);
        matches.forEach(m => {
          console.log(`- ${m.name}`);
          console.log(`  ID: ${m.id}`);
          console.log(`  Discipline: ${m.discipline}, Grade: ${m.grade || 'N/A'}`);
          console.log(`  Matched via: ${m.match_type}`);
          console.log('');
        });
      }

      console.log('='.repeat(80));
      console.log('IMPORT NOTES');
      console.log('='.repeat(80));
      console.log(`
If routes not found:
  - Alpine traverses may need to be added to database first
  - Import script will note unmatched routes in unmatched-alpine-traverses.json
  - Manual database entries may be needed for multi-day expeditions

If routes found:
  - watch_out hazards will be merged with existing data
  - No duplicate hazards will be added
  - Import will show successful merges and total hazard counts
      `);

    } catch (e) {
      console.error('Error:', e.message);
      console.log('Response:', responseData.slice(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
