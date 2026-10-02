// For each pair in audits/route-grades/deep/merge-plan.json: which facts does ONLY the dropped row
// hold (keep empty, drop set), and does the kept row's prose already mention the dropped route's
// name? Read-only.
//   node scripts/oneoff/route-identity-merge-diff.mjs
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const plan = JSON.parse(fs.readFileSync("audits/route-grades/deep/merge-plan.json", "utf8"));
const ids = [...new Set(plan.flatMap(p => [p.drop, p.keep]))];
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(key) })).json();
const by = Object.fromEntries(rows.map(r => [r.id, r]));
const SCALAR = ["fa", "pitches", "length_m", "stars", "grade", "alpine_grade", "rock_grade", "ice_grade", "lists", "classic", "features"];
const empty = v => v == null || v === "" || (Array.isArray(v) && !v.length);
for (const p of plan) {
  const d = by[p.drop], k = by[p.keep];
  const only = SCALAR.filter(c => !empty(d[c]) && (empty(k[c]) || (Array.isArray(d[c]) && d[c].some(x => !k[c]?.includes(x))))).map(c => `${c}=${JSON.stringify(d[c])}${empty(k[c]) ? "" : ` (keep ${JSON.stringify(k[c])})`}`);
  const prose = [k.overview, k.beta, k.climbing_route && JSON.stringify(k.climbing_route), k.approach, k.description].filter(Boolean).join(" ").toLowerCase();
  const word = d.name.replace(/\(.*?\)/g, "").split(/[\s/—-]+/).filter(w => w.length > 4).map(w => w.toLowerCase());
  const mentions = word.filter(w => prose.includes(w));
  console.log(`${p.confidence[0]} ${p.verdict === "PART_OF" ? "P" : "D"} ${p.drop} -> ${p.keep}\n   only-on-drop: ${only.join("; ") || "-"}\n   keep mentions [${mentions.join(",")}] of [${word.join(",")}]  drop prose ${(d.overview || "").length + (d.beta || "").length} chars`);
}
