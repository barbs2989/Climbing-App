// Re-batch the remaining peaks without the LINK-UP noise. A track that reaches two or more catalog
// summits more than LINK_KM apart is a link-up (Sierra Triple Crown, Tuolumne Grand Slam, ...): it
// can only be one of our routes if that route is itself a traverse / link-up / loop. Peaks 1-5 were
// already researched; batches from 6 on keep only single-summit tracks, plus link-up tracks on a
// peak that has a traverse-like route. Offline.
// Usage: node rebatch-peaks.mjs <first new batch number> [peaks per batch]
import fs from "fs";
import { haversineM } from "./rule.mjs";
const D = "research-data/gpx-tracks-fkt-peaks-2026-10-29";
const [firstArg, sizeArg] = process.argv.slice(2);
const FIRST = +firstArg || 6, SIZE = +sizeArg || 10, LINK_KM = 1.5;
const done = new Set();
for (let i = 1; i < FIRST; i++) for (const p of JSON.parse(fs.readFileSync(`${D}/peak-batch-${i}.json`, "utf8"))) done.add(p.peak);
const peaksAll = JSON.parse(fs.readFileSync(`${D}/peaks.json`, "utf8"));
const coord = new Map(peaksAll.map(p => [p.id, [p.lat, p.lng]]));
const cands = JSON.parse(fs.readFileSync(`${D}/candidates.json`, "utf8"));
const reached = {};
for (const c of cands) (reached[c.slug] ||= new Set()).add(c.peak);
const isLinkup = slug => { const ps = [...reached[slug]].map(id => coord.get(id)).filter(Boolean); for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if (haversineM(ps[i], ps[j]) > LINK_KM * 1000) return true; return false; };
const TRAVERSE = /traverse|link|enchain|loop|grand|tour|slam|circuit|ridge run/i;
// keep the batch fields (route text, track start) by reading them back out of the old batches
const old = new Map();
for (const f of fs.readdirSync(D).filter(f => /^peak-batch-\d+\.json$/.test(f))) for (const p of JSON.parse(fs.readFileSync(`${D}/${f}`, "utf8"))) old.set(p.peak, p);
for (const f of fs.readdirSync(D).filter(f => /^peak-batch-\d+\.json$/.test(f) && +f.match(/\d+/)[0] >= FIRST)) fs.unlinkSync(`${D}/${f}`);
const keep = [];
let dropped = 0;
for (const p of old.values()) {
  if (done.has(p.peak)) continue;
  const traverseRoute = p.routes.some(r => TRAVERSE.test(r.name || ""));
  const tracks = p.tracks.filter(t => !isLinkup(t.slug) || traverseRoute);
  dropped += p.tracks.length - tracks.length;
  if (tracks.length) keep.push({ ...p, tracks });
}
let n = FIRST - 1;
for (let i = 0; i < keep.length; i += SIZE) fs.writeFileSync(`${D}/peak-batch-${++n}.json`, JSON.stringify(keep.slice(i, i + SIZE), null, 1));
const linkups = Object.keys(reached).filter(isLinkup).length;
console.log(`${linkups} link-up tracks; ${dropped} link-up entries dropped; ${keep.length} peaks left in batches ${FIRST}-${n}`);
