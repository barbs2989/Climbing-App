// "Trust 55+ only" was a label with nothing behind it: both group-join handlers gated on
// `policy==="approval"` and nothing anywhere read a trust score, so an account at trust 0 joined a
// group whose own chip promised it vetted low-trust accounts out. A gate is a CLICK, so this is
// driven in a real browser rather than argued about.
//
// It also covers the sibling defect on the same screens: a group's join-policy chip read "Open to
// all" while its own visibility block said "join by invite only".
//
// The CONTROLS are what make the positive assertions mean anything:
//   1. a trust-gated group REFUSES the demo climber (measured vScore 18) and says why
//   2. an OPEN group still joins — a join path broken for everything looks identical to a gate
//   3. with the climber's trust raised above the bar, the SAME trust-gated group ADMITS them —
//      a gate that always refuses is not a gate, and assertion 1 alone cannot tell the difference
//   4. a PRIVATE group reads "Invite only", and a PUBLIC one still reads "Open to all" — a label
//      stuck on either value would satisfy one half alone
//
// Run 3 reads the boosted score off the page before judging: a boost that silently failed would
// otherwise report a working gate as broken.
//
//   node scripts/oneoff/probe-group-trust-gate.mjs
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5410;
const log = (m) => console.log(m);

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
async function claimPort(start, span = 40) {
  for (let p = start; p < start + span; p++) {
    const free = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}

const port = await claimPort(PORT);
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port} with three injected groups...`);
const server = spawn(
  "npx",
  ["vite", "--config", "scripts/group-trust.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) {
  console.error(died ? "the dev server exited during startup — port taken, or the scaffold failed to apply" : "dev server never came up");
  stopServer(); process.exit(1);
}

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) {
  console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]);
  stopServer(); process.exit(1);
}
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(30000);
page.on("pageerror", (e) => console.log("  page error: " + e.message.slice(0, 160)));

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

const bodyText = () => page.evaluate(() => document.body.innerText || "");

// ONE definition of "this group's card", shared by every read below. The card is the SMALLEST
// element that mentions the group AND contains its own button — walking a fixed number of parents
// up from the name label reaches the container holding every card, so a sibling group's text
// answers for this one (which is exactly how an earlier version of this probe reported a fixed
// label as still broken). A fixed window encodes a guess about the subject's size; this does not.
const CARD_FN = `(mk) => {
  const cands = [...document.querySelectorAll("div,li,article,section")].filter((e) =>
    (e.innerText || "").includes(mk) && e.querySelector("button"));
  if (!cands.length) return null;
  return cands.reduce((a, b) => (!a || b.innerText.length < a.innerText.length ? b : a), null);
}`;

const cardText = (marker) => page.evaluate(new Function("mk", `const cardOf=${CARD_FN};const c=cardOf(mk);return c?(c.innerText||""):null;`), marker);

const cardSaysJoined = async (marker) => {
  const t = await cardText(marker);
  return t === null ? null : /Joined/.test(t);
};

const tapJoinOn = (marker) => page.evaluate(new Function("mk", `
  const cardOf=${CARD_FN};
  const card = cardOf(mk);
  if (!card) {
    const any = [...document.querySelectorAll("button")].map((b) => (b.innerText || "").trim()).filter(Boolean);
    return "no-card; buttons on page: " + any.join(" | ").slice(0, 200);
  }
  const btn = [...card.querySelectorAll("button")].find((b) => /^(Join|Request)\\b/.test((b.innerText || "").trim()));
  if (!btn) return "no-button:" + [...card.querySelectorAll("button")].map((b) => (b.innerText || "").trim()).join("|").slice(0, 80);
  btn.click();
  return "clicked";
`), marker);

async function loadGroups(qs) {
  await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__zTrustReady === 1, null, { timeout: 30000 }).catch(() => {});
  await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});
  return page.evaluate(() => window.__zTrustReady === 1);
}

// ── Run 1: the demo climber, measured at vScore 18, well under the bar.
if (!(await loadGroups("?ztrust=1"))) {
  console.log("  FAIL  the scaffold never seeded its groups — nothing below was checked.");
  stopServer(); process.exit(1);
}
const seeded = await bodyText();
if (!seeded.includes("ZZTRUSTZZ") || !seeded.includes("ZZOPENZZ")) {
  console.log("  FAIL  the injected groups are not on the Groups tab (trust=" + seeded.includes("ZZTRUSTZZ") + ", open=" + seeded.includes("ZZOPENZZ") + "). Nothing below was checked.");
  stopServer(); process.exit(1);
}
ok("both probe groups are on screen");

const r1 = await tapJoinOn("ZZTRUSTZZ");
if (r1 !== "clicked") { fail(`could not press Join on the trust-gated group (${r1})`); }
else {
  await settledText(page, { min: 30, timeout: 20000 }).catch(() => {});
  const after = await bodyText();
  if (!/for climbers at trust \d+\+/.test(after)) {
    fail("joining a trust-gated group at trust 18 said nothing about trust — the gate did not fire");
  } else {
    const msg = (/This group is for climbers at trust[^\n]*/.exec(after) || [""])[0];
    ok("refused, and said why: " + JSON.stringify(msg.slice(0, 110)));
  }
  // Refusing has to mean NOT JOINED. A toast beside a completed join would be worse than silence.
  const joined = await cardSaysJoined("ZZTRUSTZZ");
  if (joined) fail("the group says Joined despite the refusal — the toast is decorative and the gate does not gate");
  else ok("the group was not joined");
}

// ── Run 2 (control): an OPEN group must still join. Without this, a join path broken for every
//    group is indistinguishable from a working gate.
const r2 = await tapJoinOn("ZZOPENZZ");
if (r2 !== "clicked") { fail(`could not press Join on the open group (${r2})`); }
else {
  await settledText(page, { min: 30, timeout: 20000 }).catch(() => {});
  const joined = await cardSaysJoined("ZZOPENZZ");
  if (joined) ok("an OPEN group still joins — the refusal is caused by the policy, not by a broken join");
  else fail("an open group did not join either — the join path is broken, so the refusal above proves nothing");
}

// ── Run 2b: a PRIVATE group must not advertise itself as open to all. `policy` and `visibility`
//    are different fields and were labelled independently, so a private group whose policy was
//    left at the default read "Open to all" on its card and "join by invite only" three lines
//    below on its detail screen. Both directions are asserted: the private one must not say open,
//    and the public one must still say it — a label that always reads "Invite only" would satisfy
//    the first on its own.
const privCard = await cardText("ZZPRIVATEZZ");
if (privCard === null) {
  fail("the private probe group is not on screen — the visibility label was never checked");
} else if (/Open to all/.test(privCard)) {
  fail("a PRIVATE group still advertises \"Open to all\" — the policy chip ignores visibility");
} else if (!/Invite only/.test(privCard)) {
  fail("a private group says neither \"Open to all\" nor \"Invite only\" — the chip is missing: " + JSON.stringify(privCard.slice(0, 120)));
} else {
  ok("a private group reads \"Invite only\", not \"Open to all\"");
}
const pubCard = await cardText("ZZOPENZZ");
if (pubCard && /Open to all/.test(pubCard)) ok("a PUBLIC open group still reads \"Open to all\"");
else fail("a public open group no longer says \"Open to all\" — the label now reads private for everything: " + JSON.stringify((pubCard || "").slice(0, 120)));

// ── Run 2c: a group's "Based in" clause. Location is OPTIONAL — the Create button gates on the
//    name alone — and the line was built as `"📍 Based in "+cl.location+" · N members"`, so a group
//    without one read "📍 Based in  · 1 member". check:zero's own dump carries the before/after for
//    the EMPTY case (its overlay probe group has no location); this fixture's groups DO have one,
//    which is the half that dump cannot show. A helper that always dropped the clause would satisfy
//    the empty case on its own.
const locCard = await cardText("ZZOPENZZ");
if (locCard === null) {
  fail("the located probe group is not on screen — the \"Based in\" clause was never checked");
} else if (!/Based in Bellingham, WA/.test(locCard)) {
  fail("a group WITH a location no longer says where it is based: " + JSON.stringify(locCard.slice(0, 140)));
} else if (/Based in\s+·/.test(locCard)) {
  fail("the location clause renders with nothing in it: " + JSON.stringify(locCard.slice(0, 140)));
} else {
  ok("a group with a location still reads \"Based in Bellingham, WA\"");
}

// ── Run 3: raise the climber above the bar and press the SAME control. A gate that always
//    refuses is not a gate.
if (!(await loadGroups("?ztrust=1&ztboost=1"))) {
  fail("the boosted run never seeded — the ADMIT half is unproven");
} else {
  const boosted = await page.evaluate(() => window.__zTrustBoost);
  if (typeof boosted !== "number") {
    fail("the trust boost did not land (window.__zTrustBoost = " + JSON.stringify(boosted) + ") — refusing to judge the ADMIT path on it");
  } else if (boosted < 55) {
    fail(`the boost only reached trust ${boosted}, still under the bar — the ADMIT path was not exercised`);
  } else {
    ok(`trust raised to ${boosted}, above the bar`);
    const r3 = await tapJoinOn("ZZTRUSTZZ");
    if (r3 !== "clicked") fail(`could not press Join on the boosted run (${r3})`);
    else {
      await settledText(page, { min: 30, timeout: 20000 }).catch(() => {});
      const after = await bodyText();
      const joined = await cardSaysJoined("ZZTRUSTZZ");
      if (/for climbers at trust \d+\+/.test(after)) fail("a climber ABOVE the bar was still refused — the gate blocks everyone");
      else if (!joined) fail("a climber above the bar neither joined nor was told why");
      else ok("a climber above the bar joins");
    }
  }
}

await browser.close();
stopServer();
console.log(failures ? `\n${failures} assertion(s) failed.` : "\nok — the trust policy is enforced, only for trust-gated groups, and only below the bar.");
process.exit(failures ? 1 : 0);
