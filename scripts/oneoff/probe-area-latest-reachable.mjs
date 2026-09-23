// Does `?za=1` actually put AreaLatest's report rows on screen, and what does Chrome announce
// for them? One page load, not a 63-screen walk — the full guard kept being reaped on a loaded
// box, and this answers the only question that matters.
//
// Prints, for the Climbs tab with an area selected: the area chosen, whether the AREA'S LATEST
// heading is present, and every [role=button] row that looks like a report, with its computed
// accessible name. If the rows are there but announce with a separator (a leading "✓"), the
// widened needle is CORRECT to skip them and the injection case simply cannot fire on this
// seed data.
import { assertQuietBox } from "../lib/quiet-box.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A browser verdict from an oversubscribed box is not evidence in either direction — a miss reads
// as a live defect, a pass can be vacuous because nothing settled. Refuses above 6x cores; --anyway
// runs regardless and stamps the output as not evidence. See scripts/lib/quiet-box.mjs.
assertQuietBox("probe-area-latest-reachable.mjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5295;

// CLAIM a free port; never adopt whatever answers 5295. With --strictPort a collision kills vite
// outright, and waitUp() below then succeeds against the FOREIGN server — so this prints numbers
// indistinguishable from a healthy run while describing somebody else's app. That is the #464
// shape check:ui already paid for, and it happened here: a run reported the recorded body length
// of 979 with `area selected: null` where the recorded run says "Kings Peak", and nothing in the
// output could say whether that was a regression or a different server.
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
const base = `http://127.0.0.1:${port}`;

const server = spawn(
  "npx",
  ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
// A dead spawn is fatal. Without this flag the only symptom of a vite that never started is a
// line on stderr nothing reads, and the walk carries on against whatever else is listening.
let died = false;
server.on("exit", () => { died = true; });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("SIGINT", () => { stop(); process.exit(130); });
process.on("SIGTERM", () => { stop(); process.exit(130); });

async function waitUp() {
  for (let i = 0; i < 90; i++) {
    try { const r = await fetch(base); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}
if (!(await waitUp()) || died) {
  console.error(died ? "the dev server exited during startup — port taken, or the config failed to apply" : "dev server never answered");
  stop(); process.exit(1);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Accessibility.enable");
await page.goto(base + "?za=1&zt=routes", { waitUntil: "domcontentloaded", timeout: 120000 });
const ready = await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 60000 }).then(() => true).catch(() => false);
// Swallowing this made "the app never booted" and "the section is correctly absent" print the
// same report. index.html's boot placeholder mirrors the real nav, so a blank app still looks
// plausible — the trap check:overlay-scroll records, where a broken scaffold exited 0 having
// verified nothing.
if (!ready) {
  console.error("the app never signalled __overlaysReady — it did not boot, so nothing below describes this app.");
  await browser.close(); stop(); process.exit(1);
}
await page.waitForTimeout(4000);

const info = await page.evaluate(() => {
  const txt = document.body.innerText || "";
  const rows = [];
  let i = 0;
  for (const el of document.querySelectorAll("[role=button]")) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    // A report row carries a person and an outcome; the date line makes it unambiguous.
    if (!/ago|\d{4}-\d{2}-\d{2}/.test(t)) continue;
    el.setAttribute("data-areaprobe", String(i));
    rows.push({ probe: i, text: t.slice(0, 80) });
    i++;
  }
  return {
    area: window.__areaOpen || null,
    areaErr: window.__areaOpenError || null,
    hasHeading: /AREA'S LATEST|LATEST FROM|Latest/i.test(txt),
    headingSample: (txt.match(/[A-Z' ]{6,30}LATEST[A-Z' ]{0,20}/) || [])[0] || null,
    rows,
    bodyLen: txt.length,
  };
});

console.log("area selected      :", info.area);
if (info.areaErr) console.log("area opener error  :", info.areaErr);
console.log("body text length   :", info.bodyLen);
console.log("a 'latest' heading :", info.hasHeading, info.headingSample ? JSON.stringify(info.headingSample) : "");
console.log("report-ish rows    :", info.rows.length);

const doc = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
for (const r of info.rows) {
  let name = "(none)";
  try {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: `[data-areaprobe="${r.probe}"]` });
    if (nodeId) {
      const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
      const ax = (nodes || []).find((x) => x.name && x.name.value != null);
      if (ax) name = (ax.ignored ? "(ignored) " : "") + JSON.stringify(String(ax.name.value));
    }
  } catch {}
  console.log(`  row: ${JSON.stringify(r.text)}\n       announced ${name}`);
}

await browser.close();
stop();
// Exit 0 means the page loaded and the numbers above describe THIS app, never that AreaLatest
// rendered. "Cannot reach it" is the recorded correct answer — that section is dead in
// production (selArea is written only on the seed path, and deploy.yml sets VITE_USE_DB=true),
// and check:a11y-badges' `arealatest` injection case expects a PASS for exactly that reason. Do
// not "fix" this into a verdict; the boot guard above is what makes the exit mean anything at
// all. READ THE OUTPUT.
process.exit(0);
