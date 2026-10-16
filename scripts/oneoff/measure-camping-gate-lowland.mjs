// The open item said: "the camping gate draws CAMPING & BIVY on sea-level desert scrambles".
// That is a claim about the DATA, not about the gate, and it is testable — so test it before
// changing a gate. CampingPanel already returns null when a route has no sites, so a lowland
// scramble can only show the section if it actually CARRIES camping data, in which case showing
// it may well be right.
//
// The failure this is looking for is a route where the section renders and the content is
// meaningless. Read-only, anon key, fails closed.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
// Every route the camping gate admits, that also carries camping data of either kind.
const rows = await q("routes?select=id,name,discipline,high_point_ft,gain_ft,bivy,waypoints&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read nothing — an empty measurement proves nothing"); process.exit(1); }

const GATED = new Set(["alpine", "mountaineering", "scrambling", "ice", "mixed"]);
const arr = (v) => (Array.isArray(v) ? v : []);
const isCamp = (w) => /camp|bivy|bivouac/i.test(String((w && w.type) || ""));

const byDisc = new Map();
let gated = 0, lowland = 0;
const lowExamples = [];

for (const r of rows) {
  const d = String(r.discipline || "").toLowerCase();
  const sites = arr(r.bivy).length + arr(r.waypoints).filter(isCamp).length;
  if (!sites) continue;
  byDisc.set(d, (byDisc.get(d) || 0) + 1);
  if (!GATED.has(d)) continue;
  gated++;
  const hp = r.high_point_ft == null ? null : Number(r.high_point_ft);
  // "Sea level / desert" in the sense that matters: a high point low enough that an overnight is
  // not a mountaineering decision. 3,000 ft is generous for the Cascades and Olympics.
  if (hp != null && hp < 3000) {
    lowland++;
    if (lowExamples.length < 12) lowExamples.push(`${String(hp).padStart(5)} ft  ${d.padEnd(12)} ${r.id}  ${sites} site(s)`);
  }
}

console.log(`== routes carrying camping data, by discipline\n`);
[...byDisc.entries()].sort((a, b) => b[1] - a[1]).forEach(([d, n]) =>
  console.log(`   ${(GATED.has(d) ? "GATED IN " : "not gated") } ${d.padEnd(14)} ${String(n).padStart(4)}`));

console.log(`\n== the claim: a LOWLAND route draws the section`);
console.log(`   gated routes carrying camping data : ${gated}`);
console.log(`   ...with a high point under 3,000 ft: ${lowland} (${gated ? Math.round((lowland / gated) * 100) : 0}%)`);
if (lowExamples.length) { console.log(`\n   examples:`); lowExamples.forEach((e) => console.log(`      ${e}`)); }
console.log(lowland === 0
  ? `\n   -> THE CLAIM DOES NOT REPRODUCE. No gated route carrying camping data is lowland, so the\n      gate is not drawing the section anywhere it should not. Changing it would be a fix to nothing.`
  : `\n   -> ${lowland} route(s) to READ before touching the gate: is the camping data meaningless there,\n      or is it a real valley basecamp that belongs on the page?`);
