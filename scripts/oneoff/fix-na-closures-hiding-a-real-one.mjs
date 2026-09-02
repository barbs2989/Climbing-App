// A route says its closures are "N/A" while its own row records the road being gated all winter.
//
// RouteDetail renders `ac.closures || ac.closure || ac.seasonal`. The string "N/A" is TRUTHY, so it
// wins the chain and the real seasonal closure behind it never reaches the screen. 42 routes read
// "N/A" while the same row holds "WA-20 (North Cascades Highway) closes gate-to-gate roughly early
// December-mid/late April; the entire Washington Pass corridor is car-inaccessible in winter" — which
// is the single most consequential access fact in the North Cascades, and the screen was saying there
// was nothing to report. 13 more hide a Cascade River Road washout history, 12 the Mountain Loop
// Highway gate, 3 the I-90 avalanche-control closures.
//
// This is the same shape as the bare "U.S. Forest Service" land manager: a PLACEHOLDER outranking real
// content, because the reader tests for presence and a placeholder is present.
//
// THE FIX IS TO CLEAR THE PLACEHOLDER, NOT TO COPY ANYTHING. "N/A" carries no information, so removing
// it loses nothing and the || chain falls through to the value the row already holds. Nothing is typed
// and no closure text is written — which matters here, because a fabricated or stale closure claim is a
// class this catalog already has (see audit:expiring-closures) and this script must not add to it.
//
// SCOPED TO ROWS THAT HAVE SOMETHING TO FALL THROUGH TO. 123 rows say "N/A"; the 53 with nothing behind
// them keep it, since a bare "N/A" at least states that nothing is recorded, and clearing it would only
// make the row vanish. Only where "N/A" is demonstrably FALSE — contradicted by the same row — is it
// removed.
//
// `ac.seasonal` reaches the screen through this one expression only (its other reader is a keyword
// haystack in lib/routeTags.js), so this cannot make a closure render twice.
//
// Read-only by default. Pass --apply to write.
import { readFileSync } from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const rd = readFileSync(new URL("../../RouteDetail.jsx", import.meta.url), "utf8");
if (!rd.includes("ac.closures||ac.closure||ac.seasonal")) { console.error("ANCHOR LOST: the closures fallback chain moved — re-read it before running this."); process.exit(1); }

// Values that mean "nothing to say" rather than saying anything.
const NOOP = /^(n\/?a|none|none known|no known closures|no closures|not applicable|-|—|none\.?|no seasonal closures)\.?$/i;

const rows = await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

let haveClosures = 0, placeholder = 0;
const plan = [], keep = [];
for (const r of rows) {
  const a = r.access; if (!a || typeof a !== "object") continue;
  const c = a.closures;
  if (typeof c !== "string" || !c.trim()) continue;
  haveClosures++;
  if (!NOOP.test(c.trim())) continue;
  placeholder++;
  const alt = [a.closure, a.seasonal].find(v => typeof v === "string" && v.trim() && !NOOP.test(v.trim()));
  if (!alt) { keep.push(r.id); continue; }
  plan.push({ id: r.id, from: c, reveals: String(alt).trim() });
}
if (!haveClosures) { console.error("no access.closures found at all — the scan is broken, refusing"); process.exit(1); }
console.log(`\nrows with access.closures: ${haveClosures}`);
console.log(`  value is a placeholder meaning "nothing"          : ${placeholder}`);
console.log(`  ...with nothing behind it, left alone             : ${keep.length}`);
console.log(`  ...CONTRADICTED by the row's own closure text     : ${plan.length}\n`);
const byText = new Map();
for (const p of plan) byText.set(p.reveals, (byText.get(p.reveals) || 0) + 1);
for (const [v, n] of [...byText].sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(n).padStart(3)} routes will now show: ${JSON.stringify(v.slice(0, 150))}`);
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, skipped = 0;
const live = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const cur = live.get(p.id)?.access;
  if (!cur || cur.closures !== p.from) { console.log(`  SKIPPED ${p.id}: the row has changed since it was read`); skipped++; continue; }
  const next = { ...cur }; delete next.closures;
  await patchRow("routes", p.id, { access: next });
  wrote++;
}
console.log(`\nwrote ${wrote}, skipped ${skipped}`);
const after = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const p of plan) {
  const a = after.get(p.id)?.access || {};
  const shows = a.closures || a.closure || a.seasonal;
  if (!a.closures && String(shows || "").trim() === p.reveals) ok++;
  else console.log(`  NOT APPLIED: ${p.id}`);
}
console.log(`verified ${ok} of ${plan.length} — each now shows its own closure text`);
