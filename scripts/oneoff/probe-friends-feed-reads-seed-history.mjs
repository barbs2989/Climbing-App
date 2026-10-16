// Can a REAL friend's logged climb ever appear in FRIENDS' RECENT ACTIVITY?
//
// The discovery-surface census filed FriendsFeed as healthy because its `connections` prop is
// DB-backed. That is a verdict about what feeds the LIST, not about what feeds the ROWS. The rows
// are `seedHistoryFor(f)` plus `f.vouches`, and
//
//     const seedIdentity  = c => !!(c && typeof c.id === "number" && (c.id !== 0 || !DB_UID));
//     const seedHistoryFor = c => seedIdentity(c) ? ticksFor(c.name) : [];
//
// so a connection whose id is a uuid STRING returns []. TickList handles this correctly -- it adds
// `extra` from real `logs` on top of the seed base -- and FriendsFeed has no equivalent.
//
// Rendered rather than reasoned about, because "returns null" and "renders an empty section" look
// identical from the source and completely different to a climber. No browser, no database.
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(ROOT, `.friends-feed-probe-${process.pid}.mjs`);
let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--loader:.jsx=jsx",
    `--define:import.meta.env=${JSON.stringify({})}`,
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { fs.rmSync(out, { force: true }); dead("esbuild could not bundle ClimbMatchCore.jsx"); }

const core = await import(out + "?t=" + Date.now());
fs.rmSync(out, { force: true });
const { FriendsFeed, CLIMBERS } = core;
if (typeof FriendsFeed !== "function") dead("FriendsFeed is not exported — ANCHOR LOST");
if (!Array.isArray(CLIMBERS) || !CLIMBERS.length) dead("CLIMBERS did not load");

const { renderToStaticMarkup } = await import("react-dom/server");
const React = await import("react");
const render = (conns) =>
  renderToStaticMarkup(React.createElement(FriendsFeed, {
    connections: conns, onOpenRoute() {}, onOpenProfile() {}, onKudos() {},
    onMsg() {}, onVouch() {}, hasVouched: () => false,
  }));

// 1. A SEED connection — an integer id and a name that authors seed activity.
const seedFriend = CLIMBERS.find((c) => typeof c.id === "number" && c.id !== 0);
if (!seedFriend) dead("no seed climber with an integer id — the fixture cannot be built");
const seedOut = render([seedFriend]);
console.log(`\nseed connection (${seedFriend.name}, id ${seedFriend.id}): ${seedOut.length} chars`);
if (seedOut.length > 200) ok("a SEED friend's history renders — so the component works and the probe can fire");
else fail(`a seed friend rendered only ${seedOut.length} chars; the probe proves nothing about the real case`);

// 2. The SAME PERSON as a real DB-derived connection: uuid id, same display name, and the shape
//    the hydration actually produces (no vouches, no grades — "carries no trust it never had").
const realFriend = {
  id: "3f2b1a55-0c4e-4a77-9d1b-8e6f0a2c4d19",
  name: seedFriend.name, avatar: seedFriend.avatar,
  location: seedFriend.location, username: "realfriend",
};
const realOut = render([realFriend]);
console.log(`real connection (same name, uuid id):        ${realOut.length} chars`);
if (realOut.length === 0)
  ok("a REAL friend renders NOTHING — the section does not appear at all, rather than appearing empty");
else fail(`expected the section to vanish for a real friend; it rendered ${realOut.length} chars`);

// 3. And it is the ID that decides, not the name: the row is keyed on seedIdentity, so no amount
//    of real climbing by that friend can reach this feed.
const realWithLogs = Object.assign({}, realFriend, {
  logs: [{ routeId: "kings_hf", date: "2026-09-01", tickType: "Summit" }],
});
if (render([realWithLogs]).length === 0)
  ok("...and attaching real logs to that friend changes nothing — FriendsFeed never reads them");
else fail("a `logs` field on the connection reached the feed; the finding needs re-deriving");

// 4. The comparison that makes it a FINDING rather than a fact about one component: TickList does
//    read real logs, so the app already knows how to do this and this surface does not.
if (typeof core.TickList !== "function") dead("TickList is not exported — the comparison cannot be made");
const tick = renderToStaticMarkup(React.createElement(core.TickList, {
  climber: realFriend,
  logs: [{ routeId: "kings_hf", date: "2026-09-01", tickType: "Summit", stars: 4 }],
  onOpen() {}, routeById: null,
}));
if (/Henry|Kings|Summit/i.test(tick))
  ok("TickList DOES render a real climber's real log — the app has the pattern, this feed lacks it");
else fail(`TickList rendered ${tick.length} chars without the real log; the comparison is inconclusive`);

console.log(bad ? `\nFAILED — ${bad}` : `\nok — FRIENDS' RECENT ACTIVITY is seed-only: a real friend's climbs cannot reach it.\n`);
process.exit(bad ? 1 : 0);
