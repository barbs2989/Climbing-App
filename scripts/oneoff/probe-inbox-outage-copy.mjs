// Does the Inbox tell a failed read apart from an account with no chats?
//
// `fetchMyDirectMessages` THROWS on a database error -- check:read-failures made sure of that,
// and its caller's `.catch` releases the retry latch so a reopen can recover. What neither did is
// tell the SCREEN. `msgs` stays `{}`, and the Inbox renders "No friend chats yet" above "Message a
// partner from their profile and your chats will live here." -- telling somebody who HAS
// conversations that they have none, and inviting them to go start one. That is
// [[throwing-is-not-enough-the-screen-still-says-none]], on an overlay.
//
// WHY A COMPONENT PROBE RATHER THAN check:outage. That guard compares a healthy walk against a
// failing one, and the fixture has no DM threads at all -- so the section is empty in BOTH runs,
// rule 2 sees nothing introduced, and the run says nothing either way. An absence the fixture
// happens to share is unmeasurable, not absent. It is also behind an OVERLAY, which no outage walk
// opens. Seeding threads into the fixture would make it measurable; that is a bigger change than
// the fix, and this probe is what stands in until then.
//
// Renders the REAL Inbox out of ClimbMatchCore.jsx. No browser, no database.

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
// Inbox calls useProfilesByIds, a react-query hook, so it needs a provider or the render throws
// "No QueryClient set" before any assertion runs. retry:false keeps a failing query from spinning
// -- SSR does not run effects anyway, so the query never resolves and its data is undefined,
// which is exactly the shape this probe is about.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Bundle INSIDE the project: node resolves `react` from the nearest node_modules, so a bundle in
// the OS temp dir throws ERR_MODULE_NOT_FOUND. And `lib/supabase.js` reads import.meta.env at
// module scope, so it has to be defined or the import throws before anything renders.
const out = path.join(ROOT, `.inbox-probe-${process.pid}.mjs`);
try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}", "--external:react", "--external:react-dom",
    // react-query MUST be external too. Bundled, esbuild inlines its own copy, and the
    // QueryClientProvider imported here is then a DIFFERENT module instance with a different
    // React context -- the render still throws "No QueryClient set" with a provider plainly
    // wrapped around it, which reads as the provider not working rather than as two copies.
    "--external:@tanstack/react-query",
    "--external:react-dom/server", "--outfile=" + out], { stdio: "pipe" });

  const mod = await import(out);
  const Inbox = mod.Inbox || mod.default?.Inbox;
  if (typeof Inbox !== "function") {
    console.error("FAIL — Inbox is not exported from ClimbMatchCore.jsx, so nothing was rendered.");
    console.error("Re-point this probe rather than deleting it; the copy it guards is still live.");
    process.exit(1);
  }

  const base = {
    msgs: {}, crews: [], crewMsgs: {}, connections: [], msgFrom: {},
    crewUnread: {}, dmUnread: {}, routeById: () => null,
    onOpenDM() {}, onOpenCrew() {}, onClose() {}, onDeleteDM() {}, onDeleteCrew() {},
    onAcceptReq() {},
  };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const render = (props) => renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(Inbox, { ...base, ...props })));

  // renderToStaticMarkup ESCAPES: the app's curly apostrophe and `&` come out as entities, so
  // match the escaped form. [[ssr-probes-must-match-escaped-html]].
  const has = (html, s) => html.includes(s);
  const cases = [
    { name: "genuinely empty — no threads, read succeeded",
      props: {},
      want: "No friend chats yet", notWant: "couldn",
      why: "An honest negative. This copy must survive: most accounts really have no chats." },
    { name: "OUTAGE — the same empty list, but the read FAILED",
      props: { dmUnavailable: true },
      want: "load your chats", notWant: "No friend chats yet",
      why: "THE DEFECT. Identical state, and the screen must not call it an empty inbox." },
    { name: "populated — a real thread, flag off",
      props: { msgs: { 5: [{ from: 5, text: "hi", ts: Date.now() }] }, connections: [{ id: 5, name: "Robin" }] },
      want: null, notWant: "No friend chats yet",
      why: "The empty state must not render at all when there is something to show." },
  ];

  let bad = 0;
  for (const c of cases) {
    const html = render(c.props);
    const okWant = c.want == null || has(html, c.want);
    const okNot = !has(html, c.notWant);
    const ok = okWant && okNot;
    if (!ok) bad++;
    console.log(`${ok ? "  ok   " : "  FAIL "}${c.name}`);
    if (!ok) {
      console.log(`         wanted ${JSON.stringify(c.want)} -> ${okWant};`
        + ` must NOT contain ${JSON.stringify(c.notWant)} -> ${okNot}`);
    }
    console.log(`         ${c.why}`);
  }

  // Fail closed: a render that produced almost nothing would satisfy every "must NOT contain".
  const len = render({}).length;
  if (len < 300) {
    console.error(`\nFAIL — the empty Inbox rendered only ${len} characters. Every negative`);
    console.error("assertion above would pass against a component that rendered nothing.");
    bad++;
  }

  console.log(bad ? `\n${bad} case(s) failed.`
    : `\nok — the Inbox tells a failed read apart from an empty one (${len} chars rendered).`);
  process.exitCode = bad ? 1 : 0;
} finally {
  fs.rmSync(out, { force: true });
}
