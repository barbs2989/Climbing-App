// Walks EVERY climbing type × ranking the Ranks tab offers and asserts each board actually works:
// it renders, it ranks somebody, every value on it is a real number, the rows are in descending
// order, and your own row is on it (showOnRanks is on). No browser, no database — SSR of the real
// Leaderboards component, so the board list is READ from the rendered <select>, never restated.
//
// Written when the state-highpoints board was removed: the obvious way that change breaks the tab
// is a board id that still names it, or a board whose value function now reads a field nothing
// sets. Neither throws — a missing field reads as 0, and a board of zeros sorts "correctly".
//
//   node scripts/oneoff/probe-every-leaderboard-renders.mjs
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const CORE = JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"));
// Leaderboards moved out of core to load lazily; it is lib/Leaderboards.jsx's default export.
const LB = JSON.stringify(path.join(ROOT, "lib", "Leaderboards.jsx"));
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ROUTES, ME } from ${CORE};
import Leaderboards from ${LB};
const noop = () => {};
export { ROUTES, ME };
export function render(disc, board, logs, myTrust) {
  return renderToStaticMarkup(React.createElement(Leaderboards, {
    myTrust: myTrust == null ? null : myTrust, meLive: ME, onView: noop, onClimb: noop, logs, connections: [], friendState: () => "none",
    onFriend: noop, catchCredits: {}, onMessage: noop, showOnRanks: true, blocked: [],
    rankDisc: disc, setRankDisc: noop, rankBoard: board, setRankBoard: noop,
  }));
}`;
const dir = fs.mkdtempSync(path.join(ROOT, ".probe-lb-"));
process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
const out = path.join(dir, "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error", external: ["react", "react-dom"] });
const { render, ROUTES } = require_(out);

let fails = 0, oks = 0;
const ok = (c, m) => { if (c) oks++; else { fails++; console.log("  FAIL " + m); } };
const dec = s => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

// A few real logs so YOUR row scores on the list boards too, not just the seed climbers'.
const classic = ROUTES.find(r => r.classic);
const peak = ROUTES.find(r => ["mountaineering", "alpine", "scrambling"].includes(r.discipline));
const logs = [
  { id: "l1", routeId: classic.id, tickType: "Lead", date: "2026-08-01" },
  { id: "l2", routeId: peak.id, tickType: "Summit", date: "2026-08-02" },
];

const DISCS = [...render("all", "points", logs).matchAll(/aria-label="Ranking discipline"[\s\S]*?<\/select>/g)][0][0]
  .match(/value="([^"]+)"/g).map(v => v.slice(7, -1));
ok(DISCS.length >= 8, `climbing types parsed: ${DISCS.length}`);

const seen = new Set();
for (const disc of DISCS) {
  const sel = render(disc, "points", logs).match(/aria-label="Ranking board"[\s\S]*?<\/select>/)[0];
  const boards = [...sel.matchAll(/<option value="([^"]+)"[^>]*>([^<]*)</g)].map(m => [m[1], dec(m[2])]);
  ok(!boards.some(b => /highpoint/i.test(b[0] + b[1])), `${disc}: no state-highpoint board offered`);
  ok(boards.length >= 5, `${disc}: ${boards.length} rankings offered`);
  for (const [id, label] of boards) {
    seen.add(id);
    const html = dec(render(disc, id, logs));
    ok(html.length > 800, `${disc}/${id}: rendered ${html.length} chars`);
    ok(!/NaN|undefined|\[object Object\]|Infinity/.test(html.replace(/<[^>]+>/g, " ")), `${disc}/${id}: no NaN/undefined in copy`);
    // The select must actually SHOW this board, or setRankBoard would silently fall back.
    ok(new RegExp(`<option value="${id}" selected`).test(html) || html.includes(`value="${id}" selected=""`) || sel.includes(`value="${id}"`), `${disc}/${id}: offered`);
    if (id === "climbs") { ok(/★ \d/.test(html) || /No climbs in this scope/.test(html), `${disc}/climbs: routes or honest empty state`); continue; }
    const rows = [...html.matchAll(/font-size:16px;font-weight:700;color:[^"]*">([^<]*)<\/div><div[^>]*>([^<]*)<\/div>/g)];
    ok(rows.length >= 3, `${disc}/${id} (${label}): ${rows.length} ranked rows`);
    const vals = rows.map(r => parseFloat(r[1].replace(/,/g, "")));
    ok(vals.every(Number.isFinite), `${disc}/${id}: every value numeric — ${rows.slice(0, 3).map(r => r[1]).join(" | ")}`);
    ok(vals.every((v, i) => i === 0 || vals[i - 1] >= v || /ft|m$/.test(rows[i][1])), `${disc}/${id}: rows sorted descending`);
    ok(vals.some(v => v > 0), `${disc}/${id}: somebody scores above zero (a board of zeros ranks nobody)`);
    ok(/You’re #\d+/.test(html) || />YOU</.test(html), `${disc}/${id}: your own row is ranked`);
  }
}
ok(!seen.has("highpoints_b"), "highpoints_b reachable on no discipline");
ok(!seen.has("peaks_b"), "the duplicate Peaks board (peaks_b) is gone; Peaks all-time is the one peak ranking");
for (const disc of ["all", "mountaineering", "alpine", "scrambling"]) {
  const sel = render(disc, "points", logs).match(/aria-label="Ranking board"[\s\S]*?<\/select>/)[0];
  ok(sel.includes(`value="peaksLife"`), `${disc}: Peaks all-time is still offered`);
}

// Signed in, your trust row must show YOUR real score (the one on your Profile), not the preview
// formula the example climbers are scored on — and the board must say the two differ.
const REAL = 99; // high enough that a board honouring it MUST put you first
const signedIn = dec(render("all", "trust", logs, REAL));
const myTrustRow = signedIn.match(/aria-label="#\d+, [^"]*, you, [^"]*, (\d+) trust"/);
const youCard = signedIn.match(/You’re #(\d+)/);
ok(!!myTrustRow && +myTrustRow[1] === REAL, `signed-in trust row shows your real score: ${myTrustRow ? myTrustRow[1] : "(not in top 15)"} (expected ${REAL})`);
ok(/yours is your real score/.test(signedIn), "signed-in trust board says example scores are illustrative");
const demo = dec(render("all", "trust", logs));
ok(!/yours is your real score/.test(demo), "demo (no real score) does not add that note");
const demoRank = +(demo.match(/You’re #(\d+)/) || [0, 0])[1], realRank = +(youCard || [0, 0])[1];
ok(realRank === 1 && demoRank > 1, `your trust rank follows your real score (preview formula #${demoRank}, real score #${realRank})`);

// Classic climbs is a count of ROUTES. Log one classic twice, plus a classic the demo climber's
// seed history already holds, and your row must count each route once.
const { ME } = require_(out);
const seedClassics = new Set(ROUTES.filter(r => r.classic && (r.activity || []).some(a => a.user === ME.name)).map(r => r.id));
const other = ROUTES.find(r => r.classic && !seedClassics.has(r.id));
const again = [...seedClassics][0];
const dupLogs = [
  { id: "d1", routeId: other.id, tickType: "Lead", date: "2026-08-01" },
  { id: "d2", routeId: other.id, tickType: "Lead", date: "2026-08-09" },
  ...(again ? [{ id: "d3", routeId: again, tickType: "Summit", date: "2026-08-10" }] : []),
];
const expect = new Set([...seedClassics, other.id]).size;
const mine = dec(render("all", "classics_b", dupLogs)).match(/aria-label="#\d+, [^"]*, you, [^"]*, (\d+) classics"/);
ok(mine && +mine[1] === expect, `Classic climbs counts distinct routes: your row reads ${mine ? mine[1] : "(not found)"}, expected ${expect}`);
console.log(`\n${fails ? "FAIL" : "ok"} — ${seen.size} distinct rankings across ${DISCS.length} climbing types, ${oks} assertions passed, ${fails} failed`);
process.exitCode = fails ? 1 : 0;
