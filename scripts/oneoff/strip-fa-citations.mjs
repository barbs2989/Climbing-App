// Strips source citations out of routes.fa (and routes.ffa): "from Hanson's Guide", "(from CGNA)?",
// a URL, "see Gillett's guide". The app names no sources anywhere; the first-ascent party stays.
// A field that is ONLY a citation becomes null. Usage: node scripts/oneoff/strip-fa-citations.mjs [--apply]
import { selectAll, patchRow, requireServiceKey } from '../lib/supabase-env.mjs';
import { writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const key = requireServiceKey();
// A parenthetical or trailing clause that cites where the credit came from.
const CITE = [
  /\s*\((?:from|per|see|listed in)\s[^)]*(?:\)|$)\??/gi,          // "(from CGNA)?", "(per Hubbel's white book)", "(from Ros…" truncated
  /\s*\(\d{4}\s+\w+\s+guide\)/gi,                                 // "(2006 Perkins guide)"
  /\s*\bsee description for full\b\.?/gi,
  /\s*https?:\/\/\S+/gi,
];
// The whole field is a citation, not a party.
const WHOLE = /^\s*(?:from\s+(?:the\s+)?[\w' .]*(?:guide|book)|from\s+tom\s+hansen'?s?\b.*|see\s+(?:the\s+)?[\w' .]*(?:guide|guidebook|book)|in\s+(?:the\s+guide\s*book|[\w']+\s+book)|https?:\/\/\S+)\s*$/i;
const UNKNOWN_LISTED = /^\s*unknown\s*-\s*listed in .*$/i;

// "(from …)" that names where a CLIMBER is from, not a source — read one by one in the dry run.
const PLACE = /\((?:from|From) (?:Austria|Seattle|Los Alamos\??|Dallas|the Bernese Oberland|Colombia’s Suesca|Tree)\)/;
// Read in the dry run; the generic strip leaves a fragment, so the result is written out here.
const BY_HAND = {
  'wa_tpmv_10_meteorological_vinculation': 'Dave Anderson, Bruce Carson, 1/73',
  'az_south_face_direct_finish_mobius_strip': undefined, // a note about who, not a citation to strip
  'ut_fiddle_sticks_tower_east_face': undefined,         // a summit register is the record itself
  'ca_cross_roads_finish': undefined,                    // "from Crossroads" is the route it starts from
};
const fix = (s, id) => {
  if (s == null) return s;
  if (id in BY_HAND) return BY_HAND[id] === undefined ? s : BY_HAND[id];
  if (PLACE.test(s)) return s;
  if (WHOLE.test(s)) return null;
  if (UNKNOWN_LISTED.test(s)) return 'Unknown';
  let t = s;
  for (const re of CITE) t = t.replace(re, '');
  if (t === s) return s;                       // no citation: leave the field exactly as it is
  t = t.replace(/[ \t]+([.,;])/g, '$1').replace(/\s*-\s*$/, '').trim();
  return t || null;
};

const rows = await selectAll('routes', 'id,fa,ffa', 'or=(fa.not.is.null,ffa.not.is.null)', { pageSize: 1000, key });
const changes = [];
for (const r of rows) for (const f of ['fa', 'ffa']) {
  const to = fix(r[f], f === 'fa' ? r.id : '');
  if (to !== r[f]) changes.push({ id: r.id, field: f, from: r[f], to });
}
for (const c of changes) console.log(`${c.id} ${c.field}: ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`);
console.log(`scanned ${rows.length}; ${changes.length} changes`);
if (APPLY && changes.length) {
  const rb = `scripts/rollback-strip-fa-citations-${Date.now()}.json`;
  writeFileSync(rb, JSON.stringify(changes, null, 1));
  for (const c of changes) await patchRow('routes', c.id, { [c.field]: c.to }, { key });
  const back = await selectAll('routes', 'id,fa,ffa', `id=in.(${[...new Set(changes.map(c => c.id))].join(',')})`, { pageSize: 1000, key });
  const by = Object.fromEntries(back.map(r => [r.id, r]));
  const bad = changes.filter(c => by[c.id]?.[c.field] !== c.to);
  console.log(`WRITTEN and re-read: ${changes.length - bad.length} ok, ${bad.length} mismatched; rollback ${rb}`);
}
