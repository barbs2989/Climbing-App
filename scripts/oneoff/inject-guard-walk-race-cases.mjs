#!/usr/bin/env node
// Injection suite for probe-guard-walk-survives-a-vanishing-file.mjs.
//
// The healthy output is a page of "ok" lines, which is also what a probe that stopped asking
// anything prints. Each case reverts ONE guard to the pre-fix walk, proves by CHECKSUM that the
// edit landed, runs the probe, and restores the file byte-identically.
//
// Case `writer` is the real defect: it puts check:policy-claims' bundle back at the repo root,
// which is where it was when check:write-feedback died mid-build.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
const SKIPNOTE = ' || name.startsWith(".")) continue; // a dot entry is never app source,\n' +
  '    // and a guard temp file that vanishes between this readdir and the stat below would\n' +
  '    // otherwise kill this walk — the guards now run concurrently.';

const CASES = [
  { name: "write-feedback-stats-everything", file: "scripts/check-write-feedback.mjs",
    find: 'if (SKIP.has(name)' + SKIPNOTE, repl: 'if (SKIP.has(name)) continue;',
    says: /check-write-feedback died walking the tree/ },
  { name: "zindex-stats-everything", file: "scripts/check-zindex.mjs",
    find: 'if (SKIP.has(name)' + SKIPNOTE, repl: 'if (SKIP.has(name)) continue;',
    says: /check-zindex died walking the tree/ },
  { name: "screen-lists-stats-everything", file: "scripts/check-screen-lists.mjs",
    find: '    if (e.startsWith(".")) continue; // never a guard; and a temp file that vanishes\n' +
          '    // between this readdir and the stat below would otherwise kill the walk.\n',
    repl: "", says: /check-screen-lists died walking the tree/ },
  { name: "writer-back-at-the-repo-root", file: "scripts/check-policy-claims.mjs",
    find: 'const cacheDir = path.join(ROOT, "node_modules", ".cache");',
    repl: 'const cacheDir = path.join(ROOT, "notnodemodules");',
    says: /bundle target is neither the root nor node_modules/ },
];

let bad = 0;
for (const c of CASES) {
  const f = path.join(ROOT, c.file);
  const before = fs.readFileSync(f, "utf8");
  const beforeSum = sum(f);
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the probe`); bad++; continue; }
  fs.writeFileSync(f, before.replace(c.find, c.repl));
  if (sum(f) === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(f, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "oneoff", "probe-guard-walk-survives-a-vanishing-file.mjs")],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(f, before);
  if (sum(f) !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  // A failure for a DIFFERENT reason is not a catch.
  if (code !== 0 && c.says.test(out)) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
  else { console.log(`  FAIL  ${c.name}: ${code !== 0 ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
