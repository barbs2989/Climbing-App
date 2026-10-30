// Write researched getting-there text (approach prose, trailhead, driving line) for a batch of routes
// that have NONE. --dry by default; pass --apply to write.
//
// Input: a JSON array from a research batch (id, found, trailhead, trailheadDirection, approach,
// numbersUsed, confidence, sourceUrls, unverified) plus the routes file it was researched from
// (--routes), and optionally --library (known trailhead coordinates; see below).
//
// Safety rails, each one a rule this repo learned the hard way:
//   * a route is written only if it has NO approach prose and NO trailhead of its own today.
//     Filling an absence only. A route that already has either is reported and skipped.
//   * every number in trailheadDirection + approach must be in numbersUsed, and vice versa
//     (traceability: the claim is checkable against the prose it was written from)
//   * the trailhead name must appear in the approach prose (the card and the prose agree on one place)
//   * only confidence high|medium; the drive must pass trailheadDirectionProblem(); and the prose must
//     share no 8-word run with any cited page, which is fetched here (scripts/lib/source-overlap.mjs)
//   * a coordinate is NEVER typed by research: it is copied only from --library, the coordinate other
//     routes already store under the identical trailhead name, when those copies agree
//   * writes approach_logistics ONLY, never a waypoints[] pin (a filled absence must not manufacture
//     an agreement that blinds audit:trailhead-agreement)
//   * MERGES into approach_logistics so no other key is lost
//   * patchRow throws unless exactly one row changed; a 200 is not evidence, so the whole batch is
//     re-read afterwards and reconciled
//   * writes are paced at >= 1000 ms; any timeout backs off 60 s and stops the batch rather than
//     retrying fast into a struggling database
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { patchRow, requireServiceKey, SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import { htmlToText, sourceIndex, copiedRuns } from "../lib/source-overlap.mjs";
import { trailheadDirectionProblem } from "../../lib/trailheadDirectionShape.js";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const RESEARCH = flag("--research");
const ROUTES = flag("--routes");
// --library: known trailheads {name: {lat, lng}} built from coordinates OTHER routes already store under
// that exact name (they must agree). A coordinate is only ever COPIED from it, never typed by research.
const LIBRARY = flag("--library");
if (!RESEARCH || !ROUTES) { console.error("usage: apply-getting-there-batch.mjs --research out.json --routes in.json [--apply]"); process.exit(2); }
if (APPLY) requireServiceKey();

const research = JSON.parse(fs.readFileSync(RESEARCH, "utf8"));
const input = JSON.parse(fs.readFileSync(ROUTES, "utf8"));
const inputRoutes = Array.isArray(input) ? input : input.routes;
const inputById = new Map(inputRoutes.map(r => [r.id, r]));

const nums = (s) => [...new Set(String(s || "").match(/\d+(?:[.,]\d+)?/g) || [])].map(n => n.replace(",", ""));
const same = (a, b) => JSON.stringify([...new Set(a.map(String))].sort()) === JSON.stringify([...new Set(b.map(String))].sort());
const library = LIBRARY ? JSON.parse(fs.readFileSync(LIBRARY, "utf8")) : {};

// Our own words only: every cited page is fetched and an 8-word run shared with it refuses the entry,
// the same rule enrich:apply enforces. A batch whose sources could not be read at all is refused too.
// --page-cache DIR: pages a researcher could read only in a BROWSER (SummitPost and mountaineers.org
// answer 403 to fetch) are saved there as <sha1(url)>.txt, so the copy check still sees them. EVERY
// cited page must be readable one way or the other: a source that silently dropped out of the check
// is exactly the page the prose is most likely to have been copied from.
const PAGE_CACHE = flag("--page-cache");
const pageText = new Map();
async function readSource(url) {
  if (pageText.has(url)) return pageText.get(url);
  let t = null;
  try { const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } }); if (res.ok) t = htmlToText(await res.text()); } catch { /* unreadable */ }
  if (!t && PAGE_CACHE) {
    const cp = path.join(PAGE_CACHE, crypto.createHash("sha1").update(url).digest("hex") + ".txt");
    if (fs.existsSync(cp)) { const c = fs.readFileSync(cp, "utf8"); if (c.trim().split(/\s+/).length > 100) t = c; }
  }
  pageText.set(url, t);
  return t;
}

const plan = [];
const skipped = [];
for (const e of research) {
  const r = inputById.get(e.id);
  if (!r) { skipped.push([e.id, "not in the routes file"]); continue; }
  if (!e.found) { skipped.push([e.id, "research did not establish the way in: " + (e.unverified || "")]); continue; }
  if (!["high", "medium"].includes(e.confidence)) { skipped.push([e.id, "confidence " + e.confidence + " is below the bar"]); continue; }
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
  const shape = trailheadDirectionProblem(e.trailheadDirection);
  if (shape) { skipped.push([e.id, "shape detector: " + shape]); continue; }
  const read = await Promise.all((e.sourceUrls || []).map(readSource));
  const texts = read.filter(Boolean);
  if (!texts.length) { skipped.push([e.id, "no cited source could be read, so the copy check cannot run"]); continue; }
  if (PAGE_CACHE && texts.length < read.length) { skipped.push([e.id, "a cited page could not be read (not fetchable, not in --page-cache): " + e.sourceUrls.filter((u, i) => !read[i]).join(" ")]); continue; }
  const grams = sourceIndex(texts);
  const runs = [...copiedRuns(e.approach, grams), ...copiedRuns(e.trailheadDirection, grams)];
  if (runs.length) { skipped.push([e.id, "copies its source word for word: \"" + runs[0] + "\""]); continue; }
  const next = Object.assign({}, cur, { trailhead: e.trailhead, trailheadDirection: e.trailheadDirection });
  const known = library[e.trailhead];
  const hasCoord = !!known;
  if (hasCoord) { next.trailheadLat = known.lat; next.trailheadLng = known.lng; }
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
