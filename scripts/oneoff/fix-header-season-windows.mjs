// The route header strap prints `season` (`5,991 ft · 16p · Jul-Sep`). seasonShort() can only
// REPAIR a sentence written there, and on these 14 rows the repair read wrong: a sentence cut
// mid-word ("Summer only, and typically…"), a window that lost its end ("Late May"), and one
// that said the OPPOSITE of the row ("good in cold weather; avoid May-Sep" showed "May-Sep").
// Audit 2026-10-24: every one of the 1,035 non-null `season` values run through the header's
// own function; these 14 were the ones that failed.
//
// Each window comes from the row's OWN text (its season sentence and its best_season), not new
// research. The sentence is not lost: where it says something best_season does not, that part
// is appended to best_season, which renders as prose ("When to go:") on the Conditions tab.
//
// Every PATCH is pinned to the season value read on 2026-10-24 (filter season=eq.<old>), so a
// row someone has edited since is refused rather than overwritten. --apply writes; default dry.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY = process.argv.includes("--apply");

const SHADED = "A shaded destination for hot days, when the nearby Mazama crags are too warm.";
const FIXES = [
  { id: "va_strawberry_fields", season: "Oct-Apr", add: "Good in cold weather; avoid May through September." },
  { id: "wa_ephemeral", season: "Jul-Sep" },
  { id: "wa_iceman", season: "Late Jun-Sep", add: SHADED },
  { id: "wa_route_c", season: "Late Jun-Sep", add: SHADED },
  { id: "wa_route_d", season: "Late Jun-Sep", add: SHADED },
  { id: "wa_mount_rainier_curtis_ridge", season: "May-Jun", add: "Best in cold, stable conditions, when rockfall is frozen in place; considered dangerous in warm or melting conditions." },
  { id: "wa_mount_rainier_emmons_glacier", season: "Late May-Aug", add: "The season opens when the White River Road does, in late May." },
  { id: "wa_mount_rainier_fuhrer_finger", season: "May-Jun", add: "Climb it early in the season, with a very early start each day to limit rockfall exposure in the couloir." },
  { id: "wa_mount_rainier_ingraham_direct", season: "Jan-May" },
  { id: "wa_mount_rainier_ptarmigan_ridge", season: "May-Jun", add: "The Mowich Lake road often does not open until early July, which delays that approach." },
  { id: "wa_mount_rainier_willis_wall", season: "Winter-spring", add: "Almost always attempted in winter or spring cold, when serac activity is most likely to be frozen." },
  { id: "wa_ne_couloir", season: "Jun-early Jul" },
  { id: "wa_northeast_ridge_1963_route", season: "Late Jun-Sep" },
  { id: "wa_storm_king_southwest_scramble", season: "Jul-Oct" },
];

const key = requireServiceKey();
const rows = await selectAll("routes", "id,season,best_season", `id=in.(${FIXES.map((f) => f.id).join(",")})`, { key });
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
const missing = FIXES.filter((f) => !byId[f.id]);
if (missing.length) { console.log("REFUSED: rows not found:", missing.map((f) => f.id).join(", ")); process.exit(1); }

const rollback = {};
let done = 0;
for (const f of FIXES) {
  const r = byId[f.id];
  const body = { season: f.season };
  if (f.add) body.best_season = r.best_season ? `${r.best_season.trim().replace(/[.]?$/, ".")} ${f.add}` : f.add;
  console.log(`${f.id}\n  season: ${JSON.stringify(r.season)}\n       -> ${JSON.stringify(body.season)}` +
    (body.best_season ? `\n  best_season -> ${JSON.stringify(body.best_season)}` : ""));
  rollback[f.id] = { season: r.season, best_season: r.best_season };
  if (!APPLY) continue;
  await patchRow("routes", f.id, body, { filter: `season=eq.${encodeURIComponent(r.season)}` });
  done++;
}
if (!APPLY) { console.log(`\nDRY RUN: ${FIXES.length} rows. Re-run with --apply to write.`); process.exit(0); }

const dir = path.join(ROOT, "audits", "header-season");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `rollback-${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify(rollback, null, 1));
// A 200 is not evidence the data changed: re-read and reconcile.
const after = await selectAll("routes", "id,season", `id=in.(${FIXES.map((f) => f.id).join(",")})`, { key });
const wrong = FIXES.filter((f) => (after.find((a) => a.id === f.id) || {}).season !== f.season);
console.log(`\nAPPLIED ${done}/${FIXES.length}; re-read mismatches: ${wrong.length}; rollback: ${path.relative(ROOT, file)}`);
if (wrong.length) process.exit(1);
