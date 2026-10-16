// Re-measure the lawyer packet's "What the app actually does" table against CURRENT main.
//
// The packet (artifact 89992f83, masthead "Source commit e5dcc81 · Compiled 20 Aug 2026") states:
//   Tables the client writes  33   ·  Tables read only 4  ·  Server functions callable 10
//   Analytics / tracking SDKs  0   ·  Payment processing 0
//
// Those are BEHAVIOURAL claims measured six days and ~100 commits ago, and they are what a reviewer
// judges the documents against. The legal TEXT is separately verified unchanged by
// extract-legal-surfaces.mjs --since e5dcc81; this covers the half that extractor does not.
// [[an-audits-advice-rots-faster-than-its-counts]]
//
// TWO BUGS IN THE FIRST DRAFT, BOTH MINE, BOTH RECORDED BECAUSE THEY NEARLY SHIPPED A FALSE ALARM
// ABOUT THE LAUNCH BLOCKER — it printed "5 of 6 claims no longer match":
//
//   1. It looked for `rest/v1/<table>` URLs. lib/db.js uses the Supabase CLIENT (`.from("x")`), so
//      it found ZERO tables and reported all three counts as having collapsed to 0. A count of 0
//      from a scan that matched nothing reads exactly like a catalog that lost everything.
//   2. "plausible" IS AN ENGLISH WORD. The tracker needle matched ordinary prose in RouteDetail.jsx
//      and lib/fire.js ("a plausible elevation") and reported 5 analytics SDKs in an app that has
//      none. The tracker is `plausible.io`; the bare word is not. Needles here are HOST-SHAPED for
//      that reason — the same too-broad-proxy trap this repo records throughout, committed while
//      auditing for it.
//
// Report-only. Prints the packet's number beside today's and names what moved.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const db = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
if (db.length < 20000) { console.error(`lib/db.js is only ${db.length} chars — refusing to report`); process.exit(1); }

// `.from("table")` then the first chained verb decides read vs write. Look ahead a bounded window
// rather than parsing: these are chained builder calls, and the verb is always adjacent.
const WRITE = /^\s*\.\s*(insert|update|upsert|delete)\b/;
const reads = new Set(), writes = new Set();
for (const m of db.matchAll(/\.from\(\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\)/g)) {
  const t = m[1], after = db.slice(m.index + m[0].length, m.index + m[0].length + 40);
  (WRITE.test(after) ? writes : reads).add(t);
}
const rpcs = new Set([...db.matchAll(/\.rpc\(\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]/g)].map(m => m[1]));
if (!reads.size && !writes.size) { console.error("no .from() calls found — the scan is broken, refusing to report"); process.exit(1); }

// "Tables read only" means read and never written.
const readOnly = [...reads].filter(t => !writes.has(t)).sort();

const rows = [
  ["Tables the client writes", 33, writes.size, [...writes].sort()],
  ["Tables read only", 4, readOnly.length, readOnly],
  ["Server functions callable", 10, rpcs.size, [...rpcs].sort()],
];

console.log(`packet masthead: Source commit e5dcc81 · Compiled 20 Aug 2026\n`);
let moved = 0;
for (const [label, was, now, list] of rows) {
  const same = was === now;
  if (!same) moved++;
  console.log(`${same ? "ok    " : "MOVED "}  ${label.padEnd(26)} packet ${String(was).padStart(3)}   today ${String(now).padStart(3)}`);
  console.log(`         ${list.join(", ")}\n`);
}

// HOST-SHAPED, never bare product words. `enrichment-wip/` is scratch (BATCH1_STATUS.md,
// STALE_DO_NOT_APPLY_*.json), referenced by neither package.json nor vite.config — not app code.
const TRACKERS = /googletagmanager\.com|google-analytics\.com|\bgtag\(|cdn\.segment\.com|api\.segment\.io|mixpanel\.com|amplitude\.com|posthog\.com|fullstory\.com|hotjar\.com|sentry\.io|datadoghq\.com|heap(?:analytics)?\.com|plausible\.io|usefathom\.com/i;
const PAY = /stripe\.com|js\.stripe|braintreegateway|paypal\.com|squareup\.com|checkout\.com|adyen\.com/i;
const SKIP = /(^|\/)(node_modules|dist|scripts|enrichment-wip|catalog|supabase|audits)(\/|$)/;
const appFiles = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  if (e.name.startsWith(".")) continue;
  const p = path.join(d, e.name), rel = path.relative(ROOT, p);
  if (SKIP.test(rel)) continue;
  if (e.isDirectory()) walk(p); else if (/\.(jsx?|mjs|html)$/.test(e.name)) appFiles.push(rel);
} };
walk(ROOT);
if (appFiles.length < 5) { console.error(`only ${appFiles.length} app files walked — refusing`); process.exit(1); }

const hit = re => appFiles.filter(f => re.test(fs.readFileSync(path.join(ROOT, f), "utf8")));
const trackerHits = hit(TRACKERS), payHits = hit(PAY);
for (const [label, was, list] of [["Analytics / tracking SDKs", 0, trackerHits], ["Payment processing", 0, payHits]]) {
  const same = list.length === was;
  if (!same) moved++;
  console.log(`${same ? "ok    " : "MOVED "}  ${label.padEnd(26)} packet ${String(was).padStart(3)}   today ${String(list.length).padStart(3)}${list.length ? "  — " + list.join(", ") : ""}`);
}
console.log(`         (${appFiles.length} app files scanned: ${appFiles.slice(0, 6).join(", ")}${appFiles.length > 6 ? " …" : ""})`);

// The packet's live-walk claim names SIX tabs. NAV has seven — `ranks` is the one every browser
// guard also missed until check:screen-lists was written.
const nav = /const NAV=\[(.*?)\]/s.exec(fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8"));
if (!nav) { console.error("\nANCHOR LOST: `const NAV=[` is not in ClimbMatch.jsx"); process.exit(1); }
const tabs = [...nav[1].matchAll(/id:"([a-z]+)"/g)].map(m => m[1]);
/* The packet SAID six until 2026-08-26; `ranks` was never opened, and it is the heaviest Unsplash
   consumer of the lot. Corrected in the artifact and pinned to 7 here, so this line now guards
   against a tab being ADDED without the walk being redone — rather than permanently re-reporting a
   finding that has been fixed, which is the stale-assertion disease this file exists to catch. */
const tabsOk = tabs.length === 7;
if (!tabsOk) moved++;
console.log(`\n${tabsOk ? "ok    " : "MOVED "}  ${'Tabs the live walk covered'.padEnd(26)} packet   7   today ${tabs.length}   ${tabs.join(", ")}`);
if (!tabsOk) console.log(`         re-run measure-third-party-hosts-live.mjs: a tab the walk never opens
         cannot contribute a host, and the packet's one MEASURED row would be short again.`);

console.log(`\n${moved} of ${rows.length + 3} claim(s) no longer match.`);
console.log(moved
  ? `Rebuild the packet before a reviewer reads it.`
  : `The behaviour table is still accurate as published.`);
process.exit(0);
