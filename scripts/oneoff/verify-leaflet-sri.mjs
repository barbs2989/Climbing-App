// Does the pin work, and does a WRONG pin fail safely?
//
// Both halves matter. Pinning a subresource is only worth doing if (a) the good hash still
// loads -- otherwise every map in the app is dead -- and (b) a bad hash lands on the loader's
// existing error path rather than breaking the page. (b) is the claim the code comment makes,
// so it gets injected rather than assumed.
//
// The REAL module is imported and called; nothing here re-implements loadLeaflet. A probe that
// copies its subject measures a fossil.
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import pwPkg from "/Users/nathanbarber/dev/Climbing-App/node_modules/playwright-core/index.js";
const { chromium } = pwPkg;

const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/top-contributors-photo-crew-resume";
const PAGE = ROOT + "/sri-probe.html";
const MAPKIT = ROOT + "/lib/mapKit.jsx";
const original = fs.readFileSync(MAPKIT, "utf8");

fs.writeFileSync(PAGE, `<!doctype html><html><body><div id="map" style="width:360px;height:300px"></div>
<script type="module">
  import { loadLeaflet, MAP_TILE_URLS } from "/lib/mapKit.jsx";
  window.__r = { ready: false, error: false, L: false, tiles: 0 };
  loadLeaflet(
    () => {
      window.__r.ready = true; window.__r.L = !!window.L;
      try {
        const m = window.L.map("map").setView([47.6, -121.5], 10);
        window.L.tileLayer(MAP_TILE_URLS.street).addTo(m);
        setTimeout(() => { window.__r.tiles = document.querySelectorAll("img.leaflet-tile").length; window.__r.done = true; }, 4000);
      } catch (e) { window.__r.threw = String(e && e.message); window.__r.done = true; }
    },
    () => { window.__r.error = true; window.__r.done = true; }
  );
</script></body></html>`);

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

const run = async (label) => {
  const port = await (async () => { for (let p = 5860; p < 5900; p++) { const free = await new Promise((res) => { const s = net.createServer(); s.once("error", () => res(false)); s.once("listening", () => s.close(() => res(true))); s.listen(p, "127.0.0.1"); }); if (free) return p; } })();
  const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore" });
  // vite.config.js sets base "/Climbing-App/", so a probe page at the project root is served
  // UNDER it. Fetching without the base returns 404 forever, which the readiness loop
  // reports as "dev server never came up" -- a message that sent me to the machine load
  // when the fault was this URL. 404 without the base, 200 with it; measured, not guessed.
  const base = `http://127.0.0.1:${port}/Climbing-App/sri-probe.html`;
  let up = false;
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base); if (r.ok) { up = true; break; } } catch {} await new Promise((r) => setTimeout(r, 2000)); }
  if (!up) { server.kill(); throw new Error("dev server never came up (" + label + ")"); }
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errs = [], cons = [];
  page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error") cons.push(m.text().slice(0, 200)); });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__r && window.__r.done)) break; await page.waitForTimeout(1000); }
  const r = await page.evaluate(() => window.__r);
  await browser.close(); server.kill();
  return { r, errs, cons };
};

try {
  console.log("--- with the published hash (must LOAD) ---");
  const a = await run("good");
  if (a.r.ready && !a.r.error) ok("loadLeaflet reported ready"); else fail("ready=" + a.r.ready + " error=" + a.r.error);
  if (a.r.L) ok("window.L is present — the pinned script executed"); else fail("window.L missing");
  if (a.r.tiles > 0) ok(`a real map rendered (${a.r.tiles} tiles)`); else fail("no tiles rendered — the CSS pin may be wrong");
  if (!a.errs.length) ok("no page errors"); else fail("page errors: " + a.errs.join(" | "));

  console.log("\n--- with a CORRUPTED hash (must fail SAFELY) ---");
  const broken = original.replace(/sri: "sha512-puJW/, 'sri: "sha512-ZZZZ');
  if (broken === original) throw new Error("injection did not land — the js sri literal moved");
  fs.writeFileSync(MAPKIT, broken);
  const b = await run("bad");
  if (b.r.error && !b.r.ready) ok("the loader reported ERROR — a refused hash lands on the existing error path");
  else fail("ready=" + b.r.ready + " error=" + b.r.error + " (a bad hash did NOT degrade to the error path)");
  if (!b.r.L) ok("window.L absent — the substituted script was genuinely refused, not merely flagged");
  else fail("window.L present despite a bad hash — integrity is not being enforced");
  const blocked = b.cons.some((c) => /integrity|Failed to find a valid digest/i.test(c));
  if (blocked) ok("the browser says why: " + JSON.stringify(b.cons.find((c) => /integrity|digest/i.test(c)).slice(0, 110)));
  else console.log("  note  no integrity message captured (browsers word this differently)");
  if (!b.errs.length) ok("and the page did not crash — a stale hash costs the map, not the app");
  else fail("page errors on the bad-hash path: " + b.errs.join(" | "));
} catch (e) { fail("threw: " + e.message); }
finally {
  fs.writeFileSync(MAPKIT, original);
  if (fs.existsSync(PAGE)) fs.unlinkSync(PAGE);
  const restored = fs.readFileSync(MAPKIT, "utf8") === original;
  console.log(`\n  mapKit restored: ${restored}`);
  if (!restored) { console.log("  RESTORE FAILED"); bad++; }
  console.log(bad ? `${bad} FAILED` : "both halves verified: the pin loads, and a wrong pin fails safely");
  process.exit(bad ? 1 : 0);
}
