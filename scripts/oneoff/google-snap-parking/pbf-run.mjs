// Step 4c (US): as pbf-download.mjs finishes each state, read its lots (pbf-lots.mjs) into <workDir>/pbf-lots/<state>.json
// and delete the extract. Exits once every state in us-states.json has a lot list.
// Usage: node pbf-run.mjs <workDir> <pbfDir>
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [W, D] = process.argv.slice(2);
const states = Object.keys(JSON.parse(fs.readFileSync(W + '/us-states.json')));
fs.mkdirSync(W + '/pbf-lots', { recursive: true });
const here = fileURLToPath(new URL('.', import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (;;) {
  const left = states.filter((s) => !fs.existsSync(W + '/pbf-lots/' + s + '.json'));
  if (!left.length) break;
  const s = left.find((x) => fs.existsSync(D + '/' + x + '.osm.pbf'));
  if (!s) { await sleep(20000); continue; }
  try {
    execFileSync('node', ['--max-old-space-size=6000', here + 'pbf-lots.mjs', D + '/' + s + '.osm.pbf', W + '/pbf-lots/' + s + '.tmp'], { stdio: 'inherit' });
    fs.renameSync(W + '/pbf-lots/' + s + '.tmp', W + '/pbf-lots/' + s + '.json');
    fs.unlinkSync(D + '/' + s + '.osm.pbf');
    console.log(new Date().toISOString(), 'done', s, 'left', left.length - 1);
  } catch (e) { console.log('FAILED', s, e.message); fs.renameSync(D + '/' + s + '.osm.pbf', D + '/' + s + '.bad'); }
}
console.log('ALL DONE');
