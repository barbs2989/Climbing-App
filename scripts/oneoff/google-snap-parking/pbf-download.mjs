// Step 4a (US): download the Geofabrik extract of every state that holds a target, 3 at a time, resumable (a file
// is kept only once curl finishes it). Overpass answered ~1 tile a minute on 2026-11-26 (~28 h for the US); the
// extracts take a few hours and then the lookup is local.
// Usage: node pbf-download.mjs <workDir> <pbfDir>   (reads <workDir>/us-states.json {state_id: n})
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const [W, D] = process.argv.slice(2); if (!D) throw new Error('usage: node pbf-download.mjs <workDir> <pbfDir>');
fs.mkdirSync(D, { recursive: true });
const counts = JSON.parse(fs.readFileSync(W + '/us-states.json'));
const states = Object.keys(counts).sort((a, b) => counts[b] - counts[a]); // most targets first, so judging starts early
const slug = (s) => s.replace(/_/g, '-');
const todo = states.filter((s) => !fs.existsSync(D + '/' + s + '.osm.pbf'));
console.log('states', states.length, 'todo', todo.length);
const one = (s) => new Promise((res) => {
  const tmp = D + '/' + s + '.part';
  const p = spawn('curl', ['-s', '-L', '-f', '--retry', '5', '--retry-delay', '30', '-C', '-', '-o', tmp, `https://download.geofabrik.de/north-america/us/${slug(s)}-latest.osm.pbf`]);
  p.on('close', (code) => { if (code === 0) { fs.renameSync(tmp, D + '/' + s + '.osm.pbf'); console.log(new Date().toISOString(), 'ok', s); } else console.log('FAIL', s, code); res(); });
});
const q = [...todo];
await Promise.all([0, 1, 2].map(async () => { while (q.length) await one(q.shift()); }));
console.log('DONE');
