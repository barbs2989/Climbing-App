// A toggle chip that turns blue when you pick it -- does it say so, or only look it?
//
// Sibling question to probe-selected-state-announced, which covered TAB bars (mutually
// exclusive, one selected) and is now fixed with aria-current. This covers the other shape:
// a MULTI-SELECT toggle, where each control carries its own on/off state. The onboarding
// modal's "WHAT DO YOU DO?" chips -- Rock, Scrambling, Alpine, Mountaineering, Hiking,
// Bouldering, Ice, Mixed, Aid -- are plain <button>s that go blue when selected and carry no
// `aria-pressed`. That is the first thing a new climber is asked, and a screen reader user
// cannot tell which disciplines they have picked.
//
// THE TWO SHAPES ARE SEPARATED BEHAVIOURALLY, which is the whole point of doing this in a
// browser. Click a control and look at its SIBLINGS:
//   - siblings also changed  -> a tab bar; exactly one is current; wants aria-current
//   - siblings unchanged     -> an independent toggle; wants aria-pressed
// Reading markup cannot tell these apart -- both are <button> with a conditional background.
//
// Report-only.
import { chromium } from "playwright-core";
import net from "node:net";
import { spawn } from "node:child_process";

const ONLY = (process.argv.find((a) => a.startsWith("--overlays=")) || "--overlays=onboardOpen").slice(11).split(",").filter(Boolean);
const TABS = (process.argv.find((a) => a.startsWith("--tabs=")) || "--tabs=").slice(7).split(",").filter(Boolean);
const ROOT = new URL("../..", import.meta.url).pathname;

async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => { const s = net.createServer(); s.once("error", () => res(false)); s.once("listening", () => s.close(() => res(true))); s.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
}
const port = await claimPort(5410);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
await fetch(base + "ClimbMatch.jsx").catch(() => {});   // warm: a cold 1.5MB compile blows the goto timeout

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

const SIG = `(el) => { const c = getComputedStyle(el); return [c.backgroundColor, c.color, c.borderColor, c.fontWeight].join("~"); }`;
const LAB = `(el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 34)`;

const snapshot = () => page.evaluate(([sig, lab]) => {
  const S = eval(sig), L = eval(lab);
  return [...document.querySelectorAll("button,[role='button'],[role='checkbox']")]
    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 8 && r.height > 8; })
    .map((b, i) => ({ i, label: L(b), sig: S(b), pressed: b.getAttribute("aria-pressed"), checked: b.getAttribute("aria-checked"), current: b.getAttribute("aria-current"), role: b.getAttribute("role") || "button" }));
}, [SIG, LAB]);

const clickIdx = (i) => page.evaluate((i) => {
  const b = [...document.querySelectorAll("button,[role='button'],[role='checkbox']")]
    .filter((x) => { const r = x.getBoundingClientRect(); return r.width > 8 && r.height > 8; })[i];
  if (!b) return false;
  b.scrollIntoView({ block: "center" });
  b.click();
  return true;
}, i);

const load = async (qs) => { await page.goto(base + qs, { waitUntil: "domcontentloaded", timeout: 120000 }); await page.waitForTimeout(2600); };

const screens = [...ONLY.map((o) => ({ name: o, qs: `?zt=me&z=${o}` })), ...TABS.map((t) => ({ name: `tab:${t}`, qs: `?zt=${t}` }))];
const toggles = [], tabsFound = [];
for (const s of screens) {
  await load(s.qs);
  const base0 = await snapshot();
  if (!base0.length) { console.log(`${s.name}: no controls on screen`); continue; }
  console.log(`\n${s.name}: ${base0.length} controls`);
  for (const c of base0) {
    await load(s.qs);
    const before = await snapshot();
    if (!before[c.i] || before[c.i].label !== c.label) continue;   // list moved; skip rather than guess
    if (!(await clickIdx(c.i))) continue;
    await page.waitForTimeout(900);
    const after = await snapshot();
    if (!after[c.i] || after[c.i].label !== c.label) continue;     // control gone: it navigated, not a toggle
    const selfChanged = after[c.i].sig !== before[c.i].sig;
    if (!selfChanged) continue;
    // Did any SIBLING also change? That is what separates a tab bar from an independent toggle.
    const siblingsChanged = before.some((b, j) => j !== c.i && after[j] && after[j].label === b.label && after[j].sig !== b.sig);
    const announces = after[c.i].pressed !== null || after[c.i].checked !== null || after[c.i].current !== null;
    const row = { screen: s.name, label: c.label, announces, role: c.role };
    if (siblingsChanged) tabsFound.push(row); else toggles.push(row);
    process.stdout.write(siblingsChanged ? "T" : (announces ? "." : "x"));
  }
  process.stdout.write("\n");
}

console.log("\n=== independent TOGGLES whose on-state announces nothing ===");
for (const t of toggles.filter((t) => !t.announces)) console.log(`  ${t.screen.padEnd(16)} ${JSON.stringify(t.label)}  role=${t.role}  (wants aria-pressed)`);
console.log("\n=== toggles that DO announce ===");
for (const t of toggles.filter((t) => t.announces)) console.log(`  ${t.screen.padEnd(16)} ${JSON.stringify(t.label)}`);
console.log("\n=== controls whose siblings also changed (tab bars, judged by aria-current elsewhere) ===");
for (const t of tabsFound) console.log(`  ${t.screen.padEnd(16)} ${JSON.stringify(t.label)}  announces=${t.announces}`);

const mute = toggles.filter((t) => !t.announces);
if (!toggles.length && !tabsFound.length) { console.error("\nfound NO stateful controls at all — the detector broke, this is not a clean result"); await browser.close(); stop(); process.exit(1); }
console.log(`\n${mute.length} toggles convey their on-state by colour alone.`);
await browser.close(); stop();
