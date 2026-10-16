// Remove the source attributions from routes.sling_rack — 8 values, every one a trailing tag.
//
// These render. `fmtSlingRack(route.slingRack)` feeds a bullet in the RACK box, so a climber
// reading their rack sees "(per Mountain Project + 2 trip reports)" inside it. The standing rule
// is that no source reaches a screen, and #1422 is what made audit:prose-citations able to see
// this column at all.
//
// EVERY EDIT IS A DECLARED find -> replace PAIR, and the run refuses unless `find` occurs EXACTLY
// ONCE in the live leaf. Nothing can be invented and a stale table cannot half-apply — the same
// contract redact-road-access-citations.mjs works under. `--dry` first.
//
// TWO OF THE EIGHT ARE NOT DELETIONS, and that is the point of doing this by reading rather than
// by regex. `(sources vary slightly)` and `(less useful here per trip reports)` carry a HEDGE:
// the first says the sizes are approximate, the second that a piece is of limited use here.
// Stripping the citation alone would leave a rack looking more certain than the record is, so the
// uncertainty is rewritten in the app's own voice instead of dropped. CLAUDE.md's citation
// taxonomy calls this out: only one of the five classes is a deletion.
import { requireServiceKey, patchRow, selectAll } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
requireServiceKey();

const EDITS = [
  // --- pure trailing-tag deletions: the sentence is unchanged without the publisher -----------
  { id: "wa_prusik_peak_der_sportsman", path: "cams",
    find: " (per Mountain Project consensus)", replace: "" },
  { id: "wa_prusik_peak_solid_gold", path: "cams",
    find: " (per Mountain Project + trip report)", replace: "" },
  { id: "wa_prusik_peak_west_ridge", path: "cams",
    find: ", per Mountain Project + 2 trip reports", replace: "" },
  { id: "wa_prusik_peak_south_face_burgner_stanley", path: "cams",
    find: " (per Mountain Project + 2 trip reports)", replace: "" },
  { id: "wa_the_chalice", path: "notes",
    find: " per Mountain Project", replace: "" },
  { id: "wa_mount_rainier_mowich_face", path: "note",
    find: " per multiple sources", replace: "" },

  // --- hedges: the uncertainty is real and survives, the attribution does not -----------------
  // "sources vary slightly" is the only thing telling a climber these sizes are approximate.
  { id: "wa_east_ridge_4", path: "cams",
    find: "(sources vary slightly)", replace: "(exact sizes vary by account)" },
  // "less useful here" is the fact; "per trip reports" is where it came from.
  { id: "wa_gato_negro", path: "nuts",
    find: " (less useful here per trip reports)", replace: " (less useful here)" },
];

const dead = (w) => { console.error(`\nREFUSED — ${w}. Nothing was written.\n`); process.exit(1); };

const rows = await selectAll("routes", "id,sling_rack", "sling_rack=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("the read failed: " + (e && e.message)));
if (!rows || !rows.length) dead("zero rows carry sling_rack — an empty read, not an empty column");
const byId = new Map(rows.map((r) => [r.id, r]));

// Navigate a dotted path to its OWNER object so the leaf can be reassigned in place.
function owner(obj, path) {
  const parts = path.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    if (o == null) return null;
    o = o[k];
  }
  const last = parts[parts.length - 1];
  return o == null ? null : { o, k: /^\d+$/.test(last) ? Number(last) : last };
}

// --- validate EVERY edit before writing ANY of them ------------------------------------------
const planned = [];
for (const e of EDITS) {
  const row = byId.get(e.id);
  if (!row) dead(`${e.id} is not in the catalog (or no longer carries sling_rack)`);
  const value = JSON.parse(JSON.stringify(row.sling_rack));
  const own = owner(value, e.path);
  if (!own) dead(`${e.id}: sling_rack.${e.path} does not resolve`);
  const cur = own.o[own.k];
  if (typeof cur !== "string") dead(`${e.id}: sling_rack.${e.path} is ${typeof cur}, not a string`);
  const n = cur.split(e.find).length - 1;
  if (n !== 1) dead(`${e.id}: sling_rack.${e.path} contains ${JSON.stringify(e.find)} ${n} time(s), expected exactly 1 — the value has changed under this table`);
  const next = cur.replace(e.find, e.replace);
  if (next === cur) dead(`${e.id}: the replacement is a no-op`);
  if (!next.trim()) dead(`${e.id}: the replacement would empty the value`);
  own.o[own.k] = next;
  planned.push({ e, before: cur, after: next, value });
}
console.log(`all ${planned.length} edit(s) validated against the live rows.\n`);
for (const p of planned) {
  console.log(`${p.e.id}  sling_rack.${p.e.path}`);
  console.log(`  -  ${p.before}`);
  console.log(`  +  ${p.after}\n`);
}
if (DRY) { console.log("--dry: nothing written."); process.exit(0); }

// --- write, then RE-READ and reconcile -------------------------------------------------------
for (const p of planned) {
  await patchRow("routes", p.e.id, { sling_rack: p.value })
    .catch((err) => dead(`${p.e.id}: the write failed — ${err && err.message}`));
}
console.log(`wrote ${planned.length} row(s). re-reading…`);

const after = await selectAll("routes", "id,sling_rack", "sling_rack=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("the verification read failed: " + (e && e.message)));
const afterById = new Map(after.map((r) => [r.id, r]));
let bad = 0;
for (const p of planned) {
  const own = owner(afterById.get(p.e.id).sling_rack, p.e.path);
  const got = own && own.o[own.k];
  if (got !== p.after) { console.error(`  MISMATCH ${p.e.id}: ${JSON.stringify(got)}`); bad++; }
  else if (got.includes(p.e.find) && p.e.replace === "") { console.error(`  STILL PRESENT ${p.e.id}`); bad++; }
}
console.log(bad ? `\n${bad} row(s) did not reconcile.` : `\nall ${planned.length} row(s) reconciled — the citations are gone and the gear text is intact.`);
process.exit(bad ? 1 : 0);
