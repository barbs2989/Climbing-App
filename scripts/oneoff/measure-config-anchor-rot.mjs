// IS ANY VITE CONFIG'S IN-MEMORY ANCHOR ALREADY LOST?
//
// The browser probes do not rewrite the app themselves — a shared `scripts/*.config.mjs` does it,
// with `code.split(ANCHOR).length - 1 !== 1` throwing ANCHOR LOST. So one rotted anchor kills every
// probe that config serves, and CLAUDE.md already records that the scaffold is a STRING no static
// gate reads.
//
// WHY THIS RUNS WITHOUT A BROWSER, WHICH IS THE POINT. Answering it by running the probes needs a
// dev server and Chrome per probe, and this repo records a probe reporting MISSED at load ~450 and
// CAUGHT at ~260 on the same commit. Whether an anchor still occurs in the source is DETERMINISTIC
// and load-independent, so it can be answered honestly on a busy box while a browser sweep cannot.
//
// THE CONTROLS ARE THE LOAD-BEARING HALF. Most of these configs are exercised by a wired guard that
// runs in CI, so their anchors are proven green on every PR. If this script reports one of THOSE as
// lost, the instrument is wrong and nothing it says about the unexercised ones can be believed —
// the standard probe-camp-elev-control.mjs sets, where the expected output is "a plausible answer",
// which is exactly what a broken scan prints. It has already earned that twice; see below.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];
const src = new Map();
for (const f of APP) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.error(`FAIL - ${f} missing; a broken scan, not a clean tree.`); process.exit(1); }
  src.set(f, fs.readFileSync(p, "utf8"));
}

/* THREE SEPARATE THINGS BROKE THE FIRST TWO VERSIONS OF THIS SCAN, AND ALL THREE PRINTED A
   PLAUSIBLE NUMBER RATHER THAN AN ERROR. They are recorded because each is a different way a
   text scan lies about the source it is reading:

   1. THE ANCHOR CONTAINS A SEMICOLON. Bounding a declaration at the first raw `;` cuts INSIDE
      the string — `const ANCHOR = "  const prevUidRef=useRef(uid);";` truncates to an
      unterminated quote, so two CONTROL configs read as UNPARSED, and journey's single-quoted
      anchor yielded the `"true"` nested inside it. An anchor is a fragment of JavaScript; of
      course it contains punctuation.
   2. A COMMENT INSIDE THE DECLARATION CONTRIBUTES LITERALS. zero-state's ANCHORS array explains
      itself between the pairs, and one of those comments contains `"a brand-new account"` in
      quotes — which shifted the from/to parity, so the TO halves (a replacement, correctly
      absent from the app) were counted and reported LOST.
   3. COUNTING ACROSS EVERY APP FILE ANSWERS THE WRONG QUESTION. `code.split(ANCHOR)` runs on the
      ONE file the transform admits, so an anchor occurring twice elsewhere is not ambiguous to
      the config at all. Scoped to the files the config's own `id.endsWith` names.

   The scanner below is comment-aware and depth-aware for that reason, and every anchor shape in
   the tree is read out of the declaration rather than assumed: a plain string, an array of
   [from, to] pairs, and an object of component -> anchor. */
function walk(text, from) {
  // Returns { end, lits } for one declaration starting at `from` (the first char after `=`).
  // Literals carry their bracket depth and whether they are an object VALUE (followed a colon),
  // which is what lets the three shapes be told apart without a parser.
  const lits = [];
  let d = 0, i = from, lastColonDepth = -1;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (c === "/" && text[i + 1] === "*") { const e = text.indexOf("*/", i + 2); i = e < 0 ? text.length : e + 1; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let s = "", j = i + 1, ok = false;
      for (; j < text.length; j++) {
        const k = text[j];
        if (k === "\\") { const n = text[j + 1]; s += n === "n" ? "\n" : n === "t" ? "\t" : n; j++; continue; }
        if (k === c) { ok = true; break; }
        if (k === "\n" && c !== "`") break;
        s += k;
      }
      if (!ok) return { end: i, lits };            // unterminated: stop rather than guess
      lits.push({ value: s, depth: d, isValue: lastColonDepth === d });
      i = j; continue;
    }
    if (c === "[" || c === "{" || c === "(") { d++; continue; }
    if (c === "]" || c === "}" || c === ")") { d--; if (d < 0) return { end: i, lits }; continue; }
    if (c === ":") { lastColonDepth = d; continue; }
    if (c === "," && d <= 1) { lastColonDepth = -1; continue; }
    if (c === ";" && d === 0) return { end: i, lits };
  }
  return { end: i, lits };
}

/* AND A FOURTH, WHICH IS THE SAME TOO-NARROW-PROXY FAILURE A THIRD TIME AND THE REASON DISCOVERY
   IS NOW BEHAVIOURAL. Matching a declaration whose NAME carries ANCHOR reported
   `policy-notice.config.mjs` as "declares no anchor" — it calls its anchor `GATE`, and it splits
   the app on it exactly like the other eleven. What makes a string an anchor is that
   `code.split()` / `code.replace()` is handed it, not what it is called; the same argument
   check:overlay-discovery already makes for discovering overlays by behaviour rather than by a
   name shape. Both rules are used, because `ANCHORS` and `ROUTE_DETAIL_ANCHORS` reach the split
   through a destructuring `for` and an index and so are invisible to the use rule.

   The structural half matters more than this one instance: a config that rewrites the app and
   yields NO anchor now FAILS rather than printing a reassuring "rewrites nothing" line, which is
   what let this sit unnoticed through two earlier runs. */
const DECL = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*/g;
const NAME_RULE = /ANCHORS?/;
const USE = /(?:code|out)\.(?:split|replace)\(\s*([A-Za-z0-9_]+)|buildOpener\(\s*(?:code|out)\s*,\s*([A-Za-z0-9_]+)/g;
// Which app file does this config's transform actually admit? `code.split(ANCHOR)` only ever
// runs on that file, so it is the only file an occurrence count is a statement about.
const TARGET = /id\.endsWith\(\s*["'`]\/([A-Za-z0-9_]+\.jsx)["'`]\s*\)/g;

function anchorsFrom(text) {
  const out = [];
  USE.lastIndex = 0;
  const used = new Set([...text.matchAll(USE)].map((u) => u[1] || u[2]).filter(Boolean));
  DECL.lastIndex = 0;
  let m;
  while ((m = DECL.exec(text))) {
    if (!NAME_RULE.test(m[1]) && !used.has(m[1])) continue;
    const start = m.index + m[0].length;
    const { lits, end } = walk(text, start);
    const raw = text.slice(start, end);
    const head = text.slice(start).trimStart()[0];
    let vals;
    if (head === "[") {
      const nested = lits.some((l) => l.depth >= 2);
      if (nested) {
        // An array of [from, to] pairs: the FROM is the FIRST literal inside each nested bracket.
        // The TO is the replacement and correctly does NOT occur in the app, so counting it would
        // manufacture LOSTs — which is exactly what the parity bug above did.
        vals = [];
        let inPair = false;
        for (const l of lits) { if (l.depth >= 2) { if (!inPair) { vals.push(l.value); inPair = true; } } else inPair = false; }
      } else vals = lits.filter((l) => l.depth === 1).map((l) => l.value);
    } else if (head === "{") {
      vals = lits.filter((l) => l.isValue).map((l) => l.value);
    } else {
      vals = lits.length ? [lits[0].value] : [];
    }
    out.push({ name: m[1], vals, raw });
  }
  // A used name may be an INDIRECTION into a collection this scan already read —
  // `const anchor = ROUTE_DETAIL_ANCHORS[component]` in the scaffold. That is resolved, not
  // unparsed, and calling it unparsed fails a control on the strength of a lookup.
  const known = out.filter((a) => a.vals.length).map((a) => a.name);
  return out.filter((a) => a.vals.length || !known.some((k) => new RegExp(`\\b${k}\\b`).test(a.raw)));
}

// Which configs does a WIRED guard use? Those are the controls. Derived from the tree rather than
// listed here, so a config that gains or loses a guard reclassifies itself.
const guardSrc = fs.readdirSync(path.join(ROOT, "scripts"))
  .filter((f) => f.startsWith("check-") && f.endsWith(".mjs"))
  .map((f) => fs.readFileSync(path.join(ROOT, "scripts", f), "utf8")).join("\n");

const files = fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => f.endsWith(".config.mjs"))
  .map((f) => ({ label: f, abs: path.join(ROOT, "scripts", f) }));
// The shared scaffold holds anchors of its own and is the file CLAUDE.md names as the STRING no
// static gate reads, so it is scanned alongside the configs rather than left out for not matching
// the filename pattern.
files.push({ label: "lib/overlay-scaffold.mjs", abs: path.join(ROOT, "scripts", "lib", "overlay-scaffold.mjs") });
if (files.length < 5) { console.error(`FAIL - only ${files.length} config files found; the walk is broken.`); process.exit(1); }

let totalAnchors = 0, lost = 0, ambiguous = 0, unparsed = 0;
const rows = [];

for (const { label, abs } of files) {
  const text = fs.readFileSync(abs, "utf8");
  const exercised = guardSrc.includes(path.basename(label)) || label.startsWith("lib/");
  TARGET.lastIndex = 0;
  const targets = [...text.matchAll(TARGET)].map((t) => t[1]).filter((t) => src.has(t));
  const scope = targets.length ? [...new Set(targets)] : APP;
  const found = [];
  for (const { name, vals } of anchorsFrom(text)) {
    if (!vals.length) { unparsed++; found.push({ name, status: "UNPARSED (no literal found in the declaration)" }); continue; }
    for (const val of vals) {
      if (!val || val.length < 4) { unparsed++; found.push({ name, status: "UNPARSED (too short to be an anchor)" }); continue; }
      totalAnchors++;
      let best = 0, where = "";
      for (const f of scope) { const n = src.get(f).split(val).length - 1; if (n > best) { best = n; where = f; } }
      let status = "ok";
      if (best === 0) { status = "LOST"; lost++; }
      else if (best > 1) { status = `AMBIGUOUS (${best})`; ambiguous++; }
      found.push({ name, status, n: best, where, val });
    }
  }
  // FAIL CLOSED: a config that rewrites the app and yields no anchor is a hole in this scan, not
  // a config that rewrites nothing. Printing the reassuring line is how `GATE` went unseen twice.
  const rewrites = /(?:code|out)\.(?:split|replace)\(/.test(text);
  rows.push({ label, exercised, found, rewrites, scope: targets.length ? scope : null });
}

const blind = rows.filter((r) => r.rewrites && !r.found.length);

const say = (r) => {
  const tag = r.exercised ? "CONTROL (a wired guard runs it)" : "NOT EXERCISED BY ANY GUARD";
  const sc = r.scope ? `  [rewrites ${r.scope.join(", ")}]` : "  [names no target file — counted across all three]";
  console.log(`\n${r.label}  — ${tag}${sc}`);
  if (!r.found.length) { console.log(r.rewrites ? "  ** SPLITS THE APP AND THIS SCAN FOUND NO ANCHOR IN IT — a hole here, not a config that rewrites nothing" : "   (rewrites nothing)"); return; }
  for (const a of r.found) {
    const mark = a.status === "ok" ? "  ok  " : "  ** ";
    console.log(`${mark}${a.name}: ${a.status}${a.where ? `  [${a.n}x in ${a.where}]` : ""}`);
    if (a.status !== "ok" && a.val) console.log(`        ${JSON.stringify(a.val.slice(0, 110))}`);
  }
};

console.log("CONTROLS FIRST — if any of these is LOST the instrument is wrong, not the tree.");
rows.filter((r) => r.exercised).forEach(say);
console.log("\n\nTHE ONES NOTHING RUNS:");
rows.filter((r) => !r.exercised).forEach(say);

const ctl = rows.filter((r) => r.exercised).flatMap((r) => r.found);
const ctlBad = ctl.filter((a) => a.status !== "ok").length;
console.log(`\n\n${files.length} config files, ${totalAnchors} anchors parsed, ${unparsed} unparsed.`);
console.log(`LOST ${lost} · AMBIGUOUS ${ambiguous}`);
if (!totalAnchors) { console.error("FAIL - no anchor parsed at all; the declaration pattern is broken, not the configs."); process.exit(1); }
if (blind.length) { console.error(`\nFAIL - ${blind.length} config(s) split the app and yielded no anchor to this scan: ${blind.map((r) => r.label).join(", ")}. That is a hole in the instrument.`); process.exit(1); }
if (ctlBad) { console.error(`\nFAIL - ${ctlBad} CONTROL anchor(s) did not resolve cleanly. A guard in CI exercises those, so the SCAN is wrong. Do not act on the rest of this output.`); process.exit(1); }
console.log(`controls: ${ctl.length} anchors, all resolving exactly once — so a LOST or AMBIGUOUS above is a statement about the tree rather than about this script.`);
