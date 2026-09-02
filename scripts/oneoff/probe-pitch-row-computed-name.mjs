// Widening check:a11y-badges to walk a pitched route did NOT catch the "5.9CRUX" glue when the
// aria-label was removed — so either the walk does not reach the rows, or the detector does not
// flag them. Those need opposite repairs, and reasoning about Chrome's name computation from the
// markup is exactly what CLAUDE.md says not to do. This measures it.
//
// Run against a tree WITH the fix and against one WITHOUT; the interesting run is without.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5480;

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 2000)); }
  return false;
}
async function claimPort(start, span = 40) {
  for (let p = start; p < start + span; p++) {
    const free = await new Promise((res) => { const s = net.createServer(); s.once("error", () => res(false)); s.once("listening", () => s.close(() => res(true))); s.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
}

const port = await claimPort(PORT);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
console.log(`dev server on ${port}...`);
const server = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
if (!(await waitForServer(base))) { console.error("dev server never came up"); stop(); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultTimeout(30000);

await page.goto(base + "?zr=1&zrp=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 30000 }).catch(() => {});
await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});

const which = await page.evaluate(() => ({ noPitched: window.__zrNoPitched === true, title: (document.body.innerText || "").split("\n").slice(0, 14).join(" | ") }));
console.log("  route opened:", JSON.stringify(which.title.slice(0, 130)));
console.log("  scaffold fell back to ROUTES[0]:", which.noPitched);

// The pitch table lives on the Plan tab.
const tapped = await page.evaluate(() => {
  const hit = [...document.querySelectorAll("button,div,span,a")]
    .filter((e) => (e.innerText || "").trim() === "Plan")
    .filter((e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; });
  if (!hit.length) return false; hit[0].click(); return true;
});
console.log("  Plan sub-tab tapped:", tapped);
if (tapped) await settledText(page, { min: 30, timeout: 45000 }).catch(() => {});

const found = await page.evaluate(() => {
  const body = document.body.innerText || "";
  const cruxOnScreen = /CRUX/.test(body);
  // Every control whose visible text mentions CRUX, with what it announces.
  const SEL = "button,summary,select,a[href],[role=button],[role=tab],[role=link],[role=menuitem],[role=checkbox],[role=switch],[role=option]";
  const rows = [...document.querySelectorAll(SEL)]
    .filter((e) => /CRUX/.test(e.innerText || ""))
    .slice(0, 6)
    .map((e) => ({
      tag: e.tagName.toLowerCase(), role: e.getAttribute("role") || "",
      label: e.getAttribute("aria-label"),
      text: (e.innerText || "").replace(/\s+/g, " ").slice(0, 70),
    }));
  // And the raw text either side of the badge, which is what the detector keys on.
  const spans = [...document.querySelectorAll("span")].filter((s) => (s.textContent || "").trim() === "CRUX");
  const boundaries = spans.slice(0, 4).map((s) => {
    const prev = s.previousSibling;
    return { prevType: prev ? prev.nodeType : null, prevText: prev && prev.textContent ? prev.textContent.slice(-8) : null };
  });
  return { cruxOnScreen, rows, boundaries, controlsWithCrux: rows.length };
});

console.log("  CRUX text on screen:", found.cruxOnScreen);
console.log("  controls whose text contains CRUX:", found.controlsWithCrux);
for (const r of found.rows) console.log(`      <${r.tag} role=${r.role || "-"}> label=${JSON.stringify(r.label)} text=${JSON.stringify(r.text)}`);
console.log("  badge boundaries (prev sibling of the CRUX span):", JSON.stringify(found.boundaries));

await browser.close();
stop();
