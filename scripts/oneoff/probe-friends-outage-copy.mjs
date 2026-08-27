// Does the friends list tell a failed read apart from having no friends?
//
// `connectionsUnavailable` has existed since #1224 and reaches six places in ClimbMatch.jsx --
// but not the FriendsList OVERLAY, which renders "No friends yet." from the same `connections`
// the flag is about. So an outage told a climber with partners that they have none, on the one
// screen whose entire subject is who you climb with.
//
// FOUND BY MEASUREMENT, NOT BY GREP. probe-overlays-that-assert-absence.mjs reports which of the
// 53 overlays assert absence; `friendsOpen` came out ungated, and following its component to
// ClimbMatchCore.jsx confirmed the empty state is real and the prop list has no flag in it.
//
// WHY ONLY THE NO-FRIENDS BRANCH IS GATED. FriendsList has three empty strings and the other two
// are claims about the FILTERS the user just set -- "None of your friends share your saved
// objectives yet" and "No friends match" are true of a filtered view of whatever did load.
// Gating those would replace a correct sentence with an error message.
//
// check:outage cannot reach this: it is behind an overlay, which no outage walk opens.

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
// FriendsList's tree reaches react-query hooks, so it needs a provider -- and react-query must be
// --external below, or esbuild inlines its own copy and the provider here is a different module
// instance with a different context. The error is still "No QueryClient set".
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(ROOT, `.friends-probe-${process.pid}.mjs`);

try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}", "--external:react", "--external:react-dom",
    "--external:@tanstack/react-query", "--external:react-dom/server",
    "--outfile=" + out], { stdio: "pipe" });

  const mod = await import(out);
  const FriendsList = mod.FriendsList || mod.default?.FriendsList;
  if (typeof FriendsList !== "function") {
    console.error("FAIL — FriendsList is not exported from ClimbMatchCore.jsx; nothing rendered.");
    console.error("Re-point this probe rather than deleting it; the copy it guards is still live.");
    process.exit(1);
  }

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const base = {
    friends: [], myFriendIds: [], kudosGiven: {}, hasVouched: () => false,
    onClose() {}, onOpenProfile() {}, onMessage() {}, onRemove() {},
    onFormCrew() {}, onVouch() {}, onKudos() {},
  };
  const render = (props) => renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(FriendsList, { ...base, ...props })));

  const cases = [
    { name: "genuinely empty — no friends, read succeeded",
      props: {}, want: "No friends yet", notWant: "unread",
      why: "An honest negative, and it must survive: a new account really has no friends." },
    { name: "OUTAGE — the same empty list, but the read FAILED",
      props: { unavailable: true }, want: "unread, not empty", notWant: "No friends yet",
      why: "THE DEFECT. Identical state; the screen must not call it an empty friends list." },
    { name: "populated — a real friend, flag off",
      props: { friends: [{ id: "u1", name: "Robin Belay", location: "Bellingham, WA" }] },
      want: null, notWant: "No friends yet",
      why: "The empty state must not render when there is something to show." },
  ];

  let bad = 0;
  for (const c of cases) {
    const html = render(c.props);
    const okWant = c.want == null || html.includes(c.want);
    const okNot = !html.includes(c.notWant);
    const ok = okWant && okNot;
    if (!ok) bad++;
    console.log(`${ok ? "  ok   " : "  FAIL "}${c.name}`);
    if (!ok) console.log(`         want ${JSON.stringify(c.want)} -> ${okWant}; `
      + `must NOT contain ${JSON.stringify(c.notWant)} -> ${okNot}`);
    console.log(`         ${c.why}`);
  }

  // The two FILTER messages must stay ungated -- they are true of whatever did load, and turning
  // them into an error would be a guard telling the author to break correct copy.
  const filtered = render({ friends: [{ id: "u1", name: "Robin" }], unavailable: true });
  if (filtered.includes("unread, not empty")) {
    console.error("\nFAIL — the outage copy rendered while friends WERE present. Only the");
    console.error("no-friends branch may be gated.");
    bad++;
  }

  // Fail closed: a near-empty render satisfies every "must NOT contain" above.
  const len = render({}).length;
  if (len < 300) {
    console.error(`\nFAIL — the empty FriendsList rendered only ${len} characters; every negative`);
    console.error("assertion above would pass against a component that rendered nothing.");
    bad++;
  }

  console.log(bad ? `\n${bad} case(s) failed.`
    : `\nok — the friends list tells a failed read apart from an empty one (${len} chars).`);
  process.exitCode = bad ? 1 : 0;
} finally {
  fs.rmSync(out, { force: true });
}
