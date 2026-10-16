// Replicate check:challenge-rows' two clicks and report WHAT was clicked.
//
// The guard says expanding "The Bulgers" takes the panel 1032 -> 208 chars, i.e. the click
// SHRINKS the panel instead of revealing rows. It picks the smallest <div> whose text starts
// with the list name, which is a positional heuristic — so "the app broke" and "the guard now
// picks a different element" are both live explanations and need opposite fixes. This prints
// the element identity so the two can be told apart.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const claim = async (start) => {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((r) => { const s = net.createServer(); s.once("error", () => r(false)); s.once("listening", () => s.close(() => r(true))); s.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
};
const port = await claim(5510);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 60; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 2000)); }
for (const mod of ["main.jsx", "ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]) {
  const t = Date.now();
  await fetch(base + mod).catch(() => {});
  console.log(`warmed ${mod} in ${Date.now() - t}ms`);
}

const browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
try {
  await page.goto(`${base}?zt=logbook`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await settledText(page, { min: 200, timeout: 60000 }).catch(() => {});

  // The guard reaches the Challenges sub-tab first, by exact visible text, taking the LAST
  // match in DOM order. Skipping this was why the first run of this probe clicked nothing:
  // the Logbook tab opens on Objectives.
  const tapped = await page.evaluate(() => {
    const els = [...document.querySelectorAll("button,div,span")];
    const hit = els.reverse().find(e => e.textContent && e.textContent.trim() === "Challenges" && e.getBoundingClientRect().width > 0);
    if (!hit) return null;
    hit.click();
    return { tag: hit.tagName, role: hit.getAttribute("role"), tabindex: hit.getAttribute("tabindex") };
  });
  console.log("step 0 (Challenges sub-tab) clicked:", JSON.stringify(tapped));
  await page.waitForTimeout(1800);

  const opened = await page.evaluate(() => {
    const els = [...document.querySelectorAll("span,div,button")];
    const hit = els.find(e => /^(The Bulgers|Desert Towers|Cascade Volcanoes|Colorado 14ers)\b/.test((e.textContent || "").trim()) && e.getBoundingClientRect().width > 0);
    if (!hit) return null;
    hit.click();
    return { tag: hit.tagName, role: hit.getAttribute("role"), text: (hit.textContent || "").trim().slice(0, 44) };
  });
  console.log("\nstep 1 (open panel) clicked:", JSON.stringify(opened));
  await page.waitForTimeout(2000);

  const before = await page.evaluate(() => (document.body.innerText || "").length);
  const expanded = await page.evaluate(() => {
    const want = /^(The Bulgers|Desert Towers|Cascade Volcanoes|Colorado 14ers|National Park Highpoints)/;
    const els = [...document.querySelectorAll("div")];
    const hits = els.filter(e => want.test((e.textContent || "").trim()) && e.getBoundingClientRect().width > 0);
    const hit = hits.sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
    if (!hit) return null;
    const info = {
      tag: hit.tagName, role: hit.getAttribute("role"), tabindex: hit.getAttribute("tabindex"),
      text: (hit.textContent || "").trim().slice(0, 44),
      candidates: hits.length,
      // What the click will actually bubble through — the cause if an ancestor now handles it.
      ancestors: (() => { const a = []; for (let p = hit.parentElement; p && a.length < 4; p = p.parentElement) a.push(`${p.tagName}${p.getAttribute("role") ? "[" + p.getAttribute("role") + "]" : ""}`); return a; })(),
    };
    hit.click();
    return info;
  });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => (document.body.innerText || "").length);
  console.log("step 2 (expand card) clicked:", JSON.stringify(expanded, null, 1));
  console.log(`panel text: ${before} -> ${after}`);
  console.log("page errors:", errs.length ? errs : "none");
  const head = await page.evaluate(() => (document.body.innerText || "").replace(/\n/g, " | ").slice(0, 220));
  console.log("after text:", head);
} finally {
  await browser.close();
  stop();
}
