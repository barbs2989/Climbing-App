// Write researched getting-there text (approach prose, trailhead, driving line, optional coordinate)
// for a batch of routes that have NONE. --dry by default; pass --apply to write.
//
// Input: a JSON array from a research batch (keys in docs/guards/roads-and-access.md: id, found,
// trailhead, trailheadDirection, trailheadLat, trailheadLng, approach, numbersUsed, sources,
// confidence, unverified) plus the routes file it was researched from (--routes), so each row's
// area_id can be checked against the area the research was about.
//
// Safety rails, each one a rule this repo learned the hard way:
//   * a route is written only if it has NO approach prose and NO trailhead of its own today.
//     Filling an absence only. A route that already has either is reported and skipped.
//   * every number in trailheadDirection + approach must be in numbersUsed, and vice versa
//     (traceability: the claim is checkable against the prose it was written from)
//   * the trailhead name must appear in the approach prose (the card and the prose agree on one place)
//   * writes approach_logistics ONLY, never a waypoints[] pin (a filled absence must not manufacture
//     an agreement that blinds audit:trailhead-agreement)
//   * MERGES into approach_logistics so no other key is lost
//   * patchRow throws unless exactly one row changed; a 200 is not evidence, so the whole batch is
//     re-read afterwards and reconciled
//   * writes are paced at >= 1000 ms; any timeout backs off 60 s and stops the batch rather than
//     retrying fast into a struggling database
import fs from "fs";
import { selectAll, patchRow, requireServiceKey, SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const RESEARCH = flag("--research");
const ROUTES = flag("--routes");
if (!RESEARCH || !ROUTES) { console.error("usage: apply-getting-there-batch.mjs --research out.json --routes in.json [--apply]"); process.exit(2); }
if (APPLY) requireServiceKey();

const research = JSON.parse(fs.readFileSync(RESEARCH, "utf8"));
const input = JSON.parse(fs.readFileSync(ROUTES, "utf8"));
const inputRoutes = Array.isArray(input) ? input : input.routes;
const inputById = new Map(inputRoutes.map(r => [r.id, r]));

const nums = (s) => [...new Set(String(s || "").match(/\d+(?:[.,]\d+)?/g) || [])].map(n => n.replace(",", ""));
const same = (a, b) => JSON.stringify([...a].map(String).sort()) === JSON.stringify([...b].map(String).sort());

const plan = [];
const skipped = [];
for (const e of research) {
  const r = inputById.get(e.id);
  if (!r) { skipped.push([e.id, "not in the routes file"]); continue; }
  if (!e.found) { skipped.push([e.id, "research did not establish the way in: " + (e.unverified || "")]); continue; }
  if (!e.approach || !e.trailhead || !e.trailheadDirection) { skipped.push([e.id, "missing approach / trailhead / direction text"]); continue; }
  if (r.approach && String(r.approach).trim()) { skipped.push([e.id, "already has approach prose — not an absence"]); continue; }
  const cur = r.approach_logistics || {};
  if (cur.trailhead) { skipped.push([e.id, "already has a trailhead — re-adjudicate, do not overwrite"]); continue; }
  const used = nums(e.approach + " " + e.trailheadDirection);
  if (!same(used, (e.numbersUsed || []).map(n => String(n).replace(",", "")))) {
    skipped.push([e.id, "numbers do not match numbersUsed: text has " + used.join(",") + " / declared " + (e.numbersUsed || []).join(",")]); continue;
  }
  if (!e.approach.includes(e.trailhead)) { skipped.push([e.id, "trailhead name is not in the approach prose"]); continue; }
  if (/\b(https?:|www\.|\.com|\.org|\.gov|mountainproject|openbeta|summitpost|peakbagger)\b/i.test(e.approach + e.trailheadDirection + e.trailhead)) {
    skipped.push([e.id, "a source name or URL leaked into app text"]); continue;
  }
  const next = Object.assign({}, cur, { trailhead: e.trailhead, trailheadDirection: e.trailheadDirection });
  const hasCoord = typeof e.trailheadLat === "number" && typeof e.trailheadLng === "number";
  if (hasCoord) { next.trailheadLat = e.trailheadLat; next.trailheadLng = e.trailheadLng; }
  plan.push({ id: e.id, approach: e.approach, next, hasCoord, keptKeys: Object.keys(cur) });
}

console.log((APPLY ? "APPLY" : "DRY") + ": " + plan.length + " to write, " + skipped.length + " skipped");
for (const [id, why] of skipped) console.log("  skip " + id + " — " + why);
for (const p of plan) console.log("  " + (APPLY ? "write" : "dry  ") + " " + p.id + (p.hasCoord ? "  [+coord]" : "") + "  keeps " + p.keptKeys.join(",") );

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

// Reconcile: re-read every written id and confirm the prose and direction landed.
const ids = plan.map(p => p.id);
let bad = 0;
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
