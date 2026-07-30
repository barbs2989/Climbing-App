// Test the jurisdiction logic used by check 6 of scripts/audit-route-identity.mjs.
//
// Worth keeping as a file rather than a one-off, because two earlier designs for this check
// PASSED synthetic tests and then failed on the live catalog:
//
//   1. Resolving place names against the area tree flagged CORRECT data — the tree is not a
//      gazetteer, and route text names real places ("Hurricane Ridge") that are not areas in
//      it, so a same-named area elsewhere became a false match.
//   2. A hand-written map of which tree branches each jurisdiction covers scored 9/9 on
//      synthetic cases and then produced 299 false positives, because the real branch
//      vocabulary ("Central-West Cascades") differed from what was guessed ("Hwy 20").
//
// So the NEGATIVE cases below matter more than the positives, and they are drawn from real
// rows rather than invented. Keep them.
//
// Usage: node scripts/test-jurisdiction-check.mjs

import { selectAll } from "./lib/supabase-env.mjs";

const areasList = await selectAll("areas", "id,name,parent_id,lat,lng", null, { pageSize: 1000 });
const areas = new Map(areasList.map(a => [a.id, a]));
const ancestry = id => { const o = []; let c = id; for (let i = 0; c && i < 12; i++) { const a = areas.get(c); if (!a) break; o.push(a); c = a.parent_id; } return o; };
const coordOf = id => { for (const a of ancestry(id)) if (a.lat != null && a.lng != null) return { lat: a.lat, lng: a.lng }; return null; };
const R_EARTH = 3958.8;
const milesBetween = (a, b) => { const p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180, dp = p2 - p1, dl = (b.lng - a.lng) * Math.PI / 180;
  return 2 * R_EARTH * Math.asin(Math.sqrt(Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2)); };

// Keep in sync with JURISDICTION in scripts/audit-route-identity.mjs.
const JURISDICTION = [
  ["Olympic National Park",        { lat: 47.80, lng: -123.60 },  60],
  ["Gifford Pinchot",             { lat: 46.20, lng: -121.70 },  70],
  ["Adams Climbing",              { lat: 46.20, lng: -121.49 },  40],
  ["North Cascades National Park",{ lat: 48.70, lng: -121.20 },  70],
  ["Okanogan-?Wenatchee",         { lat: 47.80, lng: -120.60 }, 110],
  ["Alpine Lakes Wilderness",     { lat: 47.50, lng: -121.15 },  50],
  ["Mount Rainier National Park", { lat: 46.85, lng: -121.76 },  40],
  ["Mount Baker-?Snoqualmie",     { lat: 47.90, lng: -121.60 }, 130],
];
const COMPARATIVE = /\b(not|unlike|other than|rather than|as opposed to|compared to|versus|vs\.?|nearest|nearby|closest|no\b[^.]{0,30}\bfee\b[^.]{0,10}like)\b[^.]{0,40}$/i;

function judge(areaId, text) {
  const own = coordOf(areaId);
  if (!own) return null;
  const txt = JSON.stringify(text);
  for (const [cue, centre, radius] of JURISDICTION) {
    const m = txt.match(new RegExp(cue, "i"));
    if (!m) continue;
    if (COMPARATIVE.test(txt.slice(Math.max(0, m.index - 60), m.index))) continue;
    const d = milesBetween(own, centre);
    if (d > radius) return { cites: m[0], miles: Math.round(d), radius };
  }
  return null;
}

// Positives are the four contamination patterns actually found in the catalog on 2026-07-29.
// Negatives include the specific cases that broke designs 1 and 2.
const CASES = [
  ["Olympic text on Cutthroat Peak",          "wa_cutthroat_peak", { notes: "Olympic National Park entrance pass required." }, true],
  ["Gifford Pinchot on Mount Baker",          "wa_mount_baker",    { notes: "Self-issued wilderness permit. Gifford Pinchot NF." }, true],
  ["Mount Adams pass on Forbidden Peak",      "wa_forbidden_peak", { notes: "Mount Adams Climbing Pass required." }, true],
  ["Alpine Lakes on Whatcom Peak",            "wa_whatcom_peak",   { notes: "Free permit (Alpine Lakes Wilderness)." }, true],
  ["Steeple Rock cites its OWN park",         "wa_steeple_rock",   { notes: "Olympic National Park pass; Hurricane Ridge area." }, false],
  ["Cutthroat cites Okanogan-Wenatchee",      "wa_cutthroat_peak", { notes: "Okanogan-Wenatchee National Forest, Methow Valley RD." }, false],
  ["Forbidden cites North Cascades NP",       "wa_forbidden_peak", { notes: "North Cascades National Park permit, Marblemount." }, false],
  ["comparative mention is not a claim",      "wa_cutthroat_peak", { notes: "No climbing fee here, unlike Olympic National Park." }, false],
  ["a real Adams route cites the Adams pass", "wa_mount_adams",    { notes: "Mount Adams Climbing Pass above 7,000 ft." }, false],
  ["Alta Mountain cites Okanogan-Wenatchee",  "wa_alta_mountain",  { notes: "Okanogan-Wenatchee NF; Northwest Forest Pass." }, false],
  ["a Snoqualmie crag cites MBS NF",          "wa_alta_mountain",  { notes: "Mount Baker-Snoqualmie National Forest." }, false],
];

let pass = 0, fail = 0, skipped = 0;
for (const [label, area, text, expectFlag] of CASES) {
  if (!areas.has(area)) { console.log(`SKIP  (no area ${area})  ${label}`); skipped++; continue; }
  const r = judge(area, text);
  const got = !!r;
  const ok = got === expectFlag;
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${got ? "flagged" : "quiet  "}  ${label}` +
              (r ? `  -> ${r.cites}, ${r.miles} mi (radius ${r.radius})` : ""));
}
console.log(`\n${pass} pass, ${fail} fail${skipped ? `, ${skipped} skipped` : ""}`);
process.exit(fail ? 1 : 0);
