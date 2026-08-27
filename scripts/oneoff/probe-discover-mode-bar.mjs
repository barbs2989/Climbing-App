// probe-discover-mode-bar — why does check:selected-state not classify Discover's
// [Find partners | Join a crew | Hire a guide] bar as stateful?
//
// That bar marks its selection with border, background AND colour from partnersMode===x[0], and
// carries no aria attribute -- a mute tab bar by inspection. It sits on the Discover TAB, which
// the guard walks, and the guard reports "4 group(s), 1 stateful" there, the one being the primary
// nav. So either the bar is not mute, or the guard cannot see it. Reasoning cannot separate those.
//
// Prints the group's members, their signatures before and after a click, and what the guard's own
// says() would return for each.
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;

async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => {
      const s = net.createServer();
      s.once("error", () => res(false));
      s.once("listening", () => s.close(() => res(true)));
      s.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}
const port = await claimPort(5430);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
server.stdout.on("data", () => {});
let stopped = false;
const stop = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch {} };
process.on("exit", stop);
for (let i = 0; i < 120; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(base + "?zt=today", { waitUntil: "domcontentloaded", timeout: 120000 });
await settledText(page, { timeout: 45000 }).catch(() => {});
// Reach Discover the same way the guard does: click the nav item by its text.
await page.evaluate(() => {
  const el = [...document.querySelectorAll('button,[role="button"],a,div,span')]
    .find((e) => (e.textContent || "").trim() === "Partners");
  if (el) el.click();
});
await settledText(page, { timeout: 30000 }).catch(() => {});

const read = () => page.evaluate(() => {
  const want = ["Find partners", "Join a crew", "Hire a guide"];
  const els = [...document.querySelectorAll('button,[role="button"]')]
    .filter((e) => want.includes((e.textContent || "").trim()));
  return els.map((e) => {
    const c = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return {
      label: (e.textContent || "").trim(),
      sig: [c.backgroundColor, c.color, c.borderColor, c.fontWeight].join("~"),
      top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      aria: ["aria-current", "aria-selected", "aria-pressed", "aria-expanded", "aria-checked"]
        .filter((a) => e.getAttribute(a) !== null),
    };
  });
});

const before = await read();
console.log("members found on Discover: " + before.length);
for (const m of before) console.log(`  ${m.label.padEnd(15)} top=${m.top} ${m.w}x${m.h} aria=[${m.aria}]\n      sig=${m.sig}`);
if (before.length > 1) {
  const sameRow = before.every((m) => Math.abs(m.top - before[0].top) < 6);
  console.log(`\nall on the same row (the guard's grouping test, <6px): ${sameRow}`);
}

// Click a member that is NOT currently the odd one out, exactly as the guard does.
const counts = {};
for (const m of before) counts[m.sig] = (counts[m.sig] || 0) + 1;
const target = before.slice().sort((a, b) => counts[b.sig] - counts[a.sig])[0];
console.log(`\nclicking ${JSON.stringify(target.label)} (most common signature, ${counts[target.sig]} of ${before.length})`);
await page.evaluate((lab) => {
  const el = [...document.querySelectorAll('button,[role="button"]')]
    .find((e) => (e.textContent || "").trim() === lab);
  if (el) { el.scrollIntoView({ block: "center" }); el.click(); }
}, target.label);
await page.waitForTimeout(1000);
await settledText(page, { timeout: 20000 }).catch(() => {});

const after = await read();
console.log("\nafter the click:");
for (const m of after) console.log(`  ${m.label.padEnd(15)} sig=${m.sig}`);
const b = before.find((x) => x.label === target.label);
const a = after.find((x) => x.label === target.label);
console.log(`\nclicked control changed signature: ${!!(a && b && a.sig !== b.sig)}`);
console.log(`still present after click: ${!!a}`);

await browser.close();
stop();
