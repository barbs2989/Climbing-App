// Which WA mountain route pages describe a SECOND route? (audits/route-grades/mixed-beta-scan.json)
// Read-only. Two signals, both from the Disappointment Cleaver finding:
//   A. an approach_variants card that is a CAMP choice on the same approach, which the approach
//      picker renders as another way in ("High camp at Ingraham Flats instead of Camp Muir").
//   B. route prose that names a SIBLING route on the same peak. Many are legitimate (a descent by
//      the standard route, a shared approach, a variation), so B is a reading list, not a verdict;
//      the sentence is kept so a reader can judge it without opening the row.
import fs from "fs";
import { requireServiceKey, SUPABASE_URL, headers } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const ins = fs.readdirSync("audits/route-grades/research/in").filter(f => f.endsWith(".json"));
const ids = ins.flatMap(f => JSON.parse(fs.readFileSync("audits/route-grades/research/in/" + f, "utf8")).map(r => r.id));
const PROSE = ["overview", "beta", "climbing_route", "approach", "pitch_detail", "approach_variants"];
const cols = "id,name,area_id," + PROSE.join(",");
const rows = [];
for (let i = 0; i < ids.length; i += 100) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${cols}&id=in.(${ids.slice(i, i + 100).join(",")})`, { headers: headers(key) });
  if (!res.ok) throw new Error("fetch " + res.status);
  rows.push(...await res.json());
}
// siblings: every route on the same area, from any discipline
const areaIds = [...new Set(rows.map(r => r.area_id))];
const sib = {};
for (let i = 0; i < areaIds.length; i += 80) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id&area_id=in.(${areaIds.slice(i, i + 80).join(",")})`, { headers: headers(key) });
  for (const s of await res.json()) (sib[s.area_id] ||= []).push(s);
}
const CAMP = /\b(camp|bivy|bivouac|high camp|instead of|overnight)\b/i;
const DESCENT = /\b(descen|down|retreat|bail|escape|off route|wrong|not the|different route|mistake)/i;
const out = [];
for (const r of rows) {
  const f = { id: r.id, name: r.name, camp_cards: [], sibling_mentions: [] };
  const av = Array.isArray(r.approach_variants) ? r.approach_variants : [];
  for (const v of av.slice(1)) if (v && CAMP.test(v.name || "")) f.camp_cards.push(v.name);
  const text = PROSE.map(k => { const v = r[k]; return v == null ? "" : typeof v === "string" ? v : JSON.stringify(v); }).join("\n");
  for (const s of sib[r.area_id] || []) {
    if (s.id === r.id) continue;
    const nm = s.name.replace(/\s*\(.*\)$/, "").trim();
    if (nm.length < 6 || r.name.includes(nm)) continue;
    const re = new RegExp("[^.\\n]{0,160}\\b" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b[^.\\n]{0,160}", "gi");
    for (const m of text.matchAll(re)) f.sibling_mentions.push({ sibling: s.id, descentOrOffRoute: DESCENT.test(m[0]), sentence: m[0].trim() });
  }
  if (f.camp_cards.length || f.sibling_mentions.length) out.push(f);
}
fs.writeFileSync("audits/route-grades/mixed-beta-scan.json", JSON.stringify(out, null, 1));
const nonDesc = out.filter(f => f.sibling_mentions.some(m => !m.descentOrOffRoute));
console.log("scanned", rows.length, "| with camp cards", out.filter(f => f.camp_cards.length).length,
  "| naming a sibling", out.filter(f => f.sibling_mentions.length).length, "| ...outside a descent/off-route sentence", nonDesc.length);
