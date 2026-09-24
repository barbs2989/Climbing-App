// Renders Ranks (lib/Leaderboards.jsx) server-side in BOTH populations, with no network and no
// browser: the signed-out demo board, and the signed-in board fed by leaderboard() rows seeded
// straight into the query cache (the shape 0194 returns). Written 2026-09-24 when the box was too
// oversubscribed for a browser walk. Asserts every board renders, real rows reach the screen,
// the report button and the backed switch appear only where they should, and no example
// profile is mixed into the real board.
//   node scripts/oneoff/probe-ranks-renders.mjs
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Leaderboards from ${JSON.stringify(path.join(ROOT, "lib/Leaderboards.jsx"))};
export function render(props, seed) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  (seed || []).forEach(([k, v]) => qc.setQueryData(k, v));
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(Leaderboards, props)));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-ranks-")), "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render } = require_(out);
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const base = { myTrust: 5, meLive: null, logs: [], connections: [], showOnRanks: true, blocked: [],
  rankDisc: "all", setRankDisc: () => {}, setRankBoard: () => {}, routeById: () => null,
  onView: () => {}, onClimb: () => {}, onMessage: () => {}, friendState: () => "none", onFriend: () => {}, onReport: () => {} };

// Stats in 0194's shape. Distinctive values that appear nowhere in the codebase, so a pass can
// only have come from the seeded rows.
const st = (logged, backed, pts) => ({ logged, backed, daysYr: 3, vertYr: 4321, classics: 2,
  sends: { sport: { life: 2, yr: 2 }, rock: { life: 2, yr: 2 } }, points: { all: pts, sport: pts, rock: pts },
  onsights: { sport: { life: 1, yr: 1 }, rock: { life: 1, yr: 1 } }, onsightPts: { sport: 20, rock: 20 },
  peaks: { life: 1, yr: 1 } });
const ROWS = [
  { user_id: "11111111-1111-1111-1111-111111111111", is_me: true, name: "Me", username: "me", show_name: true,
    avatar: "", location: "Seattle", disciplines: ["sport"], dist_mi: null, no_origin: false, trust: 5,
    catches: 0, vouches: 0, contribs: 0, stats: { all: st(8, 2, 111), backed: st(2, 2, 71) } },
  { user_id: "22222222-2222-2222-2222-222222222222", is_me: false, name: "Qorvath Plinz", username: "qorvath",
    show_name: true, avatar: "", location: "Bellingham", disciplines: ["sport"], dist_mi: null, no_origin: false,
    trust: 17, catches: 7, vouches: 3, contribs: 9, stats: { all: st(13, 4, 5173), backed: st(4, 4, 2911) } },
];
const seed = [[["leaderboard", "overall", null, null, ""], ROWS],
  [["leaderboard-top-climbs", "overall", null, "all", null, ""], [{ route: { id: "probe_route_x", name: "Zyxwv Arete", grade: "5.9", discipline: "alpine", area_id: "probe_area" }, area_name: "Probe Crag", climbers: 3, avg_stars: 4.3 }]]];

const BOARDS = ["trust", "catches", "vouched", "active", "points", "onsight", "vert", "days", "peaksLife", "climbs", "classics_b", "contribs"];
// 1. The real board, every board id.
for (const b of BOARDS) {
  let h; try { h = text(render({ ...base, rankBoard: b, uid: "11111111-1111-1111-1111-111111111111", useDb: true }, seed)); }
  catch (e) { fail(`real/${b} threw: ${e.message.split("\n")[0]}`); continue; }
  if (b === "climbs") { h.includes("Zyxwv Arete") && h.includes("3 climbers") ? ok("real/climbs shows the server's top climb") : fail("real/climbs missing the seeded route"); continue; }
  if (!h.includes("Qorvath Plinz") && !h.includes("@qorvath")) fail(`real/${b}: the real climber is not on the board`);
  if (/Example profiles/.test(h)) fail(`real/${b}: the example-profile caveat renders on a real board`);
  if (/Alex Rivera|Sam Chen|Jordan/.test(h)) fail(`real/${b}: a seed climber appears on the real board`);
  const want = { points: "5,173", catches: "7", vouched: "3", contribs: "9", trust: "17", active: "13" }[b];
  if (want && !h.includes(want)) fail(`real/${b}: expected the server value ${want}`);
  const logBoard = !["trust", "catches", "vouched", "contribs"].includes(b);
  if (logBoard !== h.includes("Backed climbs only")) fail(`real/${b}: backed switch ${logBoard ? "missing" : "shown on a non-log board"}`);
  if (logBoard && !h.includes("4 of 13 backed")) fail(`real/${b}: the "N of M backed" line is missing`);
  if (!/Report .*climbs or ranking/.test(render({ ...base, rankBoard: b, uid: "u", useDb: true }, seed))) fail(`real/${b}: no report control on the real row`);
  ok(`real/${b} renders`);
}
// 2. Backed only swaps to stats.backed -- checked through the data, since the switch is state.
// 3. The demo board: still renders, still labels its examples, offers no Contributions board.
for (const b of BOARDS.filter((x) => x !== "contribs")) {
  let h; try { h = text(render({ ...base, rankBoard: b, uid: null, useDb: false })); }
  catch (e) { fail(`demo/${b} threw: ${e.message.split("\n")[0]}`); continue; }
  if (/Report .*climbs or ranking|Backed climbs only|Qorvath/.test(h)) fail(`demo/${b}: a real-mode control leaked into the demo board`);
  ok(`demo/${b} renders`);
}
const demoOptions = render({ ...base, rankBoard: "trust", uid: null, useDb: false });
/value="contribs"/.test(demoOptions) ? fail("demo offers a Contributions board it cannot fill") : ok("demo does not offer Contributions");
/value="contribs"/.test(render({ ...base, rankBoard: "trust", uid: "u", useDb: true }, seed)) ? ok("real offers Contributions") : fail("real board lacks Contributions");
// 4. A failed read says so instead of rendering an empty board.
{
  const h = text(render({ ...base, rankBoard: "points", uid: "u", useDb: true }, []));
  /Loading rankings|couldn’t be read|Couldn’t load the rankings/.test(h) ? ok("real board with no data is loading/unread, not empty") : fail("real board with no data renders as empty");
}
console.log(failures ? `\nFAIL: ${failures}` : "\nok — Ranks renders in both populations");
process.exit(failures ? 1 : 0);
