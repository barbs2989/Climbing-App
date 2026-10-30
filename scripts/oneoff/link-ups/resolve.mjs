// Propose a catalog route_id for every leg of research-data/link-ups/<file>.json that has none yet,
// for a person to REVIEW before it is written into the file (route ids come mostly from the route
// NAME — never trust one unread; docs/codebase/route-identity.md).
//
//   node scripts/oneoff/link-ups/resolve.mjs wa-same-trip-north
//
// Read-only against the database. Writes research-data/link-ups/<file>.resolve.json:
//   [{ lu, leg, peak, route, pick: {id,name,area,score}|null, others: [...] }]
// A pick needs the area to match the peak AND the route name to share a word with the leg's route
// (or the leg names no route and the area holds exactly one alpine/mountaineering/scrambling route).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, requireServiceKey, headers } from "../../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const file = process.argv[2];
if (!file) throw new Error("usage: resolve.mjs <research file name without .json>");
const list = JSON.parse(fs.readFileSync(path.join(ROOT, "research-data/link-ups", file + ".json"), "utf8"));
const key = requireServiceKey();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STATE2 = { Washington: "wa", Oregon: "or", California: "ca", Colorado: "co", Wyoming: "wy", Montana: "mt", Idaho: "id", Utah: "ut", Nevada: "nv", "New Mexico": "nm", Alaska: "ak", Arizona: "az", "New Hampshire": "nh", "New York": "ny", Maine: "me", Vermont: "vt" };
const STOP = new Set(["mount", "mt", "peak", "mountain", "the", "of", "via", "route", "and", "from", "to", "standard", "ridge", "glacier", "face", "side", "trail", "approach", "a"]);

function core(peak) {
  return peak.replace(/\(.*?\)/g, " ").replace(/\b(mount|mt\.?|peak|mountain|the|needle|spire)\b/gi, " ").replace(/[^A-Za-z' -]/g, " ").trim().split(/\s+/).filter((w) => w.length > 2).join(" ");
}
const words = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
function score(legRoute, name) {
  const a = new Set(words(legRoute)), b = new Set(words(name));
  if (!a.size || !b.size) return 0;
  let n = 0; for (const w of a) if (b.has(w)) n++;
  return n / Math.max(a.size, 1);
}

async function get(url) {
  const t = Date.now();
  const res = await fetch(url, { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  if (Date.now() - t > 10000) { console.error("slow read — backing off 60 s"); await sleep(60000); }
  return res.json();
}

const out = [];
for (const lu of list) {
  if (lu.drop) continue;
  const st = STATE2[lu.state] || lu.id.slice(0, 2);
  for (const [i, leg] of lu.legs.entries()) {
    if (leg.route_id !== undefined) continue;
    const c = core(leg.peak);
    let rows = [];
    if (c) {
      rows = await get(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,grade,areas!inner(name)&id=like.${st}_*&areas.name=ilike.*${encodeURIComponent(c)}*&discipline=in.(alpine,mountaineering,scrambling)&limit=60`);
      await sleep(300);
    }
    const scored = rows.map((r) => ({ id: r.id, name: r.name, disc: r.discipline, grade: r.grade, area: r.areas.name, score: score(leg.route, r.name) })).sort((x, y) => y.score - x.score);
    let pick = null;
    if (scored.length && scored[0].score > 0 && (scored.length === 1 || scored[0].score > scored[1].score)) pick = scored[0];
    else if (scored.length === 1) pick = scored[0];
    out.push({ lu: lu.id, leg: i, peak: leg.peak, route: leg.route || null, pick, others: scored.slice(0, 8) });
  }
}
fs.writeFileSync(path.join(ROOT, "research-data/link-ups", file + ".resolve.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`${out.length} leg(s) without a route_id; ${out.filter((o) => o.pick).length} with a proposed pick, ${out.filter((o) => !o.others.length).length} with no catalog candidate`);
