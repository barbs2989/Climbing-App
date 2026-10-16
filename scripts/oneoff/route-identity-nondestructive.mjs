// The NON-DESTRUCTIVE half of the researched route-identity decisions
// (audits/route-grades/deep/IDENTITY-DECISIONS.md): renames (MISNAMED) and page rewrites
// (WRONG_CONTENT), high/medium confidence only. Duplicate merges and PART_OF fold-ins delete rows
// and are NOT done here.
//
// A rename changes `name` only — ids never change (docs/codebase/route-identity.md). The catalog's
// duplicate trigger (0216) still applies on UPDATE, so a rename onto a nearby same-named route is
// refused by the database rather than creating a second copy.
//   node scripts/oneoff/route-identity-nondestructive.mjs --dry
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const D = "audits/route-grades/deep/out/";
const all = fs.readdirSync(D).filter(f => /^i\d+\.json$/.test(f)).sort().flatMap(f => JSON.parse(fs.readFileSync(D + f, "utf8")));
const pick = all.filter(r => ["MISNAMED", "WRONG_CONTENT"].includes(r.verdict) && r.confidence !== "low");
const SOURCE_NAMES = /mountain ?project|summitpost|beckey|mountaineers|peakbagger|nwhikers|cascadeclimbers|wikipedia|\baaj\b|american alpine|according to|guidebook/i;

const plan = [], refused = [];
for (const x of pick) {
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,overview,fa,grade&id=eq.${x.id}`, { headers: headers(key) })).json())[0];
  if (!r) { refused.push([x.id, "no such row"]); continue; }
  const body = {};
  if (x.verdict === "MISNAMED") {
    const n = String(x.correct_name || "").trim();
    if (!n || n.length > 80) { refused.push([x.id, `no usable name "${n}"`]); continue; }
    if (n === r.name) { refused.push([x.id, "already named so"]); continue; }
    body.name = n;
  } else {
    const w = x.what_this_route_is || {};
    if (!w.overview || SOURCE_NAMES.test(w.overview) || w.overview.length < 80) { refused.push([x.id, "rewrite missing, too short, or names a source"]); continue; }
    body.overview = w.overview.trim();
    if (w.fa && !SOURCE_NAMES.test(w.fa)) body.fa = String(w.fa).trim();
  }
  plan.push({ id: x.id, verdict: x.verdict, before: Object.fromEntries(Object.keys(body).map(k => [k, r[k] ?? null])), body, evidence: x.evidence });
}
for (const p of plan) console.log(`${p.verdict} ${p.id}\n  - ${JSON.stringify(p.before).slice(0, 300)}\n  + ${JSON.stringify(p.body).slice(0, 300)}`);
console.log("\nplan", plan.length, "| refused", refused.length, refused.map(r => r.join(": ")).join("; "));
if (DRY) process.exit(0);
const tag = Date.now();
fs.writeFileSync(`audits/route-grades/deep/rollback-identity-${tag}.json`, JSON.stringify(Object.fromEntries(plan.map(p => [p.id, p.before])), null, 1));
for (const p of plan) await patchRow("routes", p.id, p.body);
console.log(`wrote ${plan.length}; rollback audits/route-grades/deep/rollback-identity-${tag}.json`);
