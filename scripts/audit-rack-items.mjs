// audit:rack-items — does any WA route file NON-RACK gear where the RACK card reads?
//
// The RACK card renders protection and ropework hardware: cams, nuts, slings, draws, carabiners,
// pickets, screws, pitons, cord, ropes. It read `detailed_rack` (sentences), `pro_needs`, `rack`
// and — through db.js's rack->gear fallback — the whole `gear` column, so an ice axe, crampons, a
// helmet or "Sturdy boots that edge well" rendered as the route's rack. Measured 2026-10-15 over
// 14,200 WA routes: 386 of the 1,275 with a rack of their own did this (331 via detailed_rack, 33
// via gear, 22 via pro_needs), plus 42 `rack` arrays that detailed_rack happened to out-rank.
//
// lib/rack.js now splits every rack source and sends the non-rack remainder to GEAR & ESSENTIALS
// (rackLeftovers), so the SCREEN is right whatever the row holds. This audit asks the row: it
// reports every entry the reader has to set aside, because a helmet filed under rack is a filing
// error worth fixing at the source, not merely masking. `gear` is deliberately NOT a finding —
// it is the route's whole gear list by name and the reader is expected to split it.
//
// Also asserts, with no database, that DISC_RACK (the per-discipline fallback) is rack-only.
//
//   node scripts/audit-rack-items.mjs [--state wa] [--list 40] [--selftest]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";
import { isRackEntry, isNonRackGear, rackFromText, DISC_RACK } from "../lib/rack.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = String(arg("--state", "wa")).toLowerCase();
const LIST = +arg("--list", 40);

// 1. The fallback table, with no database.
const tableBad = [];
for (const d of Object.keys(DISC_RACK)) for (const e of DISC_RACK[d]) if (!isRackEntry(e)) tableBad.push(`${d}: ${e}`);
if (tableBad.length) { console.error(`FAIL — DISC_RACK carries ${tableBad.length} non-rack entries:\n  ${tableBad.join("\n  ")}`); process.exit(1); }
console.log(`DISC_RACK: ${Object.values(DISC_RACK).flat().length} entries across ${Object.keys(DISC_RACK).length} disciplines, all rack-shaped.`);
if (argv.includes("--selftest")) {
  const cases = [["Carry an ice axe if snow lingers.", false], ["Helmet", false], ["Sturdy boots that edge well", false], ["A 60m rope and a medium alpine rack.", true], ["No rope or rack needed for the standard scramble.", true], ["Ice axe and crampons (seasonal)", false], ["2 pickets", true], ["Crash pads — 2", true]];
  let bad = 0; for (const [s, want] of cases) if (isRackEntry(s) !== want) { bad++; console.error(`  selftest: isRackEntry(${JSON.stringify(s)}) !== ${want}`); }
  if (bad) process.exit(1); console.log(`selftest: ${cases.length}/${cases.length} classified as expected.`); process.exit(0);
}

// 2. The rows. Scope on the AREA, never on the route id: the four legacy ids (rainier_*, adams_*)
// live under wa_ areas. Key-range on id for the bulk, then the legacy tail by area prefix.
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
async function page(table, select, filter) {
  const out = []; let last = "";
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filter ? `&${filter}` : ""}${last ? `&id=gt.${encodeURIComponent(last)}` : ""}&order=id.asc&limit=1000`;
    let rows;
    for (let a = 0; a < 4; a++) {
      const res = await fetch(url, { headers: headers(key) }); const t = await res.text();
      if (res.ok) { rows = JSON.parse(t); break; }
      if (a === 3) throw new Error(`GET ${table} -> ${res.status} ${t.slice(0, 200)}`);
      await new Promise(r => setTimeout(r, 800 * (a + 1)));
    }
    if (!rows.length) break; out.push(...rows); last = rows[rows.length - 1].id; if (rows.length < 1000) break;
  }
  return out;
}
const areas = new Set((await page("areas", "id", `id=gte.${STATE}_&id=lt.${STATE}%60`)).map(a => a.id));
if (!areas.size) { console.error(`FAIL — read 0 areas for state "${STATE}". A broken query, not a clean catalog.`); process.exit(1); }
const sel = "id,name,discipline,detailed_rack,pro_needs,rack";
const bulk = await page("routes", sel, `id=gte.${STATE}_&id=lt.${STATE}%60`);
const legacy = (await page("routes", sel, `id=not.like.${STATE}_*&area_id=like.${STATE}_*`)).filter(r => areas.has(r.area_id) || true);
const routes = bulk.concat(legacy);
if (!routes.length) { console.error(`FAIL — read 0 routes for state "${STATE}".`); process.exit(1); }

// pro_needs is a protection STATEMENT, not a list, so it is not split by sentence; it is a
// finding only when a clause advises carrying non-rack gear.
const CARRY_NON_RACK = /\b(?:carry|carrying|bring|add|take|pack|recommended|advis|prudent|worthwhile|useful|helps?|essential|mandatory|needed|strongly)\b[^.;]{0,80}\b(?:ice ?axes?|crampons?|microspikes?|helmet|boots?|snowshoes?|poles?)\b|\b(?:ice ?axes?|crampons?|microspikes?|helmet|boots?|snowshoes?|poles?)\b[^.;]{0,60}\b(?:is|are)\s+(?:carried|recommended|advisable|advised|essential|mandatory|worthwhile|prudent|useful|strongly)/i;

// Two classes. A FINDING names non-rack gear (what the reader moves to GEAR & ESSENTIALS); an entry
// that names no gear at all ("Terrain includes sections of loose boulders.") is NEITHER — the reader
// leaves it on the card, since the packing list would be the wrong home too, so it is listed apart.
const findings = [], neither = [];
let withOwn = 0;
const cls = s => isRackEntry(s) ? null : (isNonRackGear(s) ? "gear" : "neither");
for (const r of routes) {
  const f = [], n = [];
  if (r.detailed_rack && String(r.detailed_rack).trim()) { withOwn++; for (const s of rackFromText(r.detailed_rack)) { const c = cls(s); if (c === "gear") f.push(["detailed_rack", s]); else if (c) n.push(["detailed_rack", s]); } }
  else if (r.pro_needs && String(r.pro_needs).trim()) { withOwn++; if (CARRY_NON_RACK.test(r.pro_needs)) f.push(["pro_needs", r.pro_needs]); }
  if (Array.isArray(r.rack)) for (const e of r.rack) if (typeof e === "string" && e.trim()) { const c = cls(e); if (c === "gear") f.push(["rack", e]); else if (c) n.push(["rack", e]); }
  if (f.length) findings.push({ id: r.id, name: r.name, discipline: r.discipline, f });
  if (n.length) neither.push({ id: r.id, name: r.name, discipline: r.discipline, f: n });
}
const byCol = {}; for (const x of findings) for (const [c] of x.f) byCol[c] = (byCol[c] || 0) + 1;
console.log(`${routes.length} ${STATE.toUpperCase()} routes read (${withOwn} with a rack of their own); ${findings.length} routes file non-rack gear in a rack column${findings.length ? ` — entries by column: ${JSON.stringify(byCol)}` : "."}`);
for (const x of findings.slice(0, LIST)) { console.log(`\n${x.id}  (${x.discipline})  ${x.name}`); for (const [c, s] of x.f) console.log(`   ${c}: ${s.length > 180 ? s.slice(0, 177) + "..." : s}`); }
if (findings.length > LIST) console.log(`\n… ${findings.length - LIST} more (--list N)`);
console.log(`\n${neither.length} routes carry a rack entry that names neither rack nor gear (left on the card; fix the row):`);
for (const x of neither.slice(0, LIST)) { console.log(`${x.id}  (${x.discipline})  ${x.name}`); for (const [c, s] of x.f) console.log(`   ${c}: ${s.length > 180 ? s.slice(0, 177) + "..." : s}`); }
process.exit(findings.length ? 1 : 0);
