// A SCRIPT MUST NOT PIN ITSELF TO SOMEBODY ELSE'S WORKTREE.
//
// `const ROOT = "/Users/…/.claude/worktrees/rappels-rack-filter-class-audit"` reads the app files
// of whichever tree its author happened to be in. CLAUDE.md already records what that costs:
// `measure-which-tab-renders-each-field.mjs` "silently measured a different branch's code than the
// one you ran it in". Silently is the word — while that worktree exists the script runs, produces
// numbers, and every one of them is about another branch. Once it is deleted the script dies with
// ENOENT, which is the LOUD half and the only reason anyone ever notices.
//
// Measured before this was written: SIXTEEN scripts across ELEVEN dead worktrees. Not a class of
// one, and the repair is mechanical -- the module-relative form every healthy script already uses.
//
// Static: one directory walk and a regex. Milliseconds, so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = path.join(ROOT, "scripts");

// An absolute path into ANY worktree, or into a checkout by name. Both are the same defect: a path
// that is true on one machine, in one tree, at one moment.
const PINNED = /["'`](\/(?:Users|home)\/[^"'`\n]*?\/\.claude\/worktrees\/[^"'`\n]*)["'`]/;

let files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(mjs|js|cjs)$/.test(e.name)) files.push(p);
  }
};
walk(SCRIPTS);

// Fail closed: a walk that found almost nothing prints the same clean result as a clean tree.
if (files.length < 200) {
  console.error(`check:script-roots: only ${files.length} script(s) walked under scripts/ — the walk is broken, not the tree.`);
  process.exit(1);
}

const findings = [];
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((l, i) => {
    // A COMMENT naming the shape is documentation -- this guard's own header does it, and so does
    // CLAUDE.md's account of the defect. Flagging those would forbid explaining the rule.
    const code = l.replace(/\/\/.*$/, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const m = PINNED.exec(code);
    if (m) findings.push({ file: path.relative(ROOT, f), line: i + 1, path: m[1] });
  });
}

if (findings.length) {
  console.error("check:script-roots — a script is pinned to an absolute worktree path:\n");
  for (const x of findings) console.error(`  ${x.file}:${x.line}\n      ${x.path}`);
  console.error(`
Use the module-relative form every healthy script already uses:

  import path from "node:path";
  import { fileURLToPath } from "node:url";
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");   // from scripts/oneoff/

Check what the constant is CONCATENATED with before you swap it: the pinned form often ends in a
slash, and \`ROOT + "ClimbMatchCore.jsx"\` becomes \`/repoClimbMatchCore.jsx\` without one. Use
path.join. And \`node --check\` will NOT catch that — it proves the file parses, not that it runs.`);
  process.exit(1);
}

console.log(`check:script-roots: ok — ${files.length} scripts, none pinned to an absolute worktree path.`);
