// Can a caller tell a failed message read from an empty one?
//
// Three reads in lib/db.js answered a database error with [], which every caller then treated
// as evidence of absence: the two pagers set `crewMsgMore`/`dmMore` false (permanently hiding
// "load older") and toasted "No earlier messages", while the inbox showed "No friend chats
// yet". Each pager already had a `.catch` with the RIGHT wording — the swallow made those
// branches unreachable.
//
// Static assertions only, and the header says so rather than implying more: this proves the
// swallow is gone and that every call site can receive a rejection. It does NOT prove the
// screen behaves, which would need the DB to fail on demand.
//
//   node scripts/oneoff/probe-message-reads-surface-failure.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const db = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

const FNS = ["fetchOlderCrewMessages", "fetchOlderDirectMessages", "fetchMyDirectMessages"];
let fail = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? "ok  " : "FAIL"}  ${msg}`); if (!cond) fail++; };

// Body of an exported async function, by brace balance over raw source. The blanker used by
// sibling guards desynchronises on apostrophes in prose, and db.js is full of them.
function bodyOf(src, name) {
  const i = src.indexOf(`export async function ${name}`);
  if (i < 0) return null;
  const open = src.indexOf("{", i);
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") { depth--; if (!depth) return src.slice(open, k + 1); }
  }
  return null;
}

console.log("the reads surface their failures:");
for (const fn of FNS) {
  const body = bodyOf(db, fn);
  ok(!!body, `${fn} was found`);
  if (!body) continue;
  // Comments are stripped: all three now EXPLAIN this rule in prose that names the old shape,
  // so a scan reading comments would pass on the strength of the explanation. The same false
  // pass check:correction-readers and check:ci-cancel both record.
  const code = body.replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  ok(!/if\s*\(\s*error\s*\)\s*return\s*\[\s*\]/.test(code), `${fn} does not answer an error with []`);
  ok(/if\s*\(\s*error\s*\)\s*throw\s+error/.test(code), `${fn} throws the error`);
}

console.log("\nevery call site can receive a rejection:");
// A call site is the text from the function name to the end of its promise chain. Counting
// `.catch` file-wide would pass on somebody else's handler.
for (const fn of FNS) {
  let from = 0, n = 0;
  for (;;) {
    const i = app.indexOf(`${fn}(`, from);
    if (i < 0) break;
    from = i + 1;
    if (app.lastIndexOf("import", i) === app.lastIndexOf("import {", i) && i < app.indexOf("\n", app.indexOf("import {"))) continue;
    const chain = app.slice(i, i + 1400);
    const stop = chain.indexOf("},[");            // end of the enclosing effect/handler
    const scope = stop > 0 ? chain.slice(0, stop) : chain;
    if (!/\.catch\(/.test(scope)) { console.log(`  FAIL  a ${fn} call site has no .catch`); fail++; continue; }
    n++;
  }
  ok(n > 0, `${fn}: ${n} call site(s), all with a .catch`);
}

console.log("\nthe honest wording is now reachable:");
ok(app.includes("Couldn't load earlier messages"), "the failure toast still exists");
ok(app.includes("No earlier messages"), "the genuinely-empty toast still exists");
ok(/msgHydratedRef\.current\._threads=false/.test(app),
  "a failed inbox load releases its hydration guard, so it retries instead of standing all session");

console.log(fail ? `\n${fail} assertion(s) failed` : "\nok — a failed message read can no longer read as an empty one");
process.exit(fail ? 1 : 0);
