// Hand-run end-to-end proof of lib/tapSlop.js in the running app: a TOUCH 3px below sign-in's
// "Forgot password?" (15px tall, on empty card) opens the reset form; the same press from a MOUSE
// does not. Needs a VITE_DEMO_AUTOLOGIN=false dev server:
//   node scripts/oneoff/touch-beside-control.mjs http://127.0.0.1:<port>/Climbing-App/
//
// The events are dispatched from the page (pointerdown with its pointerType, then a click with
// detail 1), not with page.touchscreen: Chrome's own touch adjustment snaps an emulated tap to a
// control near the finger BEFORE any listener sees it, so a real tap tests Chrome, not this module.
// tapSlop acts only where that adjustment found nothing -- and the snap is what the browser does on
// a phone as well (Chrome and Safari both adjust a tap's click target).
import { chromium } from "playwright-core";
const base = process.argv[2];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const press = async (pointerType) => {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Forgot password?"), null, { timeout: 90000 });
  return page.evaluate(async (pt) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "Forgot password?"); const q = b.getBoundingClientRect();
    const x = q.left + q.width / 2, y = q.bottom + 3, hit = document.elementFromPoint(x, y);
    const was = /Reset your password/.test(document.body.innerText);
    hit.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: pt, clientX: x, clientY: y }));
    hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y }));
    await new Promise((r) => setTimeout(r, 600));
    return { hit: hit.tagName + (hit.closest("button") ? " (inside a button)" : ""), opened: !was && /Reset your password/.test(document.body.innerText) };
  }, pointerType);
};
const touch = await press("touch"), mouse = await press("mouse");
console.log("touch:", touch, "\nmouse:", mouse);
await browser.close();
const ok = !/button/.test(touch.hit) && touch.opened && !mouse.opened;
console.log(ok ? "OK — a touch beside the link opens it; a mouse click in the same place does nothing." : "FAILED");
process.exit(ok ? 0 : 1);
