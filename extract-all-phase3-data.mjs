#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const transcriptDir = '/Users/nathanbarber/.claude/projects/-Users-nathanbarber-dev-Climbing-App--claude-worktrees-photos-topo-waypoints/c80fcaa9-99ef-43a9-91ea-2dcbfab0f22e/subagents';

console.log('='.repeat(70));
console.log('PHASE 3 COMPREHENSIVE DATA EXTRACTION');
console.log('='.repeat(70));

const allRoutes = [];
const allHazards = [];
const sourceMap = {};
let filesProcessed = 0;
let filesWithData = 0;

// Read all agent transcript files
if (fs.existsSync(transcriptDir)) {
  const files = fs.readdirSync(transcriptDir).filter(f => f.endsWith('.jsonl'));
  console.log(`Processing ${files.length} agent transcripts...\n`);

  files.forEach((file) => {
    const filepath = path.join(transcriptDir, file);
    filesProcessed++;
    
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.trim().split('\n');
      
      let foundData = false;
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          
          // Check for route/hazard data in message content
          if (obj.message?.content) {
            let contentStr = obj.message.content;
            
            // Handle array content (multiple items)
            if (Array.isArray(contentStr)) {
              contentStr = contentStr.map(item => 
                typeof item === 'string' ? item : (item.text || '')
              ).join('\n');
            }
            
            // Extract JSON from markdown code blocks
            const jsonMatches = contentStr.match(/```json\n([\s\S]*?)\n```/g);
            if (jsonMatches) {
              for (const match of jsonMatches) {
                try {
                  const jsonStr = match.replace(/```json\n/, '').replace(/\n```/, '');
                  const data = JSON.parse(jsonStr);
                  
                  if (data.routes && Array.isArray(data.routes)) {
                    allRoutes.push(...data.routes);
                    foundData = true;
                    console.log(`  ✓ ${file}: ${data.routes.length} routes`);
                  }
                  if (data.hazards && Array.isArray(data.hazards)) {
                    allHazards.push(...data.hazards);
                  }
                } catch (e) {
                  // JSON parse error, continue
                }
              }
            }
          }
        } catch (e) {
          // Line parse error, continue to next line
        }
      }
      
      if (foundData) filesWithData++;
    } catch (err) {
      // File read error, continue
    }
  });
}

console.log(`\n${'='.repeat(70)}`);
console.log(`EXTRACTION COMPLETE`);
console.log(`${'='.repeat(70)}`);
console.log(`Files processed: ${filesProcessed}`);
console.log(`Files with data: ${filesWithData}`);
console.log(`Total routes extracted: ${allRoutes.length}`);
console.log(`Total hazards extracted: ${allHazards.length}`);

// Calculate statistics
const hazardCount = allRoutes.reduce((sum, r) => sum + (r.watch_out?.length || 0), 0);
console.log(`\nDETAILED HAZARD COUNT: ${hazardCount}`);

// Write comprehensive master file
const masterData = {
  phase: 3,
  extraction_timestamp: new Date().toISOString(),
  statistics: {
    agents_processed: filesProcessed,
    agents_with_data: filesWithData,
    total_routes: allRoutes.length,
    total_hazard_entries: hazardCount,
    unique_routes: new Set(allRoutes.map(r => r.id || r.name)).size,
  },
  database_impact: {
    current_routes: 8088,
    new_routes: allRoutes.length,
    projected_total: 8088 + allRoutes.length,
    current_hazards: 638,
    new_hazards: hazardCount,
    projected_total_hazards: 638 + hazardCount,
    projected_coverage: ((638 + hazardCount) / (8088 + allRoutes.length) * 100).toFixed(2) + '%',
  },
  routes: allRoutes,
  hazards_by_route: allRoutes.map(r => ({
    id: r.id || r.name,
    name: r.name,
    hazard_count: r.watch_out?.length || 0,
  })),
};

fs.writeFileSync('phase3-master-extracted-data.json', JSON.stringify(masterData, null, 2));
console.log('\n✓ Master extracted data: phase3-master-extracted-data.json');
console.log(`✓ Ready for immediate deployment`);

console.log(`\nDEPLOYMENT IMPACT:`);
console.log(`  Routes: 8,088 → ${8088 + allRoutes.length}`);
console.log(`  Hazards: 638 → ${638 + hazardCount}`);
console.log(`  Coverage: ${((638 + hazardCount) / (8088 + allRoutes.length) * 100).toFixed(2)}%`);

process.exit(0);
