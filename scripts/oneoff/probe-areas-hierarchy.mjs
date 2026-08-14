import { chromium } from "playwright-core";
const BASE = process.env.PROBE_URL || "http://localhost:5199/Climbing-App/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(BASE, { waitUntil: "commit", timeout: 60000 });
for (let i = 0; i < 25 && (await page.evaluate(() => document.body.innerText)).length < 200; i++) await page.waitForTimeout(2000);

const txt = () => page.evaluate(() => document.body.innerText);
async function tap(t, exact = true) {
  const ok = await page.evaluate(([s, ex]) => {
    const els = [...document.querySelectorAll("button,[role='button'],a,div,span,option")];
    const hit = els.filter(e => { const v = (e.innerText || "").trim(); return ex ? v === s : v.includes(s); })
      .sort((a, b) => (a.innerText || "").length - (b.innerText || "").length)[0];
    if (!hit) return false;
    hit.scrollIntoView({ block: "center" }); hit.click(); return true;
  }, [t, exact]);
  await page.waitForTimeout(1800);
  return ok;
}
async function pickSelect(labelIncludes, value) {
  return await page.evaluate(([lbl, val]) => {
    const sels = [...document.querySelectorAll("select")];
    for (const s of sels) {
      const opt = [...s.options].find(o => o.text.includes(val));
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event("change", { bubbles: true })); return s.options.length + " opts -> " + opt.text; }
    }
    return "no select had " + val;
  }, [labelIncludes, value]);
}

await tap("Climbs");
console.log("country select:", await pickSelect("country", "United States"));
await page.waitForTimeout(1500);
console.log("region select:", await pickSelect("region", "Washington"));
await page.waitForTimeout(3000);
console.log("\n=== AREA SCREEN (state root) ===\n" + (await txt()).slice(0, 1400));

// The drill-down list, in the order the AREAS section shows it.
const drill = await page.evaluate(() => {
  const t = document.body.innerText.split("\n");
  const i = t.indexOf("AREAS");
  return t.slice(i + 1).filter(s => /climbs\s*→?$/.test(s) === false).slice(0, 0);
});

async function areaListNames() {
  return await page.evaluate(() => {
    const t = document.body.innerText.split("\n").map(s => s.trim());
    const i = t.indexOf("AREAS");
    if (i < 0) return [];
    const out = [];
    for (let k = i + 1; k < t.length; k++) {
      if (/^\d[\d,]*\s+climbs?$/.test(t[k]) || t[k] === "→") continue;
      if (/^(Suggested climbs|How ClimbMatch works|ROUTES)/.test(t[k])) break;
      if (t[k]) out.push(t[k]);
    }
    return out;
  });
}
console.log("\n=== DRILL-DOWN child order ===");
const dl = await areaListNames();
dl.forEach((n, i) => console.log("  " + (i + 1) + ". " + n));

// "All areas" is BOTH the world-root breadcrumb and the full-width button. Pick the
// button by geometry, or this clicks the crumb and navigates away instead of opening.
const opened = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].filter(e => (e.innerText || "").trim() === "All areas" && e.getBoundingClientRect().width > 250)[0];
  if (!b) return false;
  b.scrollIntoView({ block: "center" }); b.click(); return true;
});
console.log("\nAll areas button:", opened);
await page.waitForTimeout(2500);
await page.waitForTimeout(2500);
const tree = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("div")].filter(d => /padding-left:\s*\d+px/.test(d.getAttribute("style") || "") || /12px 12px 12px/.test(d.getAttribute("style") || ""));
  const out = rows.map(d => {
    const st = d.getAttribute("style") || "";
    const pad = Number((st.match(/(?:padding:\s*12px 12px 12px |padding-left:\s*)(\d+)px/) || [])[1] || 0);
    return { pad, text: (d.innerText || "").replace(/\n/g, " · ").trim() };
  }).filter(r => r.text);
  return { rows: out, raw: document.body.innerText };
});
console.log("\n=== ALL AREAS tree rows (pad = depth) ===");
tree.rows.slice(0, 45).forEach(r => console.log("  pad" + String(r.pad).padStart(3) + "  " + r.text.slice(0, 90)));
console.log("\n=== ALL AREAS raw text ===\n" + tree.raw.slice(0, 1500));
await browser.close();
