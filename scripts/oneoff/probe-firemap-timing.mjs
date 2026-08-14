// Measure the fire map's load chain: lazy chunk -> Leaflet CDN -> map init -> bbox
// -> the three federal queries. Prints the wall-clock offset of each request from
// the moment the "Fire map" button is clicked.
import { chromium } from "playwright-core";

const BASE = process.env.PROBE_URL || "http://localhost:5199/Climbing-App/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

let t0 = null;
const log = [];
page.on("request", r => { if (t0) log.push(["REQ ", Date.now() - t0, r.url()]); });
page.on("response", r => { if (t0) log.push(["RESP", Date.now() - t0, r.url()]); });

await page.goto(BASE, { waitUntil: "commit", timeout: 60000 });
for (let i = 0; i < 20 && (await page.evaluate(() => document.body.innerText)).length < 200; i++) await page.waitForTimeout(2000);
console.log("app mounted");

async function tapText(txt, exact = true) {
  return await page.evaluate(([t, ex]) => {
    const els = [...document.querySelectorAll("button,[role='button'],a,div,span")];
    const hit = els.filter(e => { const s = (e.innerText || "").trim(); return ex ? s === t : s.includes(t); })
      .sort((a, b) => (a.innerText || "").length - (b.innerText || "").length)[0];
    if (!hit) return false;
    hit.scrollIntoView({ block: "center" }); hit.click(); return true;
  }, [txt, exact]);
}

console.log("Climbs:", await tapText("Climbs"));
await page.waitForTimeout(4000);

// Click the Fire map card and start the clock.
t0 = Date.now();
console.log("Fire map:", await tapText("Fire map", false));

// Poll for the moment the screen first shows real fire content.
let firstContent = null;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => document.body.innerText);
  if (!firstContent && /acre|contained|Red Flag|No active wildfires|% contained/i.test(t)) {
    firstContent = Date.now() - t0;
    console.log(">>> first fire content on screen at +" + firstContent + "ms");
  }
  if (firstContent && i > 20) break;
}
if (!firstContent) console.log(">>> NO fire content within 20s");

const inc = log.filter(([k, , u]) => k === "REQ " && /WFIGS_Incident_Locations/.test(u));
const per = log.filter(([k, , u]) => k === "REQ " && /WFIGS_Interagency_Perimeters/.test(u));
const wx = log.filter(([k, , u]) => k === "REQ " && /watch_warn_adv/.test(u));
console.log("\n>>> REQUEST COUNTS  incidents:" + inc.length + "  perimeters:" + per.length + "  fireweather:" + wx.length +
  "   (1 each = seeded bbox matched the map; 2 each = it did not)");

console.log("\n--- geometry of each incident query (seed vs real) ---");
for (const [, ms, u] of inc) {
  const g = decodeURIComponent((u.match(/[?&]geometry=([^&]*)/) || [])[1] || "");
  console.log("  +" + ms + "ms  " + g);
}
console.log("  container:", await page.evaluate(() => {
  const d = [...document.querySelectorAll("div")].find(e => e.className && String(e.className).includes("leaflet-container"));
  return d ? d.clientWidth + "x" + d.clientHeight : "not found";
}));

console.log("\n--- request timeline (relevant hosts) ---");
for (const [kind, ms, url] of log) {
  if (/unpkg|leaflet|arcgis|nifc|noaa|weather|FireMap|assets\//i.test(url)) {
    console.log(String(ms).padStart(6) + "ms " + kind + " " + url.slice(0, 130));
  }
}
console.log("\nfinal screen:", (await page.evaluate(() => document.body.innerText)).slice(0, 600).replace(/\n+/g, " | "));
await browser.close();
console.log("--- done ---");
