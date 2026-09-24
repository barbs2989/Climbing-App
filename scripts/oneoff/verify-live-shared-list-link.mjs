// One-shot LIVE check for #1842: the deployed site boots, and a `?list=` link opens the shared-list
// viewer. Uses the nil uuid, which no list has, so the answer is the viewer's "private, or deleted"
// state — proving the link is READ and the dialog MOUNTS on production, not that any list exists
// (the catalog held 0 public lists when this was written). Also asserts the param is stripped from
// the address bar once read. Spent once a real public list exists: open that instead.
import { chromium } from "playwright-core";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("verify-live-shared-list-link");
const URL = "https://barbs2989.github.io/Climbing-App/?list=00000000-0000-0000-0000-000000000000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
let bad = 0;
const say = (ok, msg) => { console.log((ok ? "  ok   " : "  FAIL ") + msg); if (!ok) bad++; };
try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  const dlg = page.locator('[role="dialog"][aria-label^="List"], [role="dialog"][aria-label="Shared list"]');
  await dlg.first().waitFor({ state: "visible", timeout: 60000 });
  await page.waitForFunction(() => {
    const d = document.querySelector('[role="dialog"][aria-label="Shared list"]');
    return d && !/Loading the list/.test(d.textContent || "");
  }, null, { timeout: 30000 }).catch(() => {});
  const text = (await dlg.first().textContent()) || "";
  say(/private, or its owner has deleted it/.test(text), `viewer opened from the link and says: ${JSON.stringify(text.slice(0, 120))}`);
  say(!/[?&]list=/.test(page.url()), `?list= stripped from the address bar (${page.url()})`);
  await page.getByRole("button", { name: "Close" }).first().click();
  await page.waitForTimeout(500);
  say((await page.locator('[role="dialog"][aria-label="Shared list"]').count()) === 0, "✕ closes it");
  const real = errors.filter((e) => !/favicon|net::ERR_|Failed to load resource/i.test(e));
  say(real.length === 0, `no page errors (${real.length})${real.length ? ": " + real.slice(0, 3).join(" | ") : ""}`);
} catch (e) {
  say(false, "live check threw: " + e.message);
} finally {
  await browser.close();
}
console.log(bad ? `\nverify-live-shared-list-link: ${bad} FAILED` : "\nverify-live-shared-list-link: ok");
process.exit(bad ? 1 : 0);
