#!/usr/bin/env node
// check:claims — a success message must not fire when the write behind it only runs
// with a signed-in session.
//
// The pattern this exists to stop:
//
//     showToast("Saved to My Objectives");                 // told the user it happened
//     if (uid) { saveObjective(uid, id).catch(...); }      // ...but uid is null when
//                                                          //    signed out, so nothing ran
//
// DEMO_AUTOLOGIN seeds `authed`/`onboarded` to true, so a visitor who never signed in
// sees a fully signed-in app. They tap Save, are told it saved, and lose it on refresh.
// #548, #575 fixed seven of these across objectives, crew formation, belay catches,
// log/report edits, conditions reports and both vouch paths.
//
// check:writes is the sibling guard and CANNOT see this class: it looks for a *rejected*
// write swallowed by an empty .catch, but a helper opening `if(!uid)return;` never creates
// a promise, so there is no rejection to observe.
//
//   node scripts/check-session-claims.mjs            # check
//   node scripts/check-session-claims.mjs --update   # rewrite the baseline

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "scripts", "session-claims-baseline.json");

// Walk the tree rather than naming files: a hardcoded list is how check:refs and
// check:hooks silently covered a quarter of the app after the three-way split (#547).
function sources(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^(scripts|catalog|supabase|enrichment-wip|docs|research)$/.test(e.name)) sources(p, acc); }
    else if (/\.jsx?$/.test(e.name)) acc.push(path.relative(ROOT, p));
  }
  return acc;
}

// Copy that is NOT a success claim: failures, refusals, and messages that already say
// the change is local only.
const NOT_A_CLAIM = /could not|couldn|did ?n|failed|error|retry|try again|only the|not allowed|on this device|locally only|won.t be saved|sign in|log in/i;

function scan() {
  const found = new Map();
  for (const rel of sources(ROOT)) {
    const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (!code.includes("showToast")) continue;
    let ast;
    try { ast = parse(code, { sourceType: "module", plugins: ["jsx"] }); }
    catch (e) { console.error(`\n  Could not parse ${rel}: ${e.message}\n`); process.exit(1); }

    // helpers that bail out without a session: function(){ if(!uid)return; ... }
    const gated = new Set();
    traverse(ast, {
      Function(p) {
        const b = p.node.body;
        if (!b || b.type !== "BlockStatement" || !b.body.length) return;
        const head = code.slice(b.body[0].start, Math.min(b.body[0].end, b.body[0].start + 60));
        if (!/^if\s*\(\s*!\s*uid\s*\)\s*return/.test(head)) return;
        const id = p.node.id?.name || p.parent?.id?.name
          || (p.parent?.type === "AssignmentExpression" && p.parent.left.type === "Identifier" && p.parent.left.name);
        if (id) gated.add(id);
      },
    });

    traverse(ast, {
      Function(p) {
        if (!p.node.body || p.node.body.type !== "BlockStatement") return;
        const src = code.slice(p.node.start, p.node.end);
        // The App body contains every handler; scanning it would attribute every toast to
        // every write. Only look at handler-sized functions.
        if (src.length > 60000) return;
        const viaHelper = [...gated].find(h => new RegExp(`\\b${h}\\s*\\(`).test(src));
        const viaInline = /if\s*\(\s*uid\s*[&)]/.test(src);
        if (!viaHelper && !viaInline) return;
        for (const m of src.matchAll(/showToast\(([^;]{0,200})/g)) {
          const arg = m[1];
          if (/\buid\b/.test(arg)) continue;        // already conditional on the session
          if (NOT_A_CLAIM.test(arg)) continue;      // failure / refusal / already honest
          const claim = arg.replace(/\s+/g, " ").slice(0, 70);
          const key = `${rel} :: ${claim}`;
          if (!found.has(key)) found.set(key, { file: rel, claim, gate: viaHelper || "if(uid)" });
        }
      },
    });
  }
  return found;
}

const found = scan();

if (process.argv.includes("--update")) {
  fs.writeFileSync(BASELINE, JSON.stringify({
    note: "Success messages beside a session-gated write that are intentional (local-only state that really did change). Shrink this list; never grow it without a reason in the PR.",
    allowed: [...found.keys()].sort(),
  }, null, 2) + "\n");
  console.log(`Baseline updated: ${found.size} accepted claim(s).`);
  process.exit(0);
}

const baseline = new Set(fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).allowed : []);
const added = [...found.entries()].filter(([k]) => !baseline.has(k));
const cleared = [...baseline].filter(k => !found.has(k));

if (cleared.length) {
  console.log(`\n${cleared.length} baseline entr${cleared.length === 1 ? "y is" : "ies are"} gone — prune with 'npm run check:claims -- --update':`);
  for (const k of cleared) console.log(`  - ${k}`);
}

if (!added.length) {
  console.log(`\ncheck-claims: ok — no success message sits in front of a session-gated write. (${baseline.size - cleared.length} accepted.)\n`);
  process.exit(0);
}

console.error(`\n${added.length} success message(s) shown even when the write behind them cannot run:\n`);
for (const [, v] of added) console.error(`  ${v.file}  showToast(${v.claim}   [gated by ${v.gate}]`);
console.error(`\nSigned out, uid is null and the write is skipped, but the message still fires.`);
console.error(`Say what actually happened — e.g. "Saved on this device — sign in to keep it".`);
console.error(`If the change really is local-only and the message is true, accept it with --update.\n`);
process.exit(1);
