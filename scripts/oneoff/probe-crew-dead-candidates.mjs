// What are the four Crew controls the dead-control sweep flagged?
//
// The sweep reports a LABEL, which for a badge span is just a number. That is not enough to
// judge: a control that changes nothing because it is the ALREADY-ACTIVE sub-tab is correct
// behaviour, and CLAUDE.md records exactly that for Crew ("crewView defaults to crews, so it
// is the Crew screen already captured"). Print each candidate's ancestry and aria state so
// the two cases can be told apart.
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const BASE = process.argv.find((a) => a.startsWith("--base="))?.slice(7) || "http://localhost:5199/Climbing-App/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForFunction(() => (document.body?.innerText || "").length > 200, { timeout: 60000 });
await settledText(page, { timeout: 45000 }).catch(() => {});
await page.evaluate(() => {
  const el = [...document.querySelectorAll('button,[role="button"],a,div,span')].find((e) => (e.textContent || "").trim() === "Crew");
  if (el) el.click();
});
await page.waitForTimeout(1500);
await settledText(page, { timeout: 30000 }).catch(() => {});

const info = await page.evaluate(() => {
  const wanted = [{ tag: "SPAN", label: "7", nth: 0 }, { tag: "SPAN", label: "7", nth: 1 },
                  { tag: "BUTTON", label: "Crews, 1", nth: 0 }, { tag: "SPAN", label: "1", nth: 2 }];
  const interactive = (el) => {
    if (el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "SUMMARY") return true;
    const role = el.getAttribute("role");
    if (role === "button" || role === "checkbox" || role === "tab") return true;
    return getComputedStyle(el).cursor === "pointer";
  };
  const labelOf = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const seen = new Map(); const all = [];
  for (const el of document.querySelectorAll("button,a,summary,div,span,b,label,li")) {
    if (!interactive(el)) continue;
    if (el.querySelector("button,a,[role='button']")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const label = labelOf(el); if (!label) continue;
    if (["Home", "Climbs", "Discover", "Crew", "Logbook", "Profile"].includes(label)) continue;
    const key = el.tagName + "|" + label; const n = seen.get(key) || 0; seen.set(key, n + 1);
    all.push({ el, tag: el.tagName, label, nth: n });
  }
  return wanted.map((w) => {
    const hit = all.find((c) => c.tag === w.tag && c.label === w.label && c.nth === w.nth);
    if (!hit) return { ...w, found: false };
    const el = hit.el;
    const chain = [];
    for (let p = el, i = 0; p && i < 4; p = p.parentElement, i++) {
      chain.push({
        tag: p.tagName,
        aria: p.getAttribute("aria-label") || null,
        selected: p.getAttribute("aria-selected"),
        text: (p.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
        hasOwnPointer: getComputedStyle(p).cursor === "pointer",
      });
    }
    return { ...w, found: true, ownText: (el.textContent || "").trim(), chain };
  });
});
console.log(JSON.stringify(info, null, 1));

// What are the Crew sub-tabs, and which is active?
const bar = await page.evaluate(() => [...document.querySelectorAll("[aria-label]")]
  .filter((e) => /^(Crews|Friends|Groups|Requests)(,|$)/.test((e.getAttribute("aria-label") || "").trim()))
  .map((e) => ({ aria: e.getAttribute("aria-label"), tag: e.tagName, text: (e.textContent || "").trim(), selected: e.getAttribute("aria-selected"), bg: getComputedStyle(e).backgroundColor })));
console.log("\ncrew sub-tab bar:", JSON.stringify(bar, null, 1));
await browser.close();
