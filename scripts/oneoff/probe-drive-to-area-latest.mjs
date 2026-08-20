// Can the Climbs tab's browse navigation be DRIVEN as far as AreaLatest?
//
// #1046 recorded that setting `selArea` from the scaffold is NOT enough — that tab drives its
// own browse navigation — and left "drive country -> state -> area" as the way to close the
// gap. This is that experiment: ONE page load with a report at every step, because the full
// 63-screen guard walk kept being reaped on a loaded box.
//
// The FIRST attempt descended greedily ("click the first row naming a climb count") and ended
// up in White Pine Boulders, which carries no `activity` at all — so AreaLatest correctly
// rendered nothing and the drive looked broken when it was merely aimed wrong. The target is
// now an explicit name path, computed from the seed data by
// scripts/oneoff/probe-which-area-has-activity.mjs rather than guessed.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5297;
const base = `http://127.0.0.1:${PORT}`;

// Each candidate is a full click path below the state select. Measured seed reports in
// brackets. Two shapes on purpose: a PEAK (direct routes) and a CANYON (subtree only), because
// AreaLatest's early return accepts either and they could behave differently.
const CANDIDATES = [
  { label: "peak", path: ["Wasatch Range", "Central Wasatch", "Mount Olympus"] },            // 3
  { label: "canyon", path: ["Wasatch Range", "Central Wasatch", "Little Cottonwood Canyon"] }, // 11 via 4 crags
  { label: "crag", path: ["Wasatch Range", "Central Wasatch", "Little Cottonwood Canyon", "The Egg"] }, // 3
];

const server = spawn(
  "npx",
  ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } }
);
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { stop(); process.exit(130); });

async function waitUp() {
  for (let i = 0; i < 120; i++) {
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

const HEADING = /LATEST FROM THIS AREA/i;
const bodyText = () => page.innerText("body").catch(() => "");

const pickInSelect = (namePrefix, label) => page.evaluate(({ namePrefix, label }) => {
  const sel = [...document.querySelectorAll("select")]
    .find((x) => (x.getAttribute("aria-label") || "").startsWith(namePrefix));
  if (!sel) return "no-select";
  const opt = [...sel.options].find((o) => o.label === label || o.label.startsWith(label + " ") || o.label.startsWith(label + " —"));
  if (!opt) return "no-option(" + [...sel.options].map((o) => o.label).slice(0, 8).join("|") + ")";
  sel.value = opt.value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  return "ok";
}, { namePrefix, label });

// Click the row whose text STARTS with this area name. Skip fixed/sticky chrome so the bottom
// nav cannot capture the click — the collision check:ui records.
const clickRow = (name) => page.evaluate((n) => {
  const rows = [...document.querySelectorAll("[role=button]")]
    .filter((e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; })
    .filter((e) => (e.innerText || "").replace(/\s+/g, " ").trim().startsWith(n));
  if (!rows.length) return false;
  rows[0].click();
  return true;
}, name);

for (const cand of CANDIDATES) {
  console.log(`\n=== ${cand.label}: ${cand.path.join(" > ")} ===`);
  await page.goto(base + "?zt=routes", { waitUntil: "domcontentloaded", timeout: 300000 });
  await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2500);
  console.log("  country:", await pickInSelect("Select a country", "United States"));
  await page.waitForTimeout(1600);
  console.log("  state  :", await pickInSelect("Select a state", "Utah"));
  await page.waitForTimeout(1600);

  let ok = true;
  for (const step of cand.path) {
    const hit = await clickRow(step);
    if (!hit) { console.log(`  MISS "${step}" — no row starts with that name`); ok = false; break; }
    await page.waitForTimeout(1700);
    const t = await bodyText();
    console.log(`  clicked ${JSON.stringify(step).padEnd(28)} body=${String(t.replace(/\s+/g, " ").trim().length).padStart(5)}  heading=${HEADING.test(t) ? "YES" : "no "}`);
  }
  if (!ok) continue;

  const t = await bodyText();
  if (!HEADING.test(t)) { console.log("  -> AreaLatest did NOT render here"); continue; }

  const rows = await page.evaluate(() => {
    const out = [];
    let i = 0;
    for (const el of document.querySelectorAll("[role=button]")) {
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!/ago\b|\d{4}-\d{2}-\d{2}/.test(txt)) continue;
      el.setAttribute("data-p", String(i));
      out.push({ i, text: txt.slice(0, 70) });
      i++;
    }
    return out;
  });
  console.log(`  -> REACHED. report-shaped rows: ${rows.length}`);
  const doc = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  for (const r of rows.slice(0, 5)) {
    let name = "(none)";
    try {
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: `[data-p="${r.i}"]` });
      if (nodeId) {
        const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
        const ax = (nodes || []).find((x) => x.name && x.name.value != null);
        if (ax) name = (ax.ignored ? "(ignored) " : "") + JSON.stringify(String(ax.name.value));
      }
    } catch {}
    console.log(`     ${JSON.stringify(r.text)}\n        announced ${name}`);
  }
  break; // one working path is all the guard needs
}

await browser.close();
stop();
process.exit(0);
