// Every browser probe here spawns its own vite and therefore has to pick a port. They do it
// with a copied `claimPort`, which BINDS a port to test it, CLOSES the socket, and then hands
// the number to vite with --strictPort. That gap is a TOCTOU race: two probes running in two
// sessions can both see the same port free, and the loser dies outright.
//
// --strictPort is CORRECT and must stay. probe-area-latest-reachable's own comment records why:
// without it a collision makes vite quietly pick another port, waitUp() then succeeds against
// the FOREIGN server, and the probe prints numbers indistinguishable from a healthy run while
// describing somebody else's app. That is the #464 shape. Refusing loudly beats adopting.
//
// What is missing is the RETRY. Observed live on 2026-09-23: a sweep's last probe died on
// `Port 5295 is already in use` while lsof showed a node process from ANOTHER worktree holding
// it, so the run produced no verdict at all -- a probe you do not have.
//
// This measures the class rather than fixing one instance, because the fix is a COLLAPSE (one
// shared helper) and not a copy-edit: the bodies have already drifted apart, which is exactly
// what this repo's four-grade-parsers entry predicts of a function pasted into thirty files.
//
// Report only. No DB, no browser, no network -- safe on a loaded box.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIRS = ["scripts", "scripts/oneoff", "scripts/lib"];

const files = [];
for (const d of DIRS) {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (f.endsWith(".mjs")) files.push(path.join(abs, f));
  }
}

// Balance braces from the declaration rather than matching to the first close brace on its own
// line -- a nested function or an object literal inside the body would truncate a regex and
// silently compare half a function against a whole one, manufacturing variants that are an
// artefact of the scan rather than real drift.
function bodyOf(src, at) {
  let depth = 0, started = false;
  for (let i = at; i < src.length; i++) {
    const c = src[i];
    if (c === "{") { depth++; started = true; }
    else if (c === "}") { depth--; if (started && depth === 0) return src.slice(at, i + 1); }
  }
  return null;
}

const DECL = /(?:async\s+)?function\s+claimPort\s*\(/;
const rows = [];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const m = DECL.exec(src);
  if (!m) continue;
  const body = bodyOf(src, m.index);
  if (body === null) { rows.push({ f: path.relative(ROOT, f), hash: "UNPARSED", retries: false }); continue; }
  // Does anything in the file recover from losing the race? Either the spawn is retried on
  // EADDRINUSE / "already in use", or claimPort itself is re-entered after a failed start.
  const after = src.slice(m.index + body.length);
  const retries = /EADDRINUSE|already in use/.test(src) && /claimPort\s*\(/.test(after);
  rows.push({ f: path.relative(ROOT, f), hash: crypto.createHash("md5").update(body).digest("hex").slice(0, 10), retries });
}

// Fail closed. A scan that matched nothing prints the same reassuring summary as a tree where
// the class has genuinely been collapsed, and telling those apart is this file's whole point.
if (rows.length < 5) {
  console.error("BROKEN SCAN - only " + rows.length + " declaration(s) of claimPort found across " + files.length + " script(s).");
  console.error("Either the function was renamed or the walk is wrong. This is NOT evidence the class is closed.");
  process.exit(1);
}

const byHash = new Map();
for (const r of rows) byHash.set(r.hash, (byHash.get(r.hash) || 0) + 1);
const retrying = rows.filter(function (r) { return r.retries; }).length;

console.log("scripts walked                      : " + files.length);
console.log("files declaring claimPort           : " + rows.length);
console.log("DISTINCT implementations            : " + byHash.size);
console.log("...that recover from losing the race: " + retrying);
console.log("");
const sorted = Array.from(byHash.entries()).sort(function (a, b) { return b[1] - a[1]; });
for (const row of sorted) console.log("  " + row[0] + "  x" + row[1]);
console.log("");
if (retrying === 0) {
  console.log("FINDING: not one copy retries. A port lost between the test-bind and vite's bind");
  console.log("kills the probe, so an unrelated session's probe can block this one outright.");
  console.log("The repair is ONE shared helper that retries, never a copy-edit into thirty files -");
  console.log("the bodies have already drifted into " + byHash.size + " variants, which is what a");
  console.log("copied function does. Collapse it; do not make the copies agree.");
} else {
  console.log(retrying + " of " + rows.length + " recover. Any that do not are still blockable.");
}
