// Record Fifty Classic Climbs of North America membership on the routes that hold it.
// Dry-run by default; `--apply` writes.
//
// Steck & Roper's 1979 list has six Pacific Northwest entries. FIVE are in Washington and
// therefore in our catalog; Slesse Mountain's Northeast Buttress is in British Columbia and
// is deliberately absent from this table rather than quietly mapped onto a WA row.
//
// Why this is a data gap and not a preference: the Leaderboards badge was TITLED "Fifty
// Classics" while counting `routes.classic`, which on live data is set on Mount Baker's
// Easton Glacier, Rainier's Kautz and Emmons, and Stuart's Cascadian Couloir — popular
// standard routes, not one of which is in the book. Meanwhile all five real entries carried
// `classic=false` and `lists=null`. The badge was not slightly wrong, it was measuring a
// different thing under the book's name. The label is now "Classic climbs" (which is what
// `classic` means) and `fifty_classics` is a list slug, so the two claims are separable.
//
// IDS ARE NOT TRUSTED BY SHAPE. Only ~9% of WA route ids are peak-scoped, and
// `wa_north_ridge*` alone spans Steeple Rock, Whatcom, Cutthroat, Primus and Main Peak — so
// a name-shaped id says nothing about which mountain it is on. Every row below is resolved
// by (area_id, name) and the script REFUSES to write unless the fetched row's area_id is the
// peak named here. That is the check whose absence caused migrations 0044-0046 to write to
// nothing and put a Mount Adams permit block on Mount Baker.

import { patchRow, SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

// route id -> the area it MUST belong to, plus why it is on the list.
const ENTRIES = [
  { id: "wa_mount_rainier_liberty_ridge", area: "wa_mount_rainier", note: "Mount Rainier, Liberty Ridge" },
  { id: "wa_forbidden_peak_west_ridge", area: "wa_forbidden_peak", note: "Forbidden Peak, West Ridge" },
  { id: "wa_mount_shuksan_price_glacier", area: "wa_mount_shuksan", note: "Mount Shuksan, Price Glacier" },
  { id: "wa_mount_stuart_north_ridge", area: "wa_mount_stuart", note: "Mount Stuart, North Ridge (the complete ridge)" },
  { id: "wa_liberty_crack", area: "wa_liberty_bell", note: "Liberty Bell Mountain, Liberty Crack" },
];

const SLUG = "fifty_classics";

const ids = ENTRIES.map(e => `"${e.id}"`).join(",");
const url = `${SUPABASE_URL}/rest/v1/routes?select=id,area_id,name,classic,lists&id=in.(${encodeURIComponent(ids)})`;
const rows = await (await fetch(url, { headers: headers(anonKey()) })).json();
if (!Array.isArray(rows) || !rows.length) { console.error("FAIL: read 0 routes."); process.exit(1); }
const byId = new Map(rows.map(r => [r.id, r]));

const plan = [];
let refused = 0;
for (const e of ENTRIES) {
  const r = byId.get(e.id);
  if (!r) { console.error(`REFUSED ${e.id} — no such route.`); refused++; continue; }
  if (r.area_id !== e.area) { console.error(`REFUSED ${e.id} — area_id is ${r.area_id}, expected ${e.area}.`); refused++; continue; }
  const lists = Array.isArray(r.lists) ? r.lists.slice() : [];
  const already = lists.some(x => String(x).trim() === SLUG);
  const body = {};
  if (!already) { lists.push(SLUG); body.lists = lists; }
  if (r.classic !== true) body.classic = true;
  console.log(`${Object.keys(body).length ? "PLAN  " : "OK    "} ${e.id}  (${r.name}) — ${e.note}` +
    `${Object.keys(body).length ? `  ->  ${JSON.stringify(body)}` : "  already tagged"}`);
  if (Object.keys(body).length) plan.push({ id: e.id, body });
}
if (refused) { console.error(`\n${refused} entries refused. Nothing written.`); process.exit(1); }
if (!plan.length) { console.log("\nNothing to do."); process.exit(0); }
if (!APPLY) { console.log(`\nDry run. Re-run with --apply to write ${plan.length} rows.`); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, p.body);
console.log(`\nPATCH reported success on ${plan.length} rows. Re-reading to verify…`);

const after = await (await fetch(url, { headers: headers(anonKey()) })).json();
let bad = 0;
for (const e of ENTRIES) {
  const r = after.find(x => x.id === e.id);
  const ok = r && r.classic === true && Array.isArray(r.lists) && r.lists.includes(SLUG);
  console.log(`   ${ok ? "OK  " : "BAD "} ${e.id}  classic=${r && r.classic}  lists=${JSON.stringify(r && r.lists)}`);
  if (!ok) bad++;
}
if (bad) { console.error(`VERIFICATION FAILED on ${bad} rows.`); process.exit(1); }
console.log("All five verified against a fresh read.");
