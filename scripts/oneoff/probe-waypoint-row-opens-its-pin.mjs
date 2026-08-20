// Does tapping a waypoint row actually open that pin on the map?
//
// Nothing static can answer this. The row is a div with a spread-in onClick, the map is
// Leaflet built imperatively inside an effect, and the popup is markup Leaflet injects — so
// the only proof is a real browser doing the tap. Same reasoning as check:overlay-scroll:
// only layout (here, only Leaflet) knows.
//
// It asserts the keyboard path too, not just the click. `clickable()` exists because a
// <div onClick> cannot be operated without a mouse, and this app's whole route list was
// unreachable from a keyboard until that helper landed; a new control that only works for a
// mouse would be the same defect again.
import { spawn } from "child_process";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5290;
let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); fails++; };

async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => {
      const probe = net.createServer();
      probe.once("error", () => res(false));
      probe.once("listening", () => probe.close(() => res(true)));
      probe.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}
const port = await claimPort(PORT);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;

const server = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stop);
process.on("SIGINT", () => { stop(); process.exit(130); });

for (let i = 0; i < 60; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultTimeout(30000);

await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);

// The waypoint list lives on the Plan tab for a non-crag route.
const planTab = page.locator('text="Plan"').first();
if (await planTab.count()) { await planTab.click().catch(() => {}); await page.waitForTimeout(1200); }

const rows = page.locator('[aria-label^="Show "][role="button"]');
const n = await rows.count();
if (!n) {
  fail("no waypoint row carries an aria-label 'Show … on the map' — the rows are not controls, or the list did not render");
} else {
  ok(`${n} waypoint row(s) render as controls with an accessible name`);

  // Every one must be keyboard reachable. role+tabIndex+key handler is the triad clickable()
  // supplies; a role without a tab stop is worse than a bare div.
  const noTab = await rows.evaluateAll((els) => els.filter((e) => e.getAttribute("tabindex") === null).length);
  if (noTab) fail(`${noTab} waypoint row(s) have a role but no tabIndex — announced as buttons, unreachable by keyboard`);
  else ok("every waypoint row is in the tab order");

  const label = await rows.first().getAttribute("aria-label");
  const wpName = String(label || "").replace(/^Show /, "").replace(/ on the map$/, "");

  await page.evaluate(() => { const p = document.querySelector(".leaflet-popup"); if (p) p.remove(); });
  await rows.first().click();
  await page.waitForTimeout(1400);

  const mapPresent = await page.locator(".leaflet-container").count();
  const popup = await page.locator(".leaflet-popup").count();
  const popupText = popup ? await page.locator(".leaflet-popup").first().innerText() : "";

  if (!mapPresent) {
    fail("no .leaflet-container on the page — Leaflet never loaded, so this run proves nothing about the tap (network-blocked CDN?)");
  } else if (!popup) {
    fail(`tapping "${wpName}" opened no popup — the row is a control that does nothing`);
  } else if (!popupText.toLowerCase().includes(String(wpName).toLowerCase().slice(0, 12))) {
    fail(`tapping "${wpName}" opened a popup for something else: "${popupText.slice(0, 80)}"`);
  } else {
    ok(`tapping "${wpName}" opened that waypoint's own popup on the map`);
  }

  // Keyboard: focus a DIFFERENT row and press Enter; the popup must change to that one.
  if (n > 1 && mapPresent) {
    const label2 = await rows.nth(1).getAttribute("aria-label");
    const wp2 = String(label2 || "").replace(/^Show /, "").replace(/ on the map$/, "");
    await rows.nth(1).focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1200);
    const t2 = (await page.locator(".leaflet-popup").count()) ? await page.locator(".leaflet-popup").first().innerText() : "";
    if (t2.toLowerCase().includes(String(wp2).toLowerCase().slice(0, 12))) ok(`Enter on "${wp2}" opened its pin — the row works without a mouse`);
    else fail(`Enter on "${wp2}" did not open its pin (popup showed "${t2.slice(0, 60)}") — mouse-only control`);
  }
}

await browser.close();
stop();
console.log(fails ? `\n${fails} problem(s).` : "\nok — a waypoint row opens its own pin, by tap and by keyboard.");
process.exit(fails ? 1 : 0);
