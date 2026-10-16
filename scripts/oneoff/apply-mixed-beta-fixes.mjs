// A route page that explains a SECOND route — the Disappointment Cleaver complaint, swept over the
// WA mountain catalog (audits/route-grades/mixed-beta/out-*.json, read by two readers over the 405
// pages scripts/oneoff/scan-mixed-route-beta.mjs found naming a sibling).
//
// Only SENTENCE-level fixes are applied here. A page that IS another route (Bonanza "North Ridge"
// is wholly the Mary Green Glacier; Ragged Edge exists twice) needs a merge, and route identity is
// an owner decision (docs/codebase/route-identity.md) — those are listed in the report, not touched.
//
// The readers quoted a ±160-char WINDOW, not a sentence, so each edit locates its window in the
// named column (exactly one hit, or refused), widens it to the enclosing sentence, and replaces or
// deletes that. A pitch_detail edit removes or rewrites the one entry holding the window.
//   node scripts/oneoff/apply-mixed-beta-fixes.mjs --dry
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const SKIP_IDS = new Set([
  "wa_bonanza_peak_north_ridge",        // whole page is the Mary Green Glacier — merge decision
  "wa_ragged_edge", "wa_vesper_peak_north_face_ragged_edge", // duplicate pair — merge decision
  "wa_huckleberry_mountain_west_route", // beta, fa and overview name three different lines — identity decision
  "wa_luna_peak_southeast_slopes",      // fixed by hand below (a breakdown stage, not a sentence)
]);
const edits = ["out-1", "out-2"].flatMap(f => JSON.parse(fs.readFileSync(`audits/route-grades/mixed-beta/${f}.json`, "utf8")))
  .filter(r => !SKIP_IDS.has(r.id))
  .flatMap(r => (r.mixed || []).map(m => ({ id: r.id, col: m.column_guess, window: m.sentence, fix: m.fix })))
  .filter(e => e.window !== e.fix);

const COLS = ["overview", "beta", "climbing_route", "approach", "pitch_detail", "approach_variants", "descent_text"];
const rows = {};
for (const id of [...new Set(edits.map(e => e.id))]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,${COLS.join(",")}&id=eq.${id}`, { headers: headers(key) });
  rows[id] = (await res.json())[0];
}

// widen a window to the sentence(s) it sits in
function sentenceSpan(text, i, j) {
  let a = i; while (a > 0 && !/[.!?]\s/.test(text.slice(a - 2, a)) && text[a - 1] !== "\n") a--;
  let b = j; while (b < text.length && !/[.!?]/.test(text[b - 1] || "") ) b++;
  while (b < text.length && text[b] === " ") b++;
  return [a, b];
}
const norm = s => s.replace(/^[\s"',{}\[\]:]+|[\s"',{}\[\]:]+$/g, "");
const out = {}, refused = [];
for (const e of edits) {
  const r = rows[e.id]; const w = norm(e.window);
  // which column actually holds it
  const holders = COLS.filter(c => r[c] != null && (typeof r[c] === "string" ? r[c] : JSON.stringify(r[c])).includes(w));
  if (holders.length !== 1) { refused.push({ ...e, why: `window found in ${holders.length} columns (${holders.join(",")})` }); continue; }
  const col = holders[0];
  const body = (out[e.id] ||= {});
  const cur = body[col] !== undefined ? body[col] : r[col];
  if (typeof cur === "string") {
    const i = cur.indexOf(w); if (cur.indexOf(w, i + 1) >= 0) { refused.push({ ...e, why: "window occurs twice" }); continue; }
    const [a, b] = sentenceSpan(cur, i, i + w.length);
    body[col] = (cur.slice(0, a) + (e.fix === "DELETE" ? "" : e.fix.trim() + " ") + cur.slice(b)).replace(/ {2,}/g, " ").replace(/\s+$/, "");
  } else if (Array.isArray(cur)) {
    const k = cur.findIndex(x => JSON.stringify(x).includes(w));
    const el = cur[k];
    if (e.fix === "DELETE" && col === "pitch_detail") { body[col] = cur.filter((_, n) => n !== k); continue; }
    // a sentence inside one string field of one entry
    const f = Object.keys(el).find(q => typeof el[q] === "string" && el[q].includes(w));
    if (!f) { refused.push({ ...e, why: "window spans entry fields" }); continue; }
    const s = el[f], i = s.indexOf(w); const [a, b] = sentenceSpan(s, i, i + w.length);
    const ns = (s.slice(0, a) + (e.fix === "DELETE" ? "" : e.fix.trim() + " ") + s.slice(b)).replace(/ {2,}/g, " ").trim();
    body[col] = cur.map((x, n) => n === k ? { ...x, [f]: ns } : x);
  }
}
// HAND EDITS, where the window-to-sentence rule would cut too much or cannot reach. Each asserts the
// exact text it replaces, so a row that has moved on is refused rather than overwritten.
const MANUAL = [
  // one long sentence: "delete the sentence" would empty the overview and lose its first ascent
  ["wa_frying_pan_whitman_glaciers", "overview", s => s
    .replace(` rather than for the east-shoulder terrain feature; modern route guides describe "Fryingpan/Whitman Glaciers" and "East Shoulder" as the same standard route — same Summerland approach, same Whitman Notch crossing, same Class 3-4 summit block — first climbed`, `. It was first climbed`)
    .replace(/\s*See the East Shoulder route entry on this peak for the closely related \(likely identical\) line\.?/, "")],
  // keep this route's own claim; drop the sibling South Route's description
  ["wa_garfield_mountain_scramble", "overview", s => s.replace(/, with the classic South Route \(first ascended August 27, 1940 by Jim Crooks and Judson Nelson\)[^.]*\./, ".")],
  // a whole breakdown row for the Southeast Ridge, a different line from this route's central gully
  ["wa_mount_shuksan_sulphide_glacier", "pitch_detail", p => p.filter(x => x.pitch !== "Southeast Ridge (alternative)")],
  // this route contours the slopes; "South ridge" is the sibling South Ridge route's terrain
  ["wa_luna_peak_southeast_slopes", "pitch_detail", p => p.map(x => x.pitch !== "South ridge" ? x : { ...x, pitch: "Southeast slopes", notes: "Continue across the southeast slopes from Luna Pass to the false summit, staying off the broad south ridge." })],
];
for (const [id, c, f] of MANUAL) {
  if (!rows[id]) rows[id] = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,${COLS.join(",")}&id=eq.${id}`, { headers: headers(key) })).json())[0];
  const body = (out[id] ||= {});
  delete body[c]; // a hand edit replaces any window edit of the same column
  const before = rows[id][c], after = f(before);
  if (JSON.stringify(after) === JSON.stringify(before)) { refused.push({ id, why: `hand edit of ${c} matched nothing` }); delete out[id][c]; continue; }
  body[c] = after;
}
for (const id of Object.keys(out)) if (!Object.keys(out[id]).length) delete out[id];
for (const [id, body] of Object.entries(out)) for (const [c, v] of Object.entries(body)) {
  const before = typeof rows[id][c] === "string" ? rows[id][c] : JSON.stringify(rows[id][c]);
  const after = typeof v === "string" ? v : JSON.stringify(v);
  console.log(`\n## ${id} [${c}] ${before.length} -> ${after.length} chars`);
  // print just the region that changed
  let p = 0; while (p < before.length && before[p] === after[p]) p++;
  let q = 0; while (q < before.length - p && before[before.length - 1 - q] === after[after.length - 1 - q]) q++;
  console.log("  - " + before.slice(Math.max(0, p - 60), before.length - q + 40).replace(/\n/g, " "));
  console.log("  + " + after.slice(Math.max(0, p - 60), after.length - q + 40).replace(/\n/g, " "));
}
console.log("\nrefused:", refused.map(r => `${r.id} (${r.why})`).join("; ") || "none");
if (DRY) process.exit(0);
const tag = Date.now();
fs.writeFileSync(`audits/route-grades/mixed-beta/rollback-${tag}.json`, JSON.stringify(Object.fromEntries(Object.entries(out).map(([id, b]) => [id, Object.fromEntries(Object.keys(b).map(c => [c, rows[id][c]]))])), null, 1));
for (const [id, body] of Object.entries(out)) await patchRow("routes", id, body);
console.log(`wrote ${Object.keys(out).length} routes; rollback audits/route-grades/mixed-beta/rollback-${tag}.json`);
