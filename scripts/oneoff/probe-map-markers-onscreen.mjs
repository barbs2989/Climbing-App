// Do the new waypoint markers actually REACH THE MAP in a real browser?
//
// The build, check:wp-styles, check:ui and the icon unit-probe all pass, and none of them can see
// this: they prove the markup is right and that no screen errors, but Leaflet only runs in a
// browser and check:ui reads TEXT — a marker is not text. So a marker that renders as an empty div,
// or not at all, would satisfy every one of them.
//
// Asserts the DOM rather than eyeballing a screenshot: each marker must be an `.leaflet-div-icon`
// whose text is a glyph WP_STYLE declares. A screenshot is saved too, but the pass/fail is the DOM.
//
// Rides the same scaffold check:a11y-badges uses — `?zr=1` calls the app's own openRoute() from
// inside the opener, which no slow list or moved control can defeat.
import { spawn } from "node:child_process";
import fs from "fs";
import net from "node:net";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const free = p => new Promise(res => { const s = net.createServer(); s.once("error", () => res(false)); s.once("listening", () => s.close(() => res(true))); s.listen(p, "127.0.0.1"); });
let PORT = 5310; while (!(await free(PORT))) PORT++;

// The glyphs the app declares, lifted from source so this cannot drift from WP_STYLE.
const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const st = src.indexOf("const WP_STYLE={");
if (st < 0) throw new Error("ANCHOR LOST: `const WP_STYLE={` is not in ClimbMatchCore.jsx");
let d = 0, en = -1;
for (let i = src.indexOf("{", st); i < src.length; i++) { if (src[i] === "{") d++; else if (src[i] === "}" && --d === 0) { en = i + 1; break; } }
const GLYPHS = [...src.slice(st, en).matchAll(/glyph:"([^"]+)"/g)].map(m => m[1]);
if (GLYPHS.length < 13) throw new Error(`expected 13 glyphs, lifted ${GLYPHS.length}`);

const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: ROOT, detached: true, stdio: "ignore" });
const stop = () => { try { process.kill(-server.pid, "SIGKILL"); } catch (e) {} };
process.on("exit", stop);

let browser, code = 1;
try {
  // Poll for the server rather than guessing a startup time — a fixed sleep is a guess about how
  // busy the machine is, and it was wrong on the first run (ERR_CONNECTION_REFUSED at 4s).
  const upBy = Date.now() + 90000;
  for (;;) {
    if (Date.now() > upBy) throw new Error("vite never came up within 90s");
    try { const r = await fetch(`http://127.0.0.1:${PORT}/Climbing-App/`); if (r.ok) break; } catch (e) {}
    await new Promise(r => setTimeout(r, 1000));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", e => console.log("  PAGE ERROR:", String(e).slice(0, 160)));
  await page.goto(`http://127.0.0.1:${PORT}/Climbing-App/?zr=1`, { waitUntil: "commit", timeout: 180000 });
  await page.waitForFunction("window.__routeOpen===true", null, { timeout: 180000 });
  // Leaflet loads from a CDN inside the app; give the tiles and markers time to attach.
  await page.waitForSelector(".leaflet-container", { timeout: 120000 });
  await page.waitForFunction("document.querySelectorAll('.leaflet-marker-icon').length>0", null, { timeout: 120000 });

  const found = await page.evaluate(() => [...document.querySelectorAll(".leaflet-marker-icon")]
    .map(el => ({ cls: el.className, text: (el.textContent || "").trim(), bg: (el.firstElementChild && el.firstElementChild.style.background) || "" })));

  console.log(`${found.length} marker icon(s) on the route map\n`);
  for (const f of found) console.log(`   glyph "${f.text}"   bg ${f.bg || "(none)"}   ${f.cls}`);

  let fail = 0;
  const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"}  ${m}`); if (!c) fail++; };
  console.log("");
  ok(found.length > 0, "the map drew at least one marker");
  ok(found.every(f => /leaflet-div-icon/.test(f.cls)), "every marker is a div icon, not a bare circle");
  ok(found.every(f => GLYPHS.includes(f.text)), `every marker's text is a glyph WP_STYLE declares (${found.map(f => f.text).join(" ")})`);
  ok(found.every(f => /#|rgb/.test(f.bg)), "every marker carries its type colour as a background");

  const shot = path.join(ROOT, "scripts/oneoff/_map-markers.png");
  await page.screenshot({ path: shot });
  console.log(`\nscreenshot: ${shot}`);
  code = fail ? 1 : 0;
  console.log(fail ? `\n${fail} FAILED` : "\nok — the markers reach the map as div icons carrying their glyph and colour.");
} catch (e) {
  console.error("probe failed:", String(e).slice(0, 300));
} finally {
  if (browser) await browser.close().catch(() => {});
  stop();
}
process.exit(code);
