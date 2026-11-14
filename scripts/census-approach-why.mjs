// Census for the "why take this way" pass: every route with more than one way in, each way in's
// name, primary mark, season, notes and any `why` already written. Read-only.
//   node scripts/census-approach-why.mjs ids.json [out.json]
// Reads by KEYED id lists, 10 at a time: a scan filtered on `approach_variants=not.is.null` (or by
// state prefix) timed out twice on 2026-10-28 while one-row keyed reads answered in under a second.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { SUPABASE_URL, headers, anonKey } from "./lib/supabase-env.mjs";
const PART = "audits/approach-why/census-raw.json"; // resumable: rows already read are kept and skipped
mkdirSync("audits/approach-why", { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rows = existsSync(PART) ? JSON.parse(readFileSync(PART, "utf8")) : [];
const have = new Set(rows.map(r => r.id)), done = new Set(existsSync(PART + ".ids") ? JSON.parse(readFileSync(PART + ".ids", "utf8")) : []);
const ids = JSON.parse(readFileSync(process.argv[2], "utf8")).filter(id => !have.has(id) && !done.has(id));
for (let i = 0; i < ids.length; i += 10) {
  const chunk = ids.slice(i, i + 10);
  const q = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,discipline,approach_variants&id=in.(${chunk.map(encodeURIComponent).join(",")})`;
  const t0 = Date.now();
  const res = await fetch(q, { headers: headers(anonKey()), signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`GET chunk ${i / 10 + 1} -> ${res.status} ${(await res.text()).slice(0, 200)} — stopping`);
  rows.push(...await res.json());
  chunk.forEach(id => done.add(id));
  writeFileSync(PART, JSON.stringify(rows)); writeFileSync(PART + ".ids", JSON.stringify([...done]));
  if (Date.now() - t0 > 8000) { console.error(`chunk took ${Date.now() - t0} ms — backing off 60 s`); await sleep(60000); } else await sleep(2000);
}
const multi = rows.filter(r => Array.isArray(r.approach_variants) && r.approach_variants.filter(Boolean).length > 1);
const out = multi.map(r => ({ id: r.id, name: r.name, area_id: r.area_id, discipline: r.discipline,
  ways: r.approach_variants.filter(Boolean).map(v => ({ name: v.name, primary: v.primary === true, viaRouteId: v.viaRouteId || null, season: v.season || null, notes: v.notes || null, why: v.whyThisWay || null })) }));
const unmarked = out.filter(r => !r.ways.some(w => w.primary));
const alts = out.reduce((n, r) => n + r.ways.filter(w => !w.primary).length, 0);
console.log(`${rows.length} rows read; ${out.length} with >1 way in; ${unmarked.length} with none marked primary; ${alts} non-primary ways in; ${out.reduce((n, r) => n + r.ways.filter(w => w.why).length, 0)} already carry why`);
writeFileSync(process.argv[3] || "audits/approach-why/census.json", JSON.stringify(out, null, 1));
