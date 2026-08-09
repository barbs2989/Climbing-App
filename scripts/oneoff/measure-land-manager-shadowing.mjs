// routes.access carries BOTH `landManager` (camelCase) and `land_manager` (snake_case), and
// they are not the same string. RouteDetail reads:
//
//   const landMgrVal = ac.landManager || ac.land_manager;
//
// so camelCase always wins and the snake_case value is never displayed. On
// adams_avalanche_glacier that means the screen shows
//   "USDA Forest Service, Gifford Pinchot National Forest; Mount Adams Wilderness"
// while the enriched value sitting beside it is the more specific
//   "Gifford Pinchot National Forest (Mt. Adams Ranger District) — Mount Adams Wilderness"
//
// This measures how widespread that is and, crucially, WHICH key is the better one — the fix
// direction has to come from the data, not from one example.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

async function page(cursor) {
  const f = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : "";
  for (const limit of [500, 300, 150, 80]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,access&access=not.is.null&order=id.asc&limit=${limit}${f}`, { headers: headers(anonKey()) });
    if (r.ok) return { rows: JSON.parse(await r.text()), limit };
    const b = (await r.text()).slice(0, 70);
    console.log(`  limit=${limit} -> ${r.status} ${b.includes("57014") ? "(timeout, smaller)" : b}`);
  }
  throw new Error("no page size worked");
}
const rows = []; let cursor = null;
for (;;) { const p = await page(cursor); if (!p.rows.length) break; rows.push(...p.rows); cursor = p.rows[p.rows.length - 1].id; if (p.rows.length < p.limit) break; }
if (!rows.length) { console.error("read zero rows — failing closed"); process.exit(1); }
console.log("routes with access:", rows.length, "\n");

let bothSame = 0, bothDiff = 0, onlyCamel = 0, onlySnake = 0, neither = 0;
let snakeLonger = 0, camelLonger = 0, snakeHasDistrict = 0, camelHasDistrict = 0;
const examples = [];
const DISTRICT = /ranger district|\bRD\b/i;
for (const r of rows) {
  const a = r.access || {};
  const c = a.landManager, s = a.land_manager;
  const hc = c != null && c !== "", hs = s != null && s !== "";
  if (hc && hs) {
    if (String(c) === String(s)) bothSame++;
    else {
      bothDiff++;
      if (String(s).length > String(c).length) snakeLonger++; else camelLonger++;
      if (DISTRICT.test(String(s))) snakeHasDistrict++;
      if (DISTRICT.test(String(c))) camelHasDistrict++;
      if (examples.length < 6) examples.push({ id: r.id, c: String(c), s: String(s) });
    }
  } else if (hc) onlyCamel++;
  else if (hs) onlySnake++;
  else neither++;
}
const pct = (n) => ((n / rows.length) * 100).toFixed(1) + "%";
console.log("=== which keys are present ===");
console.log(`  both, identical        : ${bothSame}  (${pct(bothSame)})`);
console.log(`  both, DIFFERENT        : ${bothDiff}  (${pct(bothDiff)})   <-- snake value is shadowed`);
console.log(`  only landManager (camel): ${onlyCamel}  (${pct(onlyCamel)})`);
console.log(`  only land_manager (snake): ${onlySnake}  (${pct(onlySnake)})  <-- these DO display`);
console.log(`  neither                : ${neither}\n`);

if (bothDiff) {
  console.log("=== of the ones that differ, which value is richer? ===");
  console.log(`  snake_case longer      : ${snakeLonger}`);
  console.log(`  camelCase longer       : ${camelLonger}`);
  console.log(`  snake names a ranger district: ${snakeHasDistrict}`);
  console.log(`  camel names a ranger district: ${camelHasDistrict}\n`);
  console.log("examples (camel = what the screen shows today, snake = what is hidden):");
  for (const e of examples) {
    console.log(`  ${e.id}`);
    console.log(`    shown : ${e.c.slice(0, 100)}`);
    console.log(`    hidden: ${e.s.slice(0, 100)}`);
  }
}
console.log(`
The fix direction must follow these counts, not one example: if snake_case is consistently the
richer, district-level value then the || order is simply backwards. If it is mixed, preferring
either key blindly trades one wrong display for another.`);
