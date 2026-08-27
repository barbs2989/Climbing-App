// What does the Colorado 14ers card say about the peak it can never hold?
//
// `extra = L.total - inCat` is 53 - 52 = 1, and the card renders
//   "+ 1 more on the full list — fills in as the catalog grows."
// That 1 is MOUNT BROSS, whose summit is privately owned and closed to the public. It was left
// out ON PURPOSE (0146, and memory/peak-list-gaps-researched-2026-08-13), so it does not fill in
// as the catalog grows and the sentence is a promise the app cannot keep.
//
// co14 is the ONLY list with extra > 0 — every other roster is complete — so this sentence
// renders on exactly one card, and on that card it is false.
//
// Borrows check:challenge-rows' scaffold: same config, same demo, same navigation, because the
// rows are behind local `showLists` state that no ?z= opener can reach.
//
//   node scripts/oneoff/probe-colorado-14ers-ceiling-copy.mjs
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const log = (m) => console.log(m);

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

const port = await claimPort(5460);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port}...`);
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });

let up = false;
for (let i = 0; i < 150; i++) {
  if (died) break;
  try { const r = await fetch(base); if (r.ok) { up = true; break; } } catch {}
  await new Promise((r) => setTimeout(r, 2000));
}
if (!up || died) { console.error("dev server never came up"); stopServer(); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(300000);

const fail = [];
try {
  await page.goto(base + "?zt=logbook", { waitUntil: "domcontentloaded", timeout: 300000 });
  await page.waitForTimeout(6000);

  const tapText = async (t) => page.evaluate((txt) => {
    const els = [...document.querySelectorAll("button,div,span")];
    const hit = els.reverse().find(e => e.textContent && e.textContent.trim() === txt && e.getBoundingClientRect().width > 0);
    if (hit) { hit.click(); return true; }
    return false;
  }, t);

  if (!(await tapText("Challenges"))) fail.push("could not reach the Challenges sub-tab — this probe verified nothing");
  await page.waitForTimeout(1500);

  const opened = await page.evaluate(() => {
    const els = [...document.querySelectorAll("span,div,button")];
    const hit = els.find(e => /^Colorado 14ers\b/.test((e.textContent || "").trim()) && e.getBoundingClientRect().width > 0);
    if (hit) { hit.click(); return (hit.textContent || "").trim().slice(0, 40); }
    return null;
  });
  if (!opened) fail.push("no Colorado 14ers chip on screen — nothing to open");
  else log(`  opened panel via chip: ${opened}`);
  await page.waitForTimeout(2000);

  // The card must be EXPANDED — the note is gated on `isOpen === L.key`, same second gate
  // check:challenge-rows records getting wrong in its first draft.
  const before = (await page.evaluate(() => document.body.innerText || "")).length;
  const expanded = await page.evaluate(() => {
    const els = [...document.querySelectorAll("div")];
    const hits = els.filter(e => /^Colorado 14ers/.test((e.textContent || "").trim()) && e.getBoundingClientRect().width > 0);
    const hit = hits.sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
    if (!hit) return null;
    hit.click();
    return (hit.textContent || "").trim().slice(0, 40);
  });
  if (!expanded) fail.push("could not expand the Colorado 14ers card — no note to read");
  else log(`  expanded card: ${expanded}`);
  await page.waitForTimeout(1500);

  const text = await page.evaluate(() => document.body.innerText || "");
  log(`  panel text: ${before} -> ${text.length} chars`);
  // Fails closed: a card that never opened has no note, and "no note" must not read as "no lie".
  if (text.length <= before) fail.push(`expanding added no text (${before} -> ${text.length}) — nothing rendered, so this run proves nothing`);

  const line = (text.split("\n").find((l) => /more on the full list|not on this list|tops out at|closed to the public/i.test(l)) || "").trim();
  log(`\n  THE LINE ON SCREEN: ${line ? JSON.stringify(line) : "-- none found --"}`);

  const promises = /fills in as the catalog grows/i.test(text);
  const namesBross = /Mount Bross/i.test(text);
  const saysClosed = /closed to the public/i.test(text);
  const chip = (text.match(/Colorado 14ers\s*\n?\s*[^\n]*?(\d+)\s*\/\s*(\d+)/) || []).slice(1).join(" / ");
  log(`  chip reads                                : ${chip || "-- not matched --"}`);
  log(`  promises it fills in as the catalog grows : ${promises}   (want false)`);
  log(`  names Mount Bross                         : ${namesBross}   (want true)`);
  log(`  says the summit is closed to the public   : ${saysClosed}   (want true)`);
  if (promises) fail.push("still promises the missing peak fills in as the catalog grows");
  if (!namesBross) fail.push("does not name Mount Bross — 52 is unexplained");
  if (!saysClosed) fail.push("does not say why it is excluded");
  if (/\b\/\s*53\b/.test(text)) fail.push("the card still advertises a total of 53, which it can never reach");
} catch (e) {
  fail.push("threw: " + String(e.message).split("\n")[0]);
} finally {
  await browser.close();
  stopServer();
}

if (fail.length) { console.error("\n" + fail.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log("\nprobe ran — read the line above.");
