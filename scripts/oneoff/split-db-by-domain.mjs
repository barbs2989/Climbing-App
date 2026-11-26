// Split lib/db.js into flat domain modules lib/db-<domain>.js, keeping lib/db.js as the one import path.
// Usage: node scripts/oneoff/split-db-by-domain.mjs [--dry]   (run once on 2026-11-25; kept as the record of how
// lib/db.js was cut, and to re-cut it if a domain list ever changes — it expects the ORIGINAL single-file lib/db.js)
// Every line of the original lands in exactly one domain file (asserted). Declarations another file
// needs get `export ` prepended; each domain file imports exactly the top-level names it references.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const DRY = process.argv.includes('--dry');
const acorn = createRequire(import.meta.url)('acorn');
const SRC_PATH = path.join(ROOT, 'lib/db.js');
const src = fs.readFileSync(SRC_PATH, 'utf8');
const lines = src.split('\n');
const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true });

// Domains: [file, first top-level name in it, one-line purpose]. A domain runs until the next one starts.
const DOMAINS = [
  ['db-shared', 'SEARCH_DEBOUNCE_MS', 'helpers every domain uses: debounced search terms, the network-first offline fallback, device-first reads, keyset paging'],
  ['db-catalog', 'useAreaChildren', 'the catalog: areas and routes, their trees, paths, counts and points'],
  ['db-search', 'routeSearchScore', 'search: places, regions, home state, and route search'],
  ['db-catalog-more', 'fetchAreaPath', 'the catalog, continued: area paths, classics, countries and states, nearby places, routes by id'],
  ['db-contributions', 'fetchRouteContributions', 'what climbers contribute about a place: contributions, area stats, pairings, condition reports, ranks, log tags'],
  ['db-crews', 'useMyObjectives', 'objectives, crew safety alignment, partner signals and crews (members, days, rides, gear, invites)'],
  ['db-profile', 'sessionUid', "the signed-in climber's own profile settings: discoverability, zip, condition prefs, tracked lists, notification state, résumé"],
  ['db-partners', 'usePartnersNear', 'finding partners: by objective, area listings (0300), route listings (0489), profile search, crew requests, profiles by id'],
  ['db-route-row', 'toArr', 'turning a routes row into the app\'s route object (dbRouteToCamel) and its waypoint/gear/pitch helpers'],
  ['db-photos', 'useRouteTopos', 'topos and photos: uploads, alt text, captions, device-saved media'],
  ['db-moderation', 'useMyFiledReports', 'moderation and route quality control: reports, standing, appeals, field confidence and contributions review, notices, topo lines'],
  ['db-logs', 'useMyLogPartnerNames', 'climb logs and trip reports, kudos, packing a route for offline, hazard votes, ratings, route views'],
  ['db-social', 'useMyConnections', 'connections, base check-ins, blocking and restricting, vouches, verification'],
  ['db-messaging', 'CHAT_VIDEO_MAX_BYTES', 'messages: chat videos, crew and direct messages, read state'],
  ['db-comments', 'publicNameOf', 'comments, their likes and reactions'],
  ['db-groups', 'GROUP_COLS', 'groups: discovery, membership, invites, bans, prefs, reports, posts, events'],
  ['db-lists', 'useMyLists', 'tick lists and itineraries'],
  ['db-admin', 'useIsAdmin', 'admin and the review desk: route/area proposals, placement and wall-order claims, data rights, accessibility reports, app feedback, GPS review'],
];

const declNames = (n) => {
  const d = n.type.startsWith('Export') && n.declaration ? n.declaration : n;
  if (d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') return [d.id.name];
  if (d.type === 'VariableDeclaration') return d.declarations.flatMap((x) => x.id.type === 'Identifier' ? [x.id.name] : []);
  if (d.type === 'ImportDeclaration') return d.specifiers.map((s) => s.local.name);
  return [];
};
const imports = ast.body.filter((n) => n.type === 'ImportDeclaration');
const importOf = new Map(); // local name -> {source, imported, isDefault}
for (const im of imports) for (const s of im.specifiers) importOf.set(s.local.name, { source: im.source.value, imported: s.imported ? s.imported.name : 'default', isDefault: s.type === 'ImportDefaultSpecifier' });
const body = ast.body.filter((n) => n.type !== 'ImportDeclaration');
// The one re-export of imported names (export { profileCols, PROFILE_NAME_COLS }) goes to the barrel.
const reexport = body.filter((n) => n.type === 'ExportNamedDeclaration' && !n.declaration && !n.source);
const stmts = body.filter((n) => !reexport.includes(n)).map((n) => ({ n, names: declNames(n), exported: n.type === 'ExportNamedDeclaration', start: n.loc.start.line, end: n.loc.end.line }));
const declaredIn = new Map();
// Assign domains.
let di = -1;
for (const s of stmts) {
  const next = DOMAINS[di + 1];
  if (next && s.names.includes(next[1])) di++;
  if (di < 0) throw new Error('first statement before first domain: ' + s.names);
  s.dom = DOMAINS[di][0];
  for (const nm of s.names) declaredIn.set(nm, s.dom);
}
for (const [f, first] of DOMAINS) if (![...declaredIn.values()].includes(f)) throw new Error('domain never started: ' + f + ' (' + first + ')');
const top = new Set([...declaredIn.keys(), ...importOf.keys()]);
// Refs: every Identifier/JSXIdentifier naming a top-level binding, ignoring property keys and member props.
function refs(node, acc, parent, key) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) refs(x, acc, parent, key); return; }
  if (node.type === 'Identifier' && top.has(node.name)) {
    const isProp = parent && ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed) || (parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand) || (parent.type === 'MethodDefinition' && key === 'key'));
    if (!isProp) acc.add(node.name);
  }
  for (const k of Object.keys(node)) { if (k === 'loc') continue; const v = node[k]; if (v && typeof v === 'object') refs(v, acc, node, k); }
}
// Module-scope refs: same walk, but not into function bodies.
function scopeRefs(node, acc, parent, key) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) scopeRefs(x, acc, parent, key); return; }
  if (/Function/.test(node.type)) return;
  if (node.type === 'Identifier' && top.has(node.name)) {
    const isProp = parent && ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed) || (parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand));
    if (!isProp) acc.add(node.name);
  }
  for (const k of Object.keys(node)) { if (k === 'loc') continue; const v = node[k]; if (v && typeof v === 'object') scopeRefs(v, acc, node, k); }
}
const files = new Map(DOMAINS.map(([f]) => [f, { stmts: [], refs: new Set(), scope: new Set() }]));
for (const s of stmts) {
  const F = files.get(s.dom); F.stmts.push(s);
  const a = new Set(); refs(s.n, a); for (const x of s.names) a.delete(x); for (const x of a) F.refs.add(x);
  const decl = s.n.type === 'ExportNamedDeclaration' ? s.n.declaration : s.n;
  if (decl.type !== 'FunctionDeclaration') { const b = new Set(); scopeRefs(decl, b); for (const x of s.names) b.delete(x); for (const x of b) if (declaredIn.has(x) && declaredIn.get(x) !== s.dom) F.scope.add(x + '<-' + declaredIn.get(x)); }
}
// Which declarations need exporting (used by another domain)?
const needExport = new Set();
for (const [f, F] of files) for (const r of F.refs) if (declaredIn.has(r) && declaredIn.get(r) !== f) needExport.add(r);
// Line ranges: a domain's text starts right after the previous domain's last statement ends.
const order = DOMAINS.map(([f]) => f);
const ranges = new Map();
const firstImportEnd = Math.max(...imports.map((i) => i.loc.end.line), ...reexport.map((r) => r.loc.end.line));
for (let i = 0; i < order.length; i++) {
  const F = files.get(order[i]);
  const startLine = i === 0 ? firstImportEnd + 1 : files.get(order[i - 1]).stmts.at(-1).end + 1;
  const endLine = i === order.length - 1 ? lines.length : F.stmts.at(-1).end;
  ranges.set(order[i], [startLine, endLine]);
}
// Lines 1..firstImportEnd: the header comment, imports and the re-export. Header comment goes to the barrel.
const headerLines = lines.slice(0, firstImportEnd);
// Assert full coverage of statements: no line of any statement falls outside its domain range.
for (const s of stmts) { const [a, b] = ranges.get(s.dom); if (s.start < a || s.end > b) throw new Error('statement outside its range: ' + s.names); }

const report = [];
const out = new Map();
for (const [f, purpose] of DOMAINS.map((d) => [d[0], d[2]])) {
  const F = files.get(f); const [a, b] = ranges.get(f);
  let text = lines.slice(a - 1, b);
  // export the declarations other domains need
  for (const s of F.stmts) {
    if (s.exported || !s.names.some((n) => needExport.has(n))) continue;
    const li = s.start - a; const l = text[li];
    const col = s.n.loc.start.column;
    if (!/^(async function|function|const|let|var|class)\b/.test(l.slice(col))) throw new Error('cannot export ' + s.names + ': ' + l.slice(col, col + 40));
    text[li] = l.slice(0, col) + 'export ' + l.slice(col);
  }
  // imports
  const ext = new Map(); // source -> [specifier strings]
  const intra = new Map(); // domain -> names
  for (const r of [...F.refs].sort()) {
    if (importOf.has(r)) { const im = importOf.get(r); if (!ext.has(im.source)) ext.set(im.source, { def: null, named: [] }); const e = ext.get(im.source); if (im.isDefault) e.def = r; else e.named.push(im.imported === r ? r : `${im.imported} as ${r}`); }
    else if (declaredIn.has(r) && declaredIn.get(r) !== f) { const d = declaredIn.get(r); if (!intra.has(d)) intra.set(d, []); intra.get(d).push(r); }
  }
  const imp = [];
  // keep the original import order
  for (const im of imports) { const e = ext.get(im.source.value); if (!e) continue; const parts = []; if (e.def) parts.push(e.def); if (e.named.length) parts.push(`{ ${e.named.join(', ')} }`); imp.push(`import ${parts.join(', ')} from ${JSON.stringify(im.source.value)};`); ext.delete(im.source.value); }
  for (const d of order) if (intra.has(d)) imp.push(`import { ${intra.get(d).join(', ')} } from "./${d}.js";`);
  const head = [`// lib/${f}.js — ${purpose}.`, `// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports`, `// every public name; import from this file only inside the lib/db-*.js domain files.`, ...imp, ''];
  // drop leading blank lines of the slice
  while (text.length && text[0].trim() === '') text.shift();
  out.set(f, head.concat(text).join('\n').replace(/\n*$/, '\n'));
  report.push(`${f}: lines ${a}-${b} (${b - a + 1}), ${F.stmts.length} stmts, ${F.stmts.filter((s) => s.exported).length} public, imports ${[...intra.keys()].join(',') || '-'}${F.scope.size ? '  MODULE-SCOPE CROSS: ' + [...F.scope].join(' ') : ''}`);
}
// barrel
const pub = new Map(); for (const s of stmts) if (s.exported) for (const n of s.names) pub.set(n, s.dom);
const barrel = [];
const firstCode = headerLines.findIndex((l) => /^import /.test(l));
barrel.push(...headerLines.slice(0, firstCode));
barrel.push('//', '// THIS FILE IS THE ONE IMPORT PATH. Since the maintainability audit (2026-11-25) the code lives in', '// lib/db-<domain>.js, one file per area of the app; this file re-exports every public name, so every', '// `import { … } from "./lib/db.js"` in the app is unchanged. To find a function: `grep -n "function NAME" lib/db-*.js`.', '// Guards that read the data layer as TEXT read it through readDbSource() (scripts/lib/guard-sources.mjs),', '// which joins this file and every lib/db-*.js, so a guard never reads only the re-export list.', '//');
for (const f of order) {
  const names = [...pub].filter(([, d]) => d === f).map(([n]) => n);
  if (!names.length) continue;
  barrel.push(`export {\n  ${names.join(', ').replace(/(.{1,110})(, |$)/g, '$1,\n  ').replace(/,\n  $/, '')},\n} from "./${f}.js";`.replace(/,\n  ,/g, ','));
}
for (const r of reexport) barrel.push(`export { ${r.specifiers.map((s) => s.local.name).join(', ')} } from ${JSON.stringify(importOf.get(r.specifiers[0].local.name).source)};`);
const barrelText = barrel.join('\n') + '\n';
console.log(report.join('\n'));
console.log('public names', pub.size, 'newly exported', needExport.size - [...needExport].filter((n) => pub.has(n)).length);
if (!DRY) { for (const [f, t] of out) fs.writeFileSync(path.join(ROOT, 'lib', f + '.js'), t); fs.writeFileSync(SRC_PATH, barrelText); console.log('written'); }
