#!/usr/bin/env node
// A failed read must not read as an EMPTY one — that class is guarded (check:read-failures,
// check:outage). This asks the SIBLING question nothing has: must a read that never STARTED not
// read as one still in flight?
//
// React Query v5: a query gated `enabled:false` is `isPending: true` FOREVER, with
// `fetchStatus:"idle"`. `isLoading` is defined as `isPending && isFetching`, so isLoading is
// correctly false for such a query — but a component that renders its spinner from `isPending`,
// or from `!data`, shows "Loading…" that can never resolve. lib/db.js gates 64 queries internally
// on things like `enabled: !!id`, so a null id is not an edge case here, it is the resting state.
//
// A permanent spinner is worse than an honest empty state for the same reason a failed read
// reading as empty is: the screen makes a claim ("this is coming") that will never be true, and
// nothing on it says otherwise.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../..", import.meta.url).pathname;
const FILES = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
  .split("\n").filter((f) => /\.(jsx|js)$/.test(f) && !f.startsWith("scripts/") && !f.startsWith("node_modules"));

// Copy that promises something is arriving.
const LOADING_COPY = /"[^"]{0,40}(Loading|Fetching|Checking|Searching)[^"]{0,40}"|'[^']{0,40}(Loading|Fetching)[^']{0,40}'/;

let sites = 0;
const fromPending = [], fromIsLoading = [], fromBareData = [];
for (const f of FILES) {
  const src = readFileSync(ROOT + f, "utf8");
  const lines = src.split("\n");
  lines.forEach((ln, i) => {
    if (!LOADING_COPY.test(ln)) return;
    sites++;
    // What gates this line? Look at the conditional immediately governing the copy.
    const ctx = ln;
    const rec = { f, line: i + 1, snippet: ln.trim().slice(0, 150) };
    if (/\bis(Pending|Loading)\s*:\s*(\w+)/.test(ctx) || /\bisPending\b/.test(ctx)) fromPending.push(rec);
    else if (/\bisLoading\b|\bl[a-z]\s*\?/.test(ctx)) fromIsLoading.push(rec);
    else if (/!\s*data\b|!\s*[a-z]\w*\s*\?/.test(ctx)) fromBareData.push(rec);
  });
}

console.log(`${FILES.length} app files; ${sites} line(s) render copy promising something is arriving.\n`);
console.log(`gated on isPending (pending FOREVER when the query is disabled) : ${fromPending.length}`);
console.log(`gated on isLoading (correctly false for a disabled query)       : ${fromIsLoading.length}`);
console.log(`gated on a bare truthiness test                                 : ${fromBareData.length}\n`);
for (const [label, arr] of [["isPending", fromPending], ["bare truthiness", fromBareData]]) {
  if (!arr.length) continue;
  console.log(`── ${label}:`);
  for (const r of arr.slice(0, 25)) console.log(`   ${r.f}:${r.line}\n      ${r.snippet}`);
  console.log("");
}
if (!sites) { console.error("FAIL — no loading copy found at all; the scan broke rather than the app being clean."); process.exit(1); }
