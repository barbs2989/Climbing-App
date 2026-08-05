#!/usr/bin/env node
// Accessibility audit for the real app, in a real browser.
//
// The 2026-07-30 full-app audit was scoped tab-by-tab plus the computational core; a11y was
// never covered. This app is unusually exposed: every style is inline, there is no CSS
// framework supplying focus rings or button semantics, and it is mobile-first, so touch-target
// size is a real constraint rather than a formality.
//
//   unnamed-control   a button/link a screen reader announces as nothing at all
//   icon-only-small   an icon-sized control (<44px BOTH ways) with no accessible name
//   img-no-alt        <img> with no alt attribute (decorative images still need alt="")
//   input-no-label    a form control with no label, aria-label or aria-labelledby
//   touch-target      interactive box under 44x44 CSS px (WCAG 2.5.5 / Apple HIG)
//   contrast          text below the WCAG AA ratio for its size
//
//   node scripts/audit-a11y.mjs [--url <base>] [--json out.json]
//
// Read-only. Exits 0 always: this reports, it does not gate.
//
// Deliberately NOT checked: focus visibility. Computed `outline-style` is "none" on any
// element that is not currently focused, so reading it flags every control on the page. Doing
// it honestly means focusing each element and diffing the computed style, which is slow and
// noisy; a manual keyboard pass is the right tool.

import { chromium } from "playwright-core";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const base = arg("--url", "https://barbs2989.github.io/Climbing-App/");
const jsonOut = arg("--json", null);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const tap = async (label) => {
  const el = page.locator(`text="${label}"`).first();
  try { await el.click({ timeout: 4000 }); await page.waitForTimeout(500); return true; }
  catch { return false; }
};

const AUDIT = `(() => {
  const out = [];
  const vis = el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };

  // Keep only characters a screen reader would actually announce as a word. Emoji, arrows,
  // dingbats and box glyphs do not name a control. Checked by code point rather than a regex
  // range, because malformed \\u ranges silently swallow ASCII.
  const wordy = s => {
    let n = 0;
    for (const ch of String(s)) {
      const c = ch.codePointAt(0);
      if (c >= 0x2000 && c <= 0x2BFF) continue;       // punctuation, arrows, dingbats, symbols
      if (c >= 0x1F000 && c <= 0x1FAFF) continue;     // emoji planes
      if (c === 0x200D || c === 0xFE0F) continue;     // ZWJ / variation selector
      if (/\\s/.test(ch)) continue;
      n++;
    }
    return n > 0;
  };
  const nameOf = el => (
    (el.getAttribute("aria-label") || "") || (el.getAttribute("title") || "") ||
    (el.getAttribute("alt") || "") || (el.innerText || el.textContent || "")
  ).replace(/\\s+/g, " ").trim();

  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const parse = s => { const m = (s || "").match(/[\\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const alphaOf = s => { const m = (s || "").match(/[\\d.]+/g); return m && m.length > 3 ? Number(m[3]) : 1; };
  const bgOf = el => {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor);
      if (c && alphaOf(cs.backgroundColor) > 0.5) return c;
      n = n.parentElement;
    }
    return [11, 15, 20];
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };

  const push = (kind, el, detail) => {
    const r = el.getBoundingClientRect();
    out.push({
      kind, detail, tag: el.tagName.toLowerCase(),
      text: (el.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 60),
      aria: el.getAttribute("aria-label") || "",
      box: [Math.round(r.width), Math.round(r.height)],
    });
  };

  document.querySelectorAll('button, a[href], [role="button"]').forEach(el => {
    if (!vis(el)) return;
    const named = wordy(nameOf(el));
    const r = el.getBoundingClientRect();
    const tiny = r.width < 44 && r.height < 44;
    if (!named) push(tiny ? "icon-only-small" : "unnamed-control", el, "announces as nothing — no aria-label/title/text");
    if (r.width < 44 || r.height < 44) push("touch-target", el, Math.round(r.width) + "x" + Math.round(r.height) + " (min 44x44)");
  });

  document.querySelectorAll("img").forEach(el => {
    if (!vis(el)) return;
    if (el.getAttribute("alt") === null) push("img-no-alt", el, "no alt attribute at all");
  });

  document.querySelectorAll("input, select, textarea").forEach(el => {
    if (!vis(el)) return;
    if (el.type === "hidden") return;
    const id = el.getAttribute("id");
    const labelled = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") ||
      (id && document.querySelector('label[for="' + CSS.escape(id) + '"]')) || el.closest("label");
    if (!labelled) push("input-no-label", el, "placeholder=" + JSON.stringify(el.getAttribute("placeholder") || ""));
  });

  document.querySelectorAll("div, span, p, button, a, label, li, td, th, h1, h2, h3, h4").forEach(el => {
    if (!vis(el)) return;
    const own = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) return;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color); if (!fg) return;
    const size = parseFloat(cs.fontSize) || 16;
    const bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3.0 : 4.5;
    const got = ratio(fg, bgOf(el));
    if (got < need) push("contrast", el, got.toFixed(2) + ":1 (needs " + need + ":1 at " + Math.round(size) + "px" + (bold ? " bold" : "") + ")");
  });

  return out;
})()`;

const findings = [];
const seen = new Set();
const record = (screen, rows) => {
  for (const r of rows) {
    const key = r.kind + "|" + r.tag + "|" + r.text + "|" + r.aria + "|" + r.detail;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ screen, ...r });
  }
};

const TABS = ["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks", "Profile"];
await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(3500);

for (const t of TABS) {
  if (!(await tap(t))) { console.log(`  (skip ${t}: not reachable)`); continue; }
  await page.waitForTimeout(600);
  record(t, await page.evaluate(AUDIT));
  console.log(`  ${t}: ${findings.length} cumulative`);
}
await browser.close();

const byKind = {};
for (const f of findings) (byKind[f.kind] = byKind[f.kind] || []).push(f);

console.log("\n=== ACCESSIBILITY AUDIT ===");
console.log(`base: ${base}`);
for (const k of Object.keys(byKind).sort((a, b) => byKind[b].length - byKind[a].length)) {
  console.log(`\n${k}: ${byKind[k].length} distinct`);
  for (const f of byKind[k].slice(0, 14)) {
    console.log(`  [${f.screen}] <${f.tag}> ${JSON.stringify(f.text || "")}${f.aria ? " aria=" + JSON.stringify(f.aria) : ""} ${f.box[0]}x${f.box[1]} — ${f.detail}`);
  }
  if (byKind[k].length > 14) console.log(`  … and ${byKind[k].length - 14} more`);
}
if (jsonOut) { const fs = await import("node:fs"); fs.writeFileSync(jsonOut, JSON.stringify(findings, null, 2)); console.log(`\nwrote ${jsonOut}`); }
