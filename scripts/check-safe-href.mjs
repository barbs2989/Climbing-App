#!/usr/bin/env node
// check:safe-href — no link in the app can run script (security audit 2026-11-26).
//
// React 18 renders href="javascript:…" as written. Several links are built from text another climber
// wrote into the database through the public API (a chat photo's image_url, a photo contribution's
// url, a group's links, a reported item's snapshot) — and the Review desk, where the owner is signed
// in as admin, opened two of them with no check at all. A tap would have run the writer's script as
// this site, with the session token (localStorage) in reach.
//
// Rules:
//   1. Every JSX `href={…}` that is not a plain string literal is `href={safeHref(…)}` (lib/safeUrl.js).
//      One rule for every link, rather than a judgement per call site about which values are
//      climber-written: that judgement is what missed the Review desk.
//   2. safeHref itself refuses javascript:, data:, vbscript: and file: (in any case, behind
//      whitespace or a tab the URL parser strips) and keeps https, mailto, sms, tel and a relative link.
//   3. Both builds (vite.config.js, vite.review.config.js) carry cspPlugin() — the policy that refuses
//      inline and javascript: script even if a link slipped past rule 1.
//   4. No HTML string the app writes carries an inline on…="" handler: the policy refuses those too,
//      so the control would silently do nothing (the print page's buttons were the case).
//
// Static — no browser, no DB, no network — so it sits in `npm run build`.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const fail = [];
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n").filter((f) => /\.(jsx?|tsx?)$/.test(f) && (/^[^/]+\.(jsx|tsx)$/.test(f) || /^(lib|src|review)\//.test(f)));

// Fails CLOSED: "nothing found" is also what a broken walk prints.
if (!files.includes("ClimbMatchCore.jsx") || files.length < 100) {
  console.error(`check:safe-href FAILED — only ${files.length} app file(s) found; a broken walk, not a small app.`);
  process.exit(1);
}

let wrapped = 0;
for (const f of files) {
  const s = readFileSync(path.join(ROOT, f), "utf8");
  // Rule 1. Walk each href={ to its matching brace, skipping strings.
  for (let i = s.indexOf("href={"); i >= 0; i = s.indexOf("href={", i + 6)) {
    if (!/\s/.test(s[i - 1] || "")) continue;
    let d = 1, q = null, m = i + 6;
    for (; m < s.length; m++) {
      const c = s[m];
      if (q) { if (c === "\\") { m++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === "`") { q = c; continue; }
      if (c === "{") d++; else if (c === "}" && !--d) break;
    }
    const expr = s.slice(i + 6, m).trim();
    if (/^"[^"]*"$/.test(expr)) continue;
    if (/^safeHref\(/.test(expr) && /\)$/.test(expr)) { wrapped++; continue; }
    const line = s.slice(0, i).split("\n").length;
    fail.push(`${f}:${line}  href={${expr.slice(0, 80)}} — wrap it: href={safeHref(${expr.slice(0, 40)}…)} (lib/safeUrl.js)`);
  }
  // Rule 4. An inline handler inside a string literal of HTML.
  const h = /<[a-z][^<>]*\son(click|load|error|submit|change|input|mouseover|focus)=\\?["']/gi;
  for (let mm; (mm = h.exec(s));) {
    const line = s.slice(0, mm.index).split("\n").length;
    const lineText = s.split("\n")[line - 1];
    if (/^\s*(\/\/|\*|\/\*)/.test(lineText)) continue;
    fail.push(`${f}:${line}  an inline on${mm[1]}="" in written HTML — the CSP refuses it; wire the handler with addEventListener after writing`);
  }
}
if (wrapped < 40) fail.push(`only ${wrapped} safeHref-wrapped links found (were 50 on 2026-11-26) — the walk went blind, or links were unwrapped`);

// Rule 2. The helper's own behaviour.
const { safeHref } = await import(pathToFileURL(path.join(ROOT, "lib/safeUrl.js")).href);
const refuse = ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)", "java\nscript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)", "file:///etc/passwd", "\u0001javascript:alert(1)"];
const keep = ["https://www.nps.gov/mora/", "http://example.com/", "mailto:a@b.c", "sms:?&body=hi", "tel:+15555550123", "?route=abc", "/Climbing-App/?list=1", "geo:47.1,-121.2"];
for (const u of refuse) if (safeHref(u) !== undefined) fail.push(`safeHref(${JSON.stringify(u)}) should be refused, returned ${JSON.stringify(safeHref(u))}`);
for (const u of keep) if (safeHref(u) !== u.trim()) fail.push(`safeHref(${JSON.stringify(u)}) should be kept, returned ${JSON.stringify(safeHref(u))}`);
if (safeHref(null) !== undefined || safeHref("") !== undefined) fail.push("safeHref of nothing must be undefined");

// Rule 3.
for (const cfg of ["vite.config.js", "vite.review.config.js"]) {
  const t = readFileSync(path.join(ROOT, cfg), "utf8");
  if (!/from\s+["']\.\/scripts\/lib\/vite-csp\.mjs["']/.test(t) || !/plugins:\s*\[[^\]]*\bcspPlugin\(\)/.test(t)) fail.push(`${cfg} does not use cspPlugin() — the built page would ship without its Content-Security-Policy`);
}
const csp = readFileSync(path.join(ROOT, "scripts/lib/vite-csp.mjs"), "utf8");
if (/unsafe-inline|unsafe-eval/.test(csp.replace(/\/\/.*$/gm, ""))) fail.push("scripts/lib/vite-csp.mjs allows unsafe-inline or unsafe-eval in code — that undoes the policy");

if (fail.length) {
  console.error("check:safe-href FAILED\n  " + fail.join("\n  "));
  process.exit(1);
}
console.log(`check:safe-href ok — ${wrapped} dynamic links across ${files.length} app files go through safeHref; ${refuse.length} script URLs refused, ${keep.length} real ones kept; both builds carry the CSP.`);
