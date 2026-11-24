// Loads the reviewed terrain facts into routes.glacier_travel / routes.snow_in_season (migration 0490).
//
// Owner, 2026-11-23: glacier warnings only where there is a glacier. The verdicts are a per-route review of the
// NORMAL line in its NORMAL season (research-data/glacier-travel-2026-11-23/RULE.md):
//   final.json   one row per reviewed route: glacier / snowInSeason = "yes" | "no" | "unsure"
//                ("unsure" is written as NULL: not settled, so the card keeps its careful wording)
//   plus the 2026-11-12 dry-in-season list (research-data/snow-in-season-2026-11-12/decisions.json, final "no"),
//   which becomes snow_in_season = 'no' wherever final.json has no verdict of its own.
//
//   node scripts/oneoff/load-glacier-travel.mjs --dry      # what would change, no writes
//   node scripts/oneoff/load-glacier-travel.mjs            # write (paced by patchRow), then re-read and reconcile
//
// Re-runnable: a row already holding its target is skipped, so a stopped run resumes where it left off.
import "../lib/load-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const col = (v) => (v === "yes" || v === "no" ? v : null);

// --state <slug> loads research-data/glacier-travel-2026-11-23/<slug>/final.json (a later state's review) and
// nothing else. With no --state it is the original Washington load: the top-level final.json plus the dry list.
const SI = process.argv.indexOf("--state"), STATE = SI >= 0 ? process.argv[SI + 1] : null;
if (SI >= 0 && !/^[a-z]{2}$/.test(String(STATE))) { console.error("--state needs a two-letter slug"); process.exit(2); }
const fin = JSON.parse(fs.readFileSync(path.join(ROOT, "research-data", "glacier-travel-2026-11-23", ...(STATE ? [STATE] : []), "final.json"), "utf8"));
const dry = STATE ? [] : JSON.parse(fs.readFileSync(path.join(ROOT, "research-data", "snow-in-season-2026-11-12", "decisions.json"), "utf8")).filter((d) => d.final === "no").map((d) => d.id);
if (STATE) { const stray = fin.filter((r) => !String(r.id).startsWith(STATE + "_")); if (stray.length) console.log(`note: ${stray.length} reviewed ids do not start with ${STATE}_ (legacy ids); they are loaded by id as reviewed.`); }

const want = new Map();
for (const r of fin) {
  if (r.glacier === "yes" && r.snowInSeason !== "yes") throw new Error(r.id + ": glacier yes needs snow yes");
  want.set(r.id, { glacier_travel: col(r.glacier), snow_in_season: col(r.snowInSeason) });
}
// The dry list spans every state. A dry id that a later per-state review (<slug>/final.json) covers belongs to
// that state's load: re-asserting glacier null here would undo it (2026-11-24: co_pyramid_peak_northeast_ridge
// flipped between "no" and null with each WA and CO load).
const G = path.join(ROOT, "research-data", "glacier-travel-2026-11-23");
const stateReviewed = new Set(STATE ? [] : fs.readdirSync(G).filter((d) => /^[a-z]{2}$/.test(d) && fs.existsSync(path.join(G, d, "final.json")))
  .flatMap((d) => JSON.parse(fs.readFileSync(path.join(G, d, "final.json"), "utf8")).map((r) => r.id)));
let dryAdded = 0, dryElsewhere = 0;
for (const id of dry) if (want.has(id)) continue; else if (stateReviewed.has(id)) dryElsewhere++; else { want.set(id, { glacier_travel: null, snow_in_season: "no" }); dryAdded++; }
console.log(`targets: ${want.size} routes (${fin.length} reviewed for glacier travel, ${dryAdded} more from the 2026-11-12 dry list; ${dry.length - dryAdded - dryElsewhere} of that list are covered by the newer review, ${dryElsewhere} by a state's own review)`);

async function read(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const list = ids.slice(i, i + 100).map((x) => `"${x}"`).join(",");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,glacier_travel,snow_in_season&id=in.(${encodeURIComponent(list)})`, { headers: headers(key) });
    const rows = await res.json();
    if (!res.ok || !Array.isArray(rows)) throw new Error("read -> " + res.status + " " + JSON.stringify(rows).slice(0, 200));
    rows.forEach((r) => out.set(r.id, r));
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}
const same = (have, w) => have && (have.glacier_travel || null) === w.glacier_travel && (have.snow_in_season || null) === w.snow_in_season;

const ids = [...want.keys()];
const before = await read(ids);
const missing = ids.filter((id) => !before.has(id));
const todo = ids.filter((id) => before.has(id) && !same(before.get(id), want.get(id)));
console.log(`in the catalog: ${before.size}; no longer there: ${missing.length}${missing.length ? " (" + missing.slice(0, 8).join(", ") + (missing.length > 8 ? ", …" : "") + ")" : ""}; already at target: ${before.size - todo.length}; to write: ${todo.length}`);
if (DRY) { console.log("--dry: nothing written."); process.exit(0); }

if (todo.length) {
  const rb = path.join(ROOT, "scripts", "oneoff", `rollback-glacier-travel-${STATE ? STATE + "-" : ""}${Date.now()}.json`);
  fs.writeFileSync(rb, JSON.stringify(todo.map((id) => ({ id, before: { glacier_travel: before.get(id).glacier_travel, snow_in_season: before.get(id).snow_in_season }, after: want.get(id) })), null, 1));
  console.log("rollback:", path.relative(ROOT, rb));
  let n = 0;
  for (const id of todo) {
    // `select` rides on the filter so the PATCH answers with three columns, not the whole route row.
    await patchRow("routes", id, want.get(id), { filter: "select=id,glacier_travel,snow_in_season" });
    if (++n % 50 === 0) console.log(`  ${n}/${todo.length}`);
  }
}

// A 200 is not evidence the data changed: re-read every target and reconcile.
const after = await read(ids);
const wrong = ids.filter((id) => after.has(id) && !same(after.get(id), want.get(id)));
const tally = { gy: 0, gn: 0, gnull: 0, sy: 0, sn: 0, snull: 0 };
for (const id of ids) { const a = after.get(id); if (!a) continue; tally[a.glacier_travel === "yes" ? "gy" : a.glacier_travel === "no" ? "gn" : "gnull"]++; tally[a.snow_in_season === "yes" ? "sy" : a.snow_in_season === "no" ? "sn" : "snull"]++; }
console.log(`re-read ${after.size} rows: glacier_travel yes ${tally.gy} / no ${tally.gn} / not settled ${tally.gnull}; snow_in_season yes ${tally.sy} / no ${tally.sn} / not settled ${tally.snull}`);
if (wrong.length) { console.error(`RECONCILE FAILED: ${wrong.length} rows do not hold their target (${wrong.slice(0, 8).join(", ")})`); process.exit(1); }
console.log("reconciled: every row in the catalog holds its target.");
