import { chromium } from "playwright-core";
const dir = process.argv[2];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("https://barbs2989.github.io/Climbing-App/", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.getByText("View as guest", { exact: false }).first().click({ timeout: 60000 });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: /^Crews/ }).first().click({ timeout: 20000 });
await page.waitForTimeout(3000);
const step = async (name, fn) => { try { await fn(); await page.waitForTimeout(900); return true; } catch (e) { console.log("FAIL", name, e.message.split("\n")[0]); return false; } };
const closeAll = async () => { for (let i = 0; i < 4; i++) { const d = page.getByRole("dialog").last(); if (!(await d.count())) break; const b = d.getByRole("button", { name: /Done|^Close$|Back/ }).first(); if (!(await b.count())) { await page.keyboard.press("Escape"); } else await b.click({ timeout: 4000 }).catch(() => page.keyboard.press("Escape")); await page.waitForTimeout(700); } };
const btns = async (tag) => console.log(tag, JSON.stringify(await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].pop() || document; return [...d.querySelectorAll("button")].filter(b => b.offsetParent).map(b => (b.getAttribute("aria-label") || b.textContent).trim().slice(0, 45)); })));
const measure = async (tag) => {
  const res = await page.evaluate(() => {
    const d = [...document.querySelectorAll("div")].find(d => /^\d+ of \d+ in/.test(d.textContent) && d.children.length <= 1);
    if (!d) return null; const row = d.parentElement.parentElement, box = row.firstElementChild;
    row.scrollIntoView({ block: "center" });
    const p = [...box.children].map(c => { const r = c.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; });
    const overlap = p.some((a, i) => p.some((b, j) => j > i && Math.abs(a[1] - b[1]) < a[2] && Math.abs(a[0] - b[0]) < a[2]));
    const rr = row.getBoundingClientRect(), tr = d.parentElement.getBoundingClientRect(), k = row.children[2], kr = k && k.getBoundingClientRect();
    return { text: d.textContent, names: d.nextElementSibling?.textContent, n: p.length, avs: p, overlap, row: [Math.round(rr.left), Math.round(rr.right)], textCol: [Math.round(tr.left), Math.round(tr.right)], pill: k ? [Math.round(kr.left), Math.round(kr.right), k.textContent] : null, pillClear: k ? kr.left >= tr.right - 1 && kr.right <= rr.right + 1 : null, hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  console.log(tag, JSON.stringify(res)); await page.waitForTimeout(400); await page.screenshot({ path: dir + "/" + tag + ".png" });
};
// 1. bigger crew, accept everyone asking, invite from the list
await step("open", () => page.getByRole("button", { name: /Invite a partner|^1Crew/ }).first().click({ timeout: 8000 }));
const dlg = page.getByRole("dialog", { name: "Crew" });
for (let i = 0; i < 4; i++) await step("bigger", () => dlg.getByRole("button", { name: /Bigger crew/ }).click({ timeout: 4000 }));
for (let i = 0; i < 6; i++) {
  let acc = dlg.getByRole("button", { name: /^Accept/ }).first();
  if (!(await acc.count())) { const more = dlg.getByRole("button", { name: /Show \d+ more request/ }).first(); if (await more.count()) await step("more", () => more.click()); acc = dlg.getByRole("button", { name: /^Accept/ }).first(); }
  if (!(await acc.count())) break; await step("accept", () => acc.click({ timeout: 5000 }));
  const into = page.getByRole("button", { name: /Accept into crew/ }).first(); if (await into.count()) { await step("into", () => into.click({ timeout: 5000 })); const c = page.getByRole("dialog").last().getByRole("button", { name: /^Close$/ }).first(); if (await c.count() && !(await dlg.isVisible().catch(()=>false))) await step("closeprof", () => c.click()); }
}
await btns("crew-sheet-after-accepts");
await closeAll(); await measure("p1");
await browser.close();
