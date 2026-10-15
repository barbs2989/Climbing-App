// The RACK card showed an ice axe. Re-home every non-rack item out of the rack columns — every state
// (the first three passes were WA; the fourth ran the same rewrite over the rest of the catalog).
//
// Measured 2026-10-15 over 14,200 WA routes (audit:rack-items): 386 of the 1,275 routes with a
// rack of their own rendered non-rack gear — ice axe, crampons, helmet, boots, poles, a crevasse-
// rescue kit — under RACK, through three columns:
//   detailed_rack  331 routes: 158 whole sentences that are not about rack ("Carry an ice axe if
//                  snow lingers.") and 226 that mix rack with non-rack ("A 60m rope and a medium
//                  alpine rack; light crampons and a light ice axe are recommended into early summer.")
//   pro_needs       22 routes: a "no protection" statement that goes on to advise an ice axe or helmet
//   rack            52 routes: item entries ("Ice axe and crampons (glacier approach)") in the array
//                  the RACK card reads last
// `gear` (33 more routes, 95 entries) is NOT rewritten: it is the route's whole gear list by name,
// and lib/rack.js now splits it at read time.
//
// Every rewrite keeps the route's own facts: the rack half stays in the rack column, the non-rack
// half becomes a `what_to_bring` entry in "item — qualifier" form, which GEAR & ESSENTIALS merges
// and de-duplicates against the standard kit by item (gearKey in RouteDetail.jsx). Nothing a route
// stated is dropped; it moves. The 384 sentence rewrites live in rack-rewrites.json beside this
// script, each keyed by route id AND the exact stored sentence, so a row edited since the rewrite
// was written is skipped rather than half-repaired.
//
//   node scripts/oneoff/fix-rack-non-rack-items.mjs            # dry: prints every planned change
//   node scripts/oneoff/fix-rack-non-rack-items.mjs --apply    # writes, then re-reads and reconciles
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { rackFromText, isRackEntry, isNonRackGear } from "../../lib/rack.js";

const APPLY = process.argv.includes("--apply");
const here = path.dirname(new URL(import.meta.url).pathname);
const REWRITES = JSON.parse(fs.readFileSync(path.join(here, "rack-rewrites.json"), "utf8"));

/* pro_needs is a protection STATEMENT; the clause advising non-rack kit moves out of it. */
const PRO_NEEDS = {
  wa_big_snow_mountain_north_slope_dingford_route: { keep: "Unroped scramble; no fixed protection used.", add: ["ice axe — snow couloir/gully section into summer", "crampons — sometimes, for the snow couloir/gully section"] },
  wa_buckhorn_marmot_pass: { keep: "None required -- this is a Class 2-3 scramble with no fixed protection.", add: ["helmet — loose rock, and other parties above on the boot path"] },
  wa_dot_mountain_scramble: { keep: "Class 3 talus/ridge scramble, with one short Class 4 step on Point 8207 that can be skirted on its north side. No rope or technical protection normally needed.", add: ["helmet — loose-rock ridge traverse between Lago and Dot"] },
  wa_grotto_mountain_e_route: { keep: "Most parties scramble this unroped and there is no fixed protection, but the Class 4 moves at the summit have been protected with a short rope, a few slings and a couple of small cams.", add: ["helmet — rockfall on the loose talus and in the gully"] },
  wa_hagan_mountain_south: { keep: "Not a roped rock route; parties carry a rope for the Hagan Glacier crossing rather than rock protection.", add: ["harness — glacier travel on the Hagan Glacier crossing", "crevasse-rescue kit — basic kit for the Hagan Glacier crossing"] },
  wa_iron_cap_mountain_south_route: { keep: "No technical protection is needed — this is an unroped class 3 scramble on talus and blocky rock.", add: ["helmet — rockfall on the ridge"] },
  wa_mount_appleton_standard: { keep: "No technical pro.", add: ["ice axe — early season, lingering snow near the pass"] },
  wa_mount_duckabush_standard: { keep: "No technical rock pro on the standard line.", add: ["ice axe — early-season snow slopes"] },
  wa_mount_ellinor_standard: { keep: "No technical protection needed.", add: ["ice axe — early season, strongly recommended for the snow chute (and the skill to self-arrest)"] },
  wa_mount_la_crosse_scramble: { keep: "No technical protection is used on the standard Class 2 route.", add: ["ice axe — early season, lingering snow near the ridge shared with White Mountain"] },
  wa_mount_lyall_south_route: { keep: "No fixed protection or roped climbing is documented on this route; it is typically done as an unroped scramble.", add: ["helmet — loose rock (choss) in the summit gully and boulder field"] },
  wa_mount_norton_scramble: { keep: "No technical protection is required on this Class 2 scramble.", add: ["ice axe — early season, lingering snow on the upper slopes"] },
  wa_mount_pilchuck_east_ridge: { keep: "None — this is an unroped scramble route; no technical rack is used.", add: ["ice axe — early-season snow"] },
  wa_mount_steel_standard: { keep: "No technical rock pro on the standard line.", add: ["ice axe — early-season snow slopes"] },
  wa_mount_stickney_scramble: { keep: "The summer NW Ridge route needs no rock protection — it's an unroped scramble over talus, dirt, and one short exposed ridge crest. In winter and spring some parties rope up or fix a hand line on the snow gully below the summit ridge.", add: ["ice axe and crampons — winter and spring"] },
  wa_mount_wilder_scramble: { keep: "None required under normal summer conditions on the standard south ridge line — it's an unroped Class 2 scramble.", add: ["ice axe — lingering snow patches"] },
  wa_saska_peak_emerald_saska_col: { keep: "No fixed protection is placed; this is an unroped scramble for competent parties.", add: ["ice axe — approach snow slopes", "crampons — possibly, in early season on the approach snow slopes"] },
  wa_seven_fingered_jack_southwest_slopes: { keep: "No technical protection is used - this is an unroped scramble.", add: ["ice axe — essential whenever snow/neve is present in the couloir", "helmet — loose talus sections"] },
  wa_snoqualmie_mountain_standard_route: { keep: "None in dry summer conditions.", add: ["ice axe — if snow lingers on the upper slopes", "crampons — possibly, if snow lingers on the upper slopes"] },
  wa_tye_peak_e_route: { keep: "Non-technical class 2 scramble/snow climb — no rock rack is used.", add: ["ice axe — Skyline Ridge slopes", "lightweight crampons — firm, icy, or wind-scoured conditions on the Skyline Ridge slopes"] },
  /* Researched 2026-10-15: the South Climb is an unroped, crevasse-free walk-up (Gifford Pinchot NF
     summit page; multiple trip reports), so the statement loses only the ice-axe clause, which the
     detailed_rack rewrite already moves to what_to_bring. */
  wa_mount_adams_south_climb: { keep: "No technical protection is used on the standard line; rope and glacier gear are not needed.", add: [] },
  /* Not a protection statement at all — skills and a helmet. The scramble places no gear. */
  wa_mount_stone_lake_of_angels: { keep: "No rack — an unroped Class 4 scramble; no protection is placed.", add: ["navigation — map, compass, GPS"] },
  wa_wallaby_peak_standard: { keep: "No technical rack or rope needed on the standard Class 2-3 route; no roped climbing is required.", add: ["helmet — loose summit block"] },
};

/* A route whose detailed_rack was ENTIRELY non-rack gets a rack sentence written from its own row,
   not left empty to fall through to the generic table. Lane Peak's Zipper stored a full rack in
   `rack` and `gear` that detailed_rack ("Single ice axe per climber...") out-ranked; the sentence
   below restates that stored rack. Researched 2026-10-15 against the Mountaineers route page and
   2017-2025 trip reports: up to 45 degree snow/ice, parties rope up and place pickets, 1-2 screws
   only when there is ice, many solo it in good neve; a 70 m rope or two 60s reaches for the rappel. */
const DETAILED_RACK_OVERRIDE = {
  /* Bonanza's Soviet Route: the whole detailed_rack was a pitch count; its rack lives in `rack` and
     `gear`, which pro_needs would otherwise out-rank on the card. Restated from those two columns. */
  wa_soviet_route: "Cams doubled in the finger-to-hand sizes (small Aliens most useful; one repeat ascent found the #3 and #4 unnecessary), a full set of nuts and small wires, a couple of thin knifeblade pitons (optional, for old fixed placements), and twin 60 m ropes for double-rope technique.",
  wa_lane_peak_r1: "A rope (30-60 m for a running belay; two ropes to rappel the couloir), 2-4 pickets and a couple of short ice screws placed sparingly in the narrows — in good neve many parties place one picket or none — plus a small rock rack (nuts, small cams to about 2 in, a tricam or two) for the flanking rock and belays.",
};
/* The same reduction GEAR & ESSENTIALS applies (gearKey in RouteDetail.jsx): the item before the
   first bracket, dash or comma, singularised, so "helmet — loose rock" and "Helmet" are one item.
   Copied rather than imported because that function is not exported; the probe that measures the
   merge (probe-gear-merge-dedupes.mjs) lifts it by brace-balancing for the same reason. */
function gearKey(s) {
  const head = String(s == null ? "" : s).toLowerCase().split(/\s*[(—\[]|\s+--\s+|\s*[,;:]\s+|\s+–\s+/)[0];
  return head.replace(/[^a-z0-9+/ ]/g, " ").replace(/\s+/g, " ").trim().split(" ").map(w => (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) ? w.slice(0, -1) : w).join(" ");
}
/* Two adds can state one item twice when a `rack` entry and a `detailed_rack` sentence both named
   it ("2 small pulleys + 2 prusiks per climber" / "2 small pulleys and 2 prusiks — per climber"), and
   gearKey keeps them apart on a stray "+" or "/". A word-overlap test catches that pair without
   collapsing "ice axe" into "ice tools": three-quarters of the shorter entry's words must recur. */
const words = s => new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !/^(and|the|for|per|with|from|into|that|this|are|not)$/.test(w)));
const nearDuplicate = (a, b) => { const A = words(a), B = words(b); const n = Math.min(A.size, B.size); if (!n) return false; let hit = 0; for (const w of A) if (B.has(w)) hit++; return hit / n >= 0.75; };
function addEntries(existing, adds) {
  const out = existing.slice(); const keys = out.map(gearKey);
  for (const a of adds) { const k = gearKey(a); if (!k) continue; if (out.some(e => nearDuplicate(e, a))) continue; if (keys.some(e => e === k || (e.length >= 3 && new RegExp("(^|\\s)" + e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|\\s)").test(k)) || (k.length >= 3 && new RegExp("(^|\\s)" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|\\s)").test(e)))) continue; out.push(a); keys.push(k); }
  return out;
}
const toArr = v => Array.isArray(v) ? v.filter(x => typeof x === "string" && x.trim()) : [];

const key = requireServiceKey();
const byId = new Map();
for (const r of REWRITES) { if (!byId.has(r.id)) byId.set(r.id, []); byId.get(r.id).push(r); }
const ids = new Set([...byId.keys(), ...Object.keys(PRO_NEEDS)]);
// rack-column rows are found by reading the column itself, not a stored list.
async function fetchRows(filter) {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,detailed_rack,pro_needs,rack,what_to_bring,beta,overview,approach&${filter}${last ? `&id=gt.${encodeURIComponent(last)}` : ""}&order=id.asc&limit=1000`, { headers: headers(key) });
    const t = await res.text(); if (!res.ok) throw new Error(`GET -> ${res.status} ${t.slice(0, 200)}`);
    const rows = JSON.parse(t); if (!rows.length) break; out.push(...rows); last = rows[rows.length - 1].id; if (rows.length < 1000) break;
  }
  return out;
}
// Whole catalog (owner 2026-10-15: "a general rule for all states"); the WA pass ran the same way scoped to wa_.
// `rack=not.is.null` alone times out catalog-wide; the three-column OR the audit uses does not.
const rackRows = (await fetchRows("or=(detailed_rack.not.is.null,pro_needs.not.is.null,rack.not.is.null)")).filter(r => toArr(r.rack).some(e => !isRackEntry(e) && isNonRackGear(e)));
for (const r of rackRows) ids.add(r.id);
const idList = [...ids];
const rows = new Map();
for (let i = 0; i < idList.length; i += 100) for (const r of await fetchRows(`id=in.(${idList.slice(i, i + 100).map(encodeURIComponent).join(",")})`)) rows.set(r.id, r);
if (rows.size !== idList.length) { console.error(`expected ${idList.length} rows, read ${rows.size} — refusing`); process.exit(1); }

const plans = []; let skipped = 0;
for (const id of idList) {
  const r = rows.get(id); const patch = {}; const why = []; let adds = []; const betaAdds = [];
  // detailed_rack: replace each flagged sentence by its rewrite, in place.
  if (byId.has(id)) {
    /* rackFromText appends a period to a sentence that lacks one; the rewrites were keyed on
       the raw split, so match with and without it. */
    /* A `prefix` rewrite matches a sentence by its opening (the audit prints long ones truncated);
       a `toBeta` rewrite is route description filed as rack — it moves to `beta` unless the row
       already says it in overview, approach or beta, in which case it is simply dropped. A rewrite
       whose sentence is no longer stored is DONE (an earlier --apply pass), not an error. */
    const sentences = rackFromText(r.detailed_rack); const same = (a, x) => a === x.s || a === x.s + "." || (x.prefix && a.startsWith(x.s));
    const rw = byId.get(id).filter(x => sentences.some(s => same(s, x)));
    const kept = sentences.map(s => { const x = rw.find(y => same(s, y)); if (!x) return s; adds = adds.concat(x.add); if (x.toBeta) { const said = [r.overview, r.approach, r.beta].filter(Boolean).join(" ").toLowerCase(); if (!said.includes(String(s).replace(/\.$/, "").slice(0, 40).toLowerCase())) betaAdds.push(x.beta || s); } return x.keep; }).filter(Boolean);
    const next = (DETAILED_RACK_OVERRIDE[id] && !kept.length) ? DETAILED_RACK_OVERRIDE[id] : kept.join(" ").trim();
    if (next !== String(r.detailed_rack || "").trim()) { patch.detailed_rack = next || null; why.push(`detailed_rack ${sentences.length}->${kept.length} sentences`); }
  }
  if (PRO_NEEDS[id]) {
    const p = PRO_NEEDS[id];
    if (!r.pro_needs || !String(r.pro_needs).trim()) { console.log(`SKIP ${id}: pro_needs is empty now`); skipped++; continue; }
    if (String(r.pro_needs).trim() !== p.keep) { patch.pro_needs = p.keep; why.push("pro_needs"); adds = adds.concat(p.add); }
  }
  if (Array.isArray(r.rack)) {
    const rack = toArr(r.rack); const moved = rack.filter(e => !isRackEntry(e) && isNonRackGear(e));
    if (moved.length) { patch.rack = rack.filter(e => !moved.includes(e)); if (!patch.rack.length) patch.rack = null; adds = adds.concat(moved); why.push(`rack -${moved.length}`); }
  }
  if (betaAdds.length) { const b = r.beta == null ? "" : (Array.isArray(r.beta) ? r.beta.join(" ") : String(r.beta)); patch.beta = (b ? b.replace(/\s+$/, "") + " " : "") + betaAdds.join(" "); why.push(`beta +${betaAdds.length} sentence(s)`); }
  const wtb = toArr(r.what_to_bring); const nextWtb = addEntries(wtb, adds);
  if (nextWtb.length !== wtb.length) { patch.what_to_bring = nextWtb; why.push(`what_to_bring +${nextWtb.length - wtb.length}`); }
  if (Object.keys(patch).length) plans.push({ id, name: r.name, patch, why, before: r });
}
console.log(`${plans.length} routes to change, ${skipped} skipped.`);
for (const p of plans) {
  console.log(`\n${p.id}  ${p.name}  [${p.why.join(", ")}]`);
  if ("detailed_rack" in p.patch) console.log(`  detailed_rack: ${p.patch.detailed_rack}`);
  if ("pro_needs" in p.patch) console.log(`  pro_needs: ${p.patch.pro_needs}`);
  if ("rack" in p.patch) console.log(`  rack: ${JSON.stringify(p.patch.rack)}`);
  if ("beta" in p.patch) console.log(`  beta +: ${p.patch.beta.slice(p.before.beta ? String(p.before.beta).length : 0)}`);
  if ("what_to_bring" in p.patch) console.log(`  what_to_bring +: ${JSON.stringify(p.patch.what_to_bring.slice(toArr(p.before.what_to_bring).length))}`);
}
if (!APPLY) { console.log("\nDry run. Re-run with --apply to write."); process.exit(0); }

const rollback = plans.map(p => ({ id: p.id, detailed_rack: p.before.detailed_rack, pro_needs: p.before.pro_needs, rack: p.before.rack, what_to_bring: p.before.what_to_bring, beta: p.before.beta }));
const rbPath = path.join(here, "..", `rollback-rack-non-rack-${Date.now()}.json`);
fs.writeFileSync(rbPath, JSON.stringify(rollback, null, 1));
console.log(`\nrollback written: ${rbPath}`);
let ok = 0, bad = 0;
for (const p of plans) {
  try { await patchRow("routes", p.id, p.patch); ok++; } catch (e) { bad++; console.error(`FAILED ${p.id}: ${e.message}`); }
}
console.log(`wrote ${ok}, failed ${bad}`);
// Reconcile: a 200 is not evidence the data changed.
let mismatched = 0; const after = new Map();
for (let i = 0; i < plans.length; i += 100) for (const r of await fetchRows(`id=in.(${plans.slice(i, i + 100).map(p => encodeURIComponent(p.id)).join(",")})`)) after.set(r.id, r);
for (const p of plans) {
  const r = after.get(p.id);
  for (const k of Object.keys(p.patch)) if (JSON.stringify(r[k]) !== JSON.stringify(p.patch[k])) { mismatched++; console.error(`MISMATCH ${p.id}.${k}`); }
}
console.log(`reconciled: ${plans.length - mismatched} of ${plans.length} rows hold exactly what was written`);
process.exit(mismatched ? 1 : 0);
