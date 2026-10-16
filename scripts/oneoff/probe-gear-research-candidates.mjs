// 4,938 roped WA routes carry no rack of their own. Researching all of them is not a plan, and
// most of them are not researchable anyway: a one-line crag entry with no description, no
// pitches and no beta has no published rack to find either.
//
// So before researching anything, rank by whether the route is DOCUMENTED. The proxy is the
// route's own enrichment: a row that already carries an overview, a description, pitch detail
// and an approach is a route somebody has written about, and those are the ones where a rack
// exists to be found. A row with none of that is a catalog stub.
//
// Read-only. Prints a candidate list, writes nothing.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const ROPED = new Set(["trad", "sport", "alpine", "ice", "mixed", "aid", "rock"]);

async function readAll() {
  const sel = "id,name,area_id,discipline,grade,pitches,gear,detailed_rack,pro_needs,overview,description,beta,pitch_detail,approach,climbing_route";
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=like.wa_*&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }

const cands = [];
let ropedNoRack = 0;
const bucket = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
for (const r of rows) {
  if (!ROPED.has(String(r.discipline || "").toLowerCase())) continue;
  if (leaves(r.gear).length || leaves(r.detailed_rack).length || leaves(r.pro_needs).length) continue;
  ropedNoRack++;
  /* Documentation score: each is an independent sign somebody wrote this route up. Pitch detail
     counts double — a per-pitch breakdown is the strongest signal that a real description
     exists, and it is also the thing a rack is most often published alongside. */
  let doc = 0;
  if (String(r.overview || "").length > 80) doc++;
  if (String(r.description || "").length > 80) doc++;
  if (String(r.beta || "").length > 120) doc++;
  if (String(r.climbing_route || "").length > 120) doc++;
  if (Array.isArray(r.pitch_detail) && r.pitch_detail.length) doc += 2;
  bucket[Math.min(5, doc)]++;
  if (doc >= 3) cands.push({ id: r.id, name: r.name, disc: r.discipline, grade: r.grade, pitches: r.pitches, doc });
}

cands.sort((a, b) => b.doc - a.doc || String(a.id).localeCompare(String(b.id)));
console.log(`\n=== which rackless roped routes are documented enough to research? ===`);
console.log(`${ropedNoRack} roped WA routes carry no rack of their own\n`);
console.log(`  documentation score (overview / description / beta / climbing_route / pitch_detail x2):`);
for (const s of [0, 1, 2, 3, 4, 5]) console.log(`     ${s === 5 ? "5+" : s}: ${bucket[s]}`);
console.log(`\n  score >= 3 — a route somebody has actually written up: ${cands.length}`);
console.log(`\n--- first 40 candidates ---`);
for (const c of cands.slice(0, 40)) console.log(`  doc${c.doc}  ${c.id.padEnd(52)} ${String(c.disc).padEnd(7)} ${String(c.grade || "-").padEnd(12)} ${c.pitches ?? "-"}p  ${c.name}`);
