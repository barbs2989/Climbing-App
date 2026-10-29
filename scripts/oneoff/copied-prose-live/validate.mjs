// validate.mjs bNN — checks audits/copied-prose-live/out/bNN.json against queue/bNN.json and writes apply/bNN.json
// (the rewrite-copied-prose.mjs edits shape). Refuses an item whose splice is not unique, whose numbers change,
// or whose new text still shares a run of 8+ words (not name/number-dominated) with a cited page.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
const WT = process.cwd();
const { sourceIndex, copiedRuns } = await import(`${WT}/scripts/lib/source-overlap.mjs`);
const b = process.argv[2], D = "audits/copied-prose-live", CACHE = process.env.PAGE_CACHE || "/tmp/copied-prose-pages";
const queue = JSON.parse(fs.readFileSync(`${D}/queue/${b}.json`, "utf8"));
const out = JSON.parse(fs.readFileSync(`${D}/out/${b}.json`, "utf8"));
const cites = JSON.parse(fs.readFileSync(`${D}/cites.json`, "utf8"));
const byKey = new Map(out.map(o => [o.key, o]));
const toks = s => String(s).replace(/[’‘]/g, "'").replace(/[^A-Za-z0-9.+'/]+/g, " ").split(/\s+/).map(w => w.replace(/^[.'/]+|[.'/]+$/g, "")).filter(Boolean);
const STOP = new Set(["of", "the", "and", "at", "to", "on", "in", "by", "a", "for"]);
function nameShare(text, run) { const t = toks(text), rl = run.split(" "), tl = t.map(w => w.toLowerCase());
  for (let i = 0; i + rl.length <= tl.length; i++) if (rl.every((w, j) => tl[i + j] === w)) { const seg = t.slice(i, i + rl.length).filter(w => !STOP.has(w.toLowerCase())); return seg.filter(w => /^[A-Z0-9]/.test(w)).length / Math.max(1, seg.length); }
  return 0; }
const gramsFor = new Map();
function grams(id) { if (gramsFor.has(id)) return gramsFor.get(id); const texts = [];
  for (const u of cites[id] || []) { const p = path.join(CACHE, crypto.createHash("sha1").update(u).digest("hex") + ".txt"); if (fs.existsSync(p)) { const t = fs.readFileSync(p, "utf8"); if (t) texts.push(t); } }
  const g = sourceIndex(texts); gramsFor.set(id, g); return g; }
const nums = s => (String(s).match(/\d+(?:[.,]\d+)*/g) || []).map(x => x.replace(/,/g, "")).sort().join(" ");
const apply = [], refused = [];
for (const it of queue) {
  const o = byKey.get(it.key);
  if (!o || !Array.isArray(o.edits) || !o.edits.length) { refused.push(`${it.key}: no edits returned`); continue; }
  let s = it.text, bad = null;
  for (const e of o.edits) {
    if (typeof e.old !== "string" || typeof e.new !== "string" || !e.old) { bad = "malformed edit"; break; }
    const n = s.split(e.old).length - 1; if (n !== 1) { bad = `old occurs ${n}x: ${e.old.slice(0, 50)}`; break; }
    if (nums(e.old) !== nums(e.new)) { bad = `numbers changed: [${nums(e.old)}] -> [${nums(e.new)}]`; break; }
    if (/\b[A-Z]{5,}\b/.test(e.new) && !/\b[A-Z]{5,}\b/.test(e.old)) { bad = "new text shouts"; break; }
    s = s.replace(e.old, () => e.new);
  }
  if (!bad) for (const t of it.targets) { const left = copiedRuns(s, grams(t.id)).filter(r => nameShare(s, r) < 0.6); if (left.length) { bad = `still copied: "${left[0]}"`; break; } }
  if (bad) { refused.push(`${it.key}: ${bad}`); continue; }
  for (const t of it.targets) apply.push({ id: t.id, path: t.path, text: it.text, edits: o.edits });
}
fs.mkdirSync(`${D}/apply`, { recursive: true });
fs.writeFileSync(`${D}/apply/${b}.json`, JSON.stringify(apply, null, 1));
console.log(`${b}: ${queue.length} items, ${apply.length} placements ready, ${refused.length} refused`); for (const r of refused) console.log("  " + r);
