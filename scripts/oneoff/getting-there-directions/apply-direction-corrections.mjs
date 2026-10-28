// Write the CORRECTIONS from the online accuracy check of existing driving directions
// (verify-N-out.json, see VERIFY_BRIEF.md). --dry by default; pass --apply to write.
//
//   node apply-direction-corrections.mjs verify-1-out.json [verify-2-out.json ...] [--apply]
//
// Rails:
//   * only verdict fix / not-directions at confidence high|medium, with a corrected text
//   * COMPARE-AND-SWAP: each route is re-read and written only while it still shows the exact old
//     text from existing.json, so a later edit by anyone is never overwritten
//   * every number in the text must equal numbersUsed; no source name or URL; must pass
//     trailheadDirectionProblem(), the detector the build and the daily live check run
//   * merges into approach_logistics (only trailheadDirection changes); never a waypoints[] pin
//   * paced >= 1000 ms per write; a timeout backs off 60 s once, then stops; re-read to reconcile
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { patchRow, requireServiceKey, SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
import { trailheadDirectionProblem } from "../../../lib/trailheadDirectionShape.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const files = args.filter(a => a.endsWith(".json"));
if (!files.length) { console.error("usage: apply-direction-corrections.mjs verify-N-out.json ... [--apply]"); process.exit(2); }
if (APPLY) requireServiceKey();

const existing = JSON.parse(fs.readFileSync(path.join(here, "existing.json"), "utf8"));
const nums = (s) => [...new Set(String(s || "").match(/\d+(?:[.,]\d+)?/g) || [])].map(n => n.replace(",", ""));
const same = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
const SOURCE_RE = /\b(https?:|www\.|\.com|\.org|\.gov|mountainproject|openbeta|summitpost|peakbagger|wta|wtahikers)\b/i;

const fixes = [];
const refused = [];
const tally = {};
for (const f of files) {
  for (const raw of JSON.parse(fs.readFileSync(path.resolve(here, f), "utf8"))) {
    // A second-opinion file (second-opinion-*-out.json) carries finalDirection; only its confirmed or
    // corrected entries are corrections, written with the checker's text and confidence.
    const e = "finalDirection" in raw
      ? { ...raw, verdict: ["confirmed", "corrected"].includes(raw.verdict) ? "fix" : raw.verdict, correctedDirection: raw.finalDirection, problem: raw.note }
      : raw;
    tally[raw.verdict] = (tally[raw.verdict] || 0) + 1;
    if (!["fix", "not-directions"].includes(e.verdict)) continue;
    const src = existing[e.i];
    const label = (src?.trailhead || "?") + " [" + e.i + "]";
    if (!src) { refused.push([label, "index not in existing.json"]); continue; }
    if (!["high", "medium"].includes(e.confidence)) { refused.push([label, "confidence " + e.confidence + " — " + e.problem]); continue; }
    const text = String(e.correctedDirection || "").trim();
    if (!text) { refused.push([label, "no corrected text — " + e.problem]); continue; }
    if (!same(nums(text), (e.numbersUsed || []).map(n => String(n).replace(",", "")))) { refused.push([label, "numbers do not match numbersUsed"]); continue; }
    if (SOURCE_RE.test(text)) { refused.push([label, "a source name or URL is in the text"]); continue; }
    const problem = trailheadDirectionProblem(text);
    if (problem) { refused.push([label, "shape detector: " + problem]); continue; }
    fixes.push({ label, old: src.trailheadDirection, text, ids: src.routes, problem: e.problem });
  }
}
console.log("verdicts:", JSON.stringify(tally));
console.log((APPLY ? "APPLY" : "DRY") + ": " + fixes.length + " corrections over " + fixes.reduce((n, x) => n + x.ids.length, 0) + " routes, " + refused.length + " refused");
for (const [l, why] of refused) console.log("  refuse " + l + " — " + why);
for (const x of fixes) console.log("  fix " + x.label + " (" + x.ids.length + ") — " + x.problem + "\n      " + x.text);
if (!APPLY) process.exit(0);

const read = async (ids) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,approach_logistics&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: { apikey: anonKey(), Authorization: "Bearer " + anonKey() } });
  if (!res.ok) throw new Error("read " + res.status);
  return res.json();
};
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
let written = 0, moved = 0, bad = 0;
for (const x of fixes) {
  for (const r of await read(x.ids)) {
    if (r.approach_logistics?.trailheadDirection !== x.old) { moved++; console.log("  skip " + r.id + " — its text changed since the check"); continue; }
    for (let attempt = 0; ; attempt++) {
      try { await patchRow("routes", r.id, { approach_logistics: Object.assign({}, r.approach_logistics, { trailheadDirection: x.text }) }); written++; break; }
      catch (err) {
        const timeout = /57014|timeout|timed out|503|504/i.test(String(err.message));
        if (!timeout || attempt >= 1) { console.error("STOP at " + r.id + ": " + err.message); process.exit(1); }
        console.error("timeout at " + r.id + " — backing off 60 s"); await sleep(60000);
      }
    }
    await sleep(1000);
  }
  for (const r of await read(x.ids)) if (r.approach_logistics?.trailheadDirection !== x.text && r.approach_logistics?.trailheadDirection === x.old) { bad++; console.error("NOT LANDED: " + r.id); }
}
console.log("written " + written + ", skipped as changed " + moved + ", not landed " + bad);
if (bad) process.exit(1);
