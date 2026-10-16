// Holden Village: every row already holds the window, and the flagged fields say "as of 2026".
//
// The FR 6200 / Suiattle / Beverly shape for the fourth time. Each of these rows carries "closure
// order in effect January 28, 2026 through December 31, 2027" (or "through Dec 31, 2027") in its
// road.status or road.driveNote, and then says "closed for the 2026 season" in the field
// audit:expiring-closures flags. Copying the date across makes those claims self-limiting.
//
// WHY THE 2026-SEASON PHRASING IS WORSE THAN VAGUE, AND THE REASON THIS CLUSTER WAS WORTH DOING:
// the order runs to the END OF 2027. A climber reading "closed for the 2026 season" next spring can
// reasonably infer it has reopened, and this is a road with no alternative — Holden is reached only
// by boat plus FSR 8301. The claim does not merely age, it ages into the OPPOSITE of the truth.
//
// THE ORDER NUMBER IS RESEARCHED, NOT COPIED, and that is flagged rather than blurred. No row in the
// catalog carries #06-17-05-26-04; it was read off the Forest Service's own alert page for the
// Railroad and Preston Creek road closures, which gives the number, the window (28 Jan 2026 -
// 31 Dec 2027) and the extent ("FSR 8301, from the junction with Lucerne commercial dock"). The
// WINDOW is copied from the rows; only the identifier is new. It is worth adding because a forest
// order number is the one key that identifies a closure exactly — the road name alone finds the
// wrong one, which is the near miss recorded for Harts Pass.
// [[stale-closure-grind-is-half-viable-and-blind-to-missing-ones]]
//
// Exact find -> replace, refused unless `find` matches EXACTLY once in the live value.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ORDER = "#06-17-05-26-04";
const WINDOW = "28 January 2026 through 31 December 2027";

// Every edited row is its OWN witness for the window — the date is already in that row.
const WITNESS_RE = /(?:January 28, 2026 through )?Dec(?:ember)? 31,? 2027/i;
const WITNESS_FIELDS = [["road", "status"], ["road", "driveNote"]];

const EDITS = [
  { id: "wa_bonanza_peak_mary_green_glacier", col: "road", key: "driveNote",
    find: "FR 8301 and Holden Village are closed for the 2026 season",
    repl: `FR 8301 and Holden Village are closed under USFS order ${ORDER}, in effect ${WINDOW}` },

  { id: "wa_bonanza_peak_north_ridge", col: "access", key: "closures",
    find: "are closed to all hikers and vehicles as of the 2026 season due to Dec 2025 flood/landslide damage",
    repl: `are closed to all hikers and vehicles under USFS order ${ORDER}, in effect ${WINDOW}, after Dec 2025 flood/landslide damage` },

  { id: "wa_bonanza_peak_northeast_buttress", col: "road", key: "driveNote",
    find: "FR 8301 and Holden Village are closed for the 2026 season",
    repl: `FR 8301 and Holden Village are closed under USFS order ${ORDER}, in effect ${WINDOW}` },

  { id: "wa_bonanza_peak_northeast_buttress", col: "access", key: "closures",
    find: "closed and boat shuttle suspended as of 2026 — see road note.",
    repl: `closed and boat shuttle suspended under USFS order ${ORDER}, in effect ${WINDOW} — see road note.` },

  { id: "wa_bonanza_peak_west_ridge", col: "access", key: "closures",
    find: "closed and boat shuttle suspended as of 2026 — see road note.",
    repl: `closed and boat shuttle suspended under USFS order ${ORDER}, in effect ${WINDOW} — see road note.` },

  { id: "wa_soviet_route", col: "road", key: "driveNote",
    find: "FR 8301 and Holden Village are closed for the 2026 season",
    repl: `FR 8301 and Holden Village are closed under USFS order ${ORDER}, in effect ${WINDOW}` },

  { id: "wa_soviet_route", col: "access", key: "closures",
    find: "closed and boat shuttle suspended as of 2026 — see road note.",
    repl: `closed and boat shuttle suspended under USFS order ${ORDER}, in effect ${WINDOW} — see road note.` },
];

if (APPLY) requireServiceKey();

const ids = [...new Set(EDITS.map(e => e.id))];
const rows = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} routes — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

let ok = true;
for (const id of ids) {
  const good = WITNESS_FIELDS.some(([c, k]) => {
    const v = byId[id][c] && byId[id][c][k];
    return typeof v === "string" && WITNESS_RE.test(v);
  });
  console.log(`${good ? "witness ok  " : "REFUSE      "}${id} — the row itself records the 31 Dec 2027 end date`);
  if (!good) ok = false;
}
if (!ok) { console.error("\nrefusing — a row no longer records the window this copies"); process.exit(1); }

const patches = new Map();
for (const e of EDITS) {
  const key = `${e.id}|${e.col}`;
  const working = patches.get(key) || { id: e.id, col: e.col, obj: { ...byId[e.id][e.col] } };
  const cur = working.obj[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — not a string`); ok = false; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — find matched ${hits}x, expected 1`); ok = false; continue; }
  const next = cur.replace(e.find, e.repl);
  if (!next.includes(ORDER)) { console.log(`REFUSE ${e.id} — result does not cite the order`); ok = false; continue; }
  if (/for the 2026 season|as of 2026 —/.test(next)) { console.log(`REFUSE ${e.id} — a season-scoped claim survives`); ok = false; continue; }
  working.obj[e.key] = next;
  patches.set(key, working);
  console.log(`\n${e.id}  ${e.col}.${e.key}`);
  console.log(`   -  ${cur.slice(0, 230)}`);
  console.log(`   +  ${next.slice(0, 230)}`);
}
console.log(`\n${EDITS.length} edit(s) across ${patches.size} row-object(s)`);
if (!ok) { console.error("refusing to apply while any edit is refused"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const p of patches.values()) await patchRow("routes", p.id, { [p.col]: p.obj });

const after = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
let bad = 0;
for (const e of EDITS) {
  const r = after.find(x => x.id === e.id);
  const v = r && r[e.col] && r[e.col][e.key];
  if (typeof v !== "string" || !v.includes(ORDER)) { console.log(`NOT WRITTEN  ${e.id} ${e.col}.${e.key}`); bad++; }
}
console.log(bad ? `\n${bad} edit(s) did not land` : `\nverified: no Holden row now scopes the closure to "the 2026 season".`);
process.exit(bad ? 1 : 0);
