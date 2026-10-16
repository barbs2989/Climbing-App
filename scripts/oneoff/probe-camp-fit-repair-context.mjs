// BEFORE REMOVING A CAMP FROM A ROUTE, READ WHAT ELSE THAT ROUTE HAS.
//
// audit:camp-route-fit named 5 corroborated pairings — a camp 15-19 km away, above the route's
// own summit, on a mountain the route's prose never mentions. Removing the outlier is clean IF
// the route keeps sensible camping. If the outlier is the route's ONLY camp, removal leaves the
// section empty and that is a different decision entirely: an empty CAMPING & BIVY is honest
// ("we know of none") but it is a LOSS, and CampingPanel then renders nothing at all.
//
// This is the same question the approach-scope trims had to answer before cutting a sentence:
// does the fact survive somewhere, or is this the only copy?
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};

const CASES = [
  { route: "wa_big_four_mountain_spindrift_couloir", drop: /^three fingers lookout/i },
  { route: "wa_big_four_mountain_northwest_ridge", drop: /^three fingers lookout/i },
  { route: "wa_mount_pilchuck_east_ridge", drop: /^three fingers lookout/i },
  { route: "wa_mount_pilchuck_standard_route", drop: /^three fingers lookout/i },
  { route: "wa_mount_stickney_scramble", drop: /^spire mountain/i },
];
const ids = CASES.map((c) => `"${c.route}"`).join(",");
const rows = await q(`routes?select=id,name,high_point_ft,area_id,bivy&id=in.(${ids})`);
if (!rows.length) { console.log("FAIL: none of the candidate routes exist"); process.exit(1); }
const byId = new Map(rows.map((r) => [r.id, r]));

const arr = (v) => (Array.isArray(v) ? v : []);
let wouldEmpty = 0, keepsCamps = 0;
for (const c of CASES) {
  const r = byId.get(c.route);
  if (!r) { console.log(`   MISSING ${c.route}`); continue; }
  const all = arr(r.bivy);
  const doomed = all.filter((b) => c.drop.test(String(b.name || "")));
  const kept = all.filter((b) => !c.drop.test(String(b.name || "")));
  if (!kept.length) wouldEmpty++; else keepsCamps++;
  console.log(`\n${r.id}  "${r.name}"  high ${r.high_point_ft} ft  — ${all.length} camp(s)`);
  doomed.forEach((b) => console.log(`   REMOVE  "${String(b.name).slice(0, 56)}"  ${b.elev ?? "—"} ft`));
  kept.forEach((b) => console.log(`   keep    "${String(b.name).slice(0, 56)}"  ${b.elev ?? "—"} ft`));
  if (!kept.length) console.log(`   -> WOULD LEAVE NO CAMPING AT ALL. Different decision: read before removing.`);
}
console.log(`\n   routes that keep other camps : ${keepsCamps}   <- removing the outlier is clean`);
console.log(`   routes left with none        : ${wouldEmpty}   <- a LOSS, not a tidy-up`);
