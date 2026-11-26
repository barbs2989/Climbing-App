// Mechanical checks on a pitch-gap batch before enrich:apply: every route was in the worklist, its `area` and its
// review.sources / source_texts are the ones its context file names, no low-confidence route, every entry has notes,
// no copied route grade (every pitch carrying exactly the route grade when the route has 3+ pitches is flagged).
// Usage: node audits/pitch-gap/validate.mjs batches/b001.json [...]   (exit 1 on any problem)
import fs from "fs";
import os from "os";
import path from "path";
const CTX = path.join(process.env.PITCH_TEXT_DIR || path.join(os.homedir(), "dev/mp-data/_mp/_pitchtext"), "ctx");
let bad = 0;
const say = (m) => { bad++; console.log("  " + m); };
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  console.log(f);
  for (const [id, e] of Object.entries(d)) {
    if (id === "skip_reasons") continue;
    const cp = path.join(CTX, id + ".json");
    if (!fs.existsSync(cp)) { say(`${id}: not in the worklist`); continue; }
    const c = JSON.parse(fs.readFileSync(cp, "utf8"));
    if (e.area !== c.row.area_id) say(`${id}: area ${e.area} != ${c.row.area_id}`);
    const r = e.review || {};
    if (r.confidence === "low") say(`${id}: low confidence`);
    if (!(r.sources || []).includes(c.source_url)) say(`${id}: sources missing ${c.source_url}`);
    if ((r.source_texts || {})[c.source_url] !== c.source_text_path) say(`${id}: source_texts wrong`);
    const pd = e.pitch_detail || [];
    for (const p of pd) if (!String(p.notes || "").trim()) say(`${id}: pitch ${p.pitch} has no notes`);
    // the app names no source (owner rule): no "the text", book, author or site in anything that renders
    const SRC = /\b(the text|the source|guide ?book|the book|the author|the description|according to|mountain ?project|summitpost|reportedly|reporter|the party(?! ledge))\b|\b(?:we|our|I|my|us)\b/i;
    for (const p of [...pd, ...(e.rappel_detail || [])]) for (const v of Object.values(p)) if (typeof v === "string" && SRC.test(v)) say(`${id}: names a source: "${v.match(SRC)[0]}"`);
    for (const p of e.rappel_detail || []) if (!String(p.notes || p.station || "").trim()) say(`${id}: rappel ${p.n} empty`);
    if (pd.length >= 3 && c.row.grade && pd.every((p) => p.grade === c.row.grade)) say(`${id}: every pitch carries the route grade ${c.row.grade}`);
    if ((c.row.pitch_detail || []).length && pd.length && !e.replace_pitch_detail) say(`${id}: has stored pitch_detail, no replace flag`);
    if ((c.row.rappel_detail || []).length && (e.rappel_detail || []).length && !e.replace_rappels) say(`${id}: has stored rappel_detail`);
  }
}
console.log(bad ? `${bad} problem(s)` : "OK");
process.exit(bad ? 1 : 0);
