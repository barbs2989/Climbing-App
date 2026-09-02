// A generic descent sentence is beating the route's own specific one on the screen.
//
// `routes` carries `descent` and `descent_text`, and RouteDetail picks between them with
//     descentBeta(r) = climber correction, else whichever of the two is LONGER
// so a padded generic sentence wins over a short specific one purely on character count. On
// wa_eldorado_peak_northeast_face the screen reads "Descend via the standard descent route, retracing
// the ascent when possible" (168 chars) while the row's own descent_text says "descend the East
// Ridge/Inspiration Glacier line (NOT THE FACE)" (120 chars). The row knows not to reverse the face and
// the page tells a party to reverse it. wa_doorway_flake shows the same snow-bridge boilerplate on a
// bolted rock route while hiding "Rappel the line of ascent using the fixed hand-drilled bolt and Fixe
// chain anchors; two 60m ropes recommended."
//
// WHAT IS DELETED IS PROVABLY NOT ROUTE-SPECIFIC. Only a `descent` that is BYTE-IDENTICAL across four
// or more routes is touched — a sentence repeated verbatim on dozens of unrelated peaks is not a
// description of any of them. The commonest is on 58 routes. Nothing is typed and nothing is rewritten:
// the field is cleared, and descentBeta then falls through to the row's own descent_text, which is why
// a non-empty descent_text is required. A route whose only descent prose is boilerplate keeps it —
// generic advice beats a blank.
//
// SCOPED TO THE ROWS WHERE IT ACTUALLY SHOWS. Rows carrying the same boilerplate already shadowed by a
// longer descent_text reach nobody, so clearing them would be churn.
//
// A CLIMBER'S CORRECTION IS NEVER TOUCHED: descentBeta returns `descent` outright when _contribFields
// records descentText, and the writer mirrors the two on a contribution, so a corrected row has them
// equal in substance and cannot present this shape.
//
// Read-only by default. Pass --apply to write.
import { readFileSync } from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

// The reader this depends on. If it stops preferring the longer string, this repair's premise is gone.
const rd = readFileSync(new URL("../../RouteDetail.jsx", import.meta.url), "utf8");
if (!rd.includes("return b.length>a.length?b:a;")) { console.error("ANCHOR LOST: descentBeta no longer prefers the longer value — re-read it before running this."); process.exit(1); }
if (!rd.includes('indexOf("descentText")')) { console.error("ANCHOR LOST: the descent correction guard moved"); process.exit(1); }

const MIN_SHARERS = 4;
const rows = await selectAll("routes", "id,descent,descent_text", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const tally = new Map();
for (const r of rows) { const a = String(r.descent || "").trim(); if (a) tally.set(a, (tally.get(a) || 0) + 1); }
const shared = new Set([...tally.entries()].filter(([, n]) => n >= MIN_SHARERS).map(([v]) => v));
if (!shared.size) { console.error("no descent value is shared by 4+ routes — the scan is broken, refusing"); process.exit(1); }
console.log(`\ndistinct \`descent\` values: ${tally.size}; shared by ${MIN_SHARERS}+ routes: ${shared.size}`);
for (const v of shared) console.log(`   ${String(tally.get(v)).padStart(3)}x  ${JSON.stringify(v.slice(0, 100))}`);

const plan = [], shadowed = [], noText = [];
for (const r of rows) {
  const a = String(r.descent || "").trim(), b = String(r.descent_text || "").trim();
  if (!a || !shared.has(a)) continue;
  if (!b) { noText.push(r.id); continue; }                     // boilerplate beats a blank
  if (b.length > a.length) { shadowed.push(r.id); continue; }  // already invisible
  plan.push({ id: r.id, from: a, reveals: b });
}
console.log(`\nrows carrying shared boilerplate: ${plan.length + shadowed.length + noText.length}`);
console.log(`  already shadowed by a longer descent_text, left alone : ${shadowed.length}`);
console.log(`  no descent_text to fall back to, left alone           : ${noText.length}`);
console.log(`  BOILERPLATE ON SCREEN over a real descent, cleared    : ${plan.length}\n`);
for (const p of plan) {
  console.log(`  ${p.id}`);
  console.log(`      removing ${JSON.stringify(p.from.slice(0, 120))}`);
  console.log(`      reveals  ${JSON.stringify(p.reveals.slice(0, 140))}`);
}
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, skipped = 0;
const live = new Map((await selectAll("routes", "id,descent,descent_text", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const cur = live.get(p.id);
  if (!cur || String(cur.descent || "").trim() !== p.from || String(cur.descent_text || "").trim() !== p.reveals) {
    console.log(`  SKIPPED ${p.id}: the row has changed since it was read`); skipped++; continue;
  }
  await patchRow("routes", p.id, { descent: null });
  wrote++;
}
console.log(`\nwrote ${wrote}, skipped ${skipped}`);
const after = new Map((await selectAll("routes", "id,descent,descent_text", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const p of plan) {
  const r = after.get(p.id);
  if (r && !String(r.descent || "").trim() && String(r.descent_text || "").trim() === p.reveals) ok++;
  else console.log(`  NOT APPLIED: ${p.id}`);
}
console.log(`verified ${ok} of ${plan.length} — each now falls through to its own descent_text`);
