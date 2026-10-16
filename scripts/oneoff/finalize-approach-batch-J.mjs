// Batch J arrived without `area` on any of its 21 entries, so enrich:apply would have refused every
// one of them ("batch entry has no area to assert against") and written nothing. The guard did its
// job; this fills the field in from the live rows so the batch can actually be applied.
//
// `area` is not bookkeeping. Route ids are only ~9% peak-scoped, so a name-shaped id like
// `wa_east_ridge_9` or `wa_ne_ridge` is no evidence of which peak you are on — and six of these 21
// carry exactly that kind of id. Reading area_id from the row and letting enrich:apply assert it
// back is what stops one peak's research landing on another's route.
//
// It also re-checks the precondition the batch was built on: approach_variants still EMPTY. A route
// that gained variants from a parallel session in the meantime must not be overwritten.
//
//   node scripts/oneoff/finalize-approach-batch-J.mjs
//   npm run enrich:apply -- --from research-data/approach-variants-batch-J-2026-08-13.json --dry
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const SRC = `${ROOT}research-data/approach-variants-batch-J-raw-2026-08-13.json`;
const DEST = `${ROOT}research-data/approach-variants-batch-J-2026-08-13.json`;

const raw = JSON.parse(fs.readFileSync(SRC, "utf8"));
const ids = Object.keys(raw).filter(k => !k.startsWith("_"));
const rows = await selectAll("routes", "id,name,area_id,approach_variants", `id=in.(${ids.join(",")})`, { pageSize: 100 });
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

const out = { _README: [
  "Approach variants, batch J — 21 routes, 29 variants, every one carrying a baseFinding.",
  "",
  "Delivered without `area` on any entry, which enrich:apply refuses. `area` is filled in here from",
  "the live rows by scripts/oneoff/finalize-approach-batch-J.mjs rather than typed, because six of",
  "these ids carry no peak name at all (wa_east_ridge_9 = Ingalls East Ridge, wa_ne_ridge = Cathedral",
  "Peak in the Pasayten, wa_east_face_6 = Chimney Rock, wa_mount_maude_r1/_r2) and a name-shaped id",
  "is not evidence of which peak you are on.",
  "",
  "Contamination rejected during research, recorded so it is not re-introduced: Chimney Rock's",
  "'West Face / Rappel Chimney' is IDAHO (Selkirk Crest); a Mount Maude bergschrund description",
  "referencing the Haig Glacier is in the Canadian Rockies; Cathedral Peak in Tuolumne shares a route",
  "name with the Pasayten one.",
] };

let skipped = 0, missing = 0;
for (const id of ids) {
  const r = byId[id];
  if (!r) { console.error(`MISSING ${id} — no such route in the live catalog`); missing++; continue; }
  const had = (r.approach_variants || []).length;
  if (had) {
    // The batch was built against rows reading empty. One that has since gained variants is another
    // session's work, and overwriting it silently is how researched work gets lost.
    console.error(`SKIP ${id} — already has ${had} variant(s); the batch's precondition no longer holds`);
    skipped++; continue;
  }
  out[id] = { area: r.area_id, ...raw[id] };
  console.log(`  ${id.padEnd(46)} area=${r.area_id}  ${(raw[id].approach_variants || []).length} variant(s)`);
}

if (missing) { console.error(`\nREFUSING to write — ${missing} id(s) did not resolve.`); process.exitCode = 1; }
else {
  fs.writeFileSync(DEST, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nwrote ${DEST}  (${Object.keys(out).length - 1} routes${skipped ? `, ${skipped} skipped` : ""})`);
}
