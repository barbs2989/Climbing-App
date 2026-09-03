// "WHO CAN MESSAGE ME -> Friends & crew only" NAMES TWO CATEGORIES AND FILTERS ON ONE.
//
// Settings ships this control ungated (it is NOT behind PRIVACY_CONTROLS_LIVE, unlike four of its
// neighbours) and its own copy reads:
//
//     "Only your friends and crew members can message you — others can't reach your inbox."
//
// The one consumer is Inbox's thread filter, and it asks a single question:
//
//     const isFr = t => (connections||[]).some(c => c.id === t.c.id);
//
// `connections` is the FRIENDS list. Crew membership is never consulted, though Inbox already
// receives `crews` and uses it two lines down to build crewThreads. So a climber you are in a crew
// with — but not connected to — is filtered out of the inbox the copy promises they can reach.
//
// Under "friends" the dropped thread lands NOWHERE: reqT is [] in that mode, so unlike the
// "requests" mode there is no bucket to review it in. It is not blocked, it is invisible.
//
// Bundling: @tanstack/react-query MUST be --external, or esbuild inlines its own copy and the
// provider wrapped around the component is a different module instance with a different context.
// Invocation copied from check:topo-outage-copy rather than re-derived.
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (m) => { console.error("FAIL (probe cannot report): " + m); process.exit(1); };

const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-inbox-"));
const entry = path.join(tmp, "entry.js"), out = path.join(tmp, "bundle.mjs");
process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} });

fs.writeFileSync(entry,
  `export { Inbox, CLIMBERS } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};\n`);
try {
  execFileSync("npx", ["esbuild", entry,
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle ClimbMatchCore.jsx"); }

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
}
const { Inbox, CLIMBERS } = await import(out + "?t=" + Date.now());
if (typeof Inbox !== "function") dead("ClimbMatchCore.jsx does not export Inbox — ANCHOR LOST");
if (!Array.isArray(CLIMBERS) || CLIMBERS.length < 3) dead("CLIMBERS did not load — ANCHOR LOST");

// Two seed climbers, neither of them a connection. One shares a crew with me; one does not.
const mate = CLIMBERS[0], stranger = CLIMBERS[1];
if (!mate || !stranger || mate.id === stranger.id) dead("could not pick two distinct seed climbers");

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
// A numeric thread id resolves from CLIMBERS synchronously, so nothing here depends on a fetch.
// ASSERT ON THE MESSAGE BODY, NEVER THE SENDER'S NAME. The inbox renders a sender through
// pubName(), which falls back to the handle unless showName is set — CLIMBERS[0] has it and
// CLIMBERS[1] does not, so a name assertion reported a thread that WAS listed (as "@mayaclimbs")
// as missing, and made a real finding look like a broken probe.
const MATE_MSG = "Rack sorted for Saturday", STRANGER_MSG = "Hey, climb sometime";
const msgs = {
  [String(mate.id)]:     [{ from: "them", text: MATE_MSG + "?",     ts: 2 }],
  [String(stranger.id)]: [{ from: "them", text: STRANGER_MSG + "?", ts: 1 }],
};
const crews = [{ id: "crew_probe", routeId: "probe_route", name: "Probe Crew",
                 members: [{ climberId: mate.id, status: "confirmed" }] }];

const render = (msgFrom) => renderToStaticMarkup(
  React.createElement(QueryClientProvider, { client: qc },
    React.createElement(Inbox, {
      msgs, crews, crewMsgs: {}, connections: [], msgFrom,
      onOpenDM: noop, onOpenCrew: noop, onClose: noop,
      onDeleteDM: noop, onDeleteCrew: noop, onAcceptReq: noop,
      crewUnread: {}, dmUnread: {}, routeById: () => null, dmUnavailable: false,
    })));

let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`);
  if (!cond) fail++;
};

const everyone = render("everyone");
const friends  = render("friends");

// Without this every "is not listed" assertion below passes against a component that rendered
// nothing at all.
ok("ANCHOR — the inbox rendered", everyone.includes("Messages") && everyone.length > 900,
  `only ${everyone.length} chars`);
ok('CONTROL — under "everyone" the crewmate\'s thread is listed', everyone.includes(MATE_MSG),
  "the harness never showed the thread in the first place, so nothing below means anything");
ok('CONTROL — under "everyone" the stranger\'s thread is listed', everyone.includes(STRANGER_MSG));

ok("a crewmate who is not a connection reaches the inbox", friends.includes(MATE_MSG),
  'the copy promises "friends and crew members"; the filter asks only about connections');
ok("a stranger is still filtered out", !friends.includes(STRANGER_MSG),
  "the filter was widened into a no-op — that is not the fix");

// The SETTINGS copy is the other half, and it lives in App — which no SSR render here can stand
// up. Asserted as source instead: the render above proves the filter, and this proves the sentence
// beside it still describes what that filter does. "others can't reach your inbox" is a BLOCKING
// claim and nothing blocks — sendDirectMessage's policy is `auth.uid() = sender_id` with no test of
// the recipient's preference, so the row is written and the thread reaches dmThreads.
const settings = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
if (settings.indexOf("WHO CAN MESSAGE ME") < 0) dead("ClimbMatch.jsx no longer renders WHO CAN MESSAGE ME — ANCHOR LOST");
ok("the setting no longer claims strangers are blocked",
  settings.indexOf("can't reach your inbox") < 0,
  "a message from a non-friend is hidden from the reader, not withheld from the sender");
ok("it still names both categories it filters on",
  settings.indexOf("Only your friends and crew members") >= 0,
  "the replacement copy dropped the promise the filter now keeps");

console.log(fail ? `\n${fail} failure(s).` : "\nall cases pass — the filter covers both categories its copy names.");
process.exitCode = fail ? 1 : 0;
