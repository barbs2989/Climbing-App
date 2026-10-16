// Top up routes whose stored camping is a STRICT SUBSET of the zone file that produced it.
//
// Why only subsets. `check-camping-zone-drift.mjs` reports 32 candidates and most are NOT
// defects: they carry hand-authored per-route camps the generic zone list does not have —
// Mount Terror names the Chopping Block saddle, Ptarmigan Ridge names Curtis Ridge and a high
// camp the route is built around, Maude names Upper Ice Lake, Deception names Royal Creek.
// Overwriting those replaces better data with worse.
//
// A PURE SUBSET IS NOT THE SIGNAL, and believing it was would have done damage. Measured:
// `wa_mount_rainier_ingraham_direct` holds exactly Camp Muir and Ingraham Flats — the two
// south-side camps, curated — and the subset rule wanted to hand it Thumb Rock, which is
// Liberty Ridge's camp on the far side of the mountain. `wa_south_ridge_3` holds exactly Wing
// Lake and Lewis Lake, Black Peak's own two. Both are subsets and both are RIGHT.
//
// A LEADING PREFIX was the second rule tried, and it FAILED TOO: `ingraham_direct`'s curated
// pair happens to be rainier.json's first two entries in order, so the rule waved it through.
// Two plausible discriminators, both wrong on measurement.
//
// So there is NO reliable automatic signal, and this script stops pretending otherwise. It
// requires you to NAME the zone file you know you edited (`--zone northern-pickets.json`), and
// refuses to run without one. The prefix test is kept as a second gate inside that file, not as
// the thing that decides which file. Everything else is a human read of both values.
//
// Appends the missing sites and preserves the stored order and any stored entry, so a climber's
// contributed camp survives untouched.
//
// --dry prints and writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";
import fs from "fs";
import path from "path";

const DRY = process.argv.includes("--dry");
const DIR = "enrichment-wip/camping-zones";
const ZONE = (() => { const i = process.argv.indexOf("--zone"); return i >= 0 ? process.argv[i + 1] : null; })();
if (!ZONE) {
  console.log("Refusing to run without --zone <file.json>.");
  console.log("There is no reliable automatic way to tell a stale row from a curated one — two rules were");
  console.log("tried and both were wrong on measurement. Name the zone file you know you edited.");
  process.exit(1);
}
const DIS = ["alpine", "mountaineering", "scrambling"];
const key = s => String((s && s.name) || "").trim().toLowerCase();

const areas = await selectAll("areas", "id,path", "", { pageSize: 1000 });
if (!areas.length) { console.log("FAIL: read no areas"); process.exit(1); }
const byId = new Map(areas.map(a => [a.id, a]));

const routes = await selectAll("routes", "id,area_id,discipline,bivy", "bivy=not.is.null", { pageSize: 1000 });
if (!routes.length) { console.log("FAIL: read no routes carrying bivy"); process.exit(1); }
const byArea = new Map();
for (const r of routes) {
  if (!DIS.includes(r.discipline)) continue;
  if (!byArea.has(r.area_id)) byArea.set(r.area_id, []);
  byArea.get(r.area_id).push(r);
}

requireServiceKey();
let topped = 0, leftAlone = 0;
for (const f of fs.readdirSync(DIR).filter(x => x === ZONE)) {
  const zone = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  if (!Array.isArray(zone.sites) || !Array.isArray(zone.areas)) continue;
  const want = zone.sites;
  const wantKeys = new Set(want.map(key));

  const ids = new Set();
  for (const a of zone.areas) {
    const row = byId.get(a);
    if (!row) continue;
    ids.add(a);
    for (const k of areas) if (String(k.path || "").startsWith(row.path + ".")) ids.add(k.id);
  }

  for (const id of ids) for (const r of byArea.get(id) || []) {
    const have = Array.isArray(r.bivy) ? r.bivy : [];
    const haveKeys = new Set(have.map(key));
    const missing = want.filter(s => !haveKeys.has(key(s)));
    const extra = have.filter(s => !wantKeys.has(key(s)));
    if (!missing.length) continue;
    if (!haveKeys.size || ![...haveKeys].some(k => wantKeys.has(k))) continue; // belongs to another zone
    if (extra.length) {
      console.log(`  LEAVE ${r.id} (${f}) — holds ${extra.length} site(s) the file lacks: ${extra.map(s => s.name).join(" | ")}`);
      leftAlone++;
      continue;
    }
    // The stored list must be the file's LEADING PREFIX, in order. Anything else is a curated
    // per-route selection and topping it up would add camps that route does not use.
    const isPrefix = have.length < want.length && have.every((s, i) => key(s) === key(want[i]));
    if (!isPrefix) {
      console.log(`  LEAVE ${r.id} (${f}) — ${have.length} stored site(s) are a curated selection, not the file's leading prefix: ${have.map(s => s.name).join(" | ")}`);
      leftAlone++;
      continue;
    }
    console.log(`${DRY ? "would top up" : "topping up"} ${r.id} (${f}): +${missing.length} -> ${have.length + missing.length}`);
    if (!DRY) await patchRow("routes", r.id, { bivy: [...have, ...missing] });
    topped++;
  }
}
console.log(`\n${DRY ? "would top up" : "topped up"} ${topped}; left ${leftAlone} alone because they hold route-specific camps the file does not`);
if (DRY || !topped) process.exit(0);

const after = await selectAll("routes", "id,bivy", "bivy=not.is.null", { pageSize: 1000 });
const empty = after.filter(r => !Array.isArray(r.bivy) || !r.bivy.length);
console.log(empty.length ? `FAIL: ${empty.length} row(s) ended up with no camping` : "verified — no row lost its camping");
process.exit(empty.length ? 1 : 0);
