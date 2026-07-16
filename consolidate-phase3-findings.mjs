#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Collect all agent JSON outputs from transcript directory
const transcriptDir = '/Users/nathanbarber/.claude/projects/-Users-nathanbarber-dev-Climbing-App--claude-worktrees-photos-topo-waypoints/c80fcaa9-99ef-43a9-91ea-2dcbfab0f22e/subagents';

console.log('='.repeat(70));
console.log('PHASE 3 CONSOLIDATION: COLLECTING AGENT OUTPUTS');
console.log('='.repeat(70));

let totalRoutes = 0;
let totalHazards = 0;
let agentsProcessed = 0;
const allRoutes = [];
const allHazards = [];

// List available agent output files
if (fs.existsSync(transcriptDir)) {
  const files = fs.readdirSync(transcriptDir);
  console.log(`Found ${files.length} agent transcript files\n`);

  files.forEach((file) => {
    if (file.endsWith('.jsonl')) {
      const filepath = path.join(transcriptDir, file);
      try {
        const content = fs.readFileSync(filepath, 'utf-8');
        // Parse JSONL (multiple JSON objects, one per line)
        const lines = content.trim().split('\n');
        
        // Look for final agent message with structured output
        let agentData = null;
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            // Find messages with route/hazard data
            if (obj.message?.content) {
              const text = obj.message.content;
              if (typeof text === 'string' && text.includes('routes') && text.includes('watch_out')) {
                // Extract JSON from markdown code blocks
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch) {
                  agentData = JSON.parse(jsonMatch[1]);
                  break;
                }
              }
            }
          } catch (e) {
            // Skip parse errors, continue to next line
          }
        }

        if (agentData) {
          if (agentData.routes) {
            allRoutes.push(...agentData.routes);
            totalRoutes += agentData.routes.length;
          }
          if (agentData.hazards) {
            allHazards.push(...agentData.hazards);
            totalHazards += agentData.hazards.length;
          }
          agentsProcessed++;
          console.log(`✓ ${file}: ${agentData.routes?.length || 0} routes, ${agentData.hazards?.length || 0} hazards`);
        }
      } catch (err) {
        console.log(`✗ ${file}: Parse error`);
      }
    }
  });
}

console.log(`\n${'='.repeat(70)}`);
console.log(`CONSOLIDATION COMPLETE`);
console.log(`${'='.repeat(70)}`);
console.log(`Agents processed: ${agentsProcessed}`);
console.log(`Total routes collected: ${totalRoutes}`);
console.log(`Total hazards collected: ${totalHazards}`);

// Write consolidated master file
const consolidated = {
  phase: 3,
  timestamp: new Date().toISOString(),
  consolidation: {
    agents_processed: agentsProcessed,
    total_routes: totalRoutes,
    total_hazards: totalHazards,
    deployment_ready: totalRoutes > 0 || totalHazards > 0,
  },
  routes: allRoutes,
  hazards: allHazards,
};

fs.writeFileSync('phase3-master-consolidated.json', JSON.stringify(consolidated, null, 2));
console.log('\n✓ Master consolidated data written to phase3-master-consolidated.json');

// Summary statistics
console.log(`\nDEPLOYMENT IMPACT:`);
console.log(`  Database routes: 8,088 → ${8088 + totalRoutes} (estimated)`);
console.log(`  Hazard coverage: ~638 → ${638 + totalHazards} entries`);
console.log(`  Coverage increase: +${((totalHazards / 8088) * 100).toFixed(2)}%`);

process.exit(0);
