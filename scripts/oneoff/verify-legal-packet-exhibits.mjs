// VERIFY A SAVED COPY OF THE LAWYER PACKET AGAINST THE SHIPPED TEXT.
//
// Every passage extract-legal-surfaces.mjs prints for Terms, Privacy and the Accessibility statement,
// plus every string of the in-app Privacy sheet literal in ClimbMatch.jsx (which the extractor does NOT
// cover), must appear verbatim in the matching exhibit, with HTML entities decoded first — `&amp;` never
// matches `&`. Pass the PREVIOUS packet as well: it must miss exactly the passages that changed, or the
// check is vacuous. Exhibit D (scattered copy) is not covered; check its <li> lines against the source.
//
//   node scripts/oneoff/verify-legal-packet-exhibits.mjs new.html [old.html]
//
// Save a packet with the Artifact tool's read action. Kept in the repo because the previous copy of this
// check lived in a session's tmp directory and was lost, as the extractors were before it.
import { execFileSync } from 'child_process';
import fs from 'fs';
const out = execFileSync('node', ['scripts/oneoff/extract-legal-surfaces.mjs'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const blocks = {}; let cur = null;
for (const line of out.split('\n')) {
  const h = line.match(/^(Terms of Service|Privacy Policy|Accessibility statement)\s+—/);
  if (h) { cur = h[1]; blocks[cur] = []; continue; }
  if (/^-{5,}|^\s*$/.test(line) && cur && blocks[cur].length) { if (/^-{5,}/.test(line)) cur = null; continue; }
  if (cur && /^  \S/.test(line)) blocks[cur].push(line.slice(2));
}
const dec = (t) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…').replace(/&rarr;/g, '→').replace(/&middot;/g, '·');
const src = fs.readFileSync('ClimbMatch.jsx', 'utf8');
const si = src.indexOf('"What we store"'); const ss = src.lastIndexOf('[[', si);
let d = 0, q = null, se = -1;
for (let k = ss; k < src.length; k++) { const c = src[k]; if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; } if (c === '"' || c === "'" || c === '`') { q = c; continue; } if (c === '[') d++; else if (c === ']' && --d === 0) { se = k + 1; break; } }
const sheet = eval(src.slice(ss, se)).flat().filter(x => typeof x === 'string');
const sec = (html, a, b) => dec(html.slice(html.indexOf(`id="${a}"`), b ? html.indexOf(`id="${b}"`) : html.indexOf('<footer')));
for (const file of process.argv.slice(2)) {
  const html = fs.readFileSync(file, 'utf8');
  const map = [['Terms of Service', sec(html, 'ex-a', 'ex-b')], ['Privacy Policy', sec(html, 'ex-b', 'ex-c')], ['Accessibility statement', sec(html, 'ex-e')]];
  let tot = 0, miss = [];
  for (const [k, body] of map) { const ps = blocks[k] || []; if (!ps.length) throw new Error('no passages for ' + k); for (const p of ps) { tot++; if (!body.includes(p)) miss.push(k + ': ' + p.slice(0, 90)); } }
  const cBody = sec(html, 'ex-c', 'ex-d');
  for (const p of sheet) { tot++; if (!cBody.includes(p)) miss.push('Sheet: ' + p.slice(0, 90)); }
  console.log(`${file.split('/').pop()}: ${tot - miss.length}/${tot} verbatim`); miss.forEach(m => console.log('   MISSING ' + m));
}
