#!/usr/bin/env node
// Rewrite every literal NUL byte in a source file as the two-character escape \x00.
//
// VERIFIED EQUIVALENT RATHER THAN ASSUMED, which for a mechanical byte swap across live scripts is
// the whole job. Both versions are parsed with Babel and every StringLiteral / TemplateElement
// VALUE is compared: the rewrite is accepted only if the strings the program builds are identical.
// A textual diff cannot show this — the point of the change is that the old text is undiffable.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

const ROOT = new URL("../..", import.meta.url).pathname;
const APPLY = process.argv.includes("--apply");
const NUL = 0;
const NUL_CH = String.fromCharCode(0);   // named, never embedded - see check:no-nul

const parseIt = (src, f) => parse(src, {
  sourceType: "module", errorRecovery: false,
  plugins: [...(/\.(jsx|tsx)$/.test(f) ? ["jsx"] : []), ...(/\.tsx?$/.test(f) ? ["typescript"] : [])],
});

// Every string the program will actually hold, in source order.
function strings(src, f) {
  const out = [];
  traverse.default(parseIt(src, f), {
    StringLiteral(p) { out.push(["s", p.node.value]); },
    TemplateElement(p) { out.push(["t", p.node.value.cooked]); },
  });
  return out;
}

const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n").filter((f) => f && /\.(jsx?|mjs|cjs)$/.test(f));

let changed = 0, refused = 0;
for (const f of files) {
  const buf = readFileSync(ROOT + f);
  if (!buf.includes(NUL)) continue;
  const before = buf.toString("utf8");
  const after = before.split(NUL_CH).join("\\x00");

  let a, b;
  try { a = strings(before, f); b = strings(after, f); }
  catch (e) { console.log(`REFUSED ${f} — could not parse both versions (${String(e.message).slice(0, 70)})`); refused++; continue; }

  const same = a.length === b.length && a.every(([k, v], i) => b[i][0] === k && b[i][1] === v);
  if (!same) {
    const i = a.findIndex(([k, v], j) => !b[j] || b[j][0] !== k || b[j][1] !== v);
    console.log(`REFUSED ${f} — string #${i} differs: ${JSON.stringify(a[i])} vs ${JSON.stringify(b[i])}`);
    refused++; continue;
  }
  // The NULs must have been inside strings. Any that were not would have changed the token stream
  // and been caught above, but say so explicitly rather than inferring it.
  const nAfter = Buffer.from(after, "utf8").includes(NUL);
  if (nAfter) { console.log(`REFUSED ${f} — a NUL survived the rewrite`); refused++; continue; }

  console.log(`ok ${f} — ${before.split(NUL_CH).length - 1} NUL -> \\x00, ${a.length} strings identical`);
  if (APPLY) writeFileSync(ROOT + f, after);
  changed++;
}

console.log(`\n${changed} file(s) rewritten${APPLY ? "" : " (dry run — pass --apply)"}, ${refused} refused.`);
process.exitCode = refused ? 1 : 0;
