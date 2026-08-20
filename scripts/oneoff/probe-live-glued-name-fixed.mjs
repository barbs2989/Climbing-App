// Does #1023's fix actually work FOR A USER, on production?
//
// #1023 gave the route page's "Recently climbed" rows an explicit aria-label, because Chrome was
// announcing "Nathan BarberAttempt …". That was verified in CI and by grepping the served
// bundle — neither of which is the same as asking Chrome what it announces on the live site.
//
// Reachable today on exactly ONE route: `climb_logs` holds 2 rows and both name
// `wa_mount_baker_north_ridge`, so that is the only route whose section renders in production.
// The app ships a `?debugRoute=<id>` deep link, which opens it without driving the browse tree.
//
// Read-only, one page load against the deployed site. No dev server, no local build.
import { chromium } from "playwright-core";

const SITE = "https://barbs2989.github.io/Climbing-App/";
const ROUTE = "wa_mount_baker_north_ridge";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Accessibility.enable");

await page.goto(`${SITE}?debugRoute=${ROUTE}`, { waitUntil: "domcontentloaded", timeout: 120000 });
// The route page lazy-loads its chunk and then fetches the logs; settle generously rather than
// racing it, because a miss here reads as "the fix is absent" when it is merely not painted yet.
await page.waitForTimeout(12000);

const info = await page.evaluate(() => {
  const txt = document.body.innerText || "";
  const rows = [];
  let i = 0;
  for (const el of document.querySelectorAll("[role=button]")) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!/ago\b|\d{4}-\d{2}-\d{2}/.test(t)) continue;
    el.setAttribute("data-p", String(i));
    rows.push({ i, text: t.slice(0, 80) });
    i++;
  }
  return {
    onRoutePage: /Recently climbed|Conditions & recent activity/i.test(txt),
    hasSection: /RECENTLY CLIMBED/i.test(txt),
    bodyLen: txt.length,
    rows,
  };
});

console.log(`site            : ${SITE}`);
console.log(`route           : ${ROUTE}`);
console.log(`body length     : ${info.bodyLen}`);
console.log(`on route page   : ${info.onRoutePage}`);
console.log(`section present : ${info.hasSection}`);
console.log(`report rows     : ${info.rows.length}\n`);

const doc = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
let glued = 0;
for (const r of info.rows) {
  let name = "(none)";
  try {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: `[data-p="${r.i}"]` });
    if (nodeId) {
      const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
      const ax = (nodes || []).find((x) => x.name && x.name.value != null);
      if (ax) name = String(ax.name.value);
    }
  } catch {}
  // The defect: two word characters welded across a node boundary, e.g. "BarberAttempt".
  const weld = /\w\w/.test(name) && /[a-z][A-Z]/.test(name.replace(/,\s/g, ""));
  if (weld) glued++;
  console.log(`  visible   ${JSON.stringify(r.text)}`);
  console.log(`  announced ${JSON.stringify(name)}   ${weld ? "<-- STILL GLUED" : "ok"}\n`);
}

if (!info.rows.length) {
  console.log("No report rows on screen. Either the logs did not load, or this route no longer");
  console.log("carries any — re-measure climb_logs before reading this as a verdict.");
} else {
  console.log(glued ? `${glued} row(s) still announce a welded name.` : "Every row announces a separated name — the fix works for a real user.");
}

await browser.close();
process.exit(0);
