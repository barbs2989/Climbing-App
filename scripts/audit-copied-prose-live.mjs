// audit:copied-prose -- --live — does the text a climber reads TODAY repeat a page we researched it from?
//
// audit:copied-prose checks one batch file as written; enrich:apply refuses the same thing at the
// write. Neither looks back: everything applied before the gate (2026-10-24, #2757) was never
// compared with its sources, and a later hand edit could reintroduce a copied clause. This walks
// EVERY research file under audits/, collects each route id with every URL that research cited for
// it, reads the route's live row, and runs the same 8-word test (scripts/lib/source-overlap.mjs)
// against every rendered string in it.
//
//   npm run audit:copied-prose -- --live [--ids a,b] [--cache DIR] [--json out.json] [--fetch-only]
//
// Report-only, public key (routes are world-readable). Pages are fetched one at a time, paced; `--cache DIR` keeps their text so a re-run
// fetches nothing new. An unreadable source is listed, never counted as clean.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MIN_RUN, sourceIndex, copiedRuns, fetchSourceText, words } from "./lib/source-overlap.mjs";
import { selectAll } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2).filter(a => a !== "--live");
const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const fetchOnly = argv.includes("--fetch-only");
const cacheDir = opt("--cache"), jsonOut = opt("--json"), onlyIds = opt("--ids")?.split(",");

const ROUTE_ID = /^[a-z]{2,3}_[a-z0-9_]+$/;
const URL_RE = /https?:\/\/[^\s"'<>)\]]+/g;
const clean = u => u.replace(/[.,;:]+$/, "");

// route id -> Set(url). An object that names a route (an `id` field, or a route id as its key)
// owns every URL anywhere beneath it.
const cites = new Map();
const saved = new Map(); // url -> repo path of the page text a researcher saved from a real browser (review.source_texts)
const add = (id, u) => { if (!cites.has(id)) cites.set(id, new Set()); cites.get(id).add(clean(u)); };
const urlsIn = v => { const out = []; const w = x => { if (typeof x === "string") out.push(...(x.match(URL_RE) || [])); else if (x && typeof x === "object") Object.values(x).forEach(w); }; w(v); return out; };
function collect(v) {
  if (Array.isArray(v)) return v.forEach(collect);
  if (!v || typeof v !== "object") return;
  if (v.source_texts && typeof v.source_texts === "object") for (const [u, f] of Object.entries(v.source_texts)) if (typeof f === "string") saved.set(clean(u), f);
  if (typeof v.id === "string" && ROUTE_ID.test(v.id)) { for (const u of urlsIn(v)) add(v.id, u); return; }
  for (const [k, x] of Object.entries(v)) {
    if (ROUTE_ID.test(k) && x && typeof x === "object") for (const u of urlsIn(x)) add(k, u);
    else collect(x);
  }
}
const walkDir = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walkDir(path.join(d, e.name)) : e.name.endsWith(".json") ? [path.join(d, e.name)] : []);
let files = 0;
for (const f of walkDir("audits")) { let j; try { j = JSON.parse(fs.readFileSync(f, "utf8")); } catch { continue; } files++; collect(j); }
let ids = [...cites.keys()].sort();
if (onlyIds) ids = ids.filter(i => onlyIds.includes(i));
const allUrls = new Set(ids.flatMap(i => [...cites.get(i)]));
console.log(`${files} research files cite ${allUrls.size} pages for ${ids.length} route ids.`);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const cachePath = u => cacheDir && path.join(cacheDir, crypto.createHash("sha1").update(u).digest("hex") + ".txt");
const pageText = new Map();
async function text(u) {
  if (pageText.has(u)) return pageText.get(u);
  const cp = cachePath(u);
  let t = null;
  if (saved.has(u) && fs.existsSync(saved.get(u))) { t = fs.readFileSync(saved.get(u), "utf8"); if (words(t).length < 40) t = null; }
  else if (cp && fs.existsSync(cp)) { const s = fs.readFileSync(cp, "utf8"); t = s === "" ? null : s; }
  else { t = await fetchSourceText(u); await sleep(1000); if (cp) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cp, t || ""); } }
  pageText.set(u, t);
  return t;
}

// One page at a time per site, paced by text(); up to SITES sites at once, so 7,000 pages do not
// take a day and no single site sees more than one request a second.
const SITES = 8;
async function prefetch(urls) {
  const byHost = new Map();
  for (const u of urls) { let h; try { h = new URL(u).host; } catch { h = "?"; } if (!byHost.has(h)) byHost.set(h, []); byHost.get(h).push(u); }
  const queues = [...byHost.values()].sort((a, b) => b.length - a.length);
  let k = 0, ok = 0;
  const worker = async () => { for (let q; (q = queues.shift());) for (const u of q) { if (await text(u)) ok++; if (++k % 200 === 0) console.error(`  … ${k}/${urls.size ?? urls.length} pages, ${ok} readable`); } };
  await Promise.all(Array.from({ length: SITES }, worker));
  return ok;
}
if (fetchOnly) {
  const ok = await prefetch(allUrls);
  console.log(`${ok} of ${allUrls.size} cited pages readable.`);
  process.exit(0);
}

// Rendered text only: identifiers, names and grades never reach 8 words, and the provenance/review
// columns never render.
const SKIP_COLS = new Set(["id", "area_id", "name", "path", "search_name", "sources", "source", "source_url", "provenance", "review", "mp_id", "openbeta_id", "created_at", "updated_at"]);
const strings = (row) => {
  const out = [];
  const w = (v, p) => {
    if (typeof v === "string") { if (words(v).length >= MIN_RUN && !/^https?:\/\//.test(v)) out.push({ path: p, text: v }); return; }
    if (Array.isArray(v)) return v.forEach((x, i) => w(x, `${p}[${i}]`));
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) w(x, `${p}.${k}`);
  };
  for (const [k, v] of Object.entries(row)) if (!SKIP_COLS.has(k)) w(v, k);
  return out;
};

const rows = new Map();
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50);
  for (const r of await selectAll("routes", "*", `id=in.(${chunk.map(encodeURIComponent).join(",")})`, { pageSize: 50 })) rows.set(r.id, r);
}
console.log(`${rows.size} of them are live routes.`);

await prefetch(new Set([...rows.keys()].flatMap(i => [...cites.get(i)])));
const report = [];
let hitRoutes = 0, hitStrings = 0, unchecked = 0, n = 0;
for (const id of ids) {
  const row = rows.get(id); if (!row) continue;
  n++; if (n % 50 === 0) console.error(`  … ${n}/${rows.size}`);
  const ss = strings(row); if (!ss.length) continue;
  const texts = [], unread = [];
  for (const u of cites.get(id)) { const t = await text(u); if (t) texts.push(t); else unread.push(u); }
  if (!texts.length) { unchecked++; report.push({ id, unread, hits: [] }); continue; }
  const g = sourceIndex(texts), hits = [];
  for (const s of ss) { const runs = copiedRuns(s.text, g); if (runs.length) hits.push({ path: s.path, runs, text: s.text }); }
  if (hits.length) { hitRoutes++; hitStrings += hits.length; for (const h of hits) for (const r of h.runs) console.log(`✗  ${id}  ${h.path}: "${r}"`); }
  report.push({ id, read: texts.length, unread, hits });
}
console.log(`\n${hitRoutes} live route(s), ${hitStrings} string(s) repeat a run of ${MIN_RUN}+ words from a page cited for them; ${unchecked} route(s) had no readable cited page.`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
if (hitRoutes) process.exitCode = 1;
