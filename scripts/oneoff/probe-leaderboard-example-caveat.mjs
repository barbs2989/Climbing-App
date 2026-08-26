// The Leaderboards caveat — "Example profiles are included to show how the boards work" — was
// gated on DEMO_FILLERS, an unconditional false, so it had never rendered. The seed climbers it
// describes are NOT gated on that flag, so they render for everyone: the caveat was dead and its
// subject was live. Every other surface in the app that shows seed climbers labels them
// (PartnerSearch, the crew listings, the guide listings); this was the one that could not.
//
// It is counted from the rows actually drawn rather than from a flag, so this asserts BOTH
// directions. A caveat that is simply always on would satisfy the first assertion alone, and it
// would then be a permanent apology on a board that had grown real climbers.
//
// SSR. renderToStaticMarkup runs no effects, so <CountUp> renders 0 — never assert those numbers.
//
//   node scripts/oneoff/probe-leaderboard-example-caveat.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Leaderboards, CLIMBERS } from "${path.join(ROOT, "ClimbMatchCore.jsx")}";
const noop = () => {};
export function seedCount() { return CLIMBERS.length; }
// Replace the seed pool with climbers carrying uuid ids — what a real profile looks like — so
// the board can be asked the OTHER question: with nothing on it to apologise for, is it quiet?
export function makeAllReal(n) {
  CLIMBERS.length = 0;
  for (let i = 0; i < n; i++) {
    CLIMBERS.push({
      id: "0f3a5c1e-0000-4000-8000-" + String(i).padStart(12, "0"),
      name: "Real Climber " + i, username: "real" + i, location: "Bellingham, WA",
      avatar: null, verified: false, disciplines: ["trad", "alpine"], level: "5.10a",
      trustScore: 50, routesLogged: 90 - i, vertYr: 90000 - i * 10, daysYr: 60 - i,
      peaksAllTime: 70 - i, sendPts: 90000 - i * 10, onsightPts: 70000 - i * 10,
      ticks: [], objectiveIds: [], showOnRanks: true,
    });
  }
  return CLIMBERS.length;
}
export function render() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(Leaderboards, {
        onView: noop, onClimb: noop, logs: [], connections: [],
        friendState: () => "none", onFriend: noop, catchCredits: {}, onMessage: noop,
        showOnRanks: true, blocked: [], rankDisc: "all", setRankDisc: noop,
        rankBoard: "send", setRankBoard: noop, routeById: () => null,
        logsUnavailable: false,
      })));
}
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-lbcav-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, seedCount, makeAllReal } = require_(out);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

// renderToStaticMarkup ESCAPES: the em dash and any apostrophe come back as entities. Match the
// text the way the app renders it, not the way the source spells it.
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/\s+/g, " ");

const NEEDLE = "Example profiles are included to show how the boards work";

// ── 1. Production state: the seed pool, ungated, exactly as a real signed-in climber sees it.
const n = seedCount();
const prod = render();
const prodText = text(prod);

if (prod.length < 2000 || !/#\d/.test(prodText)) {
  console.log(`  FAIL  ANCHOR LOST: the board rendered ${prod.length} chars with no ranked rows. Nothing below was checked.`);
  process.exit(1);
}
ok(`the board renders with the ${n} seed climber(s) production actually ships (${prod.length} chars)`);

if (prodText.includes(NEEDLE)) ok("it says the profiles are examples");
else fail("the caveat is NOT on screen — a real climber is ranked against seed profiles with nothing saying so");

// The claim it qualifies has to be adjacent, or the caveat is technically present and useless.
const standing = /You.{0,3}re #(\d+) of (\d+)/.exec(prodText);
if (standing) ok(`the standing it qualifies reads "${standing[0]}"`);
else fail("no \"You're #N of M\" standing on screen — check where the caveat was placed relative to it");

// ── 2. The other direction. Counted from the rows, not asserted from a flag, so a board with no
//    example rows must be quiet. Without this the fix is indistinguishable from `caveat = always`.
const realN = makeAllReal(6);
const clean = text(render());
if (!/#\d/.test(clean)) {
  fail(`the all-real board rendered no rows (${realN} climbers pushed), so its silence proves nothing`);
} else if (clean.includes(NEEDLE)) {
  fail("the caveat still shows on a board with no example profiles on it — it is unconditional, not counted");
} else {
  ok(`a board of ${realN} real (uuid) profiles shows no caveat`);
}

console.log(failures ? `\n${failures} assertion(s) failed.` : "\nok — the caveat renders on the board production ships, and only while examples are on it.");
process.exit(failures ? 1 : 0);
