// Step 2 of the route-page details pass: read the fetched pages (fetch-route-pages.mjs), keep only the
// routes whose row has an empty slot the page could fill, and cut them into batches for REWRITING.
// Nothing here is written to the database, and nothing fetched is ever shown as it was written.
//
//   node scripts/pipeline/extract-route-details.mjs <state> [--batch 30]
//
// NEEDS   catalog/_mp/_routes/<id>.html          (fetch-route-pages.mjs)
//         catalog/_mp/_map/<state>[.snow].json   (import-route-grades.mjs <state> [--snow] --create-areas --map)
// WRITES  catalog/_mp/_details/<state>/in-NNN.json   [{ id, name, grade, disc, area, want:[...], src:{...} }]
//
// Slots (route column <- page section): overview <- Description, detailed_rack <- Protection, location <- Location,
// fa <- FA.
//
// THE REWRITE (a Claude pass, Sonnet, one batch at a time; writes out-NNN.json = { id: { field: text } }): list the
// source's facts, then write them in a new order and new vocabulary — never a sentence-by-sentence paraphrase, which
// apply-route-details refuses for 4-word overlaps (New York's first draft: 49 of 85 fields). Invent nothing; never
// alter a route name; no first person, sources or capitals. Caps: overview 700, detailed_rack 280, fa 120, and
// location 160 — a DATABASE limit (routes_location_len, 0243), so aim for 150.
//
// --adds: only the climbs order-from-mp.mjs ADDED (catalog/_mp/_order/<state>.adds.json), so a wall's new
// neighbours get their prose without offering every mapped route in the state.
// A slot that already holds text is never offered, so researched prose is never overwritten.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const state = process.argv[2];
if (!state) { console.error("Name a state id (as the tree files are named)"); process.exit(1); }
const bi = process.argv.indexOf("--batch"), BATCH = bi >= 0 ? Number(process.argv[bi + 1]) : 30;
const DIR = process.env.MP_DIR || "catalog/_mp";
const KEY = requireServiceKey(), H = { apikey: KEY, Authorization: "Bearer " + KEY };

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", deg: "°" };
const text = h => h.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const section = (html, name) => {
  const m = html.match(new RegExp(`<h2 class="mt-2">\\s*${name}\\s*<!--EDIT[\\s\\S]*?<div class="fr-view">([\\s\\S]*?)</div>`));
  return m ? text(m[1]) : "";
};
const row = (html, label) => { const m = html.match(new RegExp(`<td>${label}:</td>\\s*<td>\\s*([\\s\\S]*?)\\s*</td>`)); return m ? text(m[1]) : ""; };
const placeholder = s => !s || /^(unknown|unk|n\/?a|none|\?+|-+)$/i.test(s.trim());

const maps = {};
const ADDS = process.argv.includes("--adds");
for (const f of ADDS ? [`${DIR}/_order/${state}.adds.json`] : [`${DIR}/_map/${state}.json`, `${DIR}/_map/${state}.snow.json`]) if (existsSync(f)) Object.assign(maps, JSON.parse(readFileSync(f, "utf8")));
if (!Object.keys(maps).length) { console.error(`No id map for ${state} — run import-route-grades.mjs ${state} [--snow] --create-areas --map first`); process.exit(1); }

const pages = [];
for (const [mp, id] of Object.entries(maps)) {
  const p = `${DIR}/_routes/${mp}.html`;
  if (!existsSync(p)) continue;
  const html = readFileSync(p, "utf8");
  pages.push({ mp, id, desc: section(html, "Description"), prot: section(html, "Protection"), loc: section(html, "Location"), fa: row(html, "FA") });
}

const byId = new Map();
for (let i = 0; i < pages.length; i += 150) {
  const ids = pages.slice(i, i + 150).map(p => `"${p.id}"`).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,grade,discipline,area_id,overview,detailed_rack,location,fa&id=in.(${ids})`, { headers: H });
  if (!r.ok) throw new Error(`read ${r.status}: ${await r.text()}`);
  for (const x of await r.json()) byId.set(x.id, x);
}

const out = []; let noRow = 0;
for (const p of pages) {
  const x = byId.get(p.id);
  if (!x) { noRow++; continue; }
  const want = [], src = {};
  if (!x.overview && p.desc.length >= 40) { want.push("overview"); src.desc = p.desc; }
  if (!x.detailed_rack && p.prot.length >= 25) { want.push("detailed_rack"); src.prot = p.prot; }
  if (!x.location && p.loc.length >= 25) { want.push("location"); src.loc = p.loc; }
  if (placeholder(x.fa) && !placeholder(p.fa)) { want.push("fa"); src.fa = p.fa; }
  if (want.length) out.push({ id: x.id, name: x.name, grade: x.grade, disc: x.discipline, area: x.area_id, want, src });
}

const dir = `${DIR}/_details/${state}${ADDS ? "/adds" : ""}`; // --adds batches never overwrite the full pass's
mkdirSync(dir, { recursive: true });
for (let i = 0, n = 1; i < out.length; i += BATCH, n++) writeFileSync(`${dir}/in-${String(n).padStart(3, "0")}.json`, JSON.stringify(out.slice(i, i + BATCH)));
const c = k => out.filter(o => o.want.includes(k)).length;
console.log(`${state}: ${Object.keys(maps).length} mapped, ${pages.length} pages on disk, ${noRow} with no row yet | to fill: ${out.length} routes (overview ${c("overview")}, detailed_rack ${c("detailed_rack")}, location ${c("location")}, fa ${c("fa")}) in ${Math.ceil(out.length / BATCH)} batches -> ${dir}`);
