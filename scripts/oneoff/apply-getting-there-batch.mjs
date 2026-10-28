// Write researched getting-there text (walk prose, trailhead, driving line, optional coordinate)
// for routes that have NONE. --dry by default; pass --apply to write.
//
// Input: the research JSON (keys in scripts/oneoff/getting-there-directions/ and the spec: id, found,
// trailhead, trailheadDirection, trailheadLat, trailheadLng, approach, numbersUsed, sources,
// confidence, unverified) plus the routes file it was researched from (--routes).
//
// Rails:
//   * writes only a route with NO approach prose and NO trailhead today (filling an absence)
//   * writes only found:true at high or medium confidence
//   * every number in trailheadDirection + approach must match numbersUsed as a SET
//   * the trailhead name must appear in the approach prose; no source name or URL in app text
//   * writes approach_logistics MERGED, and the approach column; never a waypoints[] pin
//   * patchRow throws unless exactly one row changed; the batch is re-read and reconciled
//   * paced at 1 s; a timeout backs off 60 s, then stops rather than retrying fast
import fs from "fs";
import { patchRow, requireServiceKey, SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const RESEARCH = flag("--research");
const ROUTES = flag("--routes");
if (!RESEARCH || !ROUTES) { console.error("usage: apply-getting-there-batch.mjs --research out.json --routes in.json [--apply]"); process.exit(2); }
if (APPLY) requireServiceKey();

const research = JSON.parse(fs.readFileSync(RESEARCH, "utf8"));
const input = JSON.parse(fs.readFileSync(ROUTES, "utf8"));
const inputById = new Map((Array.isArray(input) ? input : input.routes).map(r => [r.id, r]));

const nums = (s) => [...new Set(String(s || "").match(/\d+(?:[.,]\d+)?/g) || [])].map(n => n.replace(",", ""));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const LEAK = /\b(https?:|www\.|\.com|\.org|\.gov|mountainproject|openbeta|summitpost|peakbagger|wta|wtaorg)\b/i;

const plan = [];
const skipped = [];
for (const e of research) {
  const r = inputById.get(e.id);
  if (!r) { skipped.push([e.id, "not in the routes file"]); continue; }
  if (!e.found || !["high", "medium"].includes(e.confidence)) { skipped.push([e.id, "not established at high/medium: " + (e.unverified || "")]); continue; }
  if (!e.approach || !e.trailhead || !e.trailheadDirection) { skipped.push([e.id, "missing approach / trailhead / direction text"]); continue; }
  if (r.approach && String(r.approach).trim()) { skipped.push([e.id, "already has approach prose"]); continue; }
  if ((r.approach_logistics || {}).trailhead) { skipped.push([e.id, "already has a trailhead"]); continue; }
  const used = nums(e.approach + " " + e.trailheadDirection);
  if (!same(used, nums((e.numbersUsed || []).join(" ")))) { skipped.push([e.id, "numbers do not match numbersUsed: " + used.join(",")]); continue; }
  if (!e.approach.includes(e.trailhead)) { skipped.push([e.id, "trailhead name is not in the approach prose"]); continue; }
  if (LEAK.test(e.approach + " " + e.trailheadDirection + " " + e.trailhead)) { skipped.push([e.id, "a source name or URL in app text"]); continue; }
  const next = Object.assign({}, r.approach_logistics || {}, { trailhead: e.trailhead, trailheadDirection: e.trailheadDirection });
  const hasCoord = typeof e.trailheadLat === "number" && typeof e.trailheadLng === "number";
  if (hasCoord) { next.trailheadLat = e.trailheadLat; next.trailheadLng = e.trailheadLng; }
  plan.push({ id: e.id, approach: e.approach, next, hasCoord });
}

console.log((APPLY ? "APPLY" : "DRY") + ": " + plan.length + " to write, " + skipped.length + " skipped");
for (const [id, why] of skipped) console.log("  skip " + id + " — " + why);
for (const p of plan) console.log("  " + (APPLY ? "write" : "dry  ") + " " + p.id + (p.hasCoord ? "  [+coord]" : ""));
if (!APPLY) process.exit(0);

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
let written = 0;
for (const p of plan) {
  for (let attempt = 0; ; attempt++) {
    try {
      await patchRow("routes", p.id, { approach: p.approach, approach_logistics: p.next });
      written++;
      break;
    } catch (err) {
      const timeout = /57014|timeout|timed out|503|504/i.test(String(err.message));
      if (!timeout || attempt >= 2) { console.error("STOP at " + p.id + ": " + err.message); process.exit(1); }
      console.error("timeout at " + p.id + " — backing off 60 s"); await sleep(60000);
    }
  }
  await sleep(1000);
}
console.log("written " + written);

let bad = 0;
const ids = plan.map(p => p.id);
for (let i = 0; i < ids.length; i += 20) {
  const chunk = ids.slice(i, i + 20);
  const q = `${SUPABASE_URL}/rest/v1/routes?select=id,approach,approach_logistics&id=in.(${chunk.map(encodeURIComponent).join(",")})`;
  const rows = await (await fetch(q, { headers: { apikey: anonKey(), Authorization: "Bearer " + anonKey() } })).json();
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const p of plan.filter(x => chunk.includes(x.id))) {
    const got = byId.get(p.id);
    if (!got || got.approach !== p.approach || !got.approach_logistics || got.approach_logistics.trailheadDirection !== p.next.trailheadDirection) { bad++; console.error("NOT LANDED: " + p.id); }
  }
}
console.log("reconciled: " + (ids.length - bad) + " of " + ids.length + " landed");
if (bad) process.exit(1);
