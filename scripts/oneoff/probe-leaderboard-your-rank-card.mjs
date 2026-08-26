// The Leaderboards screen carries the "YOU" badge on TWO controls, and a browser guard can only
// ever see one of them: the list row renders when you are inside the visible top, and the
// your-rank card is gated on `meIdx >= 100`. The demo and the check:signed-in fixture both put
// six people on the board, so that card is unreachable to every walk in the repo — not a screen
// with no findings, not a screen.
//
// check:a11y-badges proved the LIST ROW announces a separated name: it reported the glue
// ("@nathanclimbsYOU") the moment the Ranks tab entered its walk, and is green now. This proves
// the other half by seeding 120 climbers into the exported seed array so the card exists at all.
// Seeding happens in the PROBE, never in the app.
//
// SSR, so it asserts the aria-label the card EMITS rather than the name Chrome computes — the
// browser half of that inference is what the guard already established. renderToStaticMarkup
// runs no effects, so <CountUp> renders 0 and its number must never be asserted here.
//
//   node scripts/oneoff/probe-leaderboard-your-rank-card.mjs
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
import { Leaderboards, CLIMBERS, ME } from "${path.join(ROOT, "ClimbMatchCore.jsx")}";
const noop = () => {};
export function seed(n) {
  // Push climbers who all outrank ME, so meIdx lands past the 100 the your-rank card needs.
  for (let i = 0; i < n; i++) {
    CLIMBERS.push({
      id: 900000 + i, name: "Probe Climber " + i, username: "probe" + i,
      location: "Bellingham, WA", avatar: null, verified: false,
      disciplines: ["trad", "alpine"], level: "5.10a", trustScore: 50,
      routesLogged: 400 - i, vertYr: 400000 - i * 10, daysYr: 200 - i,
      peaksAllTime: 300 - i, sendPts: 500000 - i * 10, onsightPts: 400000 - i * 10,
      ticks: [], objectiveIds: [], showOnRanks: true,
    });
  }
  return { climbers: CLIMBERS.length, meId: ME.id };
}
export function render(board) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(Leaderboards, {
        onView: noop, onClimb: noop, logs: [], connections: [],
        friendState: () => "none", onFriend: noop, catchCredits: {}, onMessage: noop,
        showOnRanks: true, blocked: [], rankDisc: "all", setRankDisc: noop,
        rankBoard: board, setRankBoard: noop, routeById: () => null,
        logsUnavailable: false,
      })));
}
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-lb-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { seed, render } = require_(out);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

const info = seed(120);
ok(`seeded the board to ${info.climbers} climbers (ME is id ${info.meId})`);

const html = render("send");
const labels = [...html.matchAll(/aria-label="([^"]*)"/g)]
  .map((m) => m[1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"'));
const rowLabels = labels.filter((l) => /^#\d+, /.test(l));

// ── 0. The probe must be able to FAIL. Without a rendered board every assertion is vacuous.
if (html.length < 2000 || !rowLabels.length) {
  console.log(`  FAIL  ANCHOR LOST: Leaderboards rendered ${html.length} chars and ${rowLabels.length} named row(s).`);
  console.log("        Either the screen did not render or no row names itself. Nothing below was checked.");
  process.exit(1);
}
ok(`Leaderboards renders (${html.length} chars, ${rowLabels.length} named rows)`);

// ── 1. The your-rank card exists at all. This is the assertion the whole probe is for: at six
//    climbers it does not, which is why no walk has ever seen it.
const mine = rowLabels.filter((l) => /(^|, )you(,|$)/.test(l));
const past100 = mine.filter((l) => Number(/^#(\d+),/.exec(l)[1]) > 100);
if (!past100.length) {
  fail(`no row past #100 announces "you" — the your-rank card did not render, so its fix is STILL unproven. Seeded ${info.climbers}; ranks seen: ${mine.map((l) => /^#\d+/.exec(l)[0]).join(", ") || "none"}`);
} else {
  ok(`the your-rank card renders and announces: ${JSON.stringify(past100[0])}`);
}

// ── 2. Nowhere may the badge be welded onto the name. This is the shape the browser guard
//    reported on the list row; here it is asserted on the emitted markup of both.
const welded = labels.filter((l) => /\wYOU/.test(l));
if (welded.length) fail(`an announced name still welds the badge on: ${JSON.stringify(welded[0])}`);
else ok("no announced name welds the badge onto the climber's name");

// ── 3. The fix must be a NAME, not a restructure — the badge still has to be on screen, and
//    still visually beside the name. A guard that passed because the badge was deleted would be
//    certifying the feature's removal.
const stillVisible = /<span[^>]*>YOU<\/span>/.test(html);
if (stillVisible) ok("the YOU badge still renders visually");
else fail("the YOU badge no longer renders at all — the fix removed the thing it was meant to name");

console.log(failures ? `\n${failures} assertion(s) failed.` : "\nok — both leaderboard controls that can carry the YOU badge name themselves.");
process.exit(failures ? 1 : 0);
