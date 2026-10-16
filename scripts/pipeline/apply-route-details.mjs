// Step 3 of the route-page details pass: check the rewritten text against the page it came from, then
// (with --apply) write it to the route rows. Dry run by default.
//
//   node scripts/pipeline/apply-route-details.mjs <state> <out.json> [--apply]
//
// <out.json> is { id: { overview?, detailed_rack?, fa? } } written by the rewrite step; the matching
// in-NNN.json (same directory, same number) holds the source text the check compares against.
// A field is REFUSED (and reported) when it:
//   - repeats any 4 consecutive words of its source (numbers and short names excepted), or
//   - names a source, uses first person, or SHOUTS in capitals, or runs past its length cap, or
//   - targets a slot the row has since filled (never overwrites).
// After a write it re-reads every row and reconciles, because RLS can turn a wrong-key write into a 200
// that changed nothing.
import { readFileSync } from "node:fs";
import { dirname, basename, join } from "node:path";
import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const di = process.argv.indexOf("--drop");
const dropFile = di >= 0 ? process.argv[di + 1] : null;
const [state, outFile] = process.argv.slice(2).filter((a, i, all) => a !== "--drop" && all[i - 1] !== "--drop" && !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
if (!state || !outFile) { console.error("usage: apply-route-details.mjs <state> <out.json> [--apply]"); process.exit(1); }
const KEY = requireServiceKey(), H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
const CAP = { overview: 700, detailed_rack: 280, fa: 120 };

const inFile = process.env.IN || join(dirname(outFile), basename(outFile).replace(/^out-(?:[a-z_]+-)?/, "in-"));
const inputs = new Map(JSON.parse(readFileSync(inFile, "utf8")).map(r => [r.id, r]));
const out = JSON.parse(readFileSync(outFile, "utf8"));

const words = s => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
const grams = (s, n) => { const w = words(s), g = new Set(); for (let i = 0; i + n <= w.length; i++) g.add(w.slice(i, i + n).join(" ")); return g; };
const BAD = [
  [/\b(?:mountain ?project|summitpost|peakbagger|guidebook|guide ?book|topo|trip report|according to|as described in|per the|beta from|\bMP\b)\b/i, "names a source"],
  [/\b(?:I|we|my|our|me|us|I'd|I'll|we'll|we'd)\b/, "first person"],
  [/!|[\u{1F300}-\u{1FAFF}]/u, "exclamation or emoji"],
];
const STOP = new Set("a an the of on in to for and or but with at from by is are was be as it its this that these those up out into onto over under then than so if not no".split(" "));
const shouts = s => (s.match(/\b[A-Z]{5,}\b/g) || []).some(w => !/^(?:PG13|WI\d|AI\d)$/.test(w));

const problems = (field, val, src) => {
  const p = [];
  if (typeof val !== "string" || !val.trim()) return ["empty"];
  if (val.length > CAP[field]) p.push(`over ${CAP[field]} chars (${val.length})`);
  if (shouts(val)) p.push("all caps");
  if (field !== "fa") for (const [re, why] of BAD) if (re.test(val)) p.push(why);
  if (field !== "fa") {
    const have = grams(src || "", 4), have6 = grams(src || "", 6);
    const hit = [...grams(val, 4)].filter(g => have.has(g) && g.split(" ").filter(w => !STOP.has(w) && !/^\d+$/.test(w)).length >= 3);
    for (const g of grams(val, 6)) if (have6.has(g) && !hit.some(h => g.includes(h))) hit.push(g);
    if (hit.length) p.push(`4-word overlap: "${hit[0]}"${hit.length > 1 ? ` (+${hit.length - 1})` : ""}`);
  }
  return p;
};
const srcOf = (r, f) => f === "overview" ? r.src.desc : f === "detailed_rack" ? r.src.prot : r.src.fa;

// --drop <verify.json>: a list of { id, field, problem } from the fact-check pass; those fields are never written.
const dropped = new Set((dropFile ? JSON.parse(readFileSync(dropFile, "utf8")) : []).map(d => d.id + "|" + d.field));
const refused = [], ok = [];
for (const [id, fields] of Object.entries(out)) {
  const r = inputs.get(id);
  if (!r) { refused.push([id, "*", "not in the input batch"]); continue; }
  for (const [f, v] of Object.entries(fields)) {
    if (dropped.has(id + "|" + f)) { refused.push([id, f, "dropped by the fact check"]); continue; }
    if (!r.want.includes(f)) { refused.push([id, f, "not requested"]); continue; }
    const p = problems(f, v, srcOf(r, f));
    if (p.length) refused.push([id, f, p.join("; ")]); else ok.push({ id, f, v });
  }
}
console.log(`${state}: ${ok.length} fields pass, ${refused.length} refused`);
for (const [id, f, why] of refused) console.log(`  REFUSED ${id} ${f}: ${why}`);
if (!APPLY) { for (const x of ok.slice(0, 6)) console.log(`  ${x.id} ${x.f}: ${x.v}`); console.log("DRY RUN — pass --apply to write"); process.exit(0); }

// Write one row at a time, only where the slot is STILL empty, then re-read and reconcile.
const byRow = new Map();
for (const x of ok) (byRow.get(x.id) || byRow.set(x.id, {}).get(x.id))[x.f] = x.v;
let wrote = 0, skipped = 0;
for (const [id, patch] of byRow) {
  const cur = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=overview,detailed_rack,fa&id=eq.${encodeURIComponent(id)}`, { headers: H })).json())[0];
  if (!cur) { skipped++; continue; }
  const set = {};
  for (const [f, v] of Object.entries(patch)) if (f === "fa" ? /^(?:|unknown|\?+|n\/?a)$/i.test(String(cur.fa || "").trim()) : !cur[f]) set[f] = v;
  if (!Object.keys(set).length) { skipped++; continue; }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(set) });
  const body = await res.json();
  if (!res.ok || body.length !== 1) throw new Error(`write ${id}: HTTP ${res.status}, ${Array.isArray(body) ? body.length : "?"} rows changed`);
  patch.__set = set; wrote++;
}
let bad = 0;
for (const [id, patch] of byRow) {
  if (!patch.__set) continue;
  const cur = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=overview,detailed_rack,fa&id=eq.${encodeURIComponent(id)}`, { headers: H })).json())[0];
  for (const [f, v] of Object.entries(patch.__set)) if (cur?.[f] !== v) { bad++; console.log(`  MISMATCH ${id} ${f}`); }
}
console.log(`wrote ${wrote} rows, skipped ${skipped} (slot already filled), re-read mismatches ${bad}`);
