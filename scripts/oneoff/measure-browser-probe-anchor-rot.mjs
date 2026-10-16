// Do the browser probes still assert against text the app renders?
//
// WHY THIS IS WORTH ASKING. #1678 swept the 77 static one-offs and #1695 the 202 DB-reading
// ones. Both found the same class and NOT ONE was an app defect: STALE INSTRUMENTS that read
// like live defects. #1711's worst case anchored on a heading #1625 had deliberately REMOVED,
// so acting on its failure would have argued for restoring a false claim. The ~79 browser
// probes are the un-swept third of the corpus, and they cannot be swept on this box --
// quiet-box.mjs refuses above 6x cores and this machine routinely runs far past that.
//
// But a browser probe's ANCHORS are literal strings, and whether the app still renders them
// is answerable STATICALLY. No browser, no database, no dev server: immune to load, so it can
// be answered honestly on a box too busy for a walk to be evidence. That is the same argument
// measure-config-anchor-rot.mjs makes for the vite-config anchors.
//
// IT IS PARSED WITH BABEL, AND THREE REGEX VERSIONS DIED FIRST -- each reporting a small,
// reassuring number while reaching a third of the corpus. The question "which local holds
// rendered text?" is a dataflow question, and the corpus answers it in every shape there is:
//     const t = document.body.innerText                     a plain declaration
//     const txt = await page.innerText("body")              a driver call
//     const sec = await page.evaluate(() => {...el.innerText...})   twenty lines deep
//     const o = { list: await page.evaluate(() => document.body.innerText) }   a property
//     o.detail = await page.evaluate(...)                   a member assignment
//     const detail = o.detail                               an alias
// A look-back window cannot cross a function body; a forward scan is swallowed by the OUTER
// declaration (the lazy body runs from `const o =` to the inner innerText, captures `o`, and
// moves past `const t` so it is never seen). So text-bearing bindings are TAINTED to a
// fixpoint over the AST instead, which is the same conclusion check:profile-claims records.
//
// WHAT THIS IS NOT. It is a READING LIST, not a defect count, and the output says so. A phrase
// can be absent from the app source and present on screen for three reasons that are not rot:
//   - it is rendered from DATA (a catalog row: a peak name, a route name, a grade);
//   - it is BUILT by concatenation, so no contiguous literal exists ("No " + n + " yet");
//   - it is CSS-transformed, since innerText returns the uppercased text (this is why the
//     match is always case-insensitive here -- a false MISSING is the noisy direction).
// So a missing PROSE phrase of several words is the strong signal; a missing proper noun or
// short token is usually one of the three above.
//
// RESULT 2026-09-10, and it is a NEGATIVE one: 41 of 79 probes measured, 121 assertion sites,
// 163 literal runs -- and ZERO anchors that a probe needs and the app no longer renders. The
// three sites that cannot match were all READ, and none is rot:
//   - probe-forecast-onscreen-in-both-units  "° · Low"  -- CONCATENATION. The app writes
//     `"Feels like: High " + uTemp(hi) + " · Low "`, so the degree comes from a function and
//     that literal never exists contiguously in source.
//   - verify-guide-application-queue         "Probe Mutual" -- the probe's OWN fixture name,
//     correctly absent from the app.
//   - probe-one-age-for-one-date             "verified report" -- a regression guard on a
//     defect string that was REMOVED, so being unmatchable is the point of it.
// PROVEN NON-VACUOUS rather than trusted, because "0 findings" is also what a broken scan
// prints: a synthetic probe asserting a phrase the app does not contain is reported as
// want-TRUE and named, then deleted. Re-do that before believing a future zero.
//
// COVERAGE IS 41 OF 79 AND THE REST ARE NOT CLEAN, so do not quote the zero as a statement
// about the whole corpus. `--why=<file>` says what the extractor saw in any one of them.
//
// THE 38 ARE CLASSIFIED RATHER THAN DESCRIBED, and that is a correction to this header. It
// used to say "some asserts on accessible NAMES (aria-label), which this does not read" --
// true, and an invitation to widen the extractor to cover them. MEASURE THE CLASS BEFORE
// BUILDING THE DETECTOR: that widening reaches 3 probes and 6 anchors. 15 more read
// aria-label GENERICALLY (query every [aria-label], then dump or count) so they carry no
// anchor to rot, and 20 never touch it. A detector for a class of three is the thing this
// repo keeps refusing to build, so the report NAMES the three instead -- six anchors is
// cheaper to check by hand, which is what was done: `aria-label="Primary"`, `"Help"` and
// `"Photo viewer"` are verbatim in source; the crew sub-tab bar builds `label` or
// `label + ", " + count`, both matched by its probe's `^(Crews|Friends|Groups|Requests)(,|$)`;
// and the waypoint row's `"Show " + name + " on the map"` sits inside a clickable() spread,
// which supplies the role its selector also demands. ZERO rotted, 2026-09-10.
//
//   node scripts/oneoff/measure-browser-probe-anchor-rot.mjs
//   node scripts/oneoff/measure-browser-probe-anchor-rot.mjs --all
//   node scripts/oneoff/measure-browser-probe-anchor-rot.mjs --why=<probe.mjs>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { appSources } from "../lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ALL = process.argv.includes("--all");
const WHY = (process.argv.find((a) => a.startsWith("--why=")) || "").slice(6);
const GUARD = "measure-browser-probe-anchor-rot";

// ---------------------------------------------------------------- the app, as one haystack
// appSources() is the three required files + main.jsx + lib/*, and that is NOT everything a
// climber can read: AppErrorBoundary.jsx and EnrichmentPanels.jsx are root-level components
// outside it, and index.html carries the boot shell's own nav copy. Omitting them made this
// script's first run report three phrases MISSING that the app plainly renders -- "This screen
// hit a bug" lives in AppErrorBoundary.jsx. A haystack decides what a scan can see, which is
// the same hole check:contrib-fields records for EnrichmentPanels.jsx specifically.
const appFiles = [
  ...new Set([
    ...appSources(ROOT, GUARD),
    ...fs.readdirSync(ROOT).filter((f) => f.endsWith(".jsx")),
    ...(fs.existsSync(path.join(ROOT, "index.html")) ? ["index.html"] : []),
  ]),
];
// This app writes CURLY apostrophes and the probes write straight ones, so a raw comparison
// reports correct anchors as rotted. CLAUDE.md records the same mismatch silently disabling
// check:outage's `says-broken` pattern for months -- every YES it printed came from a
// different alternative. Normalise both sides rather than rediscovering it here.
const norm = (s) =>
  s.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-");

const appText = norm(appFiles.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n"));
// Fails closed: a haystack this small means appSources handed back almost nothing, and every
// phrase would then report MISSING -- a clean-looking sweep that is a statement about the
// scan rather than about the probes.
if (appText.length < 500000) {
  console.error(`FAIL: read only ${appText.length} chars of app source across ${appFiles.length} files.`);
  console.error("Every phrase would report MISSING. This run would prove nothing.");
  process.exit(1);
}

// ------------------------------------------------------------------- phrase extraction
const TEXT_PROPS = new Set(["innerText", "textContent"]);
const DRIVER = new Set(["innerText", "textContent", "allInnerTexts", "allTextContents"]);
const EVAL = new Set(["evaluate", "evaluateHandle", "$eval", "$$eval"]);
// String operations that carry text through unchanged.
const CARRY = new Set(["trim", "replace", "toLowerCase", "toUpperCase", "slice", "join", "normalize", "split", "concat", "filter", "map", "find"]);

// Split a regex body on TOP-LEVEL alternation only -- '|' inside [] or () belongs to a term.
function altSplit(body) {
  const out = [];
  let cur = "", depth = 0, cls = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\") { cur += c + (body[i + 1] || ""); i++; continue; }
    if (cls) { if (c === "]") cls = false; cur += c; continue; }
    if (c === "[") { cls = true; cur += c; continue; }
    if (c === "(") { depth++; cur += c; continue; }
    if (c === ")") { depth--; cur += c; continue; }
    if (c === "|" && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

// The LITERAL RUNS inside one alternative. A term is rarely wholly literal -- the corpus
// writes /High (-?\d+)° · Low (-?\d+)°/ -- and the literal stretches between the patterns
// ("° · Low ") are anchors just as much as a bare phrase is. They are CONJUNCTIVE: every
// run has to be on screen for that alternative to match, which is why the caller treats
// them as one branch rather than as independent phrases.
function literalRuns(term, min = 4) {
  const runs = [];
  let cur = "";
  const flush = () => { if (cur.trim().length >= min) runs.push(cur.trim()); cur = ""; };
  for (let i = 0; i < term.length; i++) {
    const c = term[i];
    if (c === "\\") {
      const n = term[i + 1];
      i++;
      // A class escape (\d, \w, \s, \b...) is a pattern; a punctuation escape is a character.
      if (!n || /[dwsSWDbBnrtvfuxkpP0-9]/.test(n)) flush();
      else cur += n;
      continue;
    }
    if (c === "[") { // skip the whole class, it is not literal
      flush();
      while (i < term.length && term[i] !== "]") { if (term[i] === "\\") i++; i++; }
      continue;
    }
    if (c === "{") {
      // A {n,m} quantifier: its CONTENTS are not text. Skipping only the brace leaves "6,30"
      // behind as a literal run, which is how this script first reported a live anchor as
      // rotted -- a finding manufactured by its own tokeniser.
      cur = cur.slice(0, -1); // the quantifier binds the preceding character
      flush();
      while (i < term.length && term[i] !== "}") i++;
      continue;
    }
    if ("()}|^$".includes(c)) { flush(); continue; }
    if ("*+?".includes(c)) {
      // The quantifier binds the PRECEDING character, so that character is not guaranteed.
      cur = cur.slice(0, -1);
      flush();
      continue;
    }
    if (c === ".") { flush(); continue; } // wildcard: ends the run rather than matching a dot
    cur += c;
  }
  flush();
  return runs;
}

const rootName = (node) => {
  let n = node;
  while (n && n.type === "MemberExpression") n = n.object;
  return n && n.type === "Identifier" ? n.name : null;
};

// Does this expression evaluate to text the app rendered? `tainted` is the set of bindings
// already known to, which is what lets the fixpoint below follow aliases and properties.
function isTexty(node, tainted, depth = 0) {
  if (!node || depth > 12) return false;
  switch (node.type) {
    case "AwaitExpression":
      return isTexty(node.argument, tainted, depth + 1);
    case "LogicalExpression":
      return isTexty(node.left, tainted, depth + 1) || isTexty(node.right, tainted, depth + 1);
    case "ConditionalExpression":
      return isTexty(node.consequent, tainted, depth + 1) || isTexty(node.alternate, tainted, depth + 1);
    case "TemplateLiteral":
      return node.expressions.some((e) => isTexty(e, tainted, depth + 1));
    case "Identifier":
      return tainted.has(node.name);
    case "ObjectExpression":
      return node.properties.some((p) => p.value && isTexty(p.value, tainted, depth + 1));
    case "ArrayExpression":
      return node.elements.some((e) => e && isTexty(e, tainted, depth + 1));
    case "MemberExpression": {
      if (!node.computed && node.property.type === "Identifier" && TEXT_PROPS.has(node.property.name)) return true;
      return isTexty(node.object, tainted, depth + 1);
    }
    case "CallExpression": {
      const c = node.callee;
      if (c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier") {
        const p = c.property.name;
        // page.innerText("body"), locator.textContent()
        if (DRIVER.has(p)) return true;
        // page.evaluate(cb) -- texty when the callback reads rendered text.
        if (EVAL.has(p)) {
          let found = false;
          const scan = (n) => {
            if (!n || typeof n !== "object" || found) return;
            if (n.type === "MemberExpression" && !n.computed && n.property && TEXT_PROPS.has(n.property.name)) { found = true; return; }
            for (const k of Object.keys(n)) {
              const v = n[k];
              if (Array.isArray(v)) v.forEach(scan);
              else if (v && typeof v.type === "string") scan(v);
            }
          };
          node.arguments.forEach(scan);
          if (found) return true;
        }
        // "".trim() and friends carry text through.
        if (CARRY.has(p) && isTexty(c.object, tainted, depth + 1)) return true;
      }
      return false;
    }
    default:
      return false;
  }
}

// Every binding that ends up holding rendered text, to a FIXPOINT -- an alias
// (`const detail = o.detail`) only becomes visible once `o` is known, which one pass
// in source order cannot guarantee.
function taintedBindings(ast) {
  const tainted = new Set();
  for (let round = 0; round < 6; round++) {
    const before = tainted.size;
    traverse(ast, {
      VariableDeclarator(p) {
        if (p.node.id.type === "Identifier" && isTexty(p.node.init, tainted)) tainted.add(p.node.id.name);
      },
      AssignmentExpression(p) {
        if (!isTexty(p.node.right, tainted)) return;
        // `o.detail = <text>` taints o, so `o.detail` and any alias of it read as text.
        const n = p.node.left.type === "Identifier" ? p.node.left.name : rootName(p.node.left);
        if (n) tainted.add(n);
      },
    });
    if (tainted.size === before) break;
  }
  return tainted;
}

// Which way is the assertion pointing? A want-TRUE anchor that has left the app is the
// stale probe that will FAIL and read as a live defect. A want-FALSE anchor missing from
// the app is fine either way -- the probe is asserting the phrase is absent.
function directionOf(p, ifPlain, ifNegated) {
  let cur = p, negated = false;
  while (cur.parentPath && cur.parentPath.isUnaryExpression && cur.parentPath.isUnaryExpression({ operator: "!" })) {
    negated = !negated;
    cur = cur.parentPath;
  }
  let up = cur;
  while (up.parentPath && (up.parentPath.isLogicalExpression() || up.parentPath.isParenthesizedExpression?.())) up = up.parentPath;
  if (up.parentPath && up.parentPath.isIfStatement() && up.parentPath.node.test === up.node) {
    return negated ? "want-TRUE" : "want-FALSE";
  }
  if (cur.parentPath && cur.parentPath.isVariableDeclarator() && cur.parentPath.node.id.type === "Identifier") {
    const name = cur.parentPath.node.id.name;
    const plain = ifPlain.has(name), neg = ifNegated.has(name);
    if (neg && !plain) return negated ? "want-FALSE" : "want-TRUE";
    if (plain && !neg) return negated ? "want-TRUE" : "want-FALSE";
  }
  return "unknown";
}

function extract(src) {
  let ast;
  try {
    ast = parse(src, { sourceType: "module", errorRecovery: true, plugins: ["jsx"] });
  } catch {
    return null; // did not parse -- reported separately, never as clean
  }
  const tainted = taintedBindings(ast);

  // How each boolean local is later tested, so a named assertion's direction is readable.
  const ifPlain = new Set(), ifNegated = new Set();
  traverse(ast, {
    IfStatement(p) {
      const scan = (n) => {
        if (!n) return;
        if (n.type === "Identifier") ifPlain.add(n.name);
        else if (n.type === "UnaryExpression" && n.operator === "!" && n.argument.type === "Identifier") ifNegated.add(n.argument.name);
        else if (n.type === "LogicalExpression") { scan(n.left); scan(n.right); }
      };
      scan(p.node.test);
    },
  });

  const out = [];
  // Phrases are grouped BY ASSERTION SITE, because an alternation's terms are not independent
  // anchors: /PAIRS WELL WITH|SIMILAR ROUTES/ still matches while one branch is dead. Only a
  // site whose EVERY term has left the app is an anchor that will fail. A single dead branch
  // is the weaker class check:outage records, where `offline library` appeared zero times in
  // the app and could therefore only ever report a false miss.
  // An assertion SITE is a set of BRANCHES (a regex's top-level alternatives; a string test
  // has one). A branch matches only if EVERY literal run in it is on screen -- runs are
  // CONJUNCTIVE. The anchor is dead only when NO branch can match.
  let site = 0;
  const addRegex = (pattern, dir, via) => {
    const branches = [];
    for (const term of altSplit(pattern)) {
      const runs = literalRuns(term);
      if (runs.length) branches.push(runs);
    }
    if (branches.length) out.push({ group: ++site, dir, via, branches });
  };

  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== "MemberExpression" || c.computed || c.property.type !== "Identifier") return;
      const method = c.property.name;
      const args = p.node.arguments;

      if (method === "test" && c.object.type === "RegExpLiteral" && args[0] && isTexty(args[0], tainted)) {
        addRegex(c.object.pattern, directionOf(p, ifPlain, ifNegated), "regex.test");
        return;
      }
      if ((method === "match" || method === "search" || method === "split") &&
          args[0] && args[0].type === "RegExpLiteral" && isTexty(c.object, tainted)) {
        addRegex(args[0].pattern, "unknown", "text." + method);
        return;
      }
      if (["includes", "startsWith", "endsWith", "indexOf", "lastIndexOf"].includes(method) &&
          args[0] && args[0].type === "StringLiteral" && isTexty(c.object, tainted)) {
        const v = args[0].value.trim();
        if (v.length >= 4) out.push({ group: ++site, dir: directionOf(p, ifPlain, ifNegated), via: "text." + method, branches: [[v]] });
      }
    },
  });

  return out;
}

// ------------------------------------------------------------------- SELF-TEST
// The expected output here is "almost everything is present", which is also exactly what a
// broken extractor prints. So it is exercised first against a probe whose anchors are known,
// and refuses to report on the corpus unless it reproduces them -- including their DIRECTION,
// without which every want-TRUE verdict below is noise.
const SELF_FILE = "scripts/oneoff/probe-colorado-14ers-ceiling-copy.mjs";
const SELF_WANT = ["fills in as the catalog grows", "Mount Bross", "closed to the public"];
{
  const p = path.join(ROOT, SELF_FILE);
  if (!fs.existsSync(p)) {
    console.error(`FAIL: the self-test probe ${SELF_FILE} is gone. Re-point the self-test at a`);
    console.error("browser probe with known anchors rather than deleting it -- an extractor that");
    console.error("is never exercised prints a clean sweep whatever it does.");
    process.exit(1);
  }
  const sitesSelf = extract(fs.readFileSync(p, "utf8"));
  if (!sitesSelf) { console.error(`FAIL: ${SELF_FILE} did not parse, so the extractor was never exercised.`); process.exit(1); }
  const flat = sitesSelf.flatMap((s) => s.branches.flatMap((runs) => runs.map((r) => ({ run: r.toLowerCase(), dir: s.dir }))));
  const got = flat.map((x) => x.run);
  const miss = SELF_WANT.filter((w) => !got.includes(w.toLowerCase()));
  if (miss.length) {
    console.error(`FAIL: the extractor did not recover ${miss.length} known anchor(s) from ${SELF_FILE}:`);
    miss.forEach((w) => console.error("  - " + JSON.stringify(w)));
    console.error(`  it recovered: ${JSON.stringify(got)}`);
    process.exit(1);
  }
  const dirOf = (w) => (flat.find((x) => x.run === w) || {}).dir;
  if (dirOf("mount bross") !== "want-TRUE" || dirOf("fills in as the catalog grows") !== "want-FALSE") {
    console.error("FAIL: direction detection is wrong on the self-test probe.");
    console.error(`  "Mount Bross" -> ${dirOf("mount bross")} (want want-TRUE)`);
    console.error(`  "fills in as the catalog grows" -> ${dirOf("fills in as the catalog grows")} (want want-FALSE)`);
    process.exit(1);
  }
}

// ------------------------------------------------------------------- the corpus
const dir = path.join(ROOT, "scripts", "oneoff");
const SELF = path.basename(fileURLToPath(import.meta.url));
const probes = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".mjs"))
  // Exclude self: the discovery pattern below is a STRING in this file's own source, so
  // without this the measurement reports on itself and the corpus count is one too high.
  .filter((f) => f !== SELF)
  .filter((f) => /chromium\.launch|playwright/.test(fs.readFileSync(path.join(dir, f), "utf8")))
  .sort();

if (probes.length < 40) {
  console.error(`FAIL: found only ${probes.length} browser probes. The discovery is broken;`);
  console.error("a short corpus reports a clean sweep about probes it never opened.");
  process.exit(1);
}

if (WHY) {
  const f = probes.find((p) => p === WHY || p === WHY + ".mjs");
  if (!f) { console.error(`no such browser probe: ${WHY}`); process.exit(1); }
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  const ast = parse(src, { sourceType: "module", errorRecovery: true, plugins: ["jsx"] });
  console.log(`${f}\n  text bindings : ${JSON.stringify([...taintedBindings(ast)])}`);
  console.log(`  phrases       : ${JSON.stringify((extract(src) || []).map((x) => `[${x.dir}] ${x.phrase}`))}`);
  process.exit(0);
}

const isProse = (s) => s.trim().split(/\s+/).length >= 3 && !/^[A-Z][a-z]+ [A-Z]/.test(s.trim());

// WHAT THE UNMEASURED BUCKET IS, rather than a guess about it. This block used to print a
// sentence saying "some asserts on accessible NAMES (aria-label), which this does not read"
// -- which invites a widening of the extractor to cover them. Measured, that widening would
// reach THREE probes and six anchors, and a detector for a class that small is the thing this
// repo keeps refusing to build. So it classifies instead and NAMES the three, which is what
// lets a reader settle them by hand in minutes (all six were: zero rotted, 2026-09-10).
//
// MENTIONING IS NOT ASSERTING, and that is the whole distinction: 19 of the 38 mention
// aria-label and only these three carry a literal, checkable name. The rest query every
// [aria-label] element and dump or count them, so there is no anchor there to rot.
const nameAnchors = (src) => {
  const hits = [];
  for (const m of src.matchAll(/\[aria-label(?:\^|\*|\$)?=\s*["'`]([^"'`]{2,})["'`]\]/g)) hits.push(m[1]);
  for (const m of src.matchAll(/tapByName\s*\(\s*[A-Za-z_$][\w$]*\s*,\s*["'`]([^"'`]{2,})["'`]/g)) hits.push(m[1]);
  for (const m of src.matchAll(/\/\^?\(([A-Za-z ,|]{4,})\)[^/]*\/[gimsuy]*\.test\([^)]*aria-label/g)) hits.push(m[1]);
  if (hits.length) return { kind: "literal", names: [...new Set(hits)] };
  const generic =
    /querySelectorAll\(\s*["'`]\[aria-label\]["'`]\s*\)/.test(src) ||
    /getAttribute\(\s*["']aria-label["']\s*\)/.test(src);
  return { kind: generic ? "generic" : "none", names: [] };
};

const rows = [];          // one entry per assertion SITE
const notMeasured = [];
const didNotParse = [];
let phraseCount = 0;
for (const f of probes) {
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  const sites = extract(src);
  if (sites === null) { didNotParse.push(f); continue; }
  if (!sites.length) {
    // FAIL CLOSED: extracting nothing is not the same as finding nothing wrong.
    notMeasured.push({ file: f, ...nameAnchors(src) });
    continue;
  }
  for (const s of sites) {
    const branches = s.branches.map((runs) => {
      phraseCount += runs.length;
      const absent = runs.filter((r) => !appText.includes(norm(r)));
      return { runs, absent, ok: absent.length === 0 };
    });
    rows.push({ file: f, group: s.group, dir: s.dir, via: s.via, branches });
  }
}

// ------------------------------------------------------------------- report
// An anchor is dead only when NO branch can match. One dead branch beside a live one is the
// weaker class check:outage records, where `offline library` appeared zero times in the app
// and could therefore only ever report a false miss.
const rotted = rows.filter((s) => s.branches.every((b) => !b.ok));
const partly = rows.filter((s) => s.branches.some((b) => b.ok) && s.branches.some((b) => !b.ok));
const rottedWillFail = rotted.filter((s) => s.dir === "want-TRUE");
const rottedVacuous = rotted.filter((s) => s.dir === "want-FALSE");

console.log(`browser probes discovered       : ${probes.length}`);
console.log(`  measured (anchors extracted)  : ${probes.length - notMeasured.length - didNotParse.length}`);
console.log(`  NOT MEASURED (no anchor)      : ${notMeasured.length}`);
console.log(`  did not parse                 : ${didNotParse.length}`);
console.log(`assertion sites checked         : ${rows.length}  (${phraseCount} literal runs)`);
console.log(`  anchors that CANNOT match     : ${rotted.length}`);
console.log(`    want-TRUE  (probe will FAIL): ${rottedWillFail.length}   <- reads as an app defect`);
console.log(`    want-FALSE (cannot fire)    : ${rottedVacuous.length}   <- read it: see below`);
console.log(`  sites with a dead branch      : ${partly.length}   <- a sibling still matches`);

const showSites = (title, list) => {
  if (!list.length) return;
  console.log(`\n${title}`);
  for (const s of [...list].sort((a, b) => a.file.localeCompare(b.file))) {
    const txt = s.branches.map((b) => b.runs.map((r) => JSON.stringify(r)).join(" + ")).join("  |  ");
    console.log(`  ${s.file}`);
    console.log(`      [${s.dir}, ${s.via}] ${txt}`);
  }
};

showSites("ANCHOR CANNOT MATCH + want-TRUE - read these first (the probe FAILS and reads as an app defect):", rottedWillFail);
// A want-FALSE anchor being absent is not automatically a defect, and calling it one would
// be this script over-claiming: a regression guard asserting a REMOVED defect string is
// SUPPOSED to be unmatchable, and stays useful because it fails the day the string returns.
// It is only a defect when the phrase was meant to be a landmark. The two are the same shape
// from here, so the run reports and refuses to pick.
showSites("ANCHOR CANNOT MATCH + want-FALSE - cannot fire against today's app. CORRECT for a\n  regression guard asserting a removed defect string; a DEFECT for a landmark meant to match:", rottedVacuous);
showSites("ANCHOR CANNOT MATCH, direction undetermined:", rotted.filter((s) => s.dir === "unknown"));

if (ALL) {
  console.log(`\nSITES WITH A DEAD BRANCH (a sibling still matches, so the probe is not broken --`);
  console.log(`but that branch has never matched once, which is how a landmark reads as broader`);
  console.log(`coverage than it has):`);
  for (const s of partly) {
    for (const b of s.branches.filter((x) => !x.ok)) {
      console.log(`  ${s.file}\n      [${s.dir}] dead: ${b.absent.map((r) => JSON.stringify(r)).join(" + ")}`);
    }
  }
} else if (partly.length) {
  console.log(`\n(${partly.length} sites with a dead branch hidden; --all to list them)`);
}

if (didNotParse.length) {
  console.log(`\nDID NOT PARSE - the extractor never ran on these:`);
  didNotParse.forEach((f) => console.log("  " + f));
}
if (notMeasured.length) {
  // CLASSIFIED, NOT DESCRIBED. A sentence saying "some of these assert on accessible names"
  // is an invitation to widen the extractor; the counts say what that would actually buy.
  const lit = notMeasured.filter((x) => x.kind === "literal");
  const gen = notMeasured.filter((x) => x.kind === "generic");
  const non = notMeasured.filter((x) => x.kind === "none");
  console.log(`\nNOT MEASURED - no rendered-text anchor could be extracted, so these are NOT clean.`);
  console.log(`Most measure geometry, control names, console output or counts rather than copy;`);
  console.log(`--why=<file> says what the extractor saw before believing that of any one of them.`);
  console.log(`  carries a LITERAL aria-label anchor : ${lit.length}   <- checkable BY HAND, named below`);
  console.log(`  reads aria-label GENERICALLY only   : ${gen.length}   <- queries every [aria-label]: no anchor to rot`);
  console.log(`  no accessible-name anchor at all    : ${non.length}`);
  notMeasured.forEach((x) => console.log("  " + x.file));
  if (lit.length) {
    console.log(`\nThe literal accessible-name anchors, so they can be settled without widening this:`);
    lit.forEach((x) => console.log(`  ${x.file}\n      ${x.names.map((n) => JSON.stringify(n)).join("  ")}`));
  }
}

console.log(`\nThis is a READING LIST, not a defect count. A phrase can be absent from the app`);
console.log(`source and still on screen: rendered from a catalog row, built by concatenation,`);
console.log(`or split across an interpolation. Read the probe before believing an anchor rotted.`);
