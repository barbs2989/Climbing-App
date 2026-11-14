// Write researched DRIVING directions (approach_logistics.trailheadDirection) for alpine routes that
// have a trailhead card but NO directions yet. --dry by default; pass --apply to write.
//
// Input: the research output (trailhead, found, trailheadDirection, numbersUsed, confidence) and the
// route list it was researched from (--routes), so each route is matched to its own trailhead string.
//
// Safety rails:
//   * fills an ABSENT trailheadDirection only; a route that has one is skipped, never overwritten
//   * matches a route to a research row by its EXACT stored trailhead string
//   * only found:true and confidence high|medium are written; low confidence is reported, not written
//   * every number in the text must be in numbersUsed, and vice versa (traceability)
//   * the text must pass lib/trailheadDirectionShape.js (a DRIVE, not a walk), the same detector the
//     build and the daily live check run
//   * no source name or URL may appear in app text
//   * writes approach_logistics ONLY, MERGED so no other key is lost; never a waypoints[] pin
//   * patchRow throws unless exactly one row changed; the batch is re-read and reconciled afterwards
//   * writes are paced at >= 1000 ms; a timeout backs off 60 s and retries once, then stops
import fs from "fs";
import { patchRow, requireServiceKey, SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { trailheadDirectionProblem } from "../../lib/trailheadDirectionShape.js";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const RESEARCH = flag("--research");
const ROUTES = flag("--routes");
if (!RESEARCH || !ROUTES) { console.error("usage: apply-trailhead-directions-batch.mjs --research out.json [out2.json] --routes routes.json [--apply]"); process.exit(2); }
if (APPLY) requireServiceKey();

// --research may be given more than once; collect every file's rows.
const researchFiles = args.slice(args.indexOf("--research") + 1, args.indexOf("--routes"));
const research = researchFiles.flatMap(f => JSON.parse(fs.readFileSync(f, "utf8")));
const routes = JSON.parse(fs.readFileSync(ROUTES, "utf8"));

const nums = (s) => [...new Set(String(s || "").match(/\d+(?:[.,]\d+)?/g) || [])].map(n => n.replace(",", ""));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const SOURCE_RE = /\b(https?:|www\.|\.com|\.org|\.gov|mountainproject|openbeta|summitpost|peakbagger|wta|wtahikers)\b/i;

const byTrailhead = new Map();
for (const e of research) byTrailhead.set(e.trailhead, e);

const plan = [];
const skipped = [];
for (const r of routes) {
  const e = byTrailhead.get(r.trailhead);
  if (!e) { skipped.push([r.id, "no research row for trailhead '" + r.trailhead + "'"]); continue; }
  if (!e.found) { skipped.push([r.id, "research did not establish a drive route: " + (e.unverifiedNote || "")]); continue; }
  if (!["high", "medium"].includes(e.confidence)) { skipped.push([r.id, "confidence " + e.confidence + " is below the bar"]); continue; }
  if (String((r.approach_logistics || {}).trailheadDirection || "").trim()) { skipped.push([r.id, "already has a direction — not an absence"]); continue; }
  const text = String(e.trailheadDirection || "").trim();
  if (!text) { skipped.push([r.id, "empty direction text"]); continue; }
  if (!same(nums(text), (e.numbersUsed || []).map(n => String(n).replace(",", "")))) {
    skipped.push([r.id, "numbers do not match numbersUsed: text " + nums(text).join(",") + " / declared " + (e.numbersUsed || []).join(",")]); continue;
  }
  if (SOURCE_RE.test(text)) { skipped.push([r.id, "a source name or URL is in the text"]); continue; }
  const problem = trailheadDirectionProblem(text);
  if (problem) { skipped.push([r.id, "shape detector: " + problem]); continue; }
  plan.push({ id: r.id, name: r.name, next: Object.assign({}, r.approach_logistics || {}, { trailheadDirection: text }) });
}

console.log((APPLY ? "APPLY" : "DRY") + ": " + plan.length + " to write, " + skipped.length + " skipped");
for (const [id, why] of skipped) console.log("  skip " + id + " — " + why);
for (const p of plan) console.log("  " + (APPLY ? "write" : "dry  ") + " " + p.id + "  " + p.name);
if (!APPLY) process.exit(0);

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
let written = 0;
for (const p of plan) {
  for (let attempt = 0; ; attempt++) {
    try {
      await patchRow("routes", p.id, { approach_logistics: p.next });
      written++;
      break;
    } catch (err) {
      const timeout = /57014|timeout|timed out|503|504/i.test(String(err.message));
      if (!timeout || attempt >= 1) { console.error("STOP at " + p.id + ": " + err.message); process.exit(1); }
      console.error("timeout at " + p.id + " — backing off 60 s"); await sleep(60000);
    }
  }
  await sleep(1000);
}
console.log("written " + written);

// Reconcile: re-read every written id and confirm the direction landed.
const ids = plan.map(p => p.id);
let bad = 0;
for (let i = 0; i < ids.length; i += 20) {
  const chunk = ids.slice(i, i + 20);
  const q = `${SUPABASE_URL}/rest/v1/routes?select=id,approach_logistics&id=in.(${chunk.map(encodeURIComponent).join(",")})`;
  const rows = await (await fetch(q, { headers: { apikey: anonKey(), Authorization: "Bearer " + anonKey() } })).json();
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const p of plan.filter(x => chunk.includes(x.id))) {
    const got = byId.get(p.id);
    if (!got || !got.approach_logistics || got.approach_logistics.trailheadDirection !== p.next.trailheadDirection) { bad++; console.error("NOT LANDED: " + p.id); }
  }
}
console.log("reconciled: " + (ids.length - bad) + " of " + ids.length + " landed");
if (bad) process.exit(1);
