// Washington's research round on routes still unsettled (its files use the first, flat layout).
//
//   node scripts/oneoff/glacier-travel-wa-research.mjs --in      # write wa-research/research-in-*.json
//   node scripts/oneoff/glacier-travel-wa-research.mjs --fold    # fold wa-research/research-out-*.json into final.json
//
// The fold follows glacier-travel-decide.mjs's research rule: it settles only a fact that is still "unsure",
// and only on an answer whose basis is "web" (a page the researcher read). It never changes a settled fact.
// Then load with: node scripts/oneoff/load-glacier-travel.mjs   (the original Washington load; re-runnable)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = path.join(ROOT, "research-data", "glacier-travel-2026-11-23"), out = path.join(dir, "wa-research");
const finalPath = path.join(dir, "final.json");
const fin = JSON.parse(fs.readFileSync(finalPath, "utf8"));
const VALS = new Set(["yes", "no", "unsure"]);

if (process.argv.includes("--in")) {
  const inn = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => /^in-\d+\.json$/.test(f))) JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).forEach((r) => inn.set(r.id, r));
  const open = fin.filter((r) => r.glacier === "unsure" || r.snowInSeason === "unsure");
  const missing = open.filter((r) => !inn.has(r.id));
  if (missing.length) throw new Error("no input text for " + missing.map((r) => r.id).join(", "));
  fs.mkdirSync(out, { recursive: true });
  const PER = 24, N = Math.ceil(open.length / PER), per = Math.ceil(open.length / N);
  for (let i = 0; i < N; i++) fs.writeFileSync(path.join(out, `research-in-${i + 1}.json`), JSON.stringify(open.slice(i * per, (i + 1) * per).map((r) => Object.assign({}, inn.get(r.id), { stillUnsure: [r.glacier === "unsure" ? "glacier" : null, r.snowInSeason === "unsure" ? "snowInSeason" : null].filter(Boolean), earlierWhy: r.why })), null, 1));
  console.log(`wa: ${open.length} routes still unsettled, written to ${N} research files of about ${per}`);
} else if (process.argv.includes("--fold")) {
  const res = new Map();
  for (const f of fs.readdirSync(out).filter((f) => /^research-out-\d+\.json$/.test(f))) for (const r of JSON.parse(fs.readFileSync(path.join(out, f), "utf8"))) {
    if (!VALS.has(r.glacier) || !VALS.has(r.snowInSeason)) throw new Error(f + ": " + r.id + " has a bad value");
    res.set(r.id, r);
  }
  // Thin "no glacier" answers held at unsure by hand (2026-11-23): the answer moves toward the warning.
  // Forbidden East Ridge: the researcher rated it moderate and the route's own text names crevassed ground on
  // the descent. Bonanza Cascadian: one account, and its descent walks on the glacier. Chopping Block (two
  // routes): a single 2008 report, and no source says the approach stays off the Terror Glacier.
  const HOLD_GLACIER = new Set(["wa_forbidden_peak_east_ridge", "wa_bonanza_peak_cascadian_route", "wa_the_chopping_block_northeast_ridge", "wa_the_chopping_block_northwest_route"]);
  let g = 0, s = 0;
  for (const r of fin) {
    const q = res.get(r.id); if (!q || q.basis !== "web") continue;
    let moved = false;
    if (r.glacier === "unsure" && q.glacier !== "unsure" && !(q.glacier === "no" && HOLD_GLACIER.has(r.id))) { r.glacier = q.glacier; g++; moved = true; }
    if (r.snowInSeason === "unsure" && q.snowInSeason !== "unsure") { r.snowInSeason = q.snowInSeason; s++; moved = true; }
    if (r.glacier === "yes") r.snowInSeason = "yes";
    if (moved) r.research2 = q.glacier + "/" + q.snowInSeason + ": " + q.why;
  }
  fs.writeFileSync(finalPath, JSON.stringify(fin, null, 1));
  const t = (k) => fin.reduce((m, r) => { m[r[k]] = (m[r[k]] || 0) + 1; return m; }, {});
  console.log(`wa: research answers read ${res.size}; settled glacier on ${g}, snow on ${s}`);
  console.log(`  FINAL glacier ${JSON.stringify(t("glacier"))}; snow ${JSON.stringify(t("snowInSeason"))}`);
} else { console.error("needs --in or --fold"); process.exit(2); }
