// Does `what_to_bring` actually reach a screen, or does the assumed-gear filter eat it?
//
// check:field-renders lists what_to_bring as NEVER RENDERS, with the recorded reason
// "passed to RouteGearCheck as `essentials`, which drops any item already in the discipline's
// assumed-gear list; the sample route's items are being filtered, not ignored. Unconfirmed."
// An unconfirmed exemption is a guess sitting in a guard's known-good list, so this settles it
// across the whole population instead of one sample route.
//
// RouteGearEssentialsBox does:  ess = essentials.filter(x => !assumedNorm.has(norm(x)))
// So the column is read only insofar as items SURVIVE that filter. A route whose every item
// is filtered renders nothing from the column, however populated it is.
//
// This imports the app's real assumedFor/catOf/dbRouteToCamel rather than reimplementing the
// rule — a hand-copied filter would measure my reading of the code, not the code.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
if (!fs.existsSync(path.join(ROOT, "RouteDetail.jsx"))) { console.error("ROOT wrong:", ROOT); process.exit(1); }
const require_ = createRequire(import.meta.url);

// assumedFor is module-private in RouteDetail.jsx, so pull it out by re-exporting from a copy
// of the module text. Editing a temp copy keeps the real file untouched.
const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const NEEDLE = "function assumedFor(route,disc){";
if (!src.includes(NEEDLE)) { console.error("ANCHOR LOST: assumedFor signature changed — this measurement is stale, not clean."); process.exit(1); }
const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-wtb-"));
const shimPath = path.join(ROOT, "__wtb_shim.jsx");
fs.writeFileSync(shimPath, src.replace(NEEDLE, "export " + NEEDLE));

const ENTRY = `
export { assumedFor } from ${JSON.stringify(shimPath)};
export { catOf } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
`;
const out = path.join(shimDir, "b.cjs");
try {
  await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
    format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
    define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
} finally { fs.unlinkSync(shimPath); }
const { assumedFor, catOf, dbRouteToCamel } = require_(out);
if (typeof assumedFor !== "function") { console.error("assumedFor did not export"); process.exit(1); }

const COLS = "id,name,discipline,what_to_bring,gear,rack,detailed_rack,itinerary,hazards,obj_haz,overview,approach,descent,grade,pitches,area_id";
async function page(offsetId) {
  const f = offsetId ? `&id=gt.${encodeURIComponent(offsetId)}` : "";
  for (const limit of [400, 250, 150, 80]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS}&what_to_bring=not.is.null&order=id.asc&limit=${limit}${f}`, { headers: headers(anonKey()) });
    if (r.ok) return JSON.parse(await r.text());
    const b = (await r.text()).slice(0, 80);
    console.log(`  limit=${limit} -> ${r.status} ${b.includes("57014") ? "(timeout, retrying smaller)" : b}`);
  }
  throw new Error("could not read a page at any size");
}
console.log("fetching every route with what_to_bring populated…");
const rows = []; let cursor = null;
for (;;) { const p = await page(cursor); if (!p.length) break; rows.push(...p); cursor = p[p.length - 1].id; if (p.length < 80) break; }
console.log("routes with what_to_bring:", rows.length, "\n");
if (!rows.length) { console.error("read zero rows — failing closed rather than reporting a clean sweep"); process.exit(1); }

// Mirror RouteGearEssentialsBox exactly.
const normGear = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
let allFiltered = 0, someShown = 0, emptyCol = 0;
const itemTally = new Map(), killedTally = new Map();
const examples = [];
for (const r of rows) {
  const route = dbRouteToCamel(r);
  const ess = Array.isArray(route.whatToBring) ? route.whatToBring : (route.whatToBring ? [route.whatToBring] : []);
  if (!ess.length) { emptyCol++; continue; }
  const disc = catOf(route);
  const itDays = (route.itinerary && route.itinerary.days && route.itinerary.days.length) || 0;
  const assumed = assumedFor(route, disc).concat(["First aid kit"])
    .concat(itDays > 1 ? ["Tent / shelter", "Sleeping bag", "Sleeping pad", "Stove + fuel", "Extra food (overnight)"] : []);
  const asm = new Set(assumed.map(normGear));
  const shown = ess.filter((x) => !asm.has(normGear(x)));
  for (const x of ess) itemTally.set(normGear(x), (itemTally.get(normGear(x)) || 0) + 1);
  if (!shown.length) {
    allFiltered++;
    for (const x of ess) killedTally.set(normGear(x), (killedTally.get(normGear(x)) || 0) + 1);
    if (examples.length < 5) examples.push({ id: r.id, disc, ess });
  } else someShown++;
}

const pct = (n) => ((n / rows.length) * 100).toFixed(1) + "%";
console.log("=== does anything from the column reach the screen? ===");
console.log(`  at least one item SHOWN : ${someShown}  (${pct(someShown)})`);
console.log(`  every item FILTERED OUT : ${allFiltered}  (${pct(allFiltered)})`);
console.log(`  column present but empty: ${emptyCol}\n`);

if (allFiltered) {
  console.log("items most often filtered away on routes that show nothing:");
  for (const [k, v] of [...killedTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(v).padStart(5)}  ${k}`);
  console.log("\nexamples where the whole column is swallowed:");
  for (const e of examples) console.log(`  ${e.id} [${e.disc}] -> ${JSON.stringify(e.ess).slice(0, 150)}`);
}
console.log("\nmost common what_to_bring items overall:");
for (const [k, v] of [...itemTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(v).padStart(5)}  ${k}`);
console.log(`
Reading this. I first ran this expecting it to REFUTE check:field-renders' "NEVER RENDERS"
verdict, and read the high survival rate as proof the column was fine. It was not: reading
the component showed \`ess\` was referenced in exactly ONE place — the early return
  if(!assumed.length && !ess.length) return null
— and never rendered. The box printed \`assumed\`, the generic per-discipline kit, on all
${rows.length} populated routes. Same shape as descent_text (#707): mapped, computed, dropped.

So the numbers above are not a survival rate, they are the FIX's impact: the 'at least one
item SHOWN' population is how many routes gain visible route-specific gear now that \`ess\`
is rendered as "Specific to this route". The 'every item FILTERED OUT' rows correctly show
nothing — their only item is already in the standard kit.

The lesson worth keeping: a filter's OUTPUT being non-empty says nothing about whether
anything renders it. Grep the consumer, do not infer it from the transform.`);
