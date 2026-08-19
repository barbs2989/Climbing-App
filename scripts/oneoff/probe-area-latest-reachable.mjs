// Does `?za=1` actually put AreaLatest's report rows on screen, and what does Chrome announce
// for them? One page load, not a 63-screen walk — the full guard kept being reaped on a loaded
// box, and this answers the only question that matters.
//
// Prints, for the Climbs tab with an area selected: the area chosen, whether the AREA'S LATEST
// heading is present, and every [role=button] row that looks like a report, with its computed
// accessible name. If the rows are there but announce with a separator (a leading "✓"), the
// widened needle is CORRECT to skip them and the injection case simply cannot fire on this
// seed data.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5295;
const base = `http://127.0.0.1:${PORT}`;

const server = spawn(
  "npx",
  ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
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
if (!(await waitUp())) { console.error("dev server never answered"); stop(); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Accessibility.enable");
await page.goto(base + "?za=1&zt=routes", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 60000 }).catch(() => {});
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
process.exit(0);
