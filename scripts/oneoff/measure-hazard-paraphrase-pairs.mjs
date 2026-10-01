// Which lines in the KNOWN HAZARDS box say the same thing in different words?
//
// knownHazards() (lib/hazards.js) drops a line only when every significant word of it is in a
// line it keeps — deliberately not fuzzy, because two hazards 80% alike can be different hazards.
// That leaves paraphrases: "Loose blocky rock (lower route)" beside "Loose, blocky rock low on the
// route." This lists every printed pair whose shorter line has >= MIN (default 0.75) of its
// significant words in the other, with the column and index each line came from, so a reader can
// decide pair by pair. A score is a reason to READ a pair, never a verdict on it.
//
//   node scripts/oneoff/measure-hazard-paraphrase-pairs.mjs [--out file.json]
import { writeFileSync } from "fs";
import { selectAll } from "../lib/supabase-env.mjs";
import { knownHazards, toWarnArr } from "../../lib/hazards.js";

const argv = process.argv.slice(2);
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : null;
const MIN = Number(process.env.MIN || 0.75);
// The merge's own tokeniser, copied because hazards.js does not export it; a pair is only a
// CANDIDATE here, so a drift between the two costs a missed or an extra pair to read, nothing more.
const STOP = new Set("a an the and or but of in on at to for with is are be can will this that it its as by from you your so expect especially notably some there here up down out into over under than then when while very more most".split(" "));
const tok = s => new Set(String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
  .filter(w => w && w.length > 2 && !STOP.has(w)).map(w => w.replace(/(?:ing|ed|es|s)$/, "")));

const rows = await selectAll("routes", "id,name,hazards,obj_haz,watch_out",
  "or=(hazards.not.is.null,obj_haz.not.is.null,watch_out.not.is.null)", { pageSize: 1000 });
if (!rows.length) { console.log("BROKEN PROBE: no rows read — a failed read is not an empty catalog"); process.exit(1); }

const routes = [];
let nPairs = 0;
for (const r of rows) {
  const cols = { hazards: Array.isArray(r.hazards) ? r.hazards : [], obj_haz: Array.isArray(r.obj_haz) ? r.obj_haz : [], watch_out: toWarnArr(r.watch_out) };
  const k = knownHazards(cols.hazards, cols.obj_haz, cols.watch_out);
  const shown = [...k.hazards, ...k.watchOut].map(t => {
    const src = Object.entries(cols).flatMap(([c, a]) => a.map((x, i) => String(x).trim() === t ? `${c}[${i}]` : null)).filter(Boolean);
    return { text: t, src };
  });
  const pairs = [];
  for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
    const A = tok(shown[i].text), B = tok(shown[j].text);
    if (A.size < 2 || B.size < 2) continue;
    let n = 0; for (const w of A) if (B.has(w)) n++;
    const c = n / Math.min(A.size, B.size);
    if (c >= MIN) pairs.push({ a: i, b: j, score: +c.toFixed(2) });
  }
  if (pairs.length) { routes.push({ id: r.id, name: r.name, watchOutIsString: typeof r.watch_out === "string", shown, pairs }); nPairs += pairs.length; }
}
console.log(`rows read: ${rows.length}; routes with a candidate pair: ${routes.length}; pairs: ${nPairs} (threshold ${MIN})`);
if (OUT) { writeFileSync(OUT, JSON.stringify(routes, null, 1)); console.log("wrote", OUT); }
