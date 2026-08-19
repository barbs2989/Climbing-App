// The Monte Cristo townsite camp was applied to the DB telling climbers to "filter or boil" the
// water. That drainage carries arsenic and other mining-era heavy metals above drinking-water
// standards, and filtering, boiling and tablets remove none of them — those methods address
// organisms, not dissolved metals. So the advice is not merely thin, it is confidently wrong in
// the direction that gets someone hurt.
//
// This rewrites ONE key of ONE named site inside `bivy`, on the routes that already carry it.
// It never touches another site, never adds one, and re-reads to reconcile.
//
// --dry prints what it would do and writes nothing.
import { SUPABASE_URL, requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const SITE = "Monte Cristo townsite, walk-in from Barlow Pass";
const OLD = "River and creek water nearby, plentiful but untreated — filter or boil";
const NEW = "Creek and river water is plentiful and must NOT be treated as ordinary backcountry water. This drainage carries arsenic and other heavy metals from the mining era at levels above drinking-water standards, and filtering, boiling and tablets do none of them any good — those methods address organisms, not dissolved metals. Carry what you need for the road walk, or draw from tributaries well above the old workings rather than from the valley bottom.";

requireServiceKey();
const rows = await selectAll("routes", "id,name,bivy", "bivy=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL: read no routes with bivy at all — refusing to conclude anything"); process.exit(1); }

const hits = rows.filter(r => Array.isArray(r.bivy) && r.bivy.some(s => s && s.name === SITE));
console.log(`${rows.length} routes carry bivy; ${hits.length} carry the townsite site`);
if (!hits.length) { console.log("nothing to do"); process.exit(0); }

let changed = 0, alreadyOk = 0;
for (const r of hits) {
  const site = r.bivy.find(s => s && s.name === SITE);
  if (site.water === NEW) { alreadyOk++; continue; }
  if (site.water !== OLD) {
    console.log(`  SKIP ${r.id} — water is neither the known-bad string nor the fix: ${JSON.stringify(String(site.water).slice(0, 60))}`);
    continue;
  }
  const next = r.bivy.map(s => (s && s.name === SITE ? { ...s, water: NEW } : s));
  if (DRY) { changed++; continue; }
  await patchRow("routes", r.id, { bivy: next });
  changed++;
}
console.log(`${DRY ? "would rewrite" : "rewrote"} ${changed}; ${alreadyOk} already correct`);
if (DRY) process.exit(0);

// Re-read and reconcile. A 200 is not evidence the data changed.
const after = await selectAll("routes", "id,bivy", "bivy=not.is.null", { pageSize: 1000 });
const bad = after.filter(r => Array.isArray(r.bivy) && r.bivy.some(s => s && s.name === SITE && s.water !== NEW));
console.log(bad.length ? `FAIL: ${bad.length} still wrong: ${bad.map(r => r.id).join(", ")}` : "verified — every copy of that site now carries the corrected water advice");
process.exit(bad.length ? 1 : 0);
