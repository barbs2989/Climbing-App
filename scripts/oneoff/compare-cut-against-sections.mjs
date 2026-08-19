// Do the sentences a trim would remove correspond to the climbing_route SECTIONS?
//
// That correspondence is the test of whether a structurally-safe trim is also a CORRECT one.
// Dome Peak's single cut sentence is its single section ("Dome Glacier to the 8,560 ft notch")
// and East McMillan's three cuts map onto its three. Where the cut is a hazard note or an
// alternative line with no matching section, the enrichment copied indiscriminately and the
// trim is NOT justified — the text is not climbing description that ran past the base.
//
//   node scripts/oneoff/compare-cut-against-sections.mjs tails.json [id ...]
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const [file, ...only] = process.argv.slice(2);
if (!file) { console.error("give the tails json"); process.exit(1); }
const tails = JSON.parse(fs.readFileSync(file, "utf8"));
const wanted = only.length ? tails.filter(t => only.includes(t.id)) : tails;
if (!wanted.length) throw new Error("no matching rows in the tails file");

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,climbing_route&id=in.(${wanted.map(t => t.id).join(",")})`,
  { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const byId = Object.fromEntries(JSON.parse(await res.text()).map(r => [r.id, r]));
if (!Object.keys(byId).length) throw new Error("zero rows read — a clean answer here would be a false pass");

for (const t of wanted) {
  const secs = [].concat((byId[t.id] || {}).climbing_route || [])
    .filter(v => v && typeof v === "object").map(v => v.label || "(no label)");
  console.log(`\n${t.id}   trim ${t.trimming}, keep ${t.keep}`);
  console.log(`  sections (${secs.length}): ${secs.join("  |  ")}`);
  t.cut.forEach((c, i) => console.log(`  CUT ${i + 1}: ${c.slice(0, 165)}`));
  console.log(`  ENDS ON: …${t.lastKept.slice(-90)}`);
}
