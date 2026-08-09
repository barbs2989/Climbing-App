// check:a11y-names — every form control a screen reader can reach must have a name.
//
// 55 controls were named across #588/#606/#609 (and more in #582/#599/#600/#608).
// Nothing stopped the next one from shipping unnamed, which is how the category grew
// in the first place: a <div> holding the visible label, no htmlFor/id linking it to
// the input, so a sighted user reads "PARTY SIZE" and a screen reader gets "spinbutton".
//
// A DESCRIPTIVE placeholder counts as a name here; a meaningless one does not. Chrome
// falls back to placeholder text, so "Approach min" really is announced, while "0", "—"
// and "e.g. 48.7860" name nothing. The rule is at the `ph` check below, and it is
// deliberately weaker than scripts/audit-a11y.mjs, which counts NO placeholder as a name.
//
// Be precise about what a pass means, because the two obvious readings are both wrong:
//   - it does NOT mean every control has a durable name. 95 controls are named only by a
//     placeholder, which vanishes the moment the user types.
//   - a DYNAMIC placeholder (placeholder={...}) is accepted unconditionally, without
//     judging the string it builds. That is why three controls in RouteDetail lost their
//     aria-labels in a merge and this guard stayed green -- their dynamic placeholders
//     covered for them. Restored in the same commit as this comment.
//
// Walks the tree rather than naming files: a guard with a hardcoded list silently
// covered 24% of this repo after the app was split into three files (#547).
//
//   node scripts/check-a11y-names.mjs            # fail on any control not in the baseline
//   node scripts/check-a11y-names.mjs --update   # rewrite the baseline
//
// Known-but-deliberate exceptions live in a11y-names-baseline.json -- controls whose
// dynamic placeholder is genuinely descriptive at runtime ("Search Index Town Walls…",
// "Reply to Sam…"), where a static label would announce less, not more.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { assertCovered } from "./lib/guard-sources.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const BASELINE = join(ROOT, "scripts", "a11y-names-baseline.json");
const SKIP = new Set(["node_modules", "dist", ".git", ".claude", "catalog", "scripts", "supabase", "research", "audits"]);
const UPDATE = process.argv.includes("--update");

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.jsx$/.test(name)) out.push(p);
  }
  return out;
};

// Attribute span of a JSX tag. Brace-aware: an arrow function inside a handler contains
// ">" characters, so scanning to the first ">" ends the tag in the wrong place and
// inflates every count (an early version of this reported 132 instead of 46).
const tagsOf = (src, name) => {
  const out = []; const re = new RegExp(`<${name}\\b`, "g"); let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, depth = 0, inStr = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (inStr) { if (c === inStr && src[i - 1] !== "\\") inStr = null; continue; }
      if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
      if (c === "{") depth++; else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    out.push({ attrs: src.slice(m.index + m[0].length, i), start: m.index });
  }
  return out;
};

const lineOf = (src, i) => src.slice(0, i).split("\n").length;

const findings = [];
for (const file of assertCovered(walk(ROOT), ROOT, "check:a11y-names")) {
  const rel = file.slice(ROOT.length).replace(/^\/+/, "");
  const src = readFileSync(file, "utf8");
  for (const tag of ["input", "textarea", "select"]) {
    for (const t of tagsOf(src, tag)) {
      const a = t.attrs;
      // not reachable / not a labellable control
      if (/type\s*=\s*["'](hidden|submit|button|reset)["']/.test(a)) continue;
      // an explicit name, static or dynamic
      if (/aria-label\s*=|aria-labelledby\s*=/.test(a)) continue;
      // <label> wrapping the control names it
      const before = src.slice(Math.max(0, t.start - 900), t.start);
      const lo = before.lastIndexOf("<label"), lc = before.lastIndexOf("</label>");
      if (lo > -1 && lo > lc) continue;
      // an id with a matching label[for] names it
      const id = (a.match(/\bid\s*=\s*"([^"]+)"/) || [])[1];
      if (id && new RegExp(`<label[^>]*htmlFor\\s*=\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(src)) continue;
      // A DESCRIPTIVE placeholder is accepted: Chrome announces it, and while it is weak
      // (it disappears on input) it is not the defect this guard exists to catch. What
      // fails is a placeholder that names NOTHING -- a symbol, a bare number, or an
      // example value -- and a control with no placeholder at all.
      //   accepted: "Search areas, crags, peaks…", "Approach min", {"Reply to "+a.name}
      //   rejected: "0", "—", "e.g. 5.10a", "e.g. 48.7860"
      const ph = (a.match(/placeholder\s*=\s*"([^"]*)"/) || [])[1];
      if (ph && /[A-Za-z]{3,}/.test(ph) && !/^e\.g\.?,?/i.test(ph.trim())) continue;
      // a dynamic placeholder is built from runtime context and is descriptive by
      // construction ("Search Index Town Walls…"); a literal one has already been judged
      if (ph === undefined && /placeholder\s*=\s*\{/.test(a)) continue;
      findings.push({ key: `${rel}:${tag}:${(a.match(/value\s*=\s*(\{[^}]*\}|"[^"]*")/) || [, "?"])[1]}`, rel, tag, line: lineOf(src, t.start) });
    }
  }
}

if (UPDATE) {
  writeFileSync(BASELINE, JSON.stringify(findings.map((f) => f.key).sort(), null, 2) + "\n");
  console.log(`check:a11y-names — baseline rewritten with ${findings.length} known exception(s).`);
  process.exit(0);
}

const baseline = new Set(existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : []);
const fresh = findings.filter((f) => !baseline.has(f.key));
const seen = new Set(findings.map((f) => f.key));
const stale = [...baseline].filter((k) => !seen.has(k));

if (fresh.length) {
  console.error(`\ncheck:a11y-names — ${fresh.length} form control(s) with no accessible name:\n`);
  for (const f of fresh) console.error(`  ${f.rel}:${f.line}  <${f.tag}>  ${f.key.split(":").slice(2).join(":")}`);
  console.error(`
A meaningless placeholder is not a name -- "0", "—", "e.g. 5.10a" announce nothing,
and even a good one vanishes once the user types. Give the control an aria-label
matching the text already on screen, or aria-labelledby the element holding it. If the
control genuinely reads better from its runtime placeholder, add it to the baseline:

  node scripts/check-a11y-names.mjs --update
`);
  process.exit(1);
}
if (stale.length) console.log(`check:a11y-names — ${stale.length} baseline entry(ies) no longer present; run --update to shrink it.`);
console.log(`check:a11y-names: ok — every reachable form control has a name (${baseline.size} known exception(s)).`);
