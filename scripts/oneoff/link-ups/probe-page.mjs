// Open a route in the local dev server and print its LINK-UPS section, opened, as a climber sees it.
//   npm run dev -- --port 5197   then   node scripts/oneoff/link-ups/probe-page.mjs <route id> [shot.png]
import { chromium } from "playwright-core";
import { assertQuietBox } from "../../lib/quiet-box.mjs";

assertQuietBox("probe-link-ups");
const [id, shot] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`http://localhost:5197/Climbing-App/?route=${encodeURIComponent(id)}`, { waitUntil: "networkidle", timeout: 60000 });
  const head = page.getByText("LINK-UPS", { exact: true });
  await head.waitFor({ timeout: 30000 });
  const card = page.locator("button[aria-expanded]").filter({ hasText: "→" }).first();
  await card.click();
  await page.waitForTimeout(800);
  const box = head.locator("xpath=../..");
  console.log((await box.innerText()).slice(0, 2500));
  if (shot) { await box.scrollIntoViewIfNeeded(); await box.screenshot({ path: shot }); console.log("screenshot:", shot); }
} finally { await browser.close(); }
