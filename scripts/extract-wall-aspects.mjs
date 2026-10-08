// extract-wall-aspects.mjs — which way each WALL faces, read from the area pages' own prose that
// scripts/pipeline/fetch-area-text.mjs saved (<dir>/_text/<id>.json, with the walk's <dir>/_tree/<id>.json
// for names, coordinates and children). Feeds areas.aspect, which the crag conditions score reads
// for sun vs shade when a route has no aspect of its own.
//
//   node scripts/extract-wall-aspects.mjs <dir>            # report + agreement against what we hold
//   node scripts/extract-wall-aspects.mjs <dir> --sql > f  # SQL: set aspect where it is still null
//
// <dir> is the crawl's data folder (…/catalog/_mp). Nothing here is copied into the app: only the
// eight-point direction is kept.
//
// A wall gets an aspect only from a STATEMENT: "south-facing", "faces west", "the east face of the
// cliff" (how:'direct'), or sun timing — "morning sun" E, "afternoon sun" W, "sun all day" S,
// "shade all day" N (how:'sun'). Statements that disagree by more than 45° mean several walls, so
// none is kept. A sentence about the approach ("the south-facing gully", "hike the west slope")
// says nothing about the rock and is skipped. A crag-wide sentence ("all the walls face south")
// covers the crag's own walls that say nothing themselves (how:'crag').
import fs from "node:fs";
import path from "node:path";
import { selectAll } from "./lib/supabase-env.mjs";

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, "_text"))) { console.error("usage: node scripts/extract-wall-aspects.mjs <crawl data dir holding _tree and _text> [--sql]"); process.exit(2); }
const SQL = process.argv.includes("--sql");

const B = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
const NAME = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const DIR = "(north[- ]?east|north[- ]?west|south[- ]?east|south[- ]?west|north|south|east|west|ne|nw|se|sw|n|s|e|w)";
const key = function (d) { d = d.toLowerCase().replace(/[- ]/g, ""); return d.replace("north", "n").replace("south", "s").replace("east", "e").replace("west", "w"); };
const DIRECT = [
  new RegExp("\\b" + DIR + "[- ]?facing\\b", "gi"),
  new RegExp("\\bfaces?\\s+(?:to the |the |mostly |mainly |primarily |generally |due |roughly )?" + DIR + "\\b(?!\\s+(?:face|ridge|side|end|fork|of the canyon))", "gi"),
  new RegExp("\\b" + DIR + "[- ](?:face|side) of (?:the |this )?(?:wall|cliff|crag|formation|boulder|rock|buttress|dome|tower|block|outcrop)\\b", "gi"),
  // A bare "the south face has the warmups" names ANOTHER face of the same rock: it is collected so
  // that "north face of the boulder … south face" disagrees and records nothing.
  new RegExp("\\b" + DIR + "[- ]face\\b(?!\\s+of)", "gi"),
];
const SUN = [
  [/\b(?:morning|a\.?m\.?) sun\b|\bsun (?:in|during) the morning|\bafternoon shade\b|\bshade (?:in|during) the afternoon/gi, "e"],
  [/\b(?:afternoon|evening|p\.?m\.?) sun\b|\bsun (?:in|during) the (?:afternoon|evening)|\bmorning shade\b|\bshade (?:in|during) the morning/gi, "w"],
  [/\bsun all day\b|\ball[- ]day sun\b|\bsunny all day\b/gi, "s"],
  [/\bshade all day\b|\ball[- ]day shade\b|\bshady all day\b|\bnever (?:gets|sees) (?:the |any |direct )?sun\b|\balways in the shade\b/gi, "n"],
];
const APPROACH = /\b(trail|hike|hiking|approach|drive|road|slope|gully|couloir|parking|walk|descent|descend|canyon side|hillside)\b/i;
const CRAGWIDE = /\b(all|most|every|majority)\b[^.]{0,40}\b(walls|cliffs|crags|routes|climbs|faces|boulders|areas)\b[^.]{0,40}\b(face|faces|facing)\b|\bthe (cliff|crag|wall|escarpment|cliff band|cliffline)s? (?:is |are )?(?:mostly |mainly |generally )?(?:face|faces|facing)\b/i;
const diff = function (a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

export function readAspect(text) {
  const direct = [], sun = []; let wide = false;
  for (const sentence of String(text || "").split(/(?<=[.!?])\s+/)) {
    if (APPROACH.test(sentence)) continue;
    let hit = false;
    for (const re of DIRECT) for (const m of sentence.matchAll(re)) { const b = B[key(m[1])]; if (b != null) { direct.push(b); hit = true; } }
    if (hit && CRAGWIDE.test(sentence)) wide = true;
    for (const [re, d] of SUN) if (re.test(sentence)) { sun.push(B[d]); re.lastIndex = 0; }
    for (const [re] of SUN) re.lastIndex = 0;
  }
  const pick = function (bs) { if (!bs.length) return null; for (const b of bs) if (diff(b, bs[0]) > 45) return null; const x = bs.reduce(function (s, b) { return s + Math.sin(b * Math.PI / 180); }, 0), y = bs.reduce(function (s, b) { return s + Math.cos(b * Math.PI / 180); }, 0); return NAME[Math.round(((Math.atan2(x, y) * 180 / Math.PI + 360) % 360) / 45) % 8]; };
  const d = pick(direct); if (d) return { aspect: d, how: wide ? "crag" : "direct" };
  if (direct.length) return null;
  const s = pick(sun); return s ? { aspect: s, how: "sun" } : null;
}

const norm = function (s) { return String(s || "").toLowerCase().replace(/,\s*the$/, "").replace(/^the\s+/, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, ""); };
const km = function (a, b, c, d) { const R = Math.PI / 180, x = (d - b) * R * Math.cos((a + c) / 2 * R), y = (c - a) * R; return 6371 * Math.hypot(x, y); };

// The walk: names, coordinates, children (so a crag's statement can reach its walls).
const tree = new Map(), parentOf = new Map();
for (const f of fs.readdirSync(path.join(dir, "_tree"))) {
  if (!/^\d+\.json$/.test(f)) continue;
  const a = JSON.parse(fs.readFileSync(path.join(dir, "_tree", f), "utf8")); tree.set(a.id, a);
  for (const k of a.kids || []) parentOf.set(k, a.id);
}
const found = new Map(); let texts = 0;
for (const f of fs.readdirSync(path.join(dir, "_text"))) {
  if (!/^\d+\.json$/.test(f)) continue; texts++;
  const t = JSON.parse(fs.readFileSync(path.join(dir, "_text", f), "utf8"));
  const r = readAspect(Object.values(t).join(" \n"));
  if (r) found.set(f.replace(".json", ""), r);
}
// A crag-wide statement covers its walls that say nothing themselves.
for (const [id, r] of [...found]) if (r.how === "crag") for (const k of (tree.get(id) || {}).kids || []) if (!found.has(k)) found.set(k, { aspect: r.aspect, how: "crag" });

// Ours: same name, nearest within 2 km.
const ours = await selectAll("areas", "id,name,lat,lng,aspect", null, { pageSize: 1000 });
const byName = new Map();
for (const a of ours) { const k = norm(a.name); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(a); }
const out = []; let unmatched = 0;
for (const [mp, r] of found) {
  const a = tree.get(mp); if (!a || a.lat == null) { unmatched++; continue; }
  let best = null, bd = 2;
  for (const o of byName.get(norm(a.name)) || []) { if (o.lat == null) continue; const d = km(a.lat, a.lng, o.lat, o.lng); if (d < bd) { bd = d; best = o; } }
  if (best) out.push({ id: best.id, mp, aspect: r.aspect, how: r.how, had: best.aspect }); else unmatched++;
}

// Agreement against what we already hold: the routes' own aspect (majority per area) and areas.aspect.
const routeAsp = [];
const ids = [...new Set(out.map(function (o) { return o.id; }))];
for (let i = 0; i < ids.length; i += 40) routeAsp.push(...await selectAll("routes", "id,area_id,aspect", "aspect=not.is.null&area_id=in.(" + ids.slice(i, i + 40).map(encodeURIComponent).join(",") + ")", { pageSize: 500 }));
const held = new Map();
for (const r of routeAsp) { const m = String(r.aspect).match(/^\s*(north[- ]?east|north[- ]?west|south[- ]?east|south[- ]?west|north|south|east|west|ne|nw|se|sw|n|s|e|w)\b/i); if (m && !held.has(r.area_id)) held.set(r.area_id, B[key(m[1])]); }
for (const o of ours) if (o.aspect && o.aspect !== "varies") held.set(o.id, B[o.aspect.toLowerCase()]);
const agree = { direct: [0, 0], sun: [0, 0], crag: [0, 0] };
for (const o of out) if (held.has(o.id)) { agree[o.how][1]++; if (diff(held.get(o.id), B[o.aspect.toLowerCase()]) <= 45) agree[o.how][0]++; }

const fresh = out.filter(function (o) { return !o.had; });
console.error(`${texts} area texts; ${found.size} with a stated facing; ${out.length} matched to our areas (${unmatched} unmatched); ${fresh.length} would be new`);
console.error("agreement within 45° of what we hold (agree/compared): " + Object.entries(agree).map(function (e) { return e[0] + " " + e[1][0] + "/" + e[1][1]; }).join(", "));
fs.writeFileSync(path.resolve("research-data/crag-aspects/text-found.json"), JSON.stringify(out));
if (SQL && fresh.length) {
  const q = function (s) { return "'" + String(s).replace(/'/g, "''") + "'"; };
  for (let i = 0; i < fresh.length; i += 2000)
    console.log("update public.areas a set aspect = v.aspect\nfrom (values\n" + fresh.slice(i, i + 2000).map(function (o) { return "  (" + q(o.id) + ", " + q(o.aspect) + ")"; }).join(",\n") + "\n) v(id, aspect)\nwhere a.id = v.id and a.aspect is null;\n");
}
