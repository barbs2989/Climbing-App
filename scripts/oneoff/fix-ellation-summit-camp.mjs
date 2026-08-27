// Remove "Ruth Mountain summit camp" from wa_ellation.
//
// wa_ellation is an 8-pitch, ~800 ft ROCK BUTTRESS on Mamie Peak (high point 5,000 ft) in the
// Hannegan Pass / Ruth Creek valley. The camp is on RUTH MOUNTAIN's summit: 7,100 ft, 7.2 km
// away, and 2,100 ft ABOVE the top of the climb. Nobody climbing 800 ft of rock camps on a
// glaciated summit two thousand feet above it and seven kilometres off.
//
// The elevations are RIGHT and the PAIRING is noise -- a zone file handed every camp in the
// corridor to every route in it, which is the mechanism audit:camp-route-fit was written for.
//
// SCOPE IS ONE ENTRY ON PURPOSE, and the restraint is the point. This row carries four other
// Ruth/Icy/Nooksack alpine camps (Ruth Arm 5,900; the Ruth-Icy notch 6,600; the Price Lake
// shoulder 5,900; Nooksack Cirque 3,000) and they are NOT touched here. CLAUDE.md is explicit
// that a shared corridor camp is correct data and that this must never become a sweep: the
// route's own prose does place it in the Ruth Creek valley, so Ruth-AREA camps are defensible
// even on a crag route. Only the SUMMIT camp is indefensible, and that is the one finding this
// audit corroborated against the route's own prose. The other four are a reading list.
//
// Declared-state contract, like every repair script here: it names the exact entry it expects to
// find and REFUSES if the row no longer holds it, so a stale table cannot half-apply and no
// camp is invented. --apply writes; the default is a dry run.
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ROUTE = "wa_ellation";
const REMOVE = "Ruth Mountain summit camp";
const EXPECT_ELEV = 7100;
const EXPECT_COUNT = 6;

const key = requireServiceKey();
const H = { apikey: key, Authorization: `Bearer ${key}` };
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ROUTE}&select=id,name,high_point_ft,bivy`, { headers: H });
if (!res.ok) { console.error(`read failed: HTTP ${res.status}`); process.exit(1); }
const [row] = await res.json();
if (!row) { console.error(`${ROUTE} not found — refusing`); process.exit(1); }

const bivy = row.bivy || [];
if (bivy.length !== EXPECT_COUNT) {
  console.error(`refusing: expected ${EXPECT_COUNT} bivy entries, found ${bivy.length}. The row has changed; re-read it before repairing.`);
  process.exit(1);
}
const hit = bivy.filter((b) => b && b.name === REMOVE);
if (hit.length !== 1) {
  console.error(`refusing: ${JSON.stringify(REMOVE)} appears ${hit.length} times, expected exactly 1.`);
  process.exit(1);
}
if (Number(hit[0].elev) !== EXPECT_ELEV) {
  console.error(`refusing: expected elev ${EXPECT_ELEV}, found ${hit[0].elev}. This may be a different record.`);
  process.exit(1);
}

const next = bivy.filter((b) => !(b && b.name === REMOVE));
console.log(`${row.name} (${ROUTE}) — high point ${row.high_point_ft} ft`);
console.log(`  removing: ${JSON.stringify(REMOVE)} at ${hit[0].elev} ft (${hit[0].elev - row.high_point_ft} ft ABOVE the top of the climb)`);
console.log(`  keeping ${next.length}:`);
for (const b of next) console.log(`    - ${b.name} (${b.elev ?? "-"} ft)`);

if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

await patchRow("routes", ROUTE, { bivy: next });
const back = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ROUTE}&select=bivy`, { headers: H })).json();
const after = (back[0] && back[0].bivy) || [];
if (after.length !== EXPECT_COUNT - 1 || after.some((b) => b && b.name === REMOVE)) {
  console.error(`\nVERIFY FAILED: ${after.length} entries back, removal ${after.some((b) => b && b.name === REMOVE) ? "still present" : "ok"}`);
  process.exit(1);
}
console.log(`\nverified: ${after.length} entries, ${JSON.stringify(REMOVE)} gone`);
