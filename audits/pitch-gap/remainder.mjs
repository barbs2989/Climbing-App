// The gap routes census.json lists that NO saved source text covers: what a future MP route-page crawl would need.
// Writes audits/pitch-gap/remainder.json: [{ id, disc, pitches, pd, rapGap, mp: [mp route ids] }], most pitches first.
// Usage: MP_DIR=~/dev/mp-data/_mp MPTEXT=/path/mptext.json node audits/pitch-gap/remainder.mjs
import fs from "fs";
import path from "path";
const MP_DIR = process.env.MP_DIR;
const texts = JSON.parse(fs.readFileSync(process.env.MPTEXT, "utf8"));
const census = JSON.parse(fs.readFileSync(new URL("./census.json", import.meta.url), "utf8"));
const done = new Set(JSON.parse(fs.readFileSync(new URL("./worklist.json", import.meta.url), "utf8")).map((w) => w.id));
const toMp = new Map();
for (const f of fs.readdirSync(path.join(MP_DIR, "_map")).filter((n) => n.endsWith(".json"))) {
  let d; try { d = JSON.parse(fs.readFileSync(path.join(MP_DIR, "_map", f), "utf8")); } catch { continue; }
  if (!d || Array.isArray(d)) continue;
  for (const [mp, ours] of Object.entries(d)) if (typeof ours === "string") (toMp.get(ours) || toMp.set(ours, []).get(ours)).push(mp);
}
const rem = census.filter((c) => !done.has(c.id)).map((c) => ({ id: c.id, disc: c.disc, pitches: c.pitches, pd: c.pd, rapGap: c.rapGap, saved: !!texts[c.id], mp: toMp.get(c.id) || [] }));
rem.sort((a, b) => b.pitches - a.pitches);
fs.writeFileSync(new URL("./remainder.json", import.meta.url), JSON.stringify(rem));
const withMp = rem.filter((r) => r.mp.length), savedNoPer = rem.filter((r) => r.saved).length;
console.log(`remainder ${rem.length}: ${withMp.length} have an MP page id, ${rem.length - withMp.length} none; ${savedNoPer} already have saved text with no per-pitch description`);
