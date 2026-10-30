// Build the rewrite queue from live.json: distinct copied strings, their runs, every (id,path) that holds them,
// and the cited URLs per route (for re-validation). Name/number-dominated runs are exempt (facts, not prose).
import fs from "node:fs"; import path from "node:path";
const WT = process.cwd();
const R = JSON.parse(fs.readFileSync(process.env.LIVE_JSON || "audits/copied-prose-live/live.json", "utf8"));
const ROUTE_ID = /^[a-z]{2,3}_[a-z0-9_]+$/, URL_RE = /https?:\/\/[^\s"'<>)\]]+/g, clean = u => u.replace(/[.,;:]+$/, "");
const cites = new Map(); const add = (id, u) => { if (!cites.has(id)) cites.set(id, new Set()); cites.get(id).add(clean(u)); };
const urlsIn = v => { const o = []; const w = x => { if (typeof x === "string") o.push(...(x.match(URL_RE) || [])); else if (x && typeof x === "object") Object.values(x).forEach(w); }; w(v); return o; };
function collect(v) { if (Array.isArray(v)) return v.forEach(collect); if (!v || typeof v !== "object") return;
  if (typeof v.id === "string" && ROUTE_ID.test(v.id)) { for (const u of urlsIn(v)) add(v.id, u); return; }
  for (const [k, x] of Object.entries(v)) { if (ROUTE_ID.test(k) && x && typeof x === "object") for (const u of urlsIn(x)) add(k, u); else collect(x); } }
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".json") ? [path.join(d, e.name)] : []);
for (const f of walk("audits")) { if (f.startsWith("audits/copied-prose-live")) continue; try { collect(JSON.parse(fs.readFileSync(f, "utf8"))); } catch {} }

const toks = s => String(s).replace(/[’‘]/g, "'").replace(/[^A-Za-z0-9.+'/]+/g, " ").split(/\s+/).map(w => w.replace(/^[.'/]+|[.'/]+$/g, "")).filter(Boolean);
const STOP = new Set(["of", "the", "and", "at", "to", "on", "in", "by", "a", "for"]);
function nameShare(text, run) { const t = toks(text), rl = run.split(" "), tl = t.map(w => w.toLowerCase());
  for (let i = 0; i + rl.length <= tl.length; i++) if (rl.every((w, j) => tl[i + j] === w)) { const seg = t.slice(i, i + rl.length).filter(w => !STOP.has(w.toLowerCase())); return seg.filter(w => /^[A-Z0-9]/.test(w)).length / Math.max(1, seg.length); }
  return 0; }

const byText = new Map(); let exempt = 0;
for (const r of R) for (const h of r.hits || []) {
  const runs = h.runs.filter(run => nameShare(h.text, run) < 0.6); exempt += h.runs.length - runs.length;
  if (!runs.length) continue;
  if (!byText.has(h.text)) byText.set(h.text, { text: h.text, runs: new Set(), targets: [] });
  const e = byText.get(h.text); runs.forEach(x => e.runs.add(x)); e.targets.push({ id: r.id, path: h.path });
}
const items = [...byText.values()].map((e, i) => ({ key: `s${String(i + 1).padStart(4, "0")}`, text: e.text, runs: [...e.runs], targets: e.targets }));
// keep one route's strings together where possible: sort by first target id
items.sort((a, b) => a.targets[0].id.localeCompare(b.targets[0].id) || a.key.localeCompare(b.key));
const out = "audits/copied-prose-live"; fs.mkdirSync(`${out}/queue`, { recursive: true });
const BATCH = 70; let n = 0;
for (let i = 0; i < items.length; i += BATCH) { n++; fs.writeFileSync(`${out}/queue/b${String(n).padStart(2, "0")}.json`, JSON.stringify(items.slice(i, i + BATCH), null, 1)); }
const citeObj = {}; for (const it of items) for (const t of it.targets) citeObj[t.id] = [...(cites.get(t.id) || [])];
fs.writeFileSync(`${out}/cites.json`, JSON.stringify(citeObj));
console.log(`${items.length} distinct strings, ${items.reduce((s, x) => s + x.targets.length, 0)} placements, ${exempt} name/number runs exempt, ${n} batches`);
