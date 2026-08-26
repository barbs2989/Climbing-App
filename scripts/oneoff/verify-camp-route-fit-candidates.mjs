// THE THIRD RECORD. measure-camp-route-fit.mjs flags a camp whose name points at a peak far from
// the route it is offered on. That is a geometric hypothesis; the route's OWN PROSE is an
// independent one.
//
// If a route's approach or overview names the peak its camp names, the pairing is deliberate —
// parties really do stage there. If the prose never mentions it, nothing in the row connects the
// route to that place and the camp arrived from a zone file rather than from research.
//
// This is the same discipline audit:waypoints uses when it anchors on the peak's own coordinate
// instead of refereeing a pin against a line: bring in a record neither side of the disagreement
// produced.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};

// The six candidates, plus the two near-misses, named explicitly so this file records exactly
// what was judged rather than re-deriving a list that may shift.
const CASES = [
  { route: "wa_big_four_mountain_spindrift_couloir", peak: "Three Fingers", camp: "Three Fingers Lookout" },
  { route: "wa_big_four_mountain_northwest_ridge", peak: "Three Fingers", camp: "Three Fingers Lookout" },
  { route: "wa_mount_stickney_scramble", peak: "Spire Mountain", camp: "Spire Mountain — the saddle" },
  { route: "wa_mount_pilchuck_east_ridge", peak: "Three Fingers", camp: "Three Fingers Lookout" },
  { route: "wa_mount_pilchuck_standard_route", peak: "Three Fingers", camp: "Three Fingers Lookout" },
  { route: "wa_ellation", peak: "Ruth Mountain", camp: "Ruth Mountain summit camp" },
  { route: "wa_bedal_peak_standard", peak: "Kololo Peaks", camp: "White Chuck Glacier basin" },
  { route: "wa_tailgunner_peak_w_route", peak: "Spire Mountain", camp: "Spire Mountain — the saddle" },
];

const ids = CASES.map((c) => `"${c.route}"`).join(",");
const rows = await q(`routes?select=id,name,overview,approach,beta,climbing_route,approach_logistics,bivy&id=in.(${ids})`);
if (!rows.length) { console.log("FAIL: none of the candidate routes exist under those ids"); process.exit(1); }
const byId = new Map(rows.map((r) => [r.id, r]));

let corroborated = 0, silent = 0, missing = 0;
for (const c of CASES) {
  const r = byId.get(c.route);
  if (!r) { console.log(`   MISSING ROW  ${c.route}`); missing++; continue; }
  // Every prose surface the route carries, flattened. approach_logistics is jsonb, so walk its
  // string leaves rather than stringifying — a stringified blob welds keys onto values.
  const leaves = [];
  const walk = (v) => {
    if (typeof v === "string") leaves.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(r.overview); walk(r.approach); walk(r.beta); walk(r.climbing_route); walk(r.approach_logistics);
  const prose = leaves.join("  ").toLowerCase();
  // The camp entry itself does not count as corroboration — it IS the thing under suspicion.
  const key = c.peak.toLowerCase().replace(/\s+(peaks?|mountain)$/, "");
  const hit = prose.includes(c.peak.toLowerCase()) || prose.includes(key);
  if (hit) corroborated++; else silent++;
  console.log(`   ${hit ? "CORROBORATED" : "SILENT      "}  ${c.route}`);
  console.log(`        camp "${c.camp}" points at ${c.peak}`);
  console.log(`        the route's own prose (${prose.length} chars) ${hit ? "DOES" : "never"} mention ${c.peak}`);
  if (hit) {
    const i = prose.indexOf(key);
    console.log(`        ...${prose.slice(Math.max(0, i - 70), i + 90).replace(/\s+/g, " ")}...`);
  }
}
console.log(`\n   corroborated by the route's own prose : ${corroborated}`);
console.log(`   prose never mentions the named peak   : ${silent}   <- nothing in the row connects them`);
console.log(`   row missing                           : ${missing}`);
console.log(`\nA SILENT row is not proof of a defect — a route may simply have thin prose. But a`);
console.log(`camp 15 km away, above the summit, that the route never mentions has no evidence`);
console.log(`for it anywhere in the row.`);
