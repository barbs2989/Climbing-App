// Do the onboarding discipline chips respond to a tap?
//
// probe-dead-controls-overlays reported 9 of them (Rock, Scrambling, Alpine, Mountaineering,
// Hiking, Bouldering, Ice, Mixed, Aid) as changing nothing. That is a serious claim -- it would
// mean the onboarding step where a climber says what they climb does not work -- and it is
// exactly where that probe is weakest: its fingerprint covers text, node count, dialogs, aria
// and scroll, and NOT computed style. A chip that toggles only its own background colour is
// invisible to it.
//
// So measure the thing the sweep could not: the chip's own computed style, its aria state, and
// whether the modal's Continue button changes as a selection is made.
import { chromium } from "playwright-core";
import net from "node:net";
import { spawn } from "node:child_process";

const ROOT = new URL("../..", import.meta.url).pathname;
async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => { const s = net.createServer(); s.once("error", () => res(false)); s.once("listening", () => s.close(() => res(true))); s.listen(p, "127.0.0.1"); });
    if (free) return p;
  }
  return null;
}
const port = await claimPort(5390);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
// Warm the module graph before the browser asks. The first request compiles ~1.5MB and a cold
// navigation otherwise blows the 120s goto timeout -- which reads as a dead server.
await fetch(base + "ClimbMatch.jsx").catch(() => {});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 200)));
await page.goto(base + "?zt=me&z=onboardOpen", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(3000);

const read = () => page.evaluate(() => {
  const chips = [...document.querySelectorAll("button")]
    .filter((b) => ["Rock", "Scrambling", "Alpine", "Mountaineering", "Hiking", "Bouldering", "Ice", "Mixed", "Aid"].includes((b.textContent || "").trim()));
  return {
    modalText: (document.body.innerText || "").trim().slice(0, 260),
    chips: chips.map((b) => {
      const c = getComputedStyle(b);
      return { label: (b.textContent || "").trim(), bg: c.backgroundColor, color: c.color, border: c.borderColor, weight: c.fontWeight, pressed: b.getAttribute("aria-pressed"), disabled: b.disabled };
    }),
  };
});

const before = await read();
console.log("chips found:", before.chips.length);
console.log("screen:", JSON.stringify(before.modalText.split("\n").slice(0, 6)));
console.log("\nBEFORE:", JSON.stringify(before.chips[0]));

const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => (x.textContent || "").trim() === "Rock");
  if (!b) return "not found";
  b.scrollIntoView({ block: "center" });
  b.click();
  return "clicked";
});
await page.waitForTimeout(1200);
const after = await read();
console.log("click:", clicked);
console.log("AFTER :", JSON.stringify(after.chips[0]));

const changed = JSON.stringify(before.chips[0]) !== JSON.stringify(after.chips[0]);
console.log(`\nthe "Rock" chip's own appearance changed: ${changed}`);

// Second question: does anything downstream notice? A selection step usually gates its
// Continue button, and a chip whose state is stored but never used is a different bug from a
// chip that does not respond at all.
const gate = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")].map((b) => ({ t: (b.textContent || "").trim().slice(0, 30), disabled: b.disabled, bg: getComputedStyle(b).backgroundColor }));
  return btns.filter((b) => /continue|next|done|skip|get started|finish/i.test(b.t));
});
console.log("progress controls after selecting:", JSON.stringify(gate));

// And does the selection survive to the next step?
console.log("\nfull body text after the click:");
console.log(after.modalText);
await browser.close(); stop();
