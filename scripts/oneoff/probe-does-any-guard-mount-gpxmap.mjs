// Do the browser guards actually RUN GPXMap, or do they only visit the tab it lives on?
//
// GPXMap is ~200 dense lines that draw the track, every waypoint marker, the endpoint dots, the
// dashed connectors, the legend and the derived-trailhead marker. check:bare structurally cannot
// see it — the markers are built in a useEffect and effects do not run under renderToStaticMarkup.
// So a browser guard is the only thing that could, and the question is whether one does.
//
// MEASURED, NOT REASONED. Four guards reach the route page via ?zr=1 and check:overflow walks all
// six sub-tabs, which SOUNDS like coverage. Reaching the tab a map lives on and mounting the map
// are different facts: Leaflet is loaded on demand by loadLeaflet(), so `window.L` becoming defined
// is the only honest signal. Counting markers first cannot tell "no map" from "map with no markers".
//
// Uses the SHARED scaffold (overlay-scroll.config.mjs) — the one check:overlay-scroll,
// check:a11y-badges and check:selected-state all use — so the answer is about those guards rather
// than about a fixture built for this probe.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5340;

async function waitForServer(url) {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(4000) }); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
async function claimPort(start, span = 40) {
  for (let p = start; p < start + span; p++) {
    const free = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}

const port = await claimPort(PORT);
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
console.log(`driving the SHARED scaffold (overlay-scroll.config.mjs) on ${port}...`);
const server = spawn(
  "npx",
  ["vite", "--config", "scripts/overlay-scroll.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } },
);
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
if (!(await waitForServer(base)) || died) { console.error("dev server never came up"); stopServer(); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);

const snap = async (label) => {
  const r = await page.evaluate(() => ({
    hasL: typeof window.L !== "undefined",
    containers: document.querySelectorAll(".leaflet-container").length,
    markers: document.querySelectorAll(".leaflet-marker-icon").length,
    tiles: document.querySelectorAll(".leaflet-tile").length,
  }));
  console.log(`  ${label.padEnd(28)} L=${r.hasL}  containers=${r.containers}  markers=${r.markers}  tiles=${r.tiles}`);
  return r;
};

await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 40000 }).catch(() => {});
const opened = await page.evaluate(() => window.__routeOpen === true);
console.log(`\n?zr=1 opened a route: ${opened}`);
if (!opened) { console.log("FAIL — the shared scaffold's opener did not reach a route; nothing below means anything."); stopServer(); await browser.close().catch(() => {}); process.exit(1); }

await page.waitForFunction(
  () => [...document.querySelectorAll("button")].some(b => b.textContent.trim() === "Plan"),
  null, { timeout: 40000 },
).catch(() => {});
const onOverview = await snap("on Overview (where ?zr=1 lands)");

/* The recipe proven in #1235: a plain <button> whose text is exactly "Plan". NOT tapByName — that
   matches an authored aria-label and this control has only aria-current — and NO fixed/sticky
   filter, which is a check:overflow rule that exists for the BOTTOM NAV and excludes this bar. */
const planned = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Plan");
  if (!b) return false;
  b.click();
  return true;
});
console.log(`clicked Plan: ${planned}`);
if (planned) {
  await page.waitForFunction(() => typeof window.L !== "undefined", null, { timeout: 45000 }).catch(() => {});
  await page.waitForSelector(".leaflet-marker-icon", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
}
const onPlanner = await snap("after clicking Plan");

/* The control that makes this matter. #1233 fixed the shared BaseLayerToggle — Satellite / Topo /
   Street — across "every map", and check:selected-state is the guard whose whole subject is a
   control that LOOKS selected saying so. If that guard cannot reach the route page's map, the fix
   is unguarded exactly where the map is richest. Read the announced state, never the markup: a
   background colour is what #1041 was about. */
const toggle = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button,[role=button],[role=tab],[role=radio]")]
    .filter(b => /^(satellite|topo|street|terrain|map)$/i.test((b.textContent || "").trim()));
  return btns.map(b => ({
    label: (b.textContent || "").trim(),
    ariaCurrent: b.getAttribute("aria-current"),
    ariaPressed: b.getAttribute("aria-pressed"),
    ariaSelected: b.getAttribute("aria-selected"),
    role: b.getAttribute("role"),
  }));
});
console.log(`\nbase-layer toggle on the route map: ${toggle.length} control(s)`);
for (const t of toggle) console.log(`  ${t.label.padEnd(11)} role=${t.role} aria-current=${t.ariaCurrent} aria-pressed=${t.ariaPressed} aria-selected=${t.ariaSelected}`);
const announces = toggle.some(t => t.ariaCurrent || t.ariaPressed || t.ariaSelected);
if (toggle.length && !announces) console.log("  ** none of them announces a selected state");
else if (toggle.length) console.log("  ok — the selection is announced, so #1233's fix is present here");

console.log("");
if (!onOverview.hasL && onPlanner.hasL) {
  console.log("VERDICT: GPXMap mounts only once something clicks through to Planner.");
  console.log("  `?zr=1` alone lands on Overview and mounts nothing.");
  console.log("");
  console.log("  WHICH GUARDS THAT AFFECTS — read from their source, not inferred from this run:");
  console.log("    check:overflow      taps \"Plan\" (check-horizontal-overflow.mjs:275)  -> DOES reach the map");
  console.log("    check:a11y-badges   taps \"Plan\" (check-a11y-badge-names.mjs:342)     -> DOES reach the map");
  console.log("    check:selected-state opens ?zr=1 and stays on Overview                -> does NOT");
  console.log("    check:overlay-scroll never opens the route page at all                -> does NOT");
  console.log("");
  console.log("  The one that matters is check:selected-state: its whole subject is a control that");
  console.log("  LOOKS selected saying so, and #1233 just fixed the shared BaseLayerToggle across");
  console.log("  \"every map\" — so that fix is unguarded on the richest map in the app.");
} else if (onOverview.hasL) {
  console.log("VERDICT: Leaflet is already loaded on Overview — a map mounts without the Plan click.");
} else {
  console.log("VERDICT: Leaflet did NOT load even after clicking Plan. Either the click missed or");
  console.log("  this route takes the cragOnly branch, whose map is under GETTING THERE on Overview.");
}
stopServer();
await browser.close().catch(() => {});
