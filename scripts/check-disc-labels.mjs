// check:disc-labels — one spelling per discipline, everywhere.
//
// There were eleven separate discipline lists across the app and no two were
// identical. The same discipline rendered three different ways depending on
// which screen you were on: "Mountaineering" in the signup list, "Mtn" in the
// guides filter, "Mtn'ing" in a third chip row. Bouldering was "Bouldering" or
// "Boulder"; scrambling was "Scrambling" or "Scramble".
//
// Nothing linked those lists, so each one was written by hand and drifted on
// its own. lib/discLabels.js is now the single source; this fails the build if
// a label is hand-written back in with a spelling that contradicts it.
//
// Scope note: this checks SPELLING only. It deliberately does not check which
// disciplines a list offers — those memberships differ on purpose (the Ranks
// screen collapses sport+trad into one scoring bucket, the signup list offers
// `aid`, the route filters don't), and flattening them would change behaviour.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DISC_LABELS, DISC_SHORT } from "../lib/discLabels.js";
import { assertCovered } from "./lib/guard-sources.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SKIP = new Set(["node_modules", "dist", ".git", ".claude", "catalog", "scripts", "supabase", "research", "audits"]);
const EXEMPT = "disc-label-exempt"; // marks a label that means something OTHER than the discipline's name

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue; // a dot entry is never app source,
    // and a guard temp file that vanishes between this readdir and the stat below would
    // otherwise kill this walk — the guards now run concurrently.
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(p);
  }
  return out;
};

const KEYS = Object.keys(DISC_LABELS);
const allowed = (k) => [DISC_LABELS[k], DISC_SHORT[k]].filter(Boolean);

// Two shapes carry a discipline label in this codebase:
//   ["mountaineering", "Mtn"]   (filter/chip lists)
//   mountaineering: "Mtn"       (label maps)
// Each shape is matched once per quote style, and the capture excludes only the
// QUOTE THAT OPENED IT. A single `[^"']+` class instead truncates a label at an
// apostrophe: "Mtn'ing" captures as "Mtn", which is a legal short form, so the
// exact third spelling this check exists to catch would sail straight through.
// (It did — caught by injecting it.)
const PATTERNS = (k) => [
  new RegExp(`\\[\\s*["']${k}["']\\s*,\\s*"([^"]+)"`, "g"),
  new RegExp(`\\[\\s*["']${k}["']\\s*,\\s*'([^']+)'`, "g"),
  new RegExp(`(?:^|[{,\\s])${k}\\s*:\\s*"([^"]+)"`, "g"),
  new RegExp(`(?:^|[{,\\s])${k}\\s*:\\s*'([^']+)'`, "g"),
];

const offenders = [];
for (const f of assertCovered(walk(ROOT), ROOT, "check:disc-labels")) {
  if (f.endsWith("/lib/discLabels.js")) continue; // the source of truth itself
  const src = readFileSync(f, "utf8");
  for (const k of KEYS) {
    for (const re of PATTERNS(k)) {
      for (const m of src.matchAll(re)) {
        const label = m[1];
        if (allowed(k).includes(label)) continue;
        // Only single capitalised words are display labels. This deliberately
        // excludes three things that are keyed by discipline but are not its name:
        //   - other discipline KEYS, e.g. DISC_TO_REPLY_POOL's {sport:"rock"} —
        //     lowercase, so a mapping between disciplines, not a spelling of one
        //   - prose keyed by discipline, e.g. {sport:"Send hard, clip smart."}
        //   - combined-category labels, e.g. "Ice & Mixed", "Scrambling / hiking",
        //     which name a BUCKET of disciplines rather than this one
        // Without this the check fires 64 times on a clean tree, which is worse
        // than no check: a guard everyone learns to ignore is a guard you don't have.
        if (!/^[A-Z][A-Za-z'’-]{0,20}$/.test(label)) continue;
        // A label is exempt when it means something other than the discipline's
        // name — e.g. `rock: "Sport & Trad"` is a collapsed scoring bucket.
        const around = src.slice(m.index, m.index + 220);
        if (around.includes(EXEMPT)) continue;
        const line = src.slice(0, m.index).split("\n").length;
        offenders.push({ file: f.slice(ROOT.length), line, key: k, label });
      }
    }
  }
}

if (offenders.length) {
  console.error(`\ncheck:disc-labels FAILED — ${offenders.length} discipline label(s) contradict lib/discLabels.js:\n`);
  for (const o of offenders) {
    console.error(`  - ${o.file}:${o.line}  ${o.key} spelled "${o.label}"`);
    console.error(`      canonical: ${allowed(o.key).map((x) => `"${x}"`).join(" or ")}`);
  }
  console.error("\nImport DISC_LABELS / DISC_SHORT from lib/discLabels.js instead of retyping the string.");
  console.error(`If the label deliberately means something else, mark it /*${EXEMPT}: why*/.`);
  process.exit(1);
}

console.log(`  ok    ${KEYS.length} disciplines, one spelling each (+${Object.keys(DISC_SHORT).length} short forms)`);
console.log("\ndiscipline labels: ok");
